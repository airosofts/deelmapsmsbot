# UI Integration Guide for Follow-up System

## Step 1: Add Imports (Line 1-5)

Replace:
```javascript
'use client'

import { useState, useEffect } from 'react'
import { apiGet, apiPost } from '@/lib/api-client'
import { getCurrentUser } from '@/lib/auth'
```

With:
```javascript
'use client'

import { useState, useEffect } from 'react'
import { apiGet, apiPost } from '@/lib/api-client'
import { getCurrentUser } from '@/lib/auth'
import FollowupSettings from '@/components/scenarios/FollowupSettings'
import FollowupStagesModal from '@/components/scenarios/FollowupStagesModal'
import AnalyticsModal from '@/components/scenarios/AnalyticsModal'
```

## Step 2: Add State for New Modals (Line 7-16)

Add these two new state variables after line 16:
```javascript
const [showFollowupStagesModal, setShowFollowupStagesModal] = useState(false)
const [selectedScenarioForFollowup, setSelectedScenarioForFollowup] = useState(null)
const [showAnalyticsModal, setShowAnalyticsModal] = useState(false)
const [selectedScenarioForAnalytics, setSelectedScenarioForAnalytics] = useState(null)
```

## Step 3: Update ScenarioCard Component (Line 243-327)

Add these two new buttons inside the actions div (after the "Logs" button, around line 308):

```javascript
{/* Add after the "Logs" button */}
{scenario.enable_followups && (
  <button
    onClick={() => {
      setSelectedScenarioForFollowup(scenario)
      setShowFollowupStagesModal(true)
    }}
    className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg font-medium hover:bg-purple-200 transition-colors"
  >
    <i className="fas fa-layer-group mr-2"></i>
    Manage Follow-ups
  </button>
)}
<button
  onClick={() => {
    setSelectedScenarioForAnalytics(scenario)
    setShowAnalyticsModal(true)
  }}
  className="px-4 py-2 bg-pink-100 text-pink-700 rounded-lg font-medium hover:bg-pink-200 transition-colors"
>
  <i className="fas fa-chart-line mr-2"></i>
  Analytics
</button>
```

Also add a follow-up indicator badge after the contactCount check (around line 287):

```javascript
{contactCount > 0 && (
  <div className="flex items-center gap-2 text-gray-600">
    <i className="fas fa-filter text-[#C54A3F]"></i>
    <span>Restricted to {contactCount} specific {contactCount === 1 ? 'sender' : 'senders'}</span>
  </div>
)}
{/* ADD THIS: */}
{scenario.enable_followups && (
  <div className="flex items-center gap-2 text-blue-600">
    <i className="fas fa-clock text-blue-600"></i>
    <span>Follow-ups enabled (max {scenario.max_followup_attempts || 3} attempts)</span>
  </div>
)}
```

## Step 4: Update CreateScenarioModal - Add Follow-up Settings

In the CreateScenarioModal function, update the initial formData state (around line 330-338):

```javascript
const [formData, setFormData] = useState({
  name: '',
  description: '',
  instructions: '',
  phoneNumbers: [],
  contactRestrictionType: 'none',
  selectedContactLists: [],
  manualPhoneNumbers: '',
  // ADD THESE:
  enable_followups: false,
  max_followup_attempts: 3,
  enable_business_hours: false,
  business_hours_start: '09:00',
  business_hours_end: '18:00',
  business_hours_timezone: 'America/New_York',
  auto_stop_keywords: ['STOP', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT']
})
```

Add the FollowupSettings component BEFORE the "Contact Restrictions" section (around line 506):

```javascript
{/* Phone Numbers section ends here */}

{/* ADD THIS: */}
<FollowupSettings formData={formData} setFormData={setFormData} />

{/* Contact Restrictions section starts here */}
<div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
```

Update the handleSubmit function to include follow-up fields (around line 387-393):

```javascript
const response = await apiPost('/api/scenarios', {
  name: formData.name,
  description: formData.description,
  instructions: formData.instructions,
  phoneNumbers: formData.phoneNumbers,
  contacts: contactsToSend,
  // ADD THESE:
  enable_followups: formData.enable_followups,
  max_followup_attempts: formData.max_followup_attempts,
  enable_business_hours: formData.enable_business_hours,
  business_hours_start: formData.business_hours_start,
  business_hours_end: formData.business_hours_end,
  business_hours_timezone: formData.business_hours_timezone,
  auto_stop_keywords: formData.auto_stop_keywords
})
```

## Step 5: Update EditScenarioModal - Add Follow-up Settings

Update the initial formData state (around line 635-643):

```javascript
const [formData, setFormData] = useState({
  name: scenario.name,
  description: scenario.description || '',
  instructions: scenario.instructions,
  phoneNumbers: scenario.scenario_phone_numbers?.map(spn => spn.phone_number_id) || [],
  contactRestrictionType: scenario.scenario_contacts?.length > 0 ? 'manual' : 'none',
  selectedContactLists: [],
  manualPhoneNumbers: scenario.scenario_contacts?.map(sc => sc.recipient_phone).join('\n') || '',
  // ADD THESE:
  enable_followups: scenario.enable_followups || false,
  max_followup_attempts: scenario.max_followup_attempts || 3,
  enable_business_hours: scenario.enable_business_hours || false,
  business_hours_start: scenario.business_hours_start?.substring(0, 5) || '09:00',
  business_hours_end: scenario.business_hours_end?.substring(0, 5) || '18:00',
  business_hours_timezone: scenario.business_hours_timezone || 'America/New_York',
  auto_stop_keywords: scenario.auto_stop_keywords || ['STOP', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT']
})
```

Add the FollowupSettings component (same location as in CreateScenarioModal, before Contact Restrictions):

```javascript
{/* ADD THIS before Contact Restrictions: */}
<FollowupSettings formData={formData} setFormData={setFormData} />
```

Update the handleSubmit to include follow-up fields (around line 705-711):

```javascript
body: JSON.stringify({
  name: formData.name,
  description: formData.description,
  instructions: formData.instructions,
  phoneNumbers: formData.phoneNumbers,
  contacts: contactsToSend,
  // ADD THESE:
  enable_followups: formData.enable_followups,
  max_followup_attempts: formData.max_followup_attempts,
  enable_business_hours: formData.enable_business_hours,
  business_hours_start: formData.business_hours_start,
  business_hours_end: formData.business_hours_end,
  business_hours_timezone: formData.business_hours_timezone,
  auto_stop_keywords: formData.auto_stop_keywords
})
```

## Step 6: Add Follow-up Stages and Analytics Modals at the End

Add these two modals after the ExecutionsModal (around line 238, after the ExecutionsModal closing tag):

```javascript
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

      {/* ADD THESE TWO MODALS: */}
      {/* Follow-up Stages Modal */}
      {showFollowupStagesModal && selectedScenarioForFollowup && (
        <FollowupStagesModal
          scenario={selectedScenarioForFollowup}
          onClose={() => {
            setShowFollowupStagesModal(false)
            setSelectedScenarioForFollowup(null)
          }}
          onSuccess={() => {
            fetchScenarios()
          }}
        />
      )}

      {/* Analytics Modal */}
      {showAnalyticsModal && selectedScenarioForAnalytics && (
        <AnalyticsModal
          scenario={selectedScenarioForAnalytics}
          onClose={() => {
            setShowAnalyticsModal(false)
            setSelectedScenarioForAnalytics(null)
          }}
        />
      )}
    </div>
  )
}
```

## All Changes Summary

The changes enable:

1. **Follow-up Settings UI** - Toggle, max attempts, business hours, STOP keywords
2. **Manage Follow-ups Button** - Opens modal to configure multi-stage follow-ups (only shows if follow-ups are enabled)
3. **Analytics Button** - Shows performance metrics and statistics
4. **Follow-up Indicator** - Badge showing follow-ups are enabled on scenario cards

## Quick Implementation Steps

1. Copy the 3 component files already created:
   - `/src/components/scenarios/FollowupSettings.js` ✅
   - `/src/components/scenarios/FollowupStagesModal.js` ✅
   - `/src/components/scenarios/AnalyticsModal.js` ✅

2. Apply the changes above to `/src/app/(dashboard)/scenarios/page.js`

3. Restart your dev server:
```bash
npm run dev
```

4. Test the UI:
   - Create a new scenario → See follow-up settings section
   - Enable follow-ups → Configure business hours and keywords
   - Edit scenario → Add follow-up stages via "Manage Follow-ups" button
   - View analytics → Click "Analytics" button on scenario card

## Screenshots of What You'll See

### Create/Edit Scenario Modal
- New section: "Follow-up Settings" (blue gradient box)
- Toggle to enable follow-ups
- Max attempts input
- Business hours toggle with time pickers
- STOP keywords input

### Scenario Card
- Blue badge: "Follow-ups enabled (max 3 attempts)"
- Purple button: "Manage Follow-ups" (only if enabled)
- Pink button: "Analytics"

### Follow-up Stages Modal
- Add/edit multiple follow-up stages
- Each stage has: wait duration, wait unit, AI instructions
- Visual stage numbers (1, 2, 3...)

### Analytics Modal
- Conversation stats (total, active, stopped, manual override)
- Message stats (total, successful, failed, avg per conv)
- Performance (tokens, processing time, cost)
- Follow-up stage distribution chart
