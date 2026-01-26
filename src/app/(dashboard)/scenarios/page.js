'use client'

import { useState, useEffect } from 'react'
import { apiGet, apiPost } from '@/lib/api-client'

export default function ScenariosPage() {
  const [scenarios, setScenarios] = useState([])
  const [phoneNumbers, setPhoneNumbers] = useState([])
  const [contactLists, setContactLists] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingScenario, setEditingScenario] = useState(null)
  const [showExecutionsModal, setShowExecutionsModal] = useState(false)
  const [selectedScenarioExecutions, setSelectedScenarioExecutions] = useState(null)

  useEffect(() => {
    fetchScenarios()
    fetchPhoneNumbers()
    fetchContactLists()
  }, [])

  const fetchScenarios = async () => {
    try {
      const response = await apiGet('/api/scenarios')
      const data = await response.json()
      if (data.success) {
        setScenarios(data.scenarios || [])
      }
    } catch (error) {
      console.error('Error fetching scenarios:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPhoneNumbers = async () => {
    try {
      const response = await apiGet('/api/phone-numbers')
      const data = await response.json()
      if (data.success) {
        setPhoneNumbers(data.phoneNumbers || [])
      }
    } catch (error) {
      console.error('Error fetching phone numbers:', error)
    }
  }

  const fetchContactLists = async () => {
    try {
      const response = await apiGet('/api/contact-lists')
      const data = await response.json()
      if (data.success) {
        setContactLists(data.contactLists || [])
      }
    } catch (error) {
      console.error('Error fetching contact lists:', error)
    }
  }

  const handleDeleteScenario = async (scenarioId) => {
    if (!confirm('Are you sure you want to delete this scenario?')) return

    try {
      const response = await fetch(`/api/scenarios/${scenarioId}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': localStorage.getItem('userId'),
          'x-workspace-id': localStorage.getItem('workspaceId')
        }
      })

      const data = await response.json()
      if (data.success) {
        setScenarios(scenarios.filter(s => s.id !== scenarioId))
      } else {
        alert('Failed to delete scenario')
      }
    } catch (error) {
      console.error('Error deleting scenario:', error)
      alert('Error deleting scenario')
    }
  }

  const handleToggleActive = async (scenario) => {
    try {
      const response = await fetch(`/api/scenarios/${scenario.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': localStorage.getItem('userId'),
          'x-workspace-id': localStorage.getItem('workspaceId')
        },
        body: JSON.stringify({
          is_active: !scenario.is_active
        })
      })

      const data = await response.json()
      if (data.success) {
        fetchScenarios()
      }
    } catch (error) {
      console.error('Error toggling scenario:', error)
    }
  }

  const viewExecutions = async (scenario) => {
    try {
      const response = await apiGet(`/api/scenarios/${scenario.id}/executions?limit=50`)
      const data = await response.json()
      if (data.success) {
        setSelectedScenarioExecutions({
          scenario,
          executions: data.executions || []
        })
        setShowExecutionsModal(true)
      }
    } catch (error) {
      console.error('Error fetching executions:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <i className="fas fa-robot text-[#C54A3F]"></i>
                AI Scenarios
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Automate SMS conversations with AI-powered responses
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-[#C54A3F] to-[#B73E34] text-white rounded-lg font-semibold hover:from-[#B73E34] hover:to-[#A53329] transition-all shadow-md hover:shadow-lg flex items-center gap-2"
            >
              <i className="fas fa-plus"></i>
              Create Scenario
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#C54A3F]"></div>
            <p className="text-gray-600 mt-4">Loading scenarios...</p>
          </div>
        ) : scenarios.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-robot text-gray-400 text-3xl"></i>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No scenarios yet</h3>
            <p className="text-gray-600 mb-6">Create your first AI scenario to automate SMS conversations</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-[#C54A3F] to-[#B73E34] text-white rounded-lg font-semibold hover:from-[#B73E34] hover:to-[#A53329] transition-all"
            >
              Create Your First Scenario
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {scenarios.map((scenario) => (
              <ScenarioCard
                key={scenario.id}
                scenario={scenario}
                onEdit={(s) => {
                  setEditingScenario(s)
                  setShowEditModal(true)
                }}
                onDelete={handleDeleteScenario}
                onToggleActive={handleToggleActive}
                onViewExecutions={viewExecutions}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateScenarioModal
          phoneNumbers={phoneNumbers}
          contactLists={contactLists}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            fetchScenarios()
          }}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && editingScenario && (
        <EditScenarioModal
          scenario={editingScenario}
          phoneNumbers={phoneNumbers}
          contactLists={contactLists}
          onClose={() => {
            setShowEditModal(false)
            setEditingScenario(null)
          }}
          onSuccess={() => {
            setShowEditModal(false)
            setEditingScenario(null)
            fetchScenarios()
          }}
        />
      )}

      {/* Executions Modal */}
      {showExecutionsModal && selectedScenarioExecutions && (
        <ExecutionsModal
          data={selectedScenarioExecutions}
          onClose={() => {
            setShowExecutionsModal(false)
            setSelectedScenarioExecutions(null)
          }}
        />
      )}
    </div>
  )
}

function ScenarioCard({ scenario, onEdit, onDelete, onToggleActive, onViewExecutions }) {
  const phoneCount = scenario.scenario_phone_numbers?.length || 0
  const contactCount = scenario.scenario_contacts?.length || 0

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-xl font-bold text-gray-900">{scenario.name}</h3>
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  scenario.is_active
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {scenario.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            {scenario.description && (
              <p className="text-sm text-gray-600">{scenario.description}</p>
            )}
          </div>
        </div>

        {/* Instructions Preview */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <p className="text-sm text-gray-700 line-clamp-3">{scenario.instructions}</p>
        </div>

        {/* Assignments */}
        <div className="space-y-2 mb-4 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <i className="fas fa-phone text-[#C54A3F]"></i>
            <span>{phoneCount} phone {phoneCount === 1 ? 'number' : 'numbers'} assigned</span>
          </div>
          {contactCount > 0 && (
            <div className="flex items-center gap-2 text-gray-600">
              <i className="fas fa-filter text-[#C54A3F]"></i>
              <span>Restricted to {contactCount} specific {contactCount === 1 ? 'sender' : 'senders'}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onToggleActive(scenario)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              scenario.is_active
                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            {scenario.is_active ? 'Deactivate' : 'Activate'}
          </button>
          <button
            onClick={() => onViewExecutions(scenario)}
            className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-medium hover:bg-blue-200 transition-colors"
          >
            <i className="fas fa-history mr-2"></i>
            Logs
          </button>
          <button
            onClick={() => onEdit(scenario)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            <i className="fas fa-edit mr-2"></i>
            Edit
          </button>
          <button
            onClick={() => onDelete(scenario.id)}
            className="px-4 py-2 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 transition-colors"
          >
            <i className="fas fa-trash mr-2"></i>
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

function CreateScenarioModal({ phoneNumbers, contactLists, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    instructions: '',
    phoneNumbers: [],
    contactRestrictionType: 'none', // 'none', 'contact_lists', 'manual'
    selectedContactLists: [],
    manualPhoneNumbers: ''
  })
  const [loading, setLoading] = useState(false)
  const [contacts, setContacts] = useState([])

  // Fetch contacts when contact lists are selected
  useEffect(() => {
    if (formData.selectedContactLists.length > 0) {
      fetchContactsFromLists()
    } else {
      setContacts([])
    }
  }, [formData.selectedContactLists])

  const fetchContactsFromLists = async () => {
    try {
      const response = await apiGet('/api/contacts')
      const data = await response.json()
      if (data.success) {
        const filtered = data.contacts.filter(c =>
          formData.selectedContactLists.includes(c.contact_list_id)
        )
        setContacts(filtered)
      }
    } catch (error) {
      console.error('Error fetching contacts:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Build contacts array based on restriction type
      let contactsToSend = []

      if (formData.contactRestrictionType === 'contact_lists' && contacts.length > 0) {
        contactsToSend = contacts.map(c => ({
          phone: c.phone_number,
          id: c.id
        }))
      } else if (formData.contactRestrictionType === 'manual' && formData.manualPhoneNumbers) {
        const phones = formData.manualPhoneNumbers
          .split(/[\n,]/)
          .map(p => p.trim())
          .filter(p => p.length > 0)
        contactsToSend = phones.map(phone => ({ phone, id: null }))
      }

      const response = await apiPost('/api/scenarios', {
        name: formData.name,
        description: formData.description,
        instructions: formData.instructions,
        phoneNumbers: formData.phoneNumbers,
        contacts: contactsToSend
      })

      const data = await response.json()

      if (data.success) {
        onSuccess()
      } else {
        alert('Failed to create scenario: ' + (data.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error creating scenario:', error)
      alert('Error creating scenario')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Create New Scenario</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Scenario Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C54A3F] focus:border-transparent"
              placeholder="e.g., Real Estate Agent Bot"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Description
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C54A3F] focus:border-transparent"
              placeholder="Brief description of what this scenario does"
            />
          </div>

          {/* Instructions */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              AI Instructions *
            </label>
            <textarea
              value={formData.instructions}
              onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C54A3F] focus:border-transparent"
              rows="8"
              placeholder="Example: You are a professional real estate agent. When someone contacts you, greet them warmly and ask how you can help. Keep responses concise and professional. If they ask about properties, provide helpful information. Once the conversation is complete, return exactly: STOP_SCENARIO"
              required
            />
            <p className="text-xs text-gray-500 mt-2">
              Tip: Use "STOP_SCENARIO" in your instructions to tell the AI when to stop responding
            </p>
          </div>

          {/* Phone Numbers */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Assign to Your Phone Numbers (Recipients) *
            </label>
            <div className="border border-gray-300 rounded-lg p-4 max-h-48 overflow-y-auto">
              {phoneNumbers.length === 0 ? (
                <p className="text-sm text-gray-500">No phone numbers available</p>
              ) : (
                phoneNumbers.map((phone) => (
                  <label key={phone.id} className="flex items-center gap-3 py-2 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.phoneNumbers.includes(phone.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            phoneNumbers: [...formData.phoneNumbers, phone.id]
                          })
                        } else {
                          setFormData({
                            ...formData,
                            phoneNumbers: formData.phoneNumbers.filter(id => id !== phone.id)
                          })
                        }
                      }}
                      className="w-4 h-4 text-[#C54A3F] rounded focus:ring-[#C54A3F]"
                    />
                    <span className="text-sm text-gray-700">
                      {phone.custom_name || phone.phone_number}
                    </span>
                  </label>
                ))
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              This scenario will trigger when SMS is received on these numbers
            </p>
          </div>

          {/* Contact Restrictions */}
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Restrict to Specific Senders (Optional)
            </label>

            <div className="space-y-3 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="none"
                  checked={formData.contactRestrictionType === 'none'}
                  onChange={(e) => setFormData({ ...formData, contactRestrictionType: e.target.value })}
                  className="w-4 h-4 text-[#C54A3F] focus:ring-[#C54A3F]"
                />
                <span className="text-sm text-gray-700">No restrictions - Apply to all senders</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="contact_lists"
                  checked={formData.contactRestrictionType === 'contact_lists'}
                  onChange={(e) => setFormData({ ...formData, contactRestrictionType: e.target.value })}
                  className="w-4 h-4 text-[#C54A3F] focus:ring-[#C54A3F]"
                />
                <span className="text-sm text-gray-700">Select from Contact Lists</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="manual"
                  checked={formData.contactRestrictionType === 'manual'}
                  onChange={(e) => setFormData({ ...formData, contactRestrictionType: e.target.value })}
                  className="w-4 h-4 text-[#C54A3F] focus:ring-[#C54A3F]"
                />
                <span className="text-sm text-gray-700">Enter phone numbers manually</span>
              </label>
            </div>

            {/* Contact Lists Selection */}
            {formData.contactRestrictionType === 'contact_lists' && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Contact Lists
                </label>
                <div className="border border-gray-300 rounded-lg p-3 max-h-40 overflow-y-auto bg-white">
                  {contactLists.length === 0 ? (
                    <p className="text-sm text-gray-500">No contact lists available</p>
                  ) : (
                    contactLists.map((list) => (
                      <label key={list.id} className="flex items-center gap-3 py-2 hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.selectedContactLists.includes(list.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                selectedContactLists: [...formData.selectedContactLists, list.id]
                              })
                            } else {
                              setFormData({
                                ...formData,
                                selectedContactLists: formData.selectedContactLists.filter(id => id !== list.id)
                              })
                            }
                          }}
                          className="w-4 h-4 text-[#C54A3F] rounded focus:ring-[#C54A3F]"
                        />
                        <span className="text-sm text-gray-700">{list.name}</span>
                      </label>
                    ))
                  )}
                </div>
                {contacts.length > 0 && (
                  <p className="text-xs text-gray-500 mt-2">
                    {contacts.length} contact{contacts.length !== 1 ? 's' : ''} selected from lists
                  </p>
                )}
              </div>
            )}

            {/* Manual Phone Numbers */}
            {formData.contactRestrictionType === 'manual' && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter Phone Numbers
                </label>
                <textarea
                  value={formData.manualPhoneNumbers}
                  onChange={(e) => setFormData({ ...formData, manualPhoneNumbers: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C54A3F] focus:border-transparent"
                  rows="5"
                  placeholder="+12223334444&#10;+13334445555&#10;+14445556666"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Enter one phone number per line in format: +12223334444
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-[#C54A3F] to-[#B73E34] text-white rounded-lg font-semibold hover:from-[#B73E34] hover:to-[#A53329] transition-all disabled:opacity-50"
              disabled={loading || formData.phoneNumbers.length === 0}
            >
              {loading ? 'Creating...' : 'Create Scenario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function EditScenarioModal({ scenario, phoneNumbers, contactLists, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: scenario.name,
    description: scenario.description || '',
    instructions: scenario.instructions,
    phoneNumbers: scenario.scenario_phone_numbers?.map(spn => spn.phone_number_id) || [],
    contactRestrictionType: scenario.scenario_contacts?.length > 0 ? 'manual' : 'none',
    selectedContactLists: [],
    manualPhoneNumbers: scenario.scenario_contacts?.map(sc => sc.recipient_phone).join('\n') || ''
  })
  const [loading, setLoading] = useState(false)
  const [contacts, setContacts] = useState([])

  useEffect(() => {
    if (formData.selectedContactLists.length > 0) {
      fetchContactsFromLists()
    } else {
      setContacts([])
    }
  }, [formData.selectedContactLists])

  const fetchContactsFromLists = async () => {
    try {
      const response = await apiGet('/api/contacts')
      const data = await response.json()
      if (data.success) {
        const filtered = data.contacts.filter(c =>
          formData.selectedContactLists.includes(c.contact_list_id)
        )
        setContacts(filtered)
      }
    } catch (error) {
      console.error('Error fetching contacts:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      let contactsToSend = []

      if (formData.contactRestrictionType === 'contact_lists' && contacts.length > 0) {
        contactsToSend = contacts.map(c => ({
          phone: c.phone_number,
          id: c.id
        }))
      } else if (formData.contactRestrictionType === 'manual' && formData.manualPhoneNumbers) {
        const phones = formData.manualPhoneNumbers
          .split(/[\n,]/)
          .map(p => p.trim())
          .filter(p => p.length > 0)
        contactsToSend = phones.map(phone => ({ phone, id: null }))
      }

      const response = await fetch(`/api/scenarios/${scenario.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': localStorage.getItem('userId'),
          'x-workspace-id': localStorage.getItem('workspaceId')
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          instructions: formData.instructions,
          phoneNumbers: formData.phoneNumbers,
          contacts: contactsToSend
        })
      })

      const data = await response.json()

      if (data.success) {
        onSuccess()
      } else {
        alert('Failed to update scenario: ' + (data.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error updating scenario:', error)
      alert('Error updating scenario')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Edit Scenario</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Same form fields as CreateScenarioModal */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Scenario Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C54A3F] focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Description
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C54A3F] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              AI Instructions *
            </label>
            <textarea
              value={formData.instructions}
              onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C54A3F] focus:border-transparent"
              rows="8"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Assign to Your Phone Numbers *
            </label>
            <div className="border border-gray-300 rounded-lg p-4 max-h-48 overflow-y-auto">
              {phoneNumbers.map((phone) => (
                <label key={phone.id} className="flex items-center gap-3 py-2 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.phoneNumbers.includes(phone.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({
                          ...formData,
                          phoneNumbers: [...formData.phoneNumbers, phone.id]
                        })
                      } else {
                        setFormData({
                          ...formData,
                          phoneNumbers: formData.phoneNumbers.filter(id => id !== phone.id)
                        })
                      }
                    }}
                    className="w-4 h-4 text-[#C54A3F] rounded focus:ring-[#C54A3F]"
                  />
                  <span className="text-sm text-gray-700">
                    {phone.custom_name || phone.phone_number}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Contact Restrictions */}
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Restrict to Specific Senders (Optional)
            </label>

            <div className="space-y-3 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="none"
                  checked={formData.contactRestrictionType === 'none'}
                  onChange={(e) => setFormData({ ...formData, contactRestrictionType: e.target.value })}
                  className="w-4 h-4 text-[#C54A3F] focus:ring-[#C54A3F]"
                />
                <span className="text-sm text-gray-700">No restrictions - Apply to all senders</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="contact_lists"
                  checked={formData.contactRestrictionType === 'contact_lists'}
                  onChange={(e) => setFormData({ ...formData, contactRestrictionType: e.target.value })}
                  className="w-4 h-4 text-[#C54A3F] focus:ring-[#C54A3F]"
                />
                <span className="text-sm text-gray-700">Select from Contact Lists</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="manual"
                  checked={formData.contactRestrictionType === 'manual'}
                  onChange={(e) => setFormData({ ...formData, contactRestrictionType: e.target.value })}
                  className="w-4 h-4 text-[#C54A3F] focus:ring-[#C54A3F]"
                />
                <span className="text-sm text-gray-700">Enter phone numbers manually</span>
              </label>
            </div>

            {formData.contactRestrictionType === 'contact_lists' && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Contact Lists
                </label>
                <div className="border border-gray-300 rounded-lg p-3 max-h-40 overflow-y-auto bg-white">
                  {contactLists.map((list) => (
                    <label key={list.id} className="flex items-center gap-3 py-2 hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.selectedContactLists.includes(list.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              selectedContactLists: [...formData.selectedContactLists, list.id]
                            })
                          } else {
                            setFormData({
                              ...formData,
                              selectedContactLists: formData.selectedContactLists.filter(id => id !== list.id)
                            })
                          }
                        }}
                        className="w-4 h-4 text-[#C54A3F] rounded focus:ring-[#C54A3F]"
                      />
                      <span className="text-sm text-gray-700">{list.name}</span>
                    </label>
                  ))}
                </div>
                {contacts.length > 0 && (
                  <p className="text-xs text-gray-500 mt-2">
                    {contacts.length} contact{contacts.length !== 1 ? 's' : ''} selected
                  </p>
                )}
              </div>
            )}

            {formData.contactRestrictionType === 'manual' && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter Phone Numbers
                </label>
                <textarea
                  value={formData.manualPhoneNumbers}
                  onChange={(e) => setFormData({ ...formData, manualPhoneNumbers: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C54A3F] focus:border-transparent"
                  rows="5"
                  placeholder="+12223334444&#10;+13334445555&#10;+14445556666"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Enter one phone number per line in format: +12223334444
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-[#C54A3F] to-[#B73E34] text-white rounded-lg font-semibold hover:from-[#B73E34] hover:to-[#A53329] transition-all disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Update Scenario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ExecutionsModal({ data, onClose }) {
  const { scenario, executions } = data

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Execution Logs</h2>
              <p className="text-sm text-gray-600 mt-1">{scenario.name}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>
        </div>

        <div className="p-6">
          {executions.length === 0 ? (
            <div className="text-center py-12">
              <i className="fas fa-inbox text-gray-300 text-4xl mb-4"></i>
              <p className="text-gray-600">No executions yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {executions.map((execution) => (
                <ExecutionCard key={execution.id} execution={execution} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ExecutionCard({ execution }) {
  const [expanded, setExpanded] = useState(false)

  const statusColors = {
    success: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    processing: 'bg-blue-100 text-blue-700',
    no_reply: 'bg-gray-100 text-gray-700',
    skipped: 'bg-yellow-100 text-yellow-700'
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[execution.execution_status]}`}>
              {execution.execution_status}
            </span>
            {execution.reply_sent && (
              <span className="text-xs text-green-600">
                <i className="fas fa-check-circle mr-1"></i>
                Reply sent
              </span>
            )}
            <span className="text-xs text-gray-500">
              {new Date(execution.created_at).toLocaleString()}
            </span>
          </div>
          <div className="text-sm text-gray-600">
            <span className="font-medium">From:</span> {execution.sender_number} →
            <span className="font-medium ml-2">To:</span> {execution.recipient_number}
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-gray-400 hover:text-gray-600"
        >
          <i className={`fas fa-chevron-${expanded ? 'up' : 'down'}`}></i>
        </button>
      </div>

      {expanded && (
        <div className="space-y-3 pt-3 border-t border-gray-200">
          {execution.ai_response && (
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-1">AI Response:</p>
              <div className="bg-blue-50 rounded p-3 text-sm text-gray-700">
                {execution.ai_response}
              </div>
            </div>
          )}

          {execution.error_message && (
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-1">Error:</p>
              <div className="bg-red-50 rounded p-3 text-sm text-red-700">
                {execution.error_message}
              </div>
            </div>
          )}

          <div className="flex items-center gap-4 text-xs text-gray-500">
            {execution.processing_time_ms && (
              <span>
                <i className="fas fa-clock mr-1"></i>
                {execution.processing_time_ms}ms
              </span>
            )}
            {execution.tokens_used && (
              <span>
                <i className="fas fa-coins mr-1"></i>
                {execution.tokens_used} tokens
              </span>
            )}
            {execution.ai_model && (
              <span>
                <i className="fas fa-brain mr-1"></i>
                {execution.ai_model}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
