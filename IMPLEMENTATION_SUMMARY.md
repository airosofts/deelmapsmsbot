# Follow-up System Implementation Summary

## ✅ Completed Features

All requested features have been implemented:

1. ✅ **Follow-up System** - Time-based follow-ups with separate prompts for each stage
2. ✅ **STOP Keyword Detection** - Compliance feature to stop automated messages
3. ✅ **Business Hours Restrictions** - Only send messages during configured hours
4. ✅ **Basic Analytics** - Success rate, cost tracking, token usage
5. ✅ **Manual Conversation Takeover** - Pause AI and add labels to conversations

## Files Created

### Database Migration
- `supabase/migrations/014_add_followup_system.sql`
  - Adds follow-up configuration to `scenarios` table
  - Creates `scenario_followup_stages` table
  - Creates `conversation_followup_state` table
  - Creates `scenario_analytics` table
  - Adds manual override and labels to `conversations` table
  - Adds tracking fields to `messages` table
  - **Important**: Run this migration to update your database schema

### Core Services
- `src/lib/followup-service.js`
  - `containsStopKeyword()` - Detects STOP keywords in messages
  - `isWithinBusinessHours()` - Check if current time is within business hours
  - `updateFollowupState()` - Track who sent last message (customer/AI)
  - `scheduleNextFollowup()` - Calculate and schedule next follow-up time
  - `processScheduledFollowups()` - Process all due follow-ups (called by cron)
  - `stopFollowups()` - Stop follow-ups when STOP keyword detected
  - `toggleManualOverride()` - Pause/resume AI for a conversation
  - `addConversationLabel()` / `removeConversationLabel()` - Manage conversation labels

### API Endpoints

#### Cron Job
- `src/app/api/cron/process-followups/route.js`
  - GET/POST endpoint to process scheduled follow-ups
  - Should be called every 5-15 minutes by a cron service
  - Requires `Authorization: Bearer <CRON_SECRET>` header

#### Follow-up Stage Management
- `src/app/api/scenarios/[id]/followup-stages/route.js`
  - GET - Fetch all follow-up stages for a scenario
  - POST - Create/update follow-up stages

#### Manual Override
- `src/app/api/conversations/[id]/manual-override/route.js`
  - POST - Toggle manual override (pause/resume AI)

#### Labels
- `src/app/api/conversations/[id]/labels/route.js`
  - POST - Add label to conversation
  - DELETE - Remove label from conversation

#### Analytics
- `src/app/api/scenarios/[id]/analytics/route.js`
  - GET - Fetch scenario analytics with metrics

### Documentation
- `FOLLOWUP_SYSTEM.md` - Complete documentation for the follow-up system
- `IMPLEMENTATION_SUMMARY.md` - This file

## Files Modified

### Webhook Handler
- `src/app/api/webhooks/telnyx/route.js`
  - Added import for follow-up service functions
  - Added check for manual override before executing scenario
  - Added STOP keyword detection and handling
  - Updates follow-up state when customer sends message
  - Sends confirmation message when STOP detected

### Scenario Service
- `src/lib/scenario-service.js`
  - Added import for follow-up service functions
  - Added business hours check before executing scenario
  - Added AI tracking fields when saving reply messages (tokens, processing time, model)
  - Updates follow-up state after AI responds
  - Schedules next follow-up after AI sends message

### Scenario API
- `src/app/api/scenarios/[id]/route.js`
  - Added handling for new follow-up configuration fields:
    - `enable_followups`
    - `max_followup_attempts`
    - `business_hours_start`
    - `business_hours_end`
    - `business_hours_timezone`
    - `auto_stop_keywords`
    - `enable_business_hours`

## Next Steps

### 1. Run Database Migration

```bash
# Connect to your Supabase database and run:
psql -U your_user -d your_database -f supabase/migrations/014_add_followup_system.sql

# Or use Supabase CLI:
supabase db push
```

### 2. Add Environment Variable

Add to `.env.local`:
```env
CRON_SECRET=your_random_secret_here_generate_a_strong_one
```

### 3. Setup Cron Job

Choose one option:

**Option A: Vercel Cron** (if hosted on Vercel)
- Create `vercel.json` with cron configuration (see FOLLOWUP_SYSTEM.md)

**Option B: Upstash QStash**
- Sign up at https://upstash.com
- Create scheduled job to hit `/api/cron/process-followups` every 10 minutes

**Option C: Cron-job.org** (Free)
- Sign up at https://cron-job.org
- Create cron job to hit your endpoint every 10 minutes

### 4. Test the System

1. **Test STOP keyword**:
   - Create a scenario
   - Send a message to trigger it
   - Reply with "STOP"
   - Verify you receive confirmation and follow-ups are stopped

2. **Test follow-ups**:
   - Create a scenario with `enable_followups: true`
   - Add follow-up stages with short wait durations (e.g., 5 minutes for testing)
   - Send a message and let AI respond
   - Wait for the follow-up to be sent (check cron job logs)

3. **Test business hours**:
   - Set business hours to current time + 1 hour
   - Try sending message before hours
   - Verify AI doesn't respond until within hours

4. **Test manual override**:
   - Toggle manual override for a conversation
   - Send message
   - Verify AI doesn't respond

5. **Test analytics**:
   - Create some conversations
   - Check analytics endpoint
   - Verify metrics are correct

### 5. Update Frontend (Optional)

You'll need to create UI components for:

1. **Scenario Configuration Page**:
   - Toggle for enable_followups
   - Business hours time pickers
   - Keywords array input
   - Max attempts number input

2. **Follow-up Stages Manager**:
   - Add/edit/delete follow-up stages
   - Set wait duration and unit
   - Write instructions for each stage

3. **Conversation List**:
   - Show labels as badges
   - Show manual override indicator
   - Filter by labels
   - Toggle manual override button

4. **Analytics Dashboard**:
   - Display metrics from analytics endpoint
   - Charts for stage distribution
   - Cost tracking over time

## How It Works

### Message Flow

```
1. Customer sends message
   ↓
2. Check manual_override → Skip if true
   ↓
3. Check STOP keywords → Stop follow-ups if found
   ↓
4. Update follow-up state (customer sent message)
   ↓
5. Check business hours → Skip if outside
   ↓
6. Execute scenario (AI responds)
   ↓
7. Save message with AI tracking data
   ↓
8. Update follow-up state (AI sent message)
   ↓
9. Schedule next follow-up
```

### Follow-up Flow

```
1. Cron job runs (every 10 minutes)
   ↓
2. Query conversations where next_followup_at <= now
   ↓
3. For each conversation:
   - Check manual_override → Skip if true
   - Check business hours → Reschedule if outside
   - Get next follow-up stage instructions
   - Send message using AI with stage instructions
   - Update follow-up state
   - Schedule next follow-up (if more stages exist)
```

## Database Schema Overview

### New Tables
- `scenario_followup_stages` - Stores multiple follow-up prompts per scenario
- `conversation_followup_state` - Tracks follow-up progress per conversation
- `scenario_analytics` - Daily aggregated analytics per scenario

### Updated Tables
- `scenarios` - Added follow-up configuration fields
- `conversations` - Added manual_override, labels, notes
- `messages` - Added is_followup, followup_stage, tokens_used, processing_time_ms, ai_model

## API Endpoints Summary

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/scenarios/:id/followup-stages` | Get follow-up stages |
| POST | `/api/scenarios/:id/followup-stages` | Create/update stages |
| POST | `/api/conversations/:id/manual-override` | Toggle manual override |
| POST | `/api/conversations/:id/labels` | Add label |
| DELETE | `/api/conversations/:id/labels` | Remove label |
| GET | `/api/scenarios/:id/analytics?days=30` | Get analytics |
| GET | `/api/cron/process-followups` | Process follow-ups (cron) |

## Configuration Example

### Scenario with Follow-ups

```javascript
// Update scenario
await fetch('/api/scenarios/123', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Real Estate Lead Follow-up',
    instructions: 'You are a helpful real estate assistant...',
    enable_followups: true,
    max_followup_attempts: 3,
    enable_business_hours: true,
    business_hours_start: '09:00:00',
    business_hours_end: '18:00:00',
    business_hours_timezone: 'America/New_York',
    auto_stop_keywords: ['STOP', 'UNSUBSCRIBE', 'CANCEL', 'END']
  })
})

// Add follow-up stages
await fetch('/api/scenarios/123/followup-stages', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    stages: [
      {
        stage_number: 1,
        wait_duration: 1440, // 1 day in minutes
        wait_unit: 'days',
        instructions: 'Follow up asking if they want to schedule a viewing'
      },
      {
        stage_number: 2,
        wait_duration: 4320, // 3 days in minutes
        wait_unit: 'days',
        instructions: 'Offer additional property options'
      },
      {
        stage_number: 3,
        wait_duration: 10080, // 7 days in minutes
        wait_unit: 'weeks',
        instructions: 'Final check-in, ask if they want to stay informed'
      }
    ]
  })
})
```

## Testing Checklist

- [ ] Database migration applied successfully
- [ ] CRON_SECRET environment variable set
- [ ] Cron job configured and running
- [ ] STOP keyword detection works
- [ ] Business hours restriction works
- [ ] Follow-ups send at correct times
- [ ] Manual override pauses AI
- [ ] Labels can be added/removed
- [ ] Analytics endpoint returns data
- [ ] No errors in application logs

## Support

For detailed documentation, see [FOLLOWUP_SYSTEM.md](./FOLLOWUP_SYSTEM.md)

For issues or questions:
1. Check application logs for errors
2. Verify cron job is running
3. Check database for follow-up state
4. Review configuration in scenarios table
