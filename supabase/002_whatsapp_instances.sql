-- Migration: Add WhatsApp instances table
-- Description: Stores WhatsApp connection information for each bot

CREATE TABLE IF NOT EXISTS whatsapp_instances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_configuration_id UUID REFERENCES bot_configurations(id) ON DELETE CASCADE,
  instance_name TEXT UNIQUE NOT NULL,
  phone_number TEXT,
  status TEXT DEFAULT 'disconnected' CHECK (status IN ('disconnected', 'connecting', 'connected')),
  qr_code TEXT,
  qr_code_expires_at TIMESTAMPTZ,
  connected_at TIMESTAMPTZ,
  last_seen TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_bot_id ON whatsapp_instances(bot_configuration_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_instance_name ON whatsapp_instances(instance_name);
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_status ON whatsapp_instances(status);

-- RLS Policies
ALTER TABLE whatsapp_instances ENABLE ROW LEVEL SECURITY;

-- Users can view instances from their organization
CREATE POLICY "Users can view their org's WhatsApp instances"
ON whatsapp_instances FOR SELECT
TO authenticated
USING (
  bot_configuration_id IN (
    SELECT id FROM bot_configurations
    WHERE organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  )
);

-- Users can insert instances for their organization's bots
CREATE POLICY "Users can create WhatsApp instances for their org"
ON whatsapp_instances FOR INSERT
TO authenticated
WITH CHECK (
  bot_configuration_id IN (
    SELECT id FROM bot_configurations
    WHERE organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  )
);

-- Users can update instances from their organization
CREATE POLICY "Users can update their org's WhatsApp instances"
ON whatsapp_instances FOR UPDATE
TO authenticated
USING (
  bot_configuration_id IN (
    SELECT id FROM bot_configurations
    WHERE organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  )
);

-- Users can delete instances from their organization
CREATE POLICY "Users can delete their org's WhatsApp instances"
ON whatsapp_instances FOR DELETE
TO authenticated
USING (
  bot_configuration_id IN (
    SELECT id FROM bot_configurations
    WHERE organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  )
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_whatsapp_instances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_whatsapp_instances_timestamp
BEFORE UPDATE ON whatsapp_instances
FOR EACH ROW
EXECUTE FUNCTION update_whatsapp_instances_updated_at();
