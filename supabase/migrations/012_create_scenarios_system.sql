-- Create scenarios table
CREATE TABLE public.scenarios (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  instructions TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT scenarios_pkey PRIMARY KEY (id),
  CONSTRAINT scenarios_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  CONSTRAINT scenarios_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_scenarios_workspace_id ON public.scenarios USING btree (workspace_id) WHERE workspace_id IS NOT NULL;
CREATE INDEX idx_scenarios_active ON public.scenarios USING btree (is_active) WHERE is_active = true;
CREATE INDEX idx_scenarios_created_by ON public.scenarios USING btree (created_by);

CREATE TRIGGER update_scenarios_updated_at
  BEFORE UPDATE ON scenarios
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create scenario_phone_numbers junction table (scenarios assigned to sender numbers)
CREATE TABLE public.scenario_phone_numbers (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL,
  phone_number_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT scenario_phone_numbers_pkey PRIMARY KEY (id),
  CONSTRAINT scenario_phone_numbers_unique UNIQUE (scenario_id, phone_number_id),
  CONSTRAINT scenario_phone_numbers_scenario_id_fkey FOREIGN KEY (scenario_id) REFERENCES scenarios(id) ON DELETE CASCADE,
  CONSTRAINT scenario_phone_numbers_phone_number_id_fkey FOREIGN KEY (phone_number_id) REFERENCES phone_numbers(id) ON DELETE CASCADE
);

CREATE INDEX idx_scenario_phone_numbers_scenario_id ON public.scenario_phone_numbers USING btree (scenario_id);
CREATE INDEX idx_scenario_phone_numbers_phone_number_id ON public.scenario_phone_numbers USING btree (phone_number_id);

-- Create scenario_contacts junction table (optional: restrict to specific recipient numbers)
CREATE TABLE public.scenario_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL,
  recipient_phone VARCHAR(20) NOT NULL,
  contact_id UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT scenario_contacts_pkey PRIMARY KEY (id),
  CONSTRAINT scenario_contacts_unique UNIQUE (scenario_id, recipient_phone),
  CONSTRAINT scenario_contacts_scenario_id_fkey FOREIGN KEY (scenario_id) REFERENCES scenarios(id) ON DELETE CASCADE,
  CONSTRAINT scenario_contacts_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL
);

CREATE INDEX idx_scenario_contacts_scenario_id ON public.scenario_contacts USING btree (scenario_id);
CREATE INDEX idx_scenario_contacts_recipient_phone ON public.scenario_contacts USING btree (recipient_phone);
CREATE INDEX idx_scenario_contacts_contact_id ON public.scenario_contacts USING btree (contact_id) WHERE contact_id IS NOT NULL;

-- Create scenario_executions table (logs every scenario run)
CREATE TABLE public.scenario_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL,
  conversation_id UUID NOT NULL,
  message_id UUID NOT NULL,
  sender_number VARCHAR(20) NOT NULL,
  recipient_number VARCHAR(20) NOT NULL,
  conversation_history JSONB NULL,
  ai_prompt TEXT NULL,
  ai_response TEXT NULL,
  reply_sent BOOLEAN NOT NULL DEFAULT false,
  reply_message_id UUID NULL,
  execution_status VARCHAR(20) NOT NULL DEFAULT 'processing',
  error_message TEXT NULL,
  processing_time_ms INTEGER NULL,
  tokens_used INTEGER NULL,
  ai_model VARCHAR(50) NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT scenario_executions_pkey PRIMARY KEY (id),
  CONSTRAINT scenario_executions_scenario_id_fkey FOREIGN KEY (scenario_id) REFERENCES scenarios(id) ON DELETE CASCADE,
  CONSTRAINT scenario_executions_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  CONSTRAINT scenario_executions_message_id_fkey FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
  CONSTRAINT scenario_executions_reply_message_id_fkey FOREIGN KEY (reply_message_id) REFERENCES messages(id) ON DELETE SET NULL,
  CONSTRAINT scenario_executions_status_check CHECK (execution_status IN ('processing', 'success', 'failed', 'skipped', 'no_reply'))
);

CREATE INDEX idx_scenario_executions_scenario_id ON public.scenario_executions USING btree (scenario_id);
CREATE INDEX idx_scenario_executions_conversation_id ON public.scenario_executions USING btree (conversation_id);
CREATE INDEX idx_scenario_executions_message_id ON public.scenario_executions USING btree (message_id);
CREATE INDEX idx_scenario_executions_status ON public.scenario_executions USING btree (execution_status);
CREATE INDEX idx_scenario_executions_created_at ON public.scenario_executions USING btree (created_at DESC);
CREATE INDEX idx_scenario_executions_sender_number ON public.scenario_executions USING btree (sender_number);
CREATE INDEX idx_scenario_executions_recipient_number ON public.scenario_executions USING btree (recipient_number);

CREATE TRIGGER update_scenario_executions_updated_at
  BEFORE UPDATE ON scenario_executions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
