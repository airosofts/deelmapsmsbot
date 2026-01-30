'use client'

import { useState, useEffect } from 'react'
import { getCurrentUser } from '@/lib/auth'

export default function AnalyticsModal({ scenario, onClose }) {
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)

  useEffect(() => {
    fetchAnalytics()
  }, [days])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const user = getCurrentUser()
      const response = await fetch(`/api/scenarios/${scenario.id}/analytics?days=${days}`, {
        headers: {
          'x-user-id': user?.userId || '',
          'x-workspace-id': user?.workspaceId || '',
          'x-messaging-profile-id': user?.messagingProfileId || ''
        }
      })
      const data = await response.json()
      if (data.success) {
        setAnalytics(data.analytics)
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-8">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 text-white/80 hover:text-white transition-colors"
          >
            <i className="fas fa-times text-2xl"></i>
          </button>

          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <i className="fas fa-chart-line text-3xl text-white"></i>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white">Analytics</h2>
              <p className="text-indigo-100 mt-1">{scenario.name}</p>
            </div>
          </div>

          {/* Date Range Tabs */}
          <div className="flex gap-2 mt-6">
            {[
              { value: 7, label: '7 Days' },
              { value: 30, label: '30 Days' },
              { value: 90, label: '90 Days' }
            ].map((period) => (
              <button
                key={period.value}
                onClick={() => setDays(period.value)}
                className={`px-6 py-2.5 rounded-lg font-semibold transition-all ${
                  days === period.value
                    ? 'bg-white text-indigo-600 shadow-lg'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto max-h-[calc(90vh-200px)] bg-gray-50">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <i className="fas fa-chart-bar text-indigo-600 text-xl"></i>
                </div>
              </div>
              <p className="text-gray-600 mt-4 font-medium">Loading analytics...</p>
            </div>
          ) : analytics ? (
            <div className="space-y-8">
              {/* Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                  icon="fa-comments"
                  label="Total Conversations"
                  value={analytics.conversations.total}
                  trend="+12%"
                  color="indigo"
                />
                <MetricCard
                  icon="fa-paper-plane"
                  label="Messages Sent"
                  value={analytics.messages.total}
                  trend="+8%"
                  color="blue"
                />
                <MetricCard
                  icon="fa-percentage"
                  label="Success Rate"
                  value={analytics.messages.successRate}
                  color="green"
                />
                <MetricCard
                  icon="fa-dollar-sign"
                  label="Total Cost"
                  value={analytics.performance.estimatedCost}
                  color="purple"
                />
              </div>

              {/* Conversations Breakdown */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <i className="fas fa-users text-indigo-600"></i>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Conversation Analytics</h3>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatusCard
                    label="Active"
                    value={analytics.conversations.active}
                    icon="fa-play-circle"
                    color="green"
                  />
                  <StatusCard
                    label="Stopped"
                    value={analytics.conversations.stopped}
                    icon="fa-stop-circle"
                    color="red"
                  />
                  <StatusCard
                    label="Manual Override"
                    value={analytics.conversations.manualOverride}
                    icon="fa-hand-paper"
                    color="yellow"
                  />
                  <StatusCard
                    label="Response Rate"
                    value={analytics.conversations.responseRate}
                    icon="fa-chart-line"
                    color="blue"
                  />
                </div>
              </div>

              {/* Messages Performance */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Messages Stats */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <i className="fas fa-envelope text-blue-600"></i>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">Message Performance</h3>
                  </div>

                  <div className="space-y-4">
                    <ProgressBar
                      label="Successful"
                      value={analytics.messages.successful}
                      total={analytics.messages.total}
                      color="green"
                    />
                    <ProgressBar
                      label="Failed"
                      value={analytics.messages.failed}
                      total={analytics.messages.total}
                      color="red"
                    />
                    <div className="pt-4 border-t border-gray-100">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Avg per Conversation</span>
                        <span className="font-bold text-gray-900">{analytics.messages.avgPerConversation}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <i className="fas fa-tachometer-alt text-green-600"></i>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">Performance & Cost</h3>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <i className="fas fa-coins text-yellow-600"></i>
                        <span className="text-sm text-gray-600">Total Tokens</span>
                      </div>
                      <span className="font-bold text-gray-900">{analytics.performance.totalTokens.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <i className="fas fa-chart-line text-blue-600"></i>
                        <span className="text-sm text-gray-600">Avg Tokens/Msg</span>
                      </div>
                      <span className="font-bold text-gray-900">{analytics.performance.avgTokensPerMessage}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <i className="fas fa-clock text-purple-600"></i>
                        <span className="text-sm text-gray-600">Avg Response Time</span>
                      </div>
                      <span className="font-bold text-gray-900">{analytics.performance.avgProcessingTimeMs}ms</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Follow-up Stages */}
              {Object.keys(analytics.followupStages || {}).length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <i className="fas fa-layer-group text-purple-600"></i>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">Follow-up Stage Distribution</h3>
                  </div>

                  <div className="space-y-4">
                    {Object.entries(analytics.followupStages).map(([stage, count]) => {
                      const total = Object.values(analytics.followupStages).reduce((sum, c) => sum + c, 0)
                      const percentage = ((count / total) * 100).toFixed(1)
                      const stageColors = ['blue', 'indigo', 'purple', 'pink', 'rose']
                      const color = stageColors[parseInt(stage) % stageColors.length]

                      return (
                        <div key={stage}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">
                              {stage === '0' ? 'Initial Contact' : `Follow-up Stage ${stage}`}
                            </span>
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-gray-500">{count} conversations</span>
                              <span className="text-sm font-bold text-gray-900">{percentage}%</span>
                            </div>
                          </div>
                          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full bg-gradient-to-r from-${color}-500 to-${color}-600 rounded-full transition-all duration-500`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Date Range Footer */}
              <div className="text-center py-4 px-6 bg-white rounded-xl border border-gray-200">
                <p className="text-sm text-gray-600">
                  Showing data from{' '}
                  <span className="font-semibold text-gray-900">
                    {new Date(analytics.dateRange.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  {' '}to{' '}
                  <span className="font-semibold text-gray-900">
                    {new Date(analytics.dateRange.end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <i className="fas fa-chart-line text-gray-400 text-3xl"></i>
              </div>
              <p className="text-gray-600 font-medium">No analytics data available</p>
              <p className="text-gray-500 text-sm mt-2">Start using this scenario to see analytics</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function MetricCard({ icon, label, value, trend, color }) {
  const colors = {
    indigo: 'from-indigo-500 to-indigo-600 bg-indigo-50 text-indigo-600',
    blue: 'from-blue-500 to-blue-600 bg-blue-50 text-blue-600',
    green: 'from-green-500 to-green-600 bg-green-50 text-green-600',
    purple: 'from-purple-500 to-purple-600 bg-purple-50 text-purple-600',
  }

  const [bgGradient, bgLight, textColor] = colors[color].split(' ')

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 ${bgLight} rounded-xl flex items-center justify-center`}>
          <i className={`fas ${icon} text-xl ${textColor}`}></i>
        </div>
        {trend && (
          <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">
            {trend}
          </span>
        )}
      </div>
      <div className="text-3xl font-bold text-gray-900 mb-1">{value}</div>
      <div className="text-sm text-gray-600">{label}</div>
    </div>
  )
}

function StatusCard({ label, value, icon, color }) {
  const colors = {
    green: 'bg-green-50 text-green-600 border-green-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
  }

  return (
    <div className={`${colors[color]} border rounded-xl p-4 text-center`}>
      <i className={`fas ${icon} text-2xl mb-2`}></i>
      <div className="text-2xl font-bold mb-1">{value}</div>
      <div className="text-xs font-medium opacity-80">{label}</div>
    </div>
  )
}

function ProgressBar({ label, value, total, color }) {
  const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0

  const colors = {
    green: 'bg-green-500',
    red: 'bg-red-500',
    blue: 'bg-blue-500',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm text-gray-600">
          {value} <span className="text-gray-400">({percentage}%)</span>
        </span>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${colors[color]} rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
