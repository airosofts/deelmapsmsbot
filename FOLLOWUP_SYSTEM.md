# Follow-up System Documentation

## Overview

The follow-up system enables automated, time-based follow-up messages with separate AI prompts for each stage. It includes STOP keyword detection, business hours restrictions, manual conversation takeover, and analytics tracking.

## Features Implemented

### ✅ 1. Time-Based Follow-ups
- Configure multiple follow-up stages with separate AI prompts
- Set wait duration for each stage (hours, days, weeks)
- Maximum follow-up attempts limit
- Automatic tracking of customer vs AI last message
- Follow-ups only trigger if customer doesn't respond

### ✅ 2. STOP Keyword Detection (Compliance)
- Detects keywords: STOP, UNSUBSCRIBE, CANCEL, END, QUIT (customizable)
- Automatically stops all follow-ups for that conversation
- Sends confirmation message
- Customer can restart by replying "START"

### ✅ 3. Business Hours Restrictions
- Configure business hours per scenario (e.g., 9 AM - 6 PM)
- Set timezone (e.g., America/New_York)
- AI only responds within configured hours
- Follow-ups outside hours are rescheduled

### ✅ 4. Manual Conversation Takeover
- Toggle manual override to pause AI for specific conversations
- Add labels to conversations ("Need human", "Hot lead", etc.)
- View conversations with manual override in list
- AI automatically pauses when admin sends message (optional)

### ✅ 5. Analytics Dashboard
- Total conversations and messages
- Success rate and response rate
- Token usage and estimated costs
- Average processing time
- Follow-up stage distribution
- Stopped/active conversation counts

## Database Schema

### New Tables

#### `scenario_followup_stages`
```sql
id                  UUID PRIMARY KEY
scenario_id         UUID REFERENCES scenarios(id)
stage_number        INTEGER (1, 2, 3, etc.)
wait_duration       INTEGER (in minutes)
wait_unit           VARCHAR (for display: 'minutes', 'hours', 'days', 'weeks')
instructions        TEXT (AI prompt for this stage)
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

#### `conversation_followup_state`
```sql
id                  UUID PRIMARY KEY
conversation_id     UUID REFERENCES conversations(id)
scenario_id         UUID REFERENCES scenarios(id)
current_stage       INTEGER (0 = initial, 1+ = follow-up stages)
total_attempts      INTEGER
next_followup_at    TIMESTAMP (when next follow-up should be sent)
last_message_from   VARCHAR ('customer' or 'ai')
last_message_at     TIMESTAMP
stopped             BOOLEAN (true if STOP keyword detected)
stopped_at          TIMESTAMP
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

#### `scenario_analytics`
```sql
id                              UUID PRIMARY KEY
scenario_id                     UUID REFERENCES scenarios(id)
date                            DATE
total_conversations             INTEGER
total_messages                  INTEGER
total_followups                 INTEGER
stopped_count                   INTEGER
manual_takeover_count           INTEGER
avg_messages_per_conversation   DECIMAL
total_tokens_used               INTEGER
avg_response_time_ms            INTEGER
created_at                      TIMESTAMP
updated_at                      TIMESTAMP
```

### Updated Tables

#### `scenarios` (new columns)
```sql
enable_followups            BOOLEAN
max_followup_attempts       INTEGER
business_hours_start        TIME
business_hours_end          TIME
business_hours_timezone     VARCHAR
auto_stop_keywords          TEXT[]
enable_business_hours       BOOLEAN
```

#### `conversations` (new columns)
```sql
manual_override             BOOLEAN
labels                      TEXT[]
last_manual_message_at      TIMESTAMP
notes                       TEXT
```

#### `messages` (new columns)
```sql
is_followup                 BOOLEAN
followup_stage              INTEGER
tokens_used                 INTEGER
processing_time_ms          INTEGER
ai_model                    VARCHAR
```

## API Endpoints

### Follow-up Stage Management

#### Get Follow-up Stages
```http
GET /api/scenarios/:id/followup-stages
```

Response:
```json
{
  "success": true,
  "stages": [
    {
      "id": "uuid",
      "scenario_id": "uuid",
      "stage_number": 1,
      "wait_duration": 1440,
      "wait_unit": "days",
      "instructions": "Send a friendly follow-up asking if they're still interested"
    }
  ]
}
```

#### Create/Update Follow-up Stages
```http
POST /api/scenarios/:id/followup-stages
Content-Type: application/json

{
  "stages": [
    {
      "stage_number": 1,
      "wait_duration": 1440,
      "wait_unit": "days",
      "instructions": "First follow-up prompt..."
    },
    {
      "stage_number": 2,
      "wait_duration": 4320,
      "wait_unit": "days",
      "instructions": "Second follow-up prompt..."
    }
  ]
}
```

### Manual Override

#### Toggle Manual Override
```http
POST /api/conversations/:id/manual-override
Content-Type: application/json

{
  "enabled": true
}
```

Response:
```json
{
  "success": true,
  "manual_override": true
}
```

### Conversation Labels

#### Add Label
```http
POST /api/conversations/:id/labels
Content-Type: application/json

{
  "label": "Need human"
}
```

#### Remove Label
```http
DELETE /api/conversations/:id/labels
Content-Type: application/json

{
  "label": "Need human"
}
```

### Analytics

#### Get Scenario Analytics
```http
GET /api/scenarios/:id/analytics?days=30
```

Response:
```json
{
  "success": true,
  "analytics": {
    "scenario": {
      "id": "uuid",
      "name": "Scenario Name"
    },
    "dateRange": {
      "start": "2025-01-01T00:00:00Z",
      "end": "2025-01-30T00:00:00Z",
      "days": 30
    },
    "conversations": {
      "total": 150,
      "active": 120,
      "stopped": 30,
      "manualOverride": 5,
      "responseRate": "75.5%"
    },
    "messages": {
      "total": 450,
      "successful": 440,
      "failed": 10,
      "successRate": "97.8%",
      "avgPerConversation": "3.00"
    },
    "performance": {
      "totalTokens": 45000,
      "avgTokensPerMessage": 100,
      "avgProcessingTimeMs": 1200,
      "estimatedCost": "$4.5000"
    },
    "followupStages": {
      "0": 50,
      "1": 40,
      "2": 30,
      "3": 30
    }
  }
}
```

### Cron Job

#### Process Scheduled Follow-ups
```http
GET /api/cron/process-followups
Authorization: Bearer <CRON_SECRET>
```

This endpoint should be called every 5-15 minutes by a cron job service.

Response:
```json
{
  "success": true,
  "total": 10,
  "processed": 8,
  "skipped": 2
}
```

## Setup Instructions

### 1. Run Database Migration

```bash
# Apply the migration
psql -U your_user -d your_database -f supabase/migrations/014_add_followup_system.sql
```

### 2. Set Environment Variables

Add to your `.env.local`:

```env
# Cron job secret (generate a random string)
CRON_SECRET=your_random_secret_here

# App URL for internal API calls
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### 3. Configure Cron Job

Choose one of these options:

#### Option A: Vercel Cron (if hosted on Vercel)

Create `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/process-followups",
      "schedule": "*/10 * * * *"
    }
  ]
}
```

#### Option B: Upstash QStash

1. Sign up at https://upstash.com
2. Create a scheduled job:
   - URL: `https://your-domain.com/api/cron/process-followups`
   - Schedule: `*/10 * * * *` (every 10 minutes)
   - Header: `Authorization: Bearer your_cron_secret`

#### Option C: Cron-job.org (Free)

1. Sign up at https://cron-job.org
2. Create a cron job:
   - URL: `https://your-domain.com/api/cron/process-followups`
   - Schedule: Every 10 minutes
   - Add header: `Authorization: Bearer your_cron_secret`

### 4. Restart Your Application

```bash
npm run dev
# or in production
npm run build && npm start
```

## Usage Guide

### Creating a Scenario with Follow-ups

1. **Create/Edit Scenario** - Set basic scenario details and instructions

2. **Enable Follow-ups** - Update scenario with:
   ```json
   {
     "enable_followups": true,
     "max_followup_attempts": 3,
     "enable_business_hours": true,
     "business_hours_start": "09:00:00",
     "business_hours_end": "18:00:00",
     "business_hours_timezone": "America/New_York",
     "auto_stop_keywords": ["STOP", "UNSUBSCRIBE", "CANCEL"]
   }
   ```

3. **Configure Follow-up Stages**:
   ```json
   {
     "stages": [
       {
         "stage_number": 1,
         "wait_duration": 1440,
         "wait_unit": "days",
         "instructions": "It's been a day since your last message. Ask if they're still interested in the property."
       },
       {
         "stage_number": 2,
         "wait_duration": 4320,
         "wait_unit": "days",
         "instructions": "It's been 3 days. Offer additional information or a special incentive."
       },
       {
         "stage_number": 3,
         "wait_duration": 10080,
         "wait_unit": "weeks",
         "instructions": "Final follow-up after 1 week. Politely ask if they'd like to be contacted in the future."
       }
     ]
   }
   ```

### How It Works

1. **Initial Message**: Customer sends a message → AI responds immediately (if within business hours and no manual override)

2. **Follow-up Scheduling**: After AI responds, next follow-up is scheduled based on stage 1 wait duration

3. **Customer Responds**: If customer replies, follow-up is cancelled and rescheduled after AI's next response

4. **Follow-up Triggers**: After wait duration passes, cron job sends follow-up using that stage's instructions

5. **STOP Keywords**: If customer sends "STOP", all follow-ups are cancelled and confirmation is sent

6. **Manual Override**: Admin can pause AI at any time and take over the conversation

### Example Scenario

**Real Estate Lead Follow-up**:
- Initial Instructions: "You are a helpful real estate assistant. Answer questions about properties."
- Stage 1 (1 day): "Follow up asking if they'd like to schedule a viewing"
- Stage 2 (3 days): "Offer additional property options that might interest them"
- Stage 3 (1 week): "Final check-in, offer to keep them informed of new listings"

## Frontend Integration

### Display Follow-up Status

```javascript
// Fetch follow-up state for a conversation
const response = await fetch(`/api/conversations/${conversationId}`)
const data = await response.json()

const followupState = data.followup_state
console.log('Current stage:', followupState.current_stage)
console.log('Next follow-up at:', followupState.next_followup_at)
console.log('Stopped:', followupState.stopped)
```

### Toggle Manual Override

```javascript
async function toggleManualOverride(conversationId, enabled) {
  const response = await fetch(`/api/conversations/${conversationId}/manual-override`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled })
  })
  return response.json()
}
```

### Add Label

```javascript
async function addLabel(conversationId, label) {
  const response = await fetch(`/api/conversations/${conversationId}/labels`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ label })
  })
  return response.json()
}
```

### View Analytics

```javascript
async function getAnalytics(scenarioId, days = 30) {
  const response = await fetch(`/api/scenarios/${scenarioId}/analytics?days=${days}`)
  return response.json()
}
```

## Monitoring & Troubleshooting

### Check Cron Job Logs

Monitor the cron job endpoint to ensure it's processing follow-ups:

```bash
# Check logs for cron execution
grep "Processing scheduled follow-ups" logs/app.log

# Check for errors
grep "Error processing scheduled follow-ups" logs/app.log
```

### Common Issues

1. **Follow-ups not sending**:
   - Verify cron job is running (check logs)
   - Check `next_followup_at` in database
   - Ensure business hours are configured correctly
   - Verify conversation doesn't have `manual_override = true`

2. **STOP keyword not working**:
   - Check `auto_stop_keywords` array in scenario
   - Verify keyword is in uppercase in the array
   - Check `stopped` field in `conversation_followup_state`

3. **Analytics not updating**:
   - Analytics are calculated in real-time from database
   - Check that messages have `tokens_used` and `processing_time_ms` fields

## Best Practices

1. **Follow-up Timing**: Don't make wait durations too short. Recommended:
   - First follow-up: 1-2 days
   - Second follow-up: 3-5 days
   - Final follow-up: 7-14 days

2. **Instructions**: Make each stage's instructions progressively more valuable:
   - Stage 1: Simple check-in
   - Stage 2: Offer additional value/information
   - Stage 3: Final value proposition or opt-out offer

3. **Business Hours**: Always enable business hours to avoid annoying customers with late-night messages

4. **Max Attempts**: Keep to 3-4 attempts maximum to avoid being spammy

5. **STOP Keywords**: Always respect STOP keywords immediately

6. **Manual Override**: Use labels to track conversations that need human attention

## Future Enhancements

Potential additions (not yet implemented):

- A/B testing for follow-up messages
- Dynamic wait durations based on customer engagement
- Integration with CRM systems
- Custom STOP keyword responses per scenario
- Follow-up message templates
- Smart send time optimization
- Conversation health scores
- Auto-pause on negative sentiment detection
