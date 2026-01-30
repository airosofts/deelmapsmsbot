//api/webhooks/telnyx/route.js

import { NextResponse } from 'next/server'
import telnyx from '@/lib/telnyx'
import { supabaseAdmin } from '@/lib/supabase-server'
import { findMatchingScenario, executeScenario } from '@/lib/scenario-service'
import {
  containsStopKeyword,
  stopFollowups,
  updateFollowupState
} from '@/lib/followup-service'

function normalizePhoneNumber(phone) {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  
  if (digits.length === 10) {
    return `+1${digits}`
  } else if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`
  } else if (phone.startsWith('+')) {
    return phone
  }
  
  return `+1${digits}`
}

async function getOrCreateConversation(fromNumber, toNumber) {
  const normalizedFrom = normalizePhoneNumber(fromNumber)
  const normalizedTo = normalizePhoneNumber(toNumber)

  try {
    // For inbound messages, the customer is the 'from' number
    // Look for conversation matching BOTH phone_number (customer) AND from_number (our business number)
    // This ensures each customer-business number pair has a separate conversation
    let { data: conversation, error } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .eq('phone_number', normalizedFrom)
      .eq('from_number', normalizedTo)
      .single()

    // If no exact match, create new conversation
    if (error && error.code === 'PGRST116') {
      const { data: newConversation, error: createError } = await supabaseAdmin
        .from('conversations')
        .insert({
          phone_number: normalizedFrom, // Customer's number
          from_number: normalizedTo,    // Our business number
          name: null
        })
        .select()
        .single()

      if (createError) {
        throw createError
      }

      conversation = newConversation
    } else if (error) {
      throw error
    }

    return conversation
  } catch (error) {
    console.error('Error in getOrCreateConversation:', error)
    throw error
  }
}

export async function POST(request) {
  try {
    const body = await request.text()
    console.log('Telnyx webhook received:', body)

    const signature = request.headers.get('telnyx-signature-ed25519')
    const timestamp = request.headers.get('telnyx-timestamp')

    // Verify webhook signature (optional in development)
    if (process.env.NODE_ENV === 'production') {
      if (!telnyx.verifyWebhookSignature(body, signature, timestamp)) {
        console.warn('Invalid webhook signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    const event = telnyx.parseWebhookEvent(body)
    console.log('Parsed webhook event:', event.eventType, event.messageId)

    switch (event.eventType) {
      case 'message.received':
        await handleIncomingMessage(event)
        break

      case 'message.sent':
        await handleMessageSent(event)
        break

      case 'message.delivered':
        await handleMessageDelivered(event)
        break

      case 'message.delivery_failed':
      case 'message.failed':
        await handleMessageFailed(event)
        break

      case 'message.finalized':
        await handleMessageFinalized(event)
        break

      default:
        console.log(`Unhandled event type: ${event.eventType}`)
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error processing Telnyx webhook:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function handleIncomingMessage(event) {
  try {
    const { payload } = event
    const fromNumber = payload.from.phone_number
    const toNumber = payload.to[0].phone_number
    const messageBody = payload.text
    const telnyxMessageId = payload.id

    console.log(`Incoming message from ${fromNumber} to ${toNumber}`)

    // Get or create conversation
    const conversation = await getOrCreateConversation(fromNumber, toNumber)

    // Create message record
    const { data: messageRecord, error } = await supabaseAdmin
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        telnyx_message_id: telnyxMessageId,
        direction: 'inbound',
        from_number: normalizePhoneNumber(fromNumber),
        to_number: normalizePhoneNumber(toNumber),
        body: messageBody,
        status: 'received',
        delivery_details: JSON.stringify({
          received_at: event.occurredAt,
          webhook_id: event.messageId,
          media: payload.media || null
        })
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating inbound message:', error)
      return
    }

    // Update conversation timestamp
    await supabaseAdmin
      .from('conversations')
      .update({ 
        last_message_at: new Date().toISOString()
      })
      .eq('id', conversation.id)

    console.log('Inbound message saved successfully:', messageRecord.id)

    // Check for matching scenario
    const scenario = await findMatchingScenario(
      normalizePhoneNumber(toNumber),   // recipient (our number)
      normalizePhoneNumber(fromNumber)  // sender (their number)
    )

    if (scenario) {
      console.log(`Found matching scenario: ${scenario.name} (ID: ${scenario.id})`)

      // Check if manual override is active
      if (conversation.manual_override) {
        console.log(`Manual override active for conversation ${conversation.id} - skipping AI response`)
        return
      }

      // Check for STOP keywords
      if (containsStopKeyword(messageBody, scenario.auto_stop_keywords)) {
        console.log(`STOP keyword detected in message - stopping follow-ups`)

        // Stop follow-ups for this conversation
        await stopFollowups(conversation.id, scenario.id)

        // Optionally send confirmation message
        const confirmMessage = "You have been unsubscribed from automated messages. Reply START to opt back in."
        await supabaseAdmin
          .from('messages')
          .insert({
            conversation_id: conversation.id,
            direction: 'outbound',
            from_number: normalizePhoneNumber(toNumber),
            to_number: normalizePhoneNumber(fromNumber),
            body: confirmMessage,
            status: 'queued'
          })

        // Send via Telnyx
        try {
          await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/sms/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: normalizePhoneNumber(fromNumber),
              from: normalizePhoneNumber(toNumber),
              message: confirmMessage
            })
          })
        } catch (sendError) {
          console.error('Error sending STOP confirmation:', sendError)
        }

        return
      }

      // Update follow-up state (customer sent a message)
      await updateFollowupState(conversation.id, scenario.id, 'customer')

      // Execute scenario asynchronously (don't await to avoid blocking webhook)
      executeScenario(scenario, messageRecord, conversation)
        .then(result => {
          if (result.success) {
            console.log('Scenario executed successfully:', {
              scenarioId: scenario.id,
              scenarioName: scenario.name,
              replySent: result.reply ? true : false,
              stopped: result.stopped || false
            })
          } else {
            console.error('Scenario execution failed:', {
              scenarioId: scenario.id,
              scenarioName: scenario.name,
              error: result.error
            })
          }
        })
        .catch(error => {
          console.error('Scenario execution error:', {
            scenarioId: scenario.id,
            scenarioName: scenario.name,
            error: error.message
          })
        })
    } else {
      console.log('No matching scenario found for this message')
    }

  } catch (error) {
    console.error('Error handling incoming message:', error)
  }
}

async function handleMessageSent(event) {
  try {
    const { payload } = event
    const telnyxMessageId = payload.id

    await supabaseAdmin
      .from('messages')
      .update({
        status: 'sent',
        delivery_details: JSON.stringify({
          sent_at: event.occurredAt,
          webhook_id: event.messageId
        })
      })
      .eq('telnyx_message_id', telnyxMessageId)

    console.log(`Message sent status updated: ${telnyxMessageId}`)

  } catch (error) {
    console.error('Error handling message sent:', error)
  }
}

async function handleMessageDelivered(event) {
  try {
    const { payload } = event
    const telnyxMessageId = payload.id
    const deliveredAt = new Date(event.occurredAt).toISOString()

    await supabaseAdmin
      .from('messages')
      .update({
        status: 'delivered',
        delivered_at: deliveredAt,
        delivery_details: JSON.stringify({
          delivered_at: deliveredAt,
          webhook_id: event.messageId
        })
      })
      .eq('telnyx_message_id', telnyxMessageId)

    console.log(`Message delivered status updated: ${telnyxMessageId}`)

  } catch (error) {
    console.error('Error handling message delivered:', error)
  }
}

async function handleMessageFailed(event) {
  try {
    const { payload } = event
    const telnyxMessageId = payload.id

    await supabaseAdmin
      .from('messages')
      .update({
        status: 'failed',
        error_details: JSON.stringify({
          error_code: payload.error_code || 'unknown',
          error_message: payload.error_message || 'Delivery failed',
          failed_at: event.occurredAt,
          webhook_id: event.messageId
        })
      })
      .eq('telnyx_message_id', telnyxMessageId)

    console.log(`Message failed status updated: ${telnyxMessageId}`)

  } catch (error) {
    console.error('Error handling message failed:', error)
  }
}

async function handleMessageFinalized(event) {
  try {
    const { payload } = event
    const telnyxMessageId = payload.id

    const deliveryDetails = {
      finalized_at: event.occurredAt,
      final_status: payload.to[0]?.status || 'unknown',
      cost: payload.cost || null,
      webhook_id: event.messageId
    }

    await supabaseAdmin
      .from('messages')
      .update({
        delivery_details: JSON.stringify(deliveryDetails)
      })
      .eq('telnyx_message_id', telnyxMessageId)

    console.log(`Message finalized: ${telnyxMessageId}`)

  } catch (error) {
    console.error('Error handling message finalized:', error)
  }
}

export async function GET(request) {
  return NextResponse.json({ 
    status: 'webhook endpoint active',
    timestamp: new Date().toISOString(),
    url: request.url
  })
}