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
CREATE POLICY "Users can view their own organization"
  ON organizations FOR SELECT
  USING (id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update their own organization"
  ON organizations FOR UPDATE
  USING (id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));

-- Políticas RLS para users
CREATE POLICY "Users can view their own user record"
  ON users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update their own user record"
  ON users FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Users can insert their own user record"
  ON users FOR INSERT
  WITH CHECK (id = auth.uid());

-- Políticas RLS para bot_configurations
CREATE POLICY "Users can view bots from their organization"
  ON bot_configurations FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can create bots for their organization"
  ON bot_configurations FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update bots from their organization"
  ON bot_configurations FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete bots from their organization"
  ON bot_configurations FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));

-- Políticas RLS para knowledge_base_documents
CREATE POLICY "Users can view documents from their bots"
  ON knowledge_base_documents FOR SELECT
  USING (bot_configuration_id IN (
    SELECT id FROM bot_configurations
    WHERE organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can insert documents to their bots"
  ON knowledge_base_documents FOR INSERT
  WITH CHECK (bot_configuration_id IN (
    SELECT id FROM bot_configurations
    WHERE organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  ));

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
