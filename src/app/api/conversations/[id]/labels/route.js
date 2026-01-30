import { NextResponse } from 'next/server'
import { addConversationLabel, removeConversationLabel } from '@/lib/followup-service'
import { getUserFromRequest, getWorkspaceFromRequest } from '@/lib/session-helper'
import { supabaseAdmin } from '@/lib/supabase-server'

// POST - Add label to conversation
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
    const { label } = body

    if (!label || typeof label !== 'string') {
      return NextResponse.json(
        { error: 'label field is required and must be a string' },
        { status: 400 }
      )
    }

    // Verify conversation exists
    const { data: conversation } = await supabaseAdmin
      .from('conversations')
      .select('id, labels')
      .eq('id', id)
      .single()

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // Add label
    const result = await addConversationLabel(id, label)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    // Get updated labels
    const { data: updated } = await supabaseAdmin
      .from('conversations')
      .select('labels')
      .eq('id', id)
      .single()

    return NextResponse.json({
      success: true,
      labels: updated.labels
    })

  } catch (error) {
    console.error('Error adding conversation label:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Remove label from conversation
export async function DELETE(request, { params }) {
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
    const { label } = body

    if (!label || typeof label !== 'string') {
      return NextResponse.json(
        { error: 'label field is required and must be a string' },
        { status: 400 }
      )
    }

    // Remove label
    const result = await removeConversationLabel(id, label)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    // Get updated labels
    const { data: updated } = await supabaseAdmin
      .from('conversations')
      .select('labels')
      .eq('id', id)
      .single()

    return NextResponse.json({
      success: true,
      labels: updated.labels || []
    })

  } catch (error) {
    console.error('Error removing conversation label:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
