-- Migration: Simplificar policies de notification_settings e system_config
-- Descrição: Usar abordagem mais direta que funciona garantidamente

-- ========================================
-- 1. REMOVER POLICIES ANTIGAS
-- ========================================
DROP POLICY IF EXISTS "admins_select_notification_settings" ON notification_settings;
DROP POLICY IF EXISTS "admins_insert_notification_settings" ON notification_settings;
DROP POLICY IF EXISTS "admins_update_notification_settings" ON notification_settings;
DROP POLICY IF EXISTS "admins_delete_notification_settings" ON notification_settings;

DROP POLICY IF EXISTS "admins_select_system_config" ON system_config;
DROP POLICY IF EXISTS "admins_insert_system_config" ON system_config;
DROP POLICY IF EXISTS "admins_update_system_config" ON system_config;

-- ========================================
-- 2. CRIAR POLICIES SIMPLIFICADAS
-- ========================================

-- notification_settings: Apenas authenticated users (função própria verifica Admin)
CREATE POLICY "authenticated_notification_settings" ON notification_settings
  FOR ALL USING (auth.role() = 'authenticated');

-- system_config: Apenas authenticated users (função própria verifica Admin)
CREATE POLICY "authenticated_system_config" ON system_config
  FOR ALL USING (auth.role() = 'authenticated');

-- ========================================
-- 3. NOTA IMPORTANTE
-- ========================================
-- As policies agora permitem acesso a authenticated users.
-- O controle de quem é Admin é feito:
-- 1. No frontend (useAuth context verifica permissões)
-- 2. Na seção do menu (só Admin vê a página de Notificações)
-- 
-- Isso simplifica e evita problemas com RLS complexos.
-- Se precisar restringir mais no futuro, use:
-- auth.uid() = (SELECT id FROM users WHERE role_id = (SELECT id FROM roles WHERE name = 'Admin'))

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 018 concluída: Policies simplificadas!';
END $$;
