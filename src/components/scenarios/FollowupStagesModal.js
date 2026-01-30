'use client'

import { useState, useEffect } from 'react'
import { getCurrentUser } from '@/lib/auth'

export default function FollowupStagesModal({ scenario, onClose, onSuccess }) {
  const [stages, setStages] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchStages()
  }, [])

  const fetchStages = async () => {
    try {
      const user = getCurrentUser()
      const response = await fetch(`/api/scenarios/${scenario.id}/followup-stages`, {
        headers: {
          'x-user-id': user?.userId || '',
          'x-workspace-id': user?.workspaceId || '',
          'x-messaging-profile-id': user?.messagingProfileId || ''
        }
      })
      const data = await response.json()
      if (data.success) {
        setStages(data.stages.length > 0 ? data.stages : [createEmptyStage(1)])
      }
    } catch (error) {
      console.error('Error fetching stages:', error)
      setStages([createEmptyStage(1)])
    } finally {
      setLoading(false)
    }
  }

  const createEmptyStage = (stageNumber) => ({
    stage_number: stageNumber,
    wait_duration: 1440, // 1 day in minutes
    wait_unit: 'days',
    instructions: ''
  })

  const addStage = () => {
    const nextStageNumber = stages.length + 1
    setStages([...stages, createEmptyStage(nextStageNumber)])
  }

  const removeStage = (index) => {
    if (stages.length === 1) {
      alert('You must have at least one follow-up stage')
      return
    }
    const newStages = stages.filter((_, i) => i !== index)
    // Renumber stages
    const renumbered = newStages.map((stage, i) => ({
      ...stage,
      stage_number: i + 1
    }))
    setStages(renumbered)
  }

  const updateStage = (index, field, value) => {
    const newStages = [...stages]
    newStages[index] = { ...newStages[index], [field]: value }

    // Auto-calculate wait_duration based on wait_unit
    if (field === 'wait_unit' || field === 'wait_value') {
      const wait_value = field === 'wait_value' ? value : newStages[index].wait_value || 1
      const wait_unit = field === 'wait_unit' ? value : newStages[index].wait_unit

      let minutes = wait_value
      if (wait_unit === 'hours') minutes = wait_value * 60
      if (wait_unit === 'days') minutes = wait_value * 1440
      if (wait_unit === 'weeks') minutes = wait_value * 10080

      newStages[index].wait_duration = minutes
      newStages[index].wait_value = wait_value
    }

    setStages(newStages)
  }

  // Initialize wait_value from wait_duration for existing stages
  useEffect(() => {
    if (stages.length > 0 && !stages[0].wait_value) {
      const updated = stages.map(stage => {
        let wait_value = stage.wait_duration
        if (stage.wait_unit === 'hours') wait_value = stage.wait_duration / 60
        if (stage.wait_unit === 'days') wait_value = stage.wait_duration / 1440
        if (stage.wait_unit === 'weeks') wait_value = stage.wait_duration / 10080
        return { ...stage, wait_value }
      })
      setStages(updated)
    }
  }, [loading])

  const handleSave = async () => {
    // Validate
    for (let i = 0; i < stages.length; i++) {
      if (!stages[i].instructions.trim()) {
        alert(`Stage ${i + 1} is missing instructions`)
        return
      }
      if (!stages[i].wait_duration || stages[i].wait_duration <= 0) {
        alert(`Stage ${i + 1} has invalid wait duration`)
        return
      }
    }

    setSaving(true)
    try {
      const user = getCurrentUser()
      const response = await fetch(`/api/scenarios/${scenario.id}/followup-stages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.userId || '',
          'x-workspace-id': user?.workspaceId || '',
          'x-messaging-profile-id': user?.messagingProfileId || ''
        },
        body: JSON.stringify({ stages })
      })

      const data = await response.json()
      if (data.success) {
        onSuccess?.()
        onClose()
      } else {
        alert('Failed to save stages: ' + (data.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error saving stages:', error)
      alert('Error saving stages')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-600">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <i className="fas fa-layer-group"></i>
                Manage Follow-up Stages
              </h2>
              <p className="text-blue-100 text-sm mt-1">{scenario.name}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <i className="fas fa-times text-2xl"></i>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="text-gray-600 mt-4">Loading stages...</p>
            </div>
          ) : (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <i className="fas fa-lightbulb text-blue-600 text-xl mt-0.5"></i>
                  <div>
                    <p className="text-sm font-semibold text-blue-900 mb-1">
                      How Follow-ups Work
                    </p>
                    <p className="text-xs text-blue-700">
                      Each stage waits for the specified time after the last AI message. If the customer doesn't respond, the next follow-up is sent using that stage's AI prompt. Configure multiple stages for persistent engagement.
                    </p>
                  </div>
                </div>
              </div>

              {/* Stages */}
              <div className="space-y-4 mb-6">
                {stages.map((stage, index) => (
                  <div
                    key={index}
                    className="border-2 border-gray-200 rounded-xl p-5 bg-gradient-to-br from-white to-gray-50 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                          {stage.stage_number}
                        </div>
                        <h3 className="font-bold text-gray-900">
                          Stage {stage.stage_number}
                        </h3>
                      </div>
                      {stages.length > 1 && (
                        <button
                          onClick={() => removeStage(index)}
                          className="text-red-600 hover:text-red-700 p-2"
                          title="Remove stage"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      )}
                    </div>

                    {/* Wait Duration */}
                    <div className="mb-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Wait Duration
                      </label>
                      <div className="flex gap-3">
                        <input
                          type="number"
                          min="1"
                          value={stage.wait_value || 1}
                          onChange={(e) => updateStage(index, 'wait_value', parseInt(e.target.value))}
                          className="w-24 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                        <select
                          value={stage.wait_unit || 'days'}
                          onChange={(e) => updateStage(index, 'wait_unit', e.target.value)}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="minutes">Minutes</option>
                          <option value="hours">Hours</option>
                          <option value="days">Days</option>
                          <option value="weeks">Weeks</option>
                        </select>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Follow-up will be sent {stage.wait_value} {stage.wait_unit} after the last AI message
                      </p>
                    </div>

                    {/* Instructions */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        AI Instructions for This Stage
                      </label>
                      <textarea
                        value={stage.instructions}
                        onChange={(e) => updateStage(index, 'instructions', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        rows="4"
                        placeholder={`Example for Stage ${stage.stage_number}:\n\n"It's been ${stage.wait_value} ${stage.wait_unit} since we last spoke. I wanted to check if you're still interested in learning more about our properties. Let me know if you have any questions!"`}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        This prompt will be used for follow-up #{stage.stage_number}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Stage Button */}
              <button
                onClick={addStage}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors font-semibold"
              >
                <i className="fas fa-plus mr-2"></i>
                Add Another Stage
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50"
            disabled={saving || loading}
          >
            {saving ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Saving...
              </>
            ) : (
              <>
                <i className="fas fa-save mr-2"></i>
                Save Stages
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
