-- Fix conversation unique constraint to allow same customer to text multiple business numbers
-- Drop the old unique constraint on phone_number only
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_phone_number_key;

-- Add composite unique constraint on (phone_number, from_number)
-- This allows the same customer to have separate conversations with different business numbers
ALTER TABLE public.conversations
  ADD CONSTRAINT conversations_phone_from_unique UNIQUE (phone_number, from_number);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_conversations_phone_from
  ON public.conversations (phone_number, from_number);
