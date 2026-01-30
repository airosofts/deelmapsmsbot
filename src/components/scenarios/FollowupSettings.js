'use client'

import { useState } from 'react'

export default function FollowupSettings({ formData, setFormData }) {
  return (
    <div className="border border-gray-200 rounded-lg p-6 bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="flex items-center gap-3 mb-4">
        <i className="fas fa-clock text-blue-600 text-xl"></i>
        <h3 className="text-lg font-bold text-gray-900">Follow-up Settings</h3>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Automatically send follow-up messages if the customer doesn't respond
      </p>

      {/* Enable Follow-ups Toggle */}
      <div className="mb-6">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.enable_followups || false}
            onChange={(e) => setFormData({ ...formData, enable_followups: e.target.checked })}
            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
          />
          <span className="text-sm font-semibold text-gray-700">
            Enable automatic follow-ups
          </span>
        </label>
      </div>

      {formData.enable_followups && (
        <div className="space-y-6 pl-8 border-l-2 border-blue-200">
          {/* Max Attempts */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Maximum Follow-up Attempts
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={formData.max_followup_attempts || 3}
              onChange={(e) => setFormData({ ...formData, max_followup_attempts: parseInt(e.target.value) })}
              className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Stop after this many follow-up attempts
            </p>
          </div>

          {/* Business Hours */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer mb-3">
              <input
                type="checkbox"
                checked={formData.enable_business_hours || false}
                onChange={(e) => setFormData({ ...formData, enable_business_hours: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-semibold text-gray-700">
                Only send during business hours
              </span>
            </label>

            {formData.enable_business_hours && (
              <div className="pl-7 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={formData.business_hours_start || '09:00'}
                      onChange={(e) => setFormData({ ...formData, business_hours_start: e.target.value + ':00' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={formData.business_hours_end || '18:00'}
                      onChange={(e) => setFormData({ ...formData, business_hours_end: e.target.value + ':00' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Timezone
                  </label>
                  <select
                    value={formData.business_hours_timezone || 'America/New_York'}
                    onChange={(e) => setFormData({ ...formData, business_hours_timezone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="America/New_York">Eastern Time</option>
                    <option value="America/Chicago">Central Time</option>
                    <option value="America/Denver">Mountain Time</option>
                    <option value="America/Los_Angeles">Pacific Time</option>
                    <option value="America/Phoenix">Arizona</option>
                    <option value="America/Anchorage">Alaska</option>
                    <option value="Pacific/Honolulu">Hawaii</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* STOP Keywords */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              STOP Keywords (Compliance)
            </label>
            <input
              type="text"
              value={formData.auto_stop_keywords?.join(', ') || 'STOP, UNSUBSCRIBE, CANCEL, END, QUIT'}
              onChange={(e) => setFormData({
                ...formData,
                auto_stop_keywords: e.target.value.split(',').map(k => k.trim().toUpperCase()).filter(k => k)
              })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="STOP, UNSUBSCRIBE, CANCEL"
            />
            <p className="text-xs text-gray-500 mt-1">
              Comma-separated keywords that will stop automated messages
            </p>
          </div>

          {/* Note about stages */}
          <div className="bg-blue-100 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <i className="fas fa-info-circle text-blue-600 mt-0.5"></i>
              <div>
                <p className="text-sm font-semibold text-blue-900 mb-1">
                  Configure Follow-up Stages
                </p>
                <p className="text-xs text-blue-700">
                  After creating/updating the scenario, use the "Manage Follow-ups" button to set up multiple follow-up stages with custom timing and AI prompts for each stage.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
