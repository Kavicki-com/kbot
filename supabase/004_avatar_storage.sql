-- Criar bucket de storage para avatares dos bots
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bot-avatars',
  'bot-avatars',
  true, -- público para permitir acesso direto via URL
  2097152, -- 2MB em bytes
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Política RLS: Usuários podem fazer upload de avatares para bots de sua organização
CREATE POLICY "Users can upload avatars for their organization bots"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'bot-avatars' AND
  auth.uid() IN (
    SELECT u.id FROM users u
    INNER JOIN bot_configurations bc ON bc.organization_id = u.organization_id
    WHERE bc.id::text = (storage.foldername(name))[1]
  )
);

-- Política RLS: Usuários podem atualizar avatares de bots de sua organização
CREATE POLICY "Users can update avatars for their organization bots"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'bot-avatars' AND
  auth.uid() IN (
    SELECT u.id FROM users u
    INNER JOIN bot_configurations bc ON bc.organization_id = u.organization_id
    WHERE bc.id::text = (storage.foldername(name))[1]
  )
);

-- Política RLS: Usuários podem deletar avatares de bots de sua organização
CREATE POLICY "Users can delete avatars for their organization bots"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'bot-avatars' AND
  auth.uid() IN (
    SELECT u.id FROM users u
    INNER JOIN bot_configurations bc ON bc.organization_id = u.organization_id
    WHERE bc.id::text = (storage.foldername(name))[1]
  )
);

-- Política RLS: Qualquer pessoa pode ler avatares (bucket é público)
CREATE POLICY "Anyone can read bot avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'bot-avatars');
