-- Migration: Add Follow-up System and Manual Takeover Features
-- This migration adds support for:
-- 1. Time-based follow-ups with multiple stages
-- 2. STOP keyword detection
-- 3. Business hours restrictions
-- 4. Manual conversation takeover with labels
-- 5. Analytics tracking

-- Add follow-up configuration to scenarios table
ALTER TABLE public.scenarios
  ADD COLUMN IF NOT EXISTS enable_followups BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS max_followup_attempts INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS business_hours_start TIME DEFAULT '09:00:00',
  ADD COLUMN IF NOT EXISTS business_hours_end TIME DEFAULT '18:00:00',
  ADD COLUMN IF NOT EXISTS business_hours_timezone VARCHAR(50) DEFAULT 'America/New_York',
  ADD COLUMN IF NOT EXISTS auto_stop_keywords TEXT[] DEFAULT ARRAY['STOP', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'],
  ADD COLUMN IF NOT EXISTS enable_business_hours BOOLEAN DEFAULT false;

-- Create table for multi-stage follow-up prompts
CREATE TABLE IF NOT EXISTS public.scenario_followup_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES public.scenarios(id) ON DELETE CASCADE,
  stage_number INTEGER NOT NULL,
  wait_duration INTEGER NOT NULL, -- in minutes (e.g., 60 = 1 hour, 1440 = 1 day, 10080 = 1 week)
  wait_unit VARCHAR(20) DEFAULT 'minutes', -- 'minutes', 'hours', 'days', 'weeks' for display purposes
  instructions TEXT NOT NULL, -- AI prompt for this follow-up stage
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(scenario_id, stage_number)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_followup_stages_scenario
  ON public.scenario_followup_stages(scenario_id, stage_number);

-- Create table to track follow-up state per conversation
CREATE TABLE IF NOT EXISTS public.conversation_followup_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  scenario_id UUID NOT NULL REFERENCES public.scenarios(id) ON DELETE CASCADE,
  current_stage INTEGER DEFAULT 0, -- 0 = initial message, 1+ = follow-up stages
  total_attempts INTEGER DEFAULT 0,
  next_followup_at TIMESTAMP WITH TIME ZONE,
  last_message_from VARCHAR(20), -- 'customer' or 'ai'
  last_message_at TIMESTAMP WITH TIME ZONE,
  stopped BOOLEAN DEFAULT false, -- true if customer used STOP keyword
  stopped_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(conversation_id, scenario_id)
);

-- Add indexes for follow-up state queries
CREATE INDEX IF NOT EXISTS idx_followup_state_next_due
  ON public.conversation_followup_state(next_followup_at)
  WHERE stopped = false AND next_followup_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_followup_state_conversation
  ON public.conversation_followup_state(conversation_id);

-- Add manual takeover and labels to conversations
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS manual_override BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS labels TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS last_manual_message_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add index for filtering conversations with labels
CREATE INDEX IF NOT EXISTS idx_conversations_labels
  ON public.conversations USING GIN(labels);

CREATE INDEX IF NOT EXISTS idx_conversations_manual_override
  ON public.conversations(manual_override) WHERE manual_override = true;

-- Add analytics tracking to messages table (if not exists)
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS is_followup BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS followup_stage INTEGER,
  ADD COLUMN IF NOT EXISTS tokens_used INTEGER,
  ADD COLUMN IF NOT EXISTS processing_time_ms INTEGER,
  ADD COLUMN IF NOT EXISTS ai_model VARCHAR(50);

-- Create analytics summary table for scenarios
CREATE TABLE IF NOT EXISTS public.scenario_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES public.scenarios(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_conversations INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  total_followups INTEGER DEFAULT 0,
  stopped_count INTEGER DEFAULT 0, -- customers who used STOP keyword
  manual_takeover_count INTEGER DEFAULT 0,
  avg_messages_per_conversation DECIMAL(10,2),
  total_tokens_used INTEGER DEFAULT 0,
  avg_response_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(scenario_id, date)
);

-- Add index for analytics queries
CREATE INDEX IF NOT EXISTS idx_scenario_analytics_date
  ON public.scenario_analytics(scenario_id, date DESC);

-- Add function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_scenario_followup_stages_updated_at ON public.scenario_followup_stages;
CREATE TRIGGER update_scenario_followup_stages_updated_at
  BEFORE UPDATE ON public.scenario_followup_stages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_conversation_followup_state_updated_at ON public.conversation_followup_state;
CREATE TRIGGER update_conversation_followup_state_updated_at
  BEFORE UPDATE ON public.conversation_followup_state
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_scenario_analytics_updated_at ON public.scenario_analytics;
CREATE TRIGGER update_scenario_analytics_updated_at
  BEFORE UPDATE ON public.scenario_analytics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE public.scenario_followup_stages IS 'Defines multiple follow-up stages with separate prompts and timing';
COMMENT ON TABLE public.conversation_followup_state IS 'Tracks follow-up progress for each conversation';
COMMENT ON TABLE public.scenario_analytics IS 'Daily analytics aggregated per scenario';
COMMENT ON COLUMN public.scenarios.enable_followups IS 'Enable automatic follow-ups if customer does not respond';
COMMENT ON COLUMN public.scenarios.max_followup_attempts IS 'Maximum number of follow-up attempts before stopping';
COMMENT ON COLUMN public.scenarios.auto_stop_keywords IS 'Keywords that will stop the scenario (STOP, UNSUBSCRIBE, etc.)';
COMMENT ON COLUMN public.conversations.manual_override IS 'If true, AI will not respond automatically';
COMMENT ON COLUMN public.conversations.labels IS 'Tags like "Need human", "Hot lead", etc.';
COMMENT ON COLUMN public.conversation_followup_state.stopped IS 'True if customer used STOP keyword or max attempts reached';
