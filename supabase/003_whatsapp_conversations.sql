-- Migration: Add WhatsApp conversations and messages tables
-- Description: Stores all WhatsApp conversations and messages for each bot

-- Table for conversations
CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  whatsapp_instance_id UUID REFERENCES whatsapp_instances(id) ON DELETE CASCADE,
  bot_configuration_id UUID REFERENCES bot_configurations(id) ON DELETE CASCADE,
  customer_phone TEXT NOT NULL,
  customer_name TEXT,
  last_message_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(whatsapp_instance_id, customer_phone)
);

-- Table for messages
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  message_id TEXT, -- WhatsApp message ID
  direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
  content TEXT,
  media_url TEXT,
  media_type TEXT CHECK (media_type IN ('image', 'audio', 'video', 'document', 'sticker', NULL)),
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_instance ON whatsapp_conversations(whatsapp_instance_id);
CREATE INDEX IF NOT EXISTS idx_conversations_bot ON whatsapp_conversations(bot_configuration_id);
CREATE INDEX IF NOT EXISTS idx_conversations_phone ON whatsapp_conversations(customer_phone);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON whatsapp_conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON whatsapp_conversations(last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON whatsapp_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sent_at ON whatsapp_messages(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_direction ON whatsapp_messages(direction);
CREATE INDEX IF NOT EXISTS idx_messages_message_id ON whatsapp_messages(message_id);

-- Full-text search on message content
CREATE INDEX IF NOT EXISTS idx_messages_content_search ON whatsapp_messages USING gin(to_tsvector('portuguese', content));

-- RLS Policies for conversations
ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org's conversations"
ON whatsapp_conversations FOR SELECT
TO authenticated
USING (
  bot_configuration_id IN (
    SELECT id FROM bot_configurations
    WHERE organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "Users can insert conversations for their org"
ON whatsapp_conversations FOR INSERT
TO authenticated
WITH CHECK (
  bot_configuration_id IN (
    SELECT id FROM bot_configurations
    WHERE organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "Users can update their org's conversations"
ON whatsapp_conversations FOR UPDATE
TO authenticated
USING (
  bot_configuration_id IN (
    SELECT id FROM bot_configurations
    WHERE organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "Users can delete their org's conversations"
ON whatsapp_conversations FOR DELETE
TO authenticated
USING (
  bot_configuration_id IN (
    SELECT id FROM bot_configurations
    WHERE organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  )
);

-- RLS Policies for messages
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org's messages"
ON whatsapp_messages FOR SELECT
TO authenticated
USING (
  conversation_id IN (
    SELECT id FROM whatsapp_conversations
    WHERE bot_configuration_id IN (
      SELECT id FROM bot_configurations
      WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can insert messages for their org"
ON whatsapp_messages FOR INSERT
TO authenticated
WITH CHECK (
  conversation_id IN (
    SELECT id FROM whatsapp_conversations
    WHERE bot_configuration_id IN (
      SELECT id FROM bot_configurations
      WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can update their org's messages"
ON whatsapp_messages FOR UPDATE
TO authenticated
USING (
  conversation_id IN (
    SELECT id FROM whatsapp_conversations
    WHERE bot_configuration_id IN (
      SELECT id FROM bot_configurations
      WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  )
);

-- Function to update updated_at timestamp for conversations
CREATE OR REPLACE FUNCTION update_whatsapp_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_whatsapp_conversations_timestamp
BEFORE UPDATE ON whatsapp_conversations
FOR EACH ROW
EXECUTE FUNCTION update_whatsapp_conversations_updated_at();
