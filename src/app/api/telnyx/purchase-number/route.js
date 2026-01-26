// API endpoint to purchase phone numbers from Telnyx
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUserFromRequest, getWorkspaceFromRequest } from '@/lib/session-helper'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const TELNYX_API_KEY = process.env.TELNYX_API_KEY

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function POST(request) {
  try {
    console.log('=== Phone Number Purchase Request ===')

    // Get user and workspace context
    const user = getUserFromRequest(request)
    if (!user || !user.userId) {
      return NextResponse.json(
        { error: 'Unauthorized - User not found' },
        { status: 401 }
      )
    }

    const workspace = getWorkspaceFromRequest(request)
    if (!workspace || !workspace.workspaceId) {
      return NextResponse.json(
        { error: 'Unauthorized - Workspace not found' },
        { status: 401 }
      )
    }

    const { phoneNumber, upfrontCost, monthlyCost, vat, totalCost } = await request.json()

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      )
    }

    console.log('Purchase request:', {
      phoneNumber,
      upfrontCost,
      monthlyCost,
      vat,
      totalCost,
      userId: user.userId,
      workspaceId: workspace.workspaceId
    })

    // Purchase number from Telnyx
    console.log('Purchasing from Telnyx:', phoneNumber)

    const telnyxResponse = await fetch('https://api.telnyx.com/v2/number_orders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TELNYX_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phone_numbers: [
          {
            phone_number: phoneNumber
          }
        ],
        messaging_profile_id: workspace.messagingProfileId || undefined,
        billing_group_id: workspace.billingGroupId || undefined
      })
    })

    if (!telnyxResponse.ok) {
      const errorData = await telnyxResponse.json().catch(() => ({}))
      console.error('Telnyx purchase failed:', errorData)

      return NextResponse.json(
        {
          error: 'Failed to purchase number from Telnyx',
          details: errorData.errors || errorData.message || 'Unknown error'
        },
        { status: telnyxResponse.status }
      )
    }

    const telnyxData = await telnyxResponse.json()
    console.log('Telnyx purchase successful:', telnyxData.data)

    // Extract phone number ID from Telnyx response
    const phoneNumberId = telnyxData.data.phone_numbers?.[0]?.id ||
                          telnyxData.data.id ||
                          `telnyx_${Date.now()}`

    // Store phone number in database
    const { data: phoneNumberRecord, error: phoneNumberError } = await supabaseAdmin
      .from('phone_numbers')
      .insert({
        phone_number_id: phoneNumberId,
        phone_number: phoneNumber,
        workspace_id: workspace.workspaceId,
        messaging_profile_id: workspace.messagingProfileId || null,
        billing_group_id: workspace.billingGroupId || null,
        status: 'active',
        purchased_by: user.userId
      })
      .select()
      .single()

    if (phoneNumberError) {
      console.error('Database insert error:', phoneNumberError)
      console.error('CRITICAL: Phone number purchased from Telnyx but database insert failed!')
      console.error('Phone Number:', phoneNumber)
      console.error('Telnyx Order ID:', telnyxData.data.id)

      return NextResponse.json(
        {
          error: 'Purchase failed',
          message: phoneNumberError.message || 'Database error occurred',
          telnyxOrderId: telnyxData.data.id,
          requiresManualReview: true
        },
        { status: 500 }
      )
    }

    // Update messaging profile in Telnyx (if not set during order)
    if (workspace.messagingProfileId && phoneNumberId) {
      try {
        await fetch(`https://api.telnyx.com/v2/phone_numbers/${phoneNumberId}/messaging`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${TELNYX_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messaging_profile_id: workspace.messagingProfileId
          })
        })
        console.log('Messaging profile updated')
      } catch (error) {
        console.warn('Failed to update messaging profile (non-critical):', error.message)
      }
    }

    // Update billing group in Telnyx (if not set during order)
    if (workspace.billingGroupId && phoneNumberId) {
      try {
        await fetch(`https://api.telnyx.com/v2/phone_numbers/${phoneNumberId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${TELNYX_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            billing_group_id: workspace.billingGroupId
          })
        })
        console.log('Billing group updated')
      } catch (error) {
        console.warn('Failed to update billing group (non-critical):', error.message)
      }
    }

    console.log('=== Purchase Complete ===')

    return NextResponse.json({
      success: true,
      message: 'Phone number purchased successfully',
      data: {
        phoneNumber,
        phoneNumberId,
        telnyxOrderId: telnyxData.data.id,
        workspaceId: workspace.workspaceId,
        messagingProfileId: workspace.messagingProfileId,
        billingGroupId: workspace.billingGroupId
      }
    })

  } catch (error) {
    console.error('=== Purchase Error ===')
    console.error('Error:', error)
    console.error('Stack:', error.stack)

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message
      },
      { status: 500 }
    )
  }
}
