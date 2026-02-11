-- Migration: Agendar notificações automáticas com pg_cron
-- Descrição: Configura execução diária da função generate_notifications()
--            e adiciona notificação para 15 dias antes do prazo

-- ========================================
-- 1. ATIVAR EXTENSÃO pg_cron (TENTATIVA SEGURA)
-- ========================================
-- Nota: pg_cron pode não estar disponível no plano gratuito do Supabase
-- Se falhar, a migration continuará e você deve usar Edge Functions

DO $$
BEGIN
  -- Tentar criar extensão pg_cron
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
    RAISE NOTICE '✅ pg_cron ativado com sucesso!';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '⚠️  pg_cron não está disponível neste plano Supabase.';
    RAISE WARNING 'A função generate_notifications() foi criada, mas não será executada automaticamente.';
    RAISE WARNING 'Soluções alternativas estão documentadas em NOTIFICACOES.md';
  END;
END $$;

-- ========================================
-- 2. ATUALIZAR FUNÇÃO generate_notifications
-- ========================================
-- Adiciona notificações para 15 dias antes, além de 7, 3 e 1

CREATE OR REPLACE FUNCTION generate_notifications()
RETURNS void AS $$
DECLARE
  r RECORD;
BEGIN
  -- ========== NOTIFICAÇÕES DE ENTREGÁVEIS ==========
  -- Gera avisos para entregáveis que vencem em 15, 7, 3 ou 1 dia
  FOR r IN
    SELECT d.id, d.title, d.due_date, j.created_by, j.title AS job_title,
           (d.due_date - CURRENT_DATE) AS days_left
    FROM deliverables d
    JOIN jobs j ON j.id = d.job_id
    WHERE d.status IN ('pendente', 'em_producao')
      AND d.due_date IS NOT NULL
      AND d.due_date >= CURRENT_DATE
      AND (d.due_date - CURRENT_DATE) IN (15, 7, 3, 1)  -- Adicionado 15 dias
      AND j.created_by IS NOT NULL
      AND NOT EXISTS (
        -- Evita notificar mais de uma vez por dia sobre o mesmo entregável
        SELECT 1 FROM user_notifications n
        WHERE n.entity_id = d.id
          AND n.entity_type = 'deliverable'
          AND n.type = 'deliverable_due'
          AND n.created_at::date = CURRENT_DATE
      )
  LOOP
    INSERT INTO user_notifications (user_id, title, message, type, entity_type, entity_id)
    VALUES (
      r.created_by,
      CASE
        WHEN r.days_left = 1 THEN 'Entregável vence amanhã!'
        WHEN r.days_left = 3 THEN 'Entregável vence em 3 dias'
        WHEN r.days_left = 7 THEN 'Entregável vence em 1 semana'
        WHEN r.days_left = 15 THEN 'Entregável vence em 15 dias'
        ELSE 'Entregável vence em ' || r.days_left || ' dias'
      END,
      'O entregável "' || r.title || '" do job "' || r.job_title || '" vence em ' || to_char(r.due_date, 'DD/MM/YYYY') || '.',
      'deliverable_due',
      'deliverable',
      r.id
    );
  END LOOP;

  -- ========== NOTIFICAÇÕES DE VENCIMENTO NO DIA ==========
  -- Entregáveis que vencem HOJE
  FOR r IN
    SELECT d.id, d.title, j.created_by, j.title AS job_title
    FROM deliverables d
    JOIN jobs j ON j.id = d.job_id
    WHERE d.status IN ('pendente', 'em_producao')
      AND d.due_date = CURRENT_DATE
      AND j.created_by IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM user_notifications n
        WHERE n.entity_id = d.id
          AND n.entity_type = 'deliverable'
          AND n.type = 'deliverable_expired'
          AND n.created_at::date = CURRENT_DATE
      )
  LOOP
    INSERT INTO user_notifications (user_id, title, message, type, entity_type, entity_id)
    VALUES (
      r.created_by,
      '🔴 Entregável vence HOJE!',
      'O entregável "' || r.title || '" do job "' || r.job_title || '" vence hoje. Priorize!',
      'deliverable_expired',
      'deliverable',
      r.id
    );
  END LOOP;

  -- ========== NOTIFICAÇÕES DE JOBS ==========
  -- Jobs que finalizam em 7, 3 ou 1 dia
  FOR r IN
    SELECT j.id, j.title, j.end_date, j.created_by,
           (j.end_date - CURRENT_DATE) AS days_left
    FROM jobs j
    WHERE j.status IN ('aberto', 'em_andamento')
      AND j.end_date IS NOT NULL
      AND j.end_date >= CURRENT_DATE
      AND (j.end_date - CURRENT_DATE) IN (7, 3, 1)
      AND j.created_by IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM user_notifications n
        WHERE n.entity_id = j.id
          AND n.entity_type = 'job'
          AND n.type = 'job_deadline'
          AND n.created_at::date = CURRENT_DATE
      )
  LOOP
    INSERT INTO user_notifications (user_id, title, message, type, entity_type, entity_id)
    VALUES (
      r.created_by,
      CASE
        WHEN r.days_left = 1 THEN 'Job finaliza amanhã'
        ELSE 'Job finaliza em ' || r.days_left || ' dias'
      END,
      'O job "' || r.title || '" está próximo do prazo final (' || to_char(r.end_date, 'DD/MM/YYYY') || ').',
      'job_deadline',
      'job',
      r.id
    );
  END LOOP;

  -- ========== NOTIFICAÇÕES DE CHECKLIST ITEMS ==========
  -- Items de checklist que vencem em 3 ou 1 dia
  FOR r IN
    SELECT ci.id, ci.label, ci.due_date, j.created_by, j.title AS job_title, d.title AS del_title,
           (ci.due_date - CURRENT_DATE) AS days_left
    FROM deliverable_checklist_items ci
    JOIN deliverables d ON d.id = ci.deliverable_id
    JOIN jobs j ON j.id = d.job_id
    WHERE ci.completed = FALSE
      AND ci.due_date IS NOT NULL
      AND ci.due_date >= CURRENT_DATE
      AND (ci.due_date - CURRENT_DATE) IN (3, 1)
      AND j.created_by IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM user_notifications n
        WHERE n.entity_id = ci.id
          AND n.entity_type = 'checklist_item'
          AND n.type = 'checklist_due'
          AND n.created_at::date = CURRENT_DATE
      )
  LOOP
    INSERT INTO user_notifications (user_id, title, message, type, entity_type, entity_id)
    VALUES (
      r.created_by,
      CASE
        WHEN r.days_left = 1 THEN 'Tarefa vence amanhã'
        ELSE 'Tarefa vence em ' || r.days_left || ' dias'
      END,
      'A tarefa "' || r.label || '" do entregável "' || r.del_title || '" (job "' || r.job_title || '") vence em ' || to_char(r.due_date, 'DD/MM/YYYY') || '.',
      'checklist_due',
      'checklist_item',
      r.id
    );
  END LOOP;

  RAISE NOTICE 'Notificações geradas com sucesso em %', NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 3. AGENDAR EXECUÇÃO DIÁRIA COM pg_cron
-- ========================================
-- Executa generate_notifications() todo dia às 08:00 BRT (11:00 UTC)
-- Só agenda se pg_cron estiver disponível

DO $$
BEGIN
  -- Verificar se pg_cron foi instalado com sucesso
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remover job anterior se existir (para permitir re-execução da migration)
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-daily-notifications') THEN
      PERFORM cron.unschedule('generate-daily-notifications');
      RAISE NOTICE '🔄 Job anterior removido para re-agendamento';
    END IF;
    
    -- Agendar novo job
    PERFORM cron.schedule(
      'generate-daily-notifications',
      '0 11 * * *',  -- 11:00 UTC = 08:00 BRT
      'SELECT generate_notifications();'
    );
    
    RAISE NOTICE '✅ Notificações agendadas para execução diária às 08:00 BRT (11:00 UTC)';
    RAISE NOTICE 'Para verificar: SELECT * FROM cron.job;';
  ELSE
    RAISE WARNING '⚠️  pg_cron não disponível. Notificações NÃO foram agendadas automaticamente.';
    RAISE WARNING 'Você pode:';
    RAISE WARNING '  1. Executar manualmente: SELECT generate_notifications();';
    RAISE WARNING '  2. Implementar Edge Function (ver NOTIFICACOES.md)';
  END IF;
END $$;

-- ========================================
-- 4. REGISTRAR METADATA
-- ========================================
COMMENT ON FUNCTION generate_notifications() IS 'Gera notificações automáticas para usuários sobre prazos de jobs, entregáveis e checklist items. Executada diariamente via pg_cron.';

-- ========================================
-- 5. VERIFICAR CRON JOBS AGENDADOS
-- ========================================
-- Para listar os cron jobs configurados:
-- SELECT * FROM cron.job;

-- Para remover um cron job (se necessário):
-- SELECT cron.unschedule('generate-daily-notifications');

-- ========================================
-- 6. NOTAS FINAIS
-- ========================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '✅ Migration 012 concluída COM SUCESSO!';
    RAISE NOTICE '✅ Notificações automáticas configuradas para 08:00 BRT todo dia.';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Próximos passos:';
    RAISE NOTICE '  1. Verificar jobs: SELECT * FROM cron.job;';
    RAISE NOTICE '  2. Testar: SELECT generate_notifications();';
    RAISE NOTICE '  3. Ver resultado: SELECT * FROM user_notifications ORDER BY created_at DESC LIMIT 10;';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  ELSE
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '⚠️  Migration 012 concluída PARCIALMENTE.';
    RAISE NOTICE '⚠️  pg_cron não está disponível - notificações NÃO são automáticas.';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Opções:';
    RAISE NOTICE '  A) Testar manualmente: SELECT generate_notifications();';
    RAISE NOTICE '  B) Implementar Edge Function (ver NOTIFICACOES.md)';
    RAISE NOTICE '  C) Usar serviço externo de cron';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  END IF;
END $$;
