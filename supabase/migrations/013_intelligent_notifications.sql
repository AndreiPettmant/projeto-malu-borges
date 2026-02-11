-- Migration: Melhorar lógica de notificações inteligentes
-- Descrição: Notificações mais inteligentes que consideram:
--   1. Não duplica no mesmo dia E mesmo intervalo
--   2. Se foi lida mas item não concluído → notifica novamente em intervalos menores
--   3. Exemplo: Notificou 7 dias (lida) → Notifica 3 dias (pois não foi concluído)

CREATE OR REPLACE FUNCTION generate_notifications()
RETURNS void AS $$
DECLARE
  r RECORD;
  last_notif_days INTEGER;
BEGIN
  -- ========== NOTIFICAÇÕES DE ENTREGÁVEIS (INTELIGENTE) ==========
  -- Gera avisos para entregáveis que vencem em 15, 7, 3, 1 dia ou HOJE
  -- Lógica: Notifica novamente se estiver mais próximo E item não foi concluído
  
  FOR r IN
    SELECT d.id, d.title, d.due_date, d.status AS del_status, j.created_by, j.title AS job_title,
           (d.due_date - CURRENT_DATE) AS days_left
    FROM deliverables d
    JOIN jobs j ON j.id = d.job_id
    WHERE d.status IN ('pendente', 'em_producao')
      AND d.due_date IS NOT NULL
      AND d.due_date >= CURRENT_DATE
      AND (d.due_date - CURRENT_DATE) IN (15, 7, 3, 1, 0)
      AND j.created_by IS NOT NULL
  LOOP
    -- Buscar última notificação sobre este entregável
    SELECT 
      CASE 
        WHEN title LIKE '%15 dias%' THEN 15
        WHEN title LIKE '%1 semana%' THEN 7
        WHEN title LIKE '%3 dias%' THEN 3
        WHEN title LIKE '%amanhã%' THEN 1
        WHEN title LIKE '%HOJE%' THEN 0
        ELSE NULL
      END INTO last_notif_days
    FROM user_notifications
    WHERE entity_id = r.id
      AND entity_type = 'deliverable'
      AND type IN ('deliverable_due', 'deliverable_expired')
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Lógica de notificação inteligente:
    -- 1. Se nunca notificou (last_notif_days IS NULL) → notifica
    -- 2. Se já notificou mas estamos mais próximos do prazo (r.days_left < last_notif_days) → notifica novamente
    -- 3. Se já notificou hoje no mesmo intervalo → NÃO notifica
    
    IF (last_notif_days IS NULL OR r.days_left < last_notif_days) 
       AND NOT EXISTS (
         SELECT 1 FROM user_notifications n
         WHERE n.entity_id = r.id
           AND n.entity_type = 'deliverable'
           AND n.type IN ('deliverable_due', 'deliverable_expired')
           AND n.created_at::date = CURRENT_DATE
           AND (
             (r.days_left = 15 AND n.title LIKE '%15 dias%') OR
             (r.days_left = 7 AND n.title LIKE '%1 semana%') OR
             (r.days_left = 3 AND n.title LIKE '%3 dias%') OR
             (r.days_left = 1 AND n.title LIKE '%amanhã%') OR
             (r.days_left = 0 AND n.title LIKE '%HOJE%')
           )
       )
    THEN
      INSERT INTO user_notifications (user_id, title, message, type, entity_type, entity_id)
      VALUES (
        r.created_by,
        CASE
          WHEN r.days_left = 0 THEN '🔴 Entregável vence HOJE!'
          WHEN r.days_left = 1 THEN 'Entregável vence amanhã!'
          WHEN r.days_left = 3 THEN 'Entregável vence em 3 dias'
          WHEN r.days_left = 7 THEN 'Entregável vence em 1 semana'
          WHEN r.days_left = 15 THEN 'Entregável vence em 15 dias'
          ELSE 'Entregável vence em ' || r.days_left || ' dias'
        END,
        'O entregável "' || r.title || '" do job "' || r.job_title || '" vence em ' || to_char(r.due_date, 'DD/MM/YYYY') || '.',
        CASE WHEN r.days_left = 0 THEN 'deliverable_expired' ELSE 'deliverable_due' END,
        'deliverable',
        r.id
      );
    END IF;
  END LOOP;

  -- ========== NOTIFICAÇÕES DE JOBS ==========
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

  -- ========== NOTIFICAÇÕES DE CHECKLIST ITEMS (INTELIGENTE) ==========
  FOR r IN
    SELECT ci.id, ci.label, ci.due_date, j.created_by, j.title AS job_title, d.title AS del_title,
           (ci.due_date - CURRENT_DATE) AS days_left
    FROM deliverable_checklist_items ci
    JOIN deliverables d ON d.id = ci.deliverable_id
    JOIN jobs j ON j.id = d.job_id
    WHERE ci.completed = FALSE
      AND ci.due_date IS NOT NULL
      AND ci.due_date >= CURRENT_DATE
      AND (ci.due_date - CURRENT_DATE) IN (3, 1, 0)
      AND j.created_by IS NOT NULL
  LOOP
    -- Buscar última notificação
    SELECT 
      CASE 
        WHEN title LIKE '%3 dias%' THEN 3
        WHEN title LIKE '%amanhã%' THEN 1
        WHEN title LIKE '%HOJE%' THEN 0
        ELSE NULL
      END INTO last_notif_days
    FROM user_notifications
    WHERE entity_id = r.id
      AND entity_type = 'checklist_item'
      AND type = 'checklist_due'
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF (last_notif_days IS NULL OR r.days_left < last_notif_days) 
       AND NOT EXISTS (
         SELECT 1 FROM user_notifications n
         WHERE n.entity_id = r.id
           AND n.entity_type = 'checklist_item'
           AND n.type = 'checklist_due'
           AND n.created_at::date = CURRENT_DATE
       )
    THEN
      INSERT INTO user_notifications (user_id, title, message, type, entity_type, entity_id)
      VALUES (
        r.created_by,
        CASE
          WHEN r.days_left = 0 THEN '🔴 Tarefa vence HOJE!'
          WHEN r.days_left = 1 THEN 'Tarefa vence amanhã'
          ELSE 'Tarefa vence em ' || r.days_left || ' dias'
        END,
        'A tarefa "' || r.label || '" do entregável "' || r.del_title || '" (job "' || r.job_title || '") vence em ' || to_char(r.due_date, 'DD/MM/YYYY') || '.',
        'checklist_due',
        'checklist_item',
        r.id
      );
    END IF;
  END LOOP;

  RAISE NOTICE 'Notificações inteligentes geradas com sucesso em %', NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION generate_notifications() IS 'Gera notificações inteligentes: não duplica no mesmo dia+intervalo, mas renotifica se item não concluído e mais próximo do prazo.';

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 013 concluída: Sistema de notificações inteligentes ativado!';
END $$;
