-- Migration: Atualizar geração de notificações para usar configurações por papel
-- Descrição: Notifica usuários baseado em seu papel e configurações de notificação

CREATE OR REPLACE FUNCTION generate_notifications()
RETURNS void AS $$
DECLARE
  r RECORD;
  last_notif_days INTEGER;
  v_notification_type VARCHAR(50);
  v_has_budget BOOLEAN;
BEGIN
  -- ========== NOTIFICAÇÕES DE ENTREGÁVEIS (INTELIGENTE + POR PAPEL) ==========
  
  FOR r IN
    SELECT 
      d.id, 
      d.title, 
      d.due_date, 
      d.status AS del_status,
      d.category,
      j.id AS job_id,
      j.title AS job_title,
      (d.due_date - CURRENT_DATE) AS days_left,
      -- Verificar se tem checklist items com orçamento pendente
      EXISTS(
        SELECT 1 FROM deliverable_checklist_items ci
        WHERE ci.deliverable_id = d.id
          AND ci.completed = FALSE
          AND ci.budget IS NOT NULL
          AND ci.budget > 0
      ) AS has_pending_budget
    FROM deliverables d
    JOIN jobs j ON j.id = d.job_id
    WHERE d.status IN ('pendente', 'em_producao')
      AND d.due_date IS NOT NULL
      AND d.due_date >= CURRENT_DATE
      AND (d.due_date - CURRENT_DATE) IN (15, 7, 3, 1, 0)
  LOOP
    -- Determinar tipo de notificação baseado na categoria e orçamento
    v_notification_type := get_notification_type_from_category(r.category, r.has_pending_budget);
    
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
    
    -- Lógica de notificação inteligente
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
      -- Notificar TODOS os usuários cujo papel está configurado para receber este tipo
      INSERT INTO user_notifications (user_id, title, message, type, entity_type, entity_id)
      SELECT 
        u.id,
        CASE
          WHEN r.days_left = 0 THEN '🔴 Entregável vence HOJE!'
          WHEN r.days_left = 1 THEN 'Entregável vence amanhã!'
          WHEN r.days_left = 3 THEN 'Entregável vence em 3 dias'
          WHEN r.days_left = 7 THEN 'Entregável vence em 1 semana'
          WHEN r.days_left = 15 THEN 'Entregável vence em 15 dias'
          ELSE 'Entregável vence em ' || r.days_left || ' dias'
        END,
        'O entregável "' || r.title || '" (' || r.category || ') do job "' || r.job_title || '" vence em ' || to_char(r.due_date, 'DD/MM/YYYY') || '.',
        CASE WHEN r.days_left = 0 THEN 'deliverable_expired' ELSE 'deliverable_due' END,
        'deliverable',
        r.id
      FROM users u
      WHERE u.role_id IS NOT NULL
        AND should_notify_role(u.role_id, v_notification_type);
    END IF;
  END LOOP;

  -- ========== NOTIFICAÇÕES DE JOBS (POR PAPEL) ==========
  FOR r IN
    SELECT 
      j.id, 
      j.title, 
      j.end_date,
      (j.end_date - CURRENT_DATE) AS days_left
    FROM jobs j
    WHERE j.status IN ('aberto', 'em_andamento')
      AND j.end_date IS NOT NULL
      AND j.end_date >= CURRENT_DATE
      AND (j.end_date - CURRENT_DATE) IN (7, 3, 1)
      AND NOT EXISTS (
        SELECT 1 FROM user_notifications n
        WHERE n.entity_id = j.id
          AND n.entity_type = 'job'
          AND n.type = 'job_deadline'
          AND n.created_at::date = CURRENT_DATE
      )
  LOOP
    -- Notificar todos os usuários configurados para receber "project_deadline"
    INSERT INTO user_notifications (user_id, title, message, type, entity_type, entity_id)
    SELECT 
      u.id,
      CASE
        WHEN r.days_left = 1 THEN 'Job finaliza amanhã'
        ELSE 'Job finaliza em ' || r.days_left || ' dias'
      END,
      'O job "' || r.title || '" está próximo do prazo final (' || to_char(r.end_date, 'DD/MM/YYYY') || ').',
      'job_deadline',
      'job',
      r.id
    FROM users u
    WHERE u.role_id IS NOT NULL
      AND should_notify_role(u.role_id, 'project_deadline');
  END LOOP;

  -- ========== NOTIFICAÇÕES DE CHECKLIST ITEMS (INTELIGENTE + POR PAPEL) ==========
  FOR r IN
    SELECT 
      ci.id, 
      ci.label, 
      ci.due_date,
      ci.budget,
      d.title AS del_title,
      d.category,
      j.title AS job_title,
      (ci.due_date - CURRENT_DATE) AS days_left
    FROM deliverable_checklist_items ci
    JOIN deliverables d ON d.id = ci.deliverable_id
    JOIN jobs j ON j.id = d.job_id
    WHERE ci.completed = FALSE
      AND ci.due_date IS NOT NULL
      AND ci.due_date >= CURRENT_DATE
      AND (ci.due_date - CURRENT_DATE) IN (3, 1, 0)
  LOOP
    -- Determinar tipo baseado na categoria e orçamento
    v_has_budget := r.budget IS NOT NULL AND r.budget > 0;
    v_notification_type := get_notification_type_from_category(r.category, v_has_budget);
    
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
      SELECT 
        u.id,
        CASE
          WHEN r.days_left = 0 THEN '🔴 Tarefa vence HOJE!'
          WHEN r.days_left = 1 THEN 'Tarefa vence amanhã'
          ELSE 'Tarefa vence em ' || r.days_left || ' dias'
        END,
        'A tarefa "' || r.label || '" do entregável "' || r.del_title || '" (job "' || r.job_title || '") vence em ' || to_char(r.due_date, 'DD/MM/YYYY') || '.' ||
        CASE WHEN v_has_budget THEN ' Orçamento: R$ ' || r.budget::TEXT ELSE '' END,
        'checklist_due',
        'checklist_item',
        r.id
      FROM users u
      WHERE u.role_id IS NOT NULL
        AND should_notify_role(u.role_id, v_notification_type);
    END IF;
  END LOOP;

  RAISE NOTICE 'Notificações inteligentes geradas com sucesso em % (baseado em configurações por papel)', NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION generate_notifications() IS 'Gera notificações inteligentes baseadas em configurações por papel. Notifica usuários cujo papel está habilitado para cada categoria.';

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 015 concluída: Sistema de notificações por papel ativado!';
END $$;
