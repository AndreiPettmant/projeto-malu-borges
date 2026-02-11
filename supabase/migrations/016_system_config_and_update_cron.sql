-- Migration: Adicionar tabela system_config e função para atualizar cron
-- Descrição: Permite que o Admin configure o horário de execução das notificações

-- ========================================
-- 1. TABELA DE CONFIGURAÇÕES DO SISTEMA
-- ========================================
CREATE TABLE IF NOT EXISTS system_config (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_config_key ON system_config(key);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_system_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_system_config_updated_at
  BEFORE UPDATE ON system_config
  FOR EACH ROW
  EXECUTE FUNCTION update_system_config_timestamp();

-- ========================================
-- 2. INSERIR CONFIGURAÇÃO PADRÃO DO CRON
-- ========================================
INSERT INTO system_config (key, value, description)
VALUES (
  'notification_cron_schedule',
  '0 11 * * *',
  'Horário de execução das notificações automáticas (formato cron, UTC). Padrão: 11:00 UTC = 08:00 BRT'
)
ON CONFLICT (key) DO NOTHING;

-- ========================================
-- 3. RLS PARA system_config
-- ========================================
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- Admins podem ver e editar
CREATE POLICY "admins_manage_system_config" ON system_config
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE u.id = auth.uid() AND r.name = 'Admin'
    )
  );

-- ========================================
-- 4. FUNÇÃO: Atualizar agendamento do cron
-- ========================================
CREATE OR REPLACE FUNCTION update_notification_cron(new_schedule TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Verificar se pg_cron está disponível
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE NOTICE '⚠️  pg_cron não está disponível. Não foi possível atualizar o agendamento.';
    RETURN FALSE;
  END IF;

  -- Remover job antigo se existir
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-daily-notifications') THEN
    PERFORM cron.unschedule('generate-daily-notifications');
    RAISE NOTICE '🔄 Job anterior removido';
  END IF;

  -- Agendar novo job com o novo horário
  PERFORM cron.schedule(
    'generate-daily-notifications',
    new_schedule,
    'SELECT generate_notifications();'
  );

  RAISE NOTICE '✅ Cron atualizado para: %', new_schedule;
  RETURN TRUE;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Erro ao atualizar cron: %', SQLERRM;
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 5. PERMISSÕES PARA system_config
-- ========================================
-- Apenas Admin pode acessar
INSERT INTO permissions (role_id, section, can_create, can_read, can_update, can_delete)
SELECT r.id, 'system_config', TRUE, TRUE, TRUE, TRUE
FROM roles r WHERE r.name = 'Admin'
ON CONFLICT (role_id, section) DO UPDATE SET
  can_create = TRUE, can_read = TRUE, can_update = TRUE, can_delete = TRUE;

COMMENT ON TABLE system_config IS 'Configurações gerais do sistema (apenas Admin)';
COMMENT ON FUNCTION update_notification_cron IS 'Atualiza o agendamento do cron de notificações no pg_cron';

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 016 concluída: Sistema de configuração de horário criado!';
END $$;
