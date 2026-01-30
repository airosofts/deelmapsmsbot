import { NextResponse } from 'next/server'
import { toggleManualOverride } from '@/lib/followup-service'
import { getUserFromRequest, getWorkspaceFromRequest } from '@/lib/session-helper'
import { supabaseAdmin } from '@/lib/supabase-server'

// POST - Toggle manual override
export async function POST(request, { params }) {
  try {
    const user = getUserFromRequest(request)
    const workspace = getWorkspaceFromRequest(request)

    if (!user || !workspace) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { enabled } = body

    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'enabled field is required and must be boolean' },
        { status: 400 }
      )
    }

    // Verify conversation belongs to user's workspace
    const { data: conversation } = await supabaseAdmin
      .from('conversations')
      .select('id')
      .eq('id', id)
      .single()

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // Toggle manual override
    const result = await toggleManualOverride(id, enabled)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      manual_override: enabled
    })

  } catch (error) {
    console.error('Error toggling manual override:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
