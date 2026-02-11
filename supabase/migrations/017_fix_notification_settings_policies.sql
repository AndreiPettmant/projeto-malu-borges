-- Migration: Corrigir policies de notification_settings
-- Descrição: Permitir que Admins gerenciem configurações de notificação

-- ========================================
-- 1. REMOVER POLICIES ANTIGAS
-- ========================================
DROP POLICY IF EXISTS "admins_manage_notification_settings" ON notification_settings;
DROP POLICY IF EXISTS "admins_select_notification_settings" ON notification_settings;
DROP POLICY IF EXISTS "admins_insert_notification_settings" ON notification_settings;
DROP POLICY IF EXISTS "admins_update_notification_settings" ON notification_settings;
DROP POLICY IF EXISTS "admins_delete_notification_settings" ON notification_settings;

-- ========================================
-- 2. CRIAR POLICIES ESPECÍFICAS PARA CADA OPERAÇÃO
-- ========================================

-- Admins podem selecionar
CREATE POLICY "admins_select_notification_settings" ON notification_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 
      FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE u.id IN (SELECT id FROM auth.users WHERE id = auth.uid())
        AND r.name = 'Admin'
    )
  );

-- Admins podem inserir
CREATE POLICY "admins_insert_notification_settings" ON notification_settings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE u.id IN (SELECT id FROM auth.users WHERE id = auth.uid())
        AND r.name = 'Admin'
    )
  );

-- Admins podem atualizar
CREATE POLICY "admins_update_notification_settings" ON notification_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 
      FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE u.id IN (SELECT id FROM auth.users WHERE id = auth.uid())
        AND r.name = 'Admin'
    )
  );

-- Admins podem deletar
CREATE POLICY "admins_delete_notification_settings" ON notification_settings
  FOR DELETE USING (
    EXISTS (
      SELECT 1 
      FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE u.id IN (SELECT id FROM auth.users WHERE id = auth.uid())
        AND r.name = 'Admin'
    )
  );

-- ========================================
-- 3. POLICIES PARA system_config
-- ========================================
DROP POLICY IF EXISTS "admins_manage_system_config" ON system_config;
DROP POLICY IF EXISTS "admins_select_system_config" ON system_config;
DROP POLICY IF EXISTS "admins_insert_system_config" ON system_config;
DROP POLICY IF EXISTS "admins_update_system_config" ON system_config;

CREATE POLICY "admins_select_system_config" ON system_config
  FOR SELECT USING (
    EXISTS (
      SELECT 1 
      FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE u.id IN (SELECT id FROM auth.users WHERE id = auth.uid())
        AND r.name = 'Admin'
    )
  );

CREATE POLICY "admins_insert_system_config" ON system_config
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE u.id IN (SELECT id FROM auth.users WHERE id = auth.uid())
        AND r.name = 'Admin'
    )
  );

CREATE POLICY "admins_update_system_config" ON system_config
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 
      FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE u.id IN (SELECT id FROM auth.users WHERE id = auth.uid())
        AND r.name = 'Admin'
    )
  );

-- ========================================
-- 4. VERIFICAÇÃO DE SEGURANÇA
-- ========================================
-- Garantir que apenas Admins têm acesso
DO $$
BEGIN
  -- Verificar se as policies foram criadas
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notification_settings' 
      AND policyname LIKE 'admins_%'
  ) THEN
    RAISE NOTICE '✅ Policies de notification_settings criadas com sucesso!';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'system_config' 
      AND policyname LIKE 'admins_%'
  ) THEN
    RAISE NOTICE '✅ Policies de system_config criadas com sucesso!';
  END IF;
END $$;

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 017 concluída: Policies corrigidas!';
END $$;
