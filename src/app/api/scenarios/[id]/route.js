import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { getUserFromRequest, getWorkspaceFromRequest } from '@/lib/session-helper'

// GET - Fetch single scenario
export async function GET(request, { params }) {
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

    const { data: scenario, error } = await supabaseAdmin
      .from('scenarios')
      .select(`
        *,
        scenario_phone_numbers (
          phone_number_id,
          phone_numbers (
            phone_number,
            custom_name
          )
        ),
        scenario_contacts (
          recipient_phone,
          contact_id,
          contacts (
            business_name
          )
        )
      `)
      .eq('id', id)
      .eq('workspace_id', workspace.workspaceId)
      .single()

    if (error) {
      console.error('Error fetching scenario:', error)
      return NextResponse.json(
        { error: 'Scenario not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      scenario
    })
  } catch (error) {
    console.error('Error in scenario GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH - Update scenario
export async function PATCH(request, { params }) {
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
    const { name, description, instructions, is_active, phoneNumbers, contacts } = body

    // Update scenario
    const updateData = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (instructions !== undefined) updateData.instructions = instructions
    if (is_active !== undefined) updateData.is_active = is_active

    const { data: scenario, error: updateError } = await supabaseAdmin
      .from('scenarios')
      .update(updateData)
      .eq('id', id)
      .eq('workspace_id', workspace.workspaceId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating scenario:', updateError)
      return NextResponse.json(
        { error: 'Failed to update scenario' },
        { status: 500 }
      )
    }

    // Update phone number assignments if provided
    if (phoneNumbers !== undefined) {
      // Delete existing assignments
      await supabaseAdmin
        .from('scenario_phone_numbers')
        .delete()
        .eq('scenario_id', id)

      // Add new assignments
      if (phoneNumbers.length > 0) {
        const phoneNumberInserts = phoneNumbers.map(phoneId => ({
          scenario_id: id,
          phone_number_id: phoneId
        }))

        await supabaseAdmin
          .from('scenario_phone_numbers')
          .insert(phoneNumberInserts)
      }
    }

    // Update contact restrictions if provided
    if (contacts !== undefined) {
      // Delete existing restrictions
      await supabaseAdmin
        .from('scenario_contacts')
        .delete()
        .eq('scenario_id', id)

      // Add new restrictions
      if (contacts.length > 0) {
        const contactInserts = contacts.map(contact => ({
          scenario_id: id,
          recipient_phone: contact.phone,
          contact_id: contact.id || null
        }))

        await supabaseAdmin
          .from('scenario_contacts')
          .insert(contactInserts)
      }
    }

    return NextResponse.json({
      success: true,
      scenario
    })
  } catch (error) {
    console.error('Error in scenario PATCH:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete scenario
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

    const { error } = await supabaseAdmin
      .from('scenarios')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspace.workspaceId)

    if (error) {
      console.error('Error deleting scenario:', error)
      return NextResponse.json(
        { error: 'Failed to delete scenario' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Scenario deleted successfully'
    })
  } catch (error) {
    console.error('Error in scenario DELETE:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
