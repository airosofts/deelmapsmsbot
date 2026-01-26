import { supabaseAdmin } from '@/lib/supabase-server'
import { getAIResponse } from '@/lib/openai'
import telnyx from '@/lib/telnyx'

export async function findMatchingScenario(recipientNumber, senderNumber) {
  try {
    // First, find the phone number record by phone number string
    const { data: phoneRecord, error: phoneRecordError } = await supabaseAdmin
      .from('phone_numbers')
      .select('id')
      .eq('phone_number', recipientNumber)
      .single()

    if (phoneRecordError || !phoneRecord) {
      console.log(`No phone number record found for ${recipientNumber}`)
      return null
    }

    // Find scenarios assigned to this phone number ID
    const { data: scenarioPhoneNumbers, error: phoneError } = await supabaseAdmin
      .from('scenario_phone_numbers')
      .select(`
        scenario_id,
        scenarios!inner (
          id,
          workspace_id,
          name,
          instructions,
          is_active
        )
      `)
      .eq('phone_number_id', phoneRecord.id)
      .eq('scenarios.is_active', true)

    if (phoneError) {
      console.error('Error finding scenarios:', phoneError)
      return null
    }

    if (!scenarioPhoneNumbers || scenarioPhoneNumbers.length === 0) {
      console.log(`No active scenarios found for phone ${recipientNumber}`)
      return null
    }

    // Check if any scenario has contact restrictions
    for (const item of scenarioPhoneNumbers) {
      const scenario = item.scenarios

      // Check if scenario has contact restrictions
      const { data: contactRestrictions } = await supabaseAdmin
        .from('scenario_contacts')
        .select('recipient_phone')
        .eq('scenario_id', scenario.id)

      // If no restrictions, scenario applies
      if (!contactRestrictions || contactRestrictions.length === 0) {
        return scenario
      }

      // If restrictions exist, check if sender matches
      const isAllowed = contactRestrictions.some(
        restriction => restriction.recipient_phone === senderNumber
      )

      if (isAllowed) {
        return scenario
      }
    }

    return null
  } catch (error) {
    console.error('Error in findMatchingScenario:', error)
    return null
  }
}

export async function executeScenario(scenario, message, conversation) {
  const startTime = Date.now()
  const executionLog = {
    scenario_id: scenario.id,
    conversation_id: conversation.id,
    message_id: message.id,
    sender_number: message.from_number,
    recipient_number: message.to_number,
    execution_status: 'processing',
    reply_sent: false
  }

  try {
    // Get conversation history
    const { data: messages, error: messagesError } = await supabaseAdmin
      .from('messages')
      .select('id, direction, body, from_number, to_number, created_at')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true })

    if (messagesError) {
      throw new Error(`Failed to fetch conversation history: ${messagesError.message}`)
    }

    // Format conversation history for AI
    const conversationHistory = messages.map(msg => ({
      direction: msg.direction,
      body: msg.body,
      from: msg.from_number,
      to: msg.to_number,
      timestamp: msg.created_at
    }))

    executionLog.conversation_history = conversationHistory

    // Build AI prompt
    const aiPrompt = `${scenario.instructions}

IMPORTANT RULES:
1. Follow the scenario instructions strictly
2. Keep responses concise and natural
3. If the scenario says to stop responding, return exactly: "STOP_SCENARIO"
4. Never mention you are an AI or bot
5. Stay in character based on the scenario

Current conversation:`

    executionLog.ai_prompt = aiPrompt

    // Get AI response
    const aiResult = await getAIResponse(conversationHistory, aiPrompt)

    if (!aiResult.success) {
      executionLog.execution_status = 'failed'
      executionLog.error_message = aiResult.error
      executionLog.processing_time_ms = Date.now() - startTime
      await logScenarioExecution(executionLog)
      return { success: false, error: aiResult.error }
    }

    executionLog.ai_response = aiResult.response
    executionLog.tokens_used = aiResult.tokensUsed
    executionLog.ai_model = aiResult.model

    // Check if AI wants to stop
    if (aiResult.response.includes('STOP_SCENARIO')) {
      executionLog.execution_status = 'no_reply'
      executionLog.processing_time_ms = Date.now() - startTime
      await logScenarioExecution(executionLog)
      return { success: true, stopped: true }
    }

    // Send reply via Telnyx
    const sendResult = await telnyx.sendMessage(
      message.to_number, // from (our number)
      message.from_number, // to (their number)
      aiResult.response
    )

    if (!sendResult.success) {
      executionLog.execution_status = 'failed'
      executionLog.error_message = `Failed to send message: ${sendResult.error}`
      executionLog.processing_time_ms = Date.now() - startTime
      await logScenarioExecution(executionLog)
      return { success: false, error: sendResult.error }
    }

    // Create message record
    const { data: replyMessage, error: replyError } = await supabaseAdmin
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        telnyx_message_id: sendResult.messageId,
        direction: 'outbound',
        from_number: message.to_number,
        to_number: message.from_number,
        body: aiResult.response,
        status: 'sent'
      })
      .select()
      .single()

    if (replyError) {
      console.error('Failed to create reply message record:', replyError)
    }

    // Update execution log
    executionLog.reply_sent = true
    executionLog.reply_message_id = replyMessage?.id
    executionLog.execution_status = 'success'
    executionLog.processing_time_ms = Date.now() - startTime

    await logScenarioExecution(executionLog)

    return {
      success: true,
      reply: aiResult.response,
      messageId: sendResult.messageId
    }

  } catch (error) {
    console.error('Error executing scenario:', error)
    executionLog.execution_status = 'failed'
    executionLog.error_message = error.message
    executionLog.processing_time_ms = Date.now() - startTime
    await logScenarioExecution(executionLog)
    return { success: false, error: error.message }
  }
}

async function logScenarioExecution(executionLog) {
  try {
    const { error } = await supabaseAdmin
      .from('scenario_executions')
      .insert(executionLog)

    if (error) {
      console.error('Failed to log scenario execution:', error)
    }
  } catch (error) {
    console.error('Error logging scenario execution:', error)
  }
}
