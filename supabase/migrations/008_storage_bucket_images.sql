-- ================================================================
-- MIGRATION 008: Criar bucket de imagens no Supabase Storage
-- Execute no SQL Editor do Supabase
-- ================================================================

-- Criar o bucket público para imagens
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'images',
  'images',
  TRUE,
  10485760,  -- 10MB por arquivo
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- ==================== POLÍTICAS DE ACESSO ====================

-- Qualquer pessoa pode visualizar as imagens (público)
CREATE POLICY "images_public_select" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'images');

-- Usuários autenticados podem fazer upload
CREATE POLICY "images_authenticated_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'images' AND auth.role() = 'authenticated');

-- Usuários autenticados podem atualizar
CREATE POLICY "images_authenticated_update" ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'images' AND auth.role() = 'authenticated');

-- Usuários autenticados podem deletar
CREATE POLICY "images_authenticated_delete" ON storage.objects
  FOR DELETE
  USING (bucket_id = 'images' AND auth.role() = 'authenticated');
