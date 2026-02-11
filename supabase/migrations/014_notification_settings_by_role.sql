-- Migration: Sistema de Configuração de Notificações por Papel
-- Descrição: Permite configurar quais papéis recebem notificações de quais categorias

-- ========================================
-- 1. TABELA DE CONFIGURAÇÃO DE NOTIFICAÇÕES
-- ========================================
CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role_id, notification_type)
);

CREATE INDEX IF NOT EXISTS idx_notification_settings_role ON notification_settings(role_id);
CREATE INDEX IF NOT EXISTS idx_notification_settings_type ON notification_settings(notification_type);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_notification_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notification_settings_updated_at
  BEFORE UPDATE ON notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_settings_timestamp();

-- ========================================
-- 2. TIPOS DE NOTIFICAÇÃO
-- ========================================
-- project_deadline: Vencimento de projetos/jobs
-- midia: Entregáveis de mídia
-- captacao: Entregáveis de captação
-- publicidade: Entregáveis de publicidade
-- evento: Entregáveis de evento
-- outros: Entregáveis outros
-- financial: Itens com orçamento pendente

-- ========================================
-- 3. CONFIGURAÇÕES PADRÃO
-- ========================================
-- Admin: Recebe tudo
INSERT INTO notification_settings (role_id, notification_type, enabled)
SELECT r.id, type, true
FROM roles r, UNNEST(ARRAY[
  'project_deadline',
  'midia',
  'captacao',
  'publicidade',
  'evento',
  'outros',
  'financial'
]) AS type
WHERE r.name = 'Admin'
ON CONFLICT (role_id, notification_type) DO NOTHING;

-- Marketing: Mídia e Publicidade
INSERT INTO notification_settings (role_id, notification_type, enabled)
SELECT r.id, type, true
FROM roles r, UNNEST(ARRAY[
  'project_deadline',
  'midia',
  'publicidade'
]) AS type
WHERE r.name = 'Marketing'
ON CONFLICT (role_id, notification_type) DO NOTHING;

-- Produção: Mídia e Captação
INSERT INTO notification_settings (role_id, notification_type, enabled)
SELECT r.id, type, true
FROM roles r, UNNEST(ARRAY[
  'project_deadline',
  'midia',
  'captacao'
]) AS type
WHERE r.name = 'Produção'
ON CONFLICT (role_id, notification_type) DO NOTHING;

-- Financeiro: Financial
INSERT INTO notification_settings (role_id, notification_type, enabled)
SELECT r.id, type, true
FROM roles r, UNNEST(ARRAY[
  'financial'
]) AS type
WHERE r.name = 'Financeiro'
ON CONFLICT (role_id, notification_type) DO NOTHING;

-- Cliente: Vencimento de Projeto apenas
INSERT INTO notification_settings (role_id, notification_type, enabled)
SELECT r.id, 'project_deadline', true
FROM roles r
WHERE r.name = 'Cliente'
ON CONFLICT (role_id, notification_type) DO NOTHING;

-- ========================================
-- 4. RLS PARA notification_settings
-- ========================================
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- Admins podem ver e editar tudo
CREATE POLICY "admins_manage_notification_settings" ON notification_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE u.id = auth.uid() AND r.name = 'Admin'
    )
  );

-- ========================================
-- 5. PERMISSÕES PARA SEÇÃO notification_settings
-- ========================================
INSERT INTO permissions (role_id, section, can_create, can_read, can_update, can_delete)
SELECT r.id, 'notification_settings', TRUE, TRUE, TRUE, TRUE
FROM roles r WHERE r.name = 'Admin'
ON CONFLICT (role_id, section) DO UPDATE SET
  can_create = TRUE, can_read = TRUE, can_update = TRUE, can_delete = TRUE;

-- Outros papéis podem apenas visualizar
INSERT INTO permissions (role_id, section, can_create, can_read, can_update, can_delete)
SELECT r.id, 'notification_settings', FALSE, TRUE, FALSE, FALSE
FROM roles r WHERE r.name != 'Admin'
ON CONFLICT (role_id, section) DO UPDATE SET
  can_read = TRUE;

-- ========================================
-- 6. FUNÇÃO HELPER: Verificar se papel recebe notificação do tipo
-- ========================================
CREATE OR REPLACE FUNCTION should_notify_role(
  p_role_id UUID,
  p_notification_type VARCHAR(50)
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM notification_settings
    WHERE role_id = p_role_id
      AND notification_type = p_notification_type
      AND enabled = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 7. FUNÇÃO: Obter tipo de notificação baseado em categoria
-- ========================================
CREATE OR REPLACE FUNCTION get_notification_type_from_category(
  p_category VARCHAR(50),
  p_has_budget BOOLEAN DEFAULT false
)
RETURNS VARCHAR(50) AS $$
BEGIN
  -- Se tem orçamento pendente, é financeiro
  IF p_has_budget THEN
    RETURN 'financial';
  END IF;
  
  -- Mapear categoria para tipo de notificação
  RETURN CASE p_category
    WHEN 'midia' THEN 'midia'
    WHEN 'captacao' THEN 'captacao'
    WHEN 'publicidade' THEN 'publicidade'
    WHEN 'evento' THEN 'evento'
    ELSE 'outros'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON TABLE notification_settings IS 'Configurações de quais papéis recebem notificações de quais categorias';
COMMENT ON FUNCTION should_notify_role IS 'Verifica se um papel deve receber notificações de um tipo específico';
COMMENT ON FUNCTION get_notification_type_from_category IS 'Mapeia categoria de entregável para tipo de notificação';

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 014 concluída: Sistema de configuração de notificações por papel criado!';
END $$;
