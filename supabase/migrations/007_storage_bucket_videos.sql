-- ================================================================
-- MIGRATION 007: Criar bucket de vídeos no Supabase Storage
-- Execute no SQL Editor do Supabase
-- ================================================================

-- Criar o bucket público para vídeos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'videos',
  'videos',
  TRUE,
  104857600,  -- 100MB por arquivo
  ARRAY['video/mp4', 'video/webm', 'video/quicktime']
) ON CONFLICT (id) DO NOTHING;

-- ==================== POLÍTICAS DE ACESSO ====================

-- Qualquer pessoa pode visualizar os vídeos (público)
CREATE POLICY "videos_public_select" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'videos');

-- Usuários autenticados podem fazer upload
CREATE POLICY "videos_authenticated_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'videos' AND auth.role() = 'authenticated');

-- Usuários autenticados podem atualizar (substituir)
CREATE POLICY "videos_authenticated_update" ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'videos' AND auth.role() = 'authenticated');

-- Usuários autenticados podem deletar
CREATE POLICY "videos_authenticated_delete" ON storage.objects
  FOR DELETE
  USING (bucket_id = 'videos' AND auth.role() = 'authenticated');
