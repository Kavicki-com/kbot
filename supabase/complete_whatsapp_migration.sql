-- =====================================================
-- MIGRATION COMPLETA: KBOT - Schema Completo
-- Execute este arquivo UMA VEZ no SQL Editor do Supabase
-- Inclui: Schema inicial + WhatsApp Integration
-- =====================================================

-- ===============================
-- PARTE 1: Schema Inicial
-- ===============================

-- Criar extensão UUID se ainda não existir
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de organizações
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de usuários (estende auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de configurações de bot
CREATE TABLE IF NOT EXISTS bot_configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  
  -- Identificação
  bot_name TEXT NOT NULL,
  company_name TEXT NOT NULL,
  
  -- Personalidade e Comportamento
  tone_of_voice TEXT DEFAULT 'professional' CHECK (tone_of_voice IN ('professional', 'casual', 'friendly', 'technical', 'custom')),
  system_prompt TEXT NOT NULL,
  
  -- Configurações de Atendimento
  business_hours JSONB DEFAULT '{"enabled": false}'::jsonb,
  
  -- Coleta de Leads
  collect_name BOOLEAN DEFAULT true,
  collect_email BOOLEAN DEFAULT true,
  collect_phone BOOLEAN DEFAULT true,
  custom_fields JSONB DEFAULT '[]'::jsonb,
  
  -- Branding (Web Chat)
  primary_color TEXT DEFAULT '#6366f1',
  avatar_url TEXT,
  
  -- Integração
  whatsapp_number TEXT,
  typebot_id TEXT,
  
  -- RAG / Base de Conhecimento
  knowledge_base_enabled BOOLEAN DEFAULT false,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de documentos da base de conhecimento
CREATE TABLE IF NOT EXISTS knowledge_base_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_configuration_id UUID REFERENCES bot_configurations(id) ON DELETE CASCADE NOT NULL,
  
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  
  -- Para RAG com embeddings (futuro)
  content TEXT,
  
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_users_organization ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_bot_configs_organization ON bot_configurations(organization_id);
CREATE INDEX IF NOT EXISTS idx_bot_configs_active ON bot_configurations(is_active);
CREATE INDEX IF NOT EXISTS idx_knowledge_docs_bot ON knowledge_base_documents(bot_configuration_id);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bot_configurations_updated_at ON bot_configurations;
CREATE TRIGGER update_bot_configurations_updated_at
  BEFORE UPDATE ON bot_configurations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base_documents ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para organizations
DROP POLICY IF EXISTS "Users can view their own organization" ON organizations;
CREATE POLICY "Users can view their own organization"
  ON organizations FOR SELECT
  USING (id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can update their own organization" ON organizations;
CREATE POLICY "Users can update their own organization"
  ON organizations FOR UPDATE
  USING (id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));

-- Políticas RLS para users
DROP POLICY IF EXISTS "Users can view their own user record" ON users;
CREATE POLICY "Users can view their own user record"
  ON users FOR SELECT
  USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own user record" ON users;
CREATE POLICY "Users can update their own user record"
  ON users FOR UPDATE
  USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own user record" ON users;
CREATE POLICY "Users can insert their own user record"
  ON users FOR INSERT
  WITH CHECK (id = auth.uid());

-- Políticas RLS para bot_configurations
DROP POLICY IF EXISTS "Users can view bots from their organization" ON bot_configurations;
CREATE POLICY "Users can view bots from their organization"
  ON bot_configurations FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can create bots for their organization" ON bot_configurations;
CREATE POLICY "Users can create bots for their organization"
  ON bot_configurations FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can update bots from their organization" ON bot_configurations;
CREATE POLICY "Users can update bots from their organization"
  ON bot_configurations FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can delete bots from their organization" ON bot_configurations;
CREATE POLICY "Users can delete bots from their organization"
  ON bot_configurations FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));

-- Políticas RLS para knowledge_base_documents
DROP POLICY IF EXISTS "Users can view documents from their bots" ON knowledge_base_documents;
CREATE POLICY "Users can view documents from their bots"
  ON knowledge_base_documents FOR SELECT
  USING (bot_configuration_id IN (
    SELECT id FROM bot_configurations
    WHERE organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  ));

DROP POLICY IF EXISTS "Users can insert documents to their bots" ON knowledge_base_documents;
CREATE POLICY "Users can insert documents to their bots"
  ON knowledge_base_documents FOR INSERT
  WITH CHECK (bot_configuration_id IN (
    SELECT id FROM bot_configurations
    WHERE organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  ));

DROP POLICY IF EXISTS "Users can delete documents from their bots" ON knowledge_base_documents;
CREATE POLICY "Users can delete documents from their bots"
  ON knowledge_base_documents FOR DELETE
  USING (bot_configuration_id IN (
    SELECT id FROM bot_configurations
    WHERE organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  ));

-- Função para criar organização e usuário após signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id UUID;
BEGIN
  -- Criar organização
  INSERT INTO public.organizations (name)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'organization_name', 'Minha Empresa'))
  RETURNING id INTO new_org_id;

  -- Criar registro de usuário
  INSERT INTO public.users (id, email, organization_id, role)
  VALUES (NEW.id, NEW.email, new_org_id, 'admin');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar usuário automaticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ===============================
-- PARTE 2: WhatsApp Instances
-- ===============================

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

CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_bot_id ON whatsapp_instances(bot_configuration_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_instance_name ON whatsapp_instances(instance_name);
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_status ON whatsapp_instances(status);

ALTER TABLE whatsapp_instances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their org's WhatsApp instances" ON whatsapp_instances;
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

DROP POLICY IF EXISTS "Users can create WhatsApp instances for their org" ON whatsapp_instances;
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

DROP POLICY IF EXISTS "Users can update their org's WhatsApp instances" ON whatsapp_instances;
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

DROP POLICY IF EXISTS "Users can delete their org's WhatsApp instances" ON whatsapp_instances;
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

CREATE OR REPLACE FUNCTION update_whatsapp_instances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_whatsapp_instances_timestamp ON whatsapp_instances;
CREATE TRIGGER update_whatsapp_instances_timestamp
BEFORE UPDATE ON whatsapp_instances
FOR EACH ROW
EXECUTE FUNCTION update_whatsapp_instances_updated_at();


-- ===============================
-- PARTE 3: WhatsApp Conversations & Messages
-- ===============================

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

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  message_id TEXT,
  direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
  content TEXT,
  media_url TEXT,
  media_type TEXT CHECK (media_type IN ('image', 'audio', 'video', 'document', 'sticker', NULL)),
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_instance ON whatsapp_conversations(whatsapp_instance_id);
CREATE INDEX IF NOT EXISTS idx_conversations_bot ON whatsapp_conversations(bot_configuration_id);
CREATE INDEX IF NOT EXISTS idx_conversations_phone ON whatsapp_conversations(customer_phone);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON whatsapp_conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON whatsapp_conversations(last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON whatsapp_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sent_at ON whatsapp_messages(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_direction ON whatsapp_messages(direction);
CREATE INDEX IF NOT EXISTS idx_messages_message_id ON whatsapp_messages(message_id);

CREATE INDEX IF NOT EXISTS idx_messages_content_search ON whatsapp_messages USING gin(to_tsvector('portuguese', content));

ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their org's conversations" ON whatsapp_conversations;
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

DROP POLICY IF EXISTS "Users can insert conversations for their org" ON whatsapp_conversations;
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

DROP POLICY IF EXISTS "Users can update their org's conversations" ON whatsapp_conversations;
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

DROP POLICY IF EXISTS "Users can delete their org's conversations" ON whatsapp_conversations;
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

DROP POLICY IF EXISTS "Users can view their org's messages" ON whatsapp_messages;
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

DROP POLICY IF EXISTS "Users can insert messages for their org" ON whatsapp_messages;
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

DROP POLICY IF EXISTS "Users can update their org's messages" ON whatsapp_messages;
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

CREATE OR REPLACE FUNCTION update_whatsapp_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_whatsapp_conversations_timestamp ON whatsapp_conversations;
CREATE TRIGGER update_whatsapp_conversations_timestamp
BEFORE UPDATE ON whatsapp_conversations
FOR EACH ROW
EXECUTE FUNCTION update_whatsapp_conversations_updated_at();

-- =====================================================
-- FIM DA MIGRATION COMPLETA
-- =====================================================
