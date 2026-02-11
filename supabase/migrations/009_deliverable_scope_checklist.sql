-- ================================================================
-- MIGRATION 009: Escopo + Checklist nos entregáveis + Notificações
-- - deliverables: category, due_time
-- - Nova tabela deliverable_checklist_items
-- - Nova tabela user_notifications
-- - important_dates: deprecada (mantida para leitura)
-- ================================================================

-- ==================== DELIVERABLES: category + due_time ====================
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deliverables' AND column_name = 'category') THEN
    ALTER TABLE deliverables ADD COLUMN category VARCHAR(50) DEFAULT 'outros';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deliverables' AND column_name = 'due_time') THEN
    ALTER TABLE deliverables ADD COLUMN due_time TIME;
  END IF;
END $$;

-- Preencher category a partir de type existente (apenas se não foi preenchido ainda)
UPDATE deliverables
SET category = CASE
  WHEN LOWER(type) IN ('reel', 'reels', 'stories', 'story', 'post', 'feed', 'vídeo', 'video', 'foto', 'live', 'review', 'unboxing') THEN 'midia'
  WHEN LOWER(type) IN ('presença', 'evento') THEN 'evento'
  WHEN LOWER(type) IN ('captação', 'captacao') THEN 'captacao'
  WHEN LOWER(type) IN ('publicidade', 'publi') THEN 'publicidade'
  ELSE 'outros'
END
WHERE (category IS NULL OR category = 'outros') AND type IS NOT NULL;

-- ==================== TABELA: DELIVERABLE_CHECKLIST_ITEMS ====================
CREATE TABLE IF NOT EXISTS deliverable_checklist_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deliverable_id UUID NOT NULL REFERENCES deliverables(id) ON DELETE CASCADE,
  label VARCHAR(500) NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  due_date DATE,
  due_time TIME,
  details TEXT,
  budget DECIMAL(12, 2),
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checklist_items_deliverable
  ON deliverable_checklist_items(deliverable_id);

DROP TRIGGER IF EXISTS trg_checklist_items_updated_at ON deliverable_checklist_items;
CREATE TRIGGER trg_checklist_items_updated_at
  BEFORE UPDATE ON deliverable_checklist_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ==================== TABELA: USER_NOTIFICATIONS ====================
CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'reminder',
  entity_type VARCHAR(100),
  entity_id UUID,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON user_notifications(user_id, read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON user_notifications(created_at);

-- RLS para notifications
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_notifications" ON user_notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_update_own_notifications" ON user_notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Authenticated pode inserir (para a rotina ou funções)
CREATE POLICY "authenticated_insert_notifications" ON user_notifications
  FOR INSERT WITH CHECK (true);

-- RLS para checklist items (segue do deliverable)
ALTER TABLE deliverable_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "checklist_select" ON deliverable_checklist_items
  FOR SELECT USING (true);

CREATE POLICY "checklist_insert" ON deliverable_checklist_items
  FOR INSERT WITH CHECK (true);

CREATE POLICY "checklist_update" ON deliverable_checklist_items
  FOR UPDATE USING (true);

CREATE POLICY "checklist_delete" ON deliverable_checklist_items
  FOR DELETE USING (true);

-- ==================== FUNÇÃO: Gerar notificações automáticas ====================
-- Pode ser chamada por pg_cron ou manualmente
CREATE OR REPLACE FUNCTION generate_notifications()
RETURNS void AS $$
DECLARE
  r RECORD;
BEGIN
  -- Notificar jobs que vencem em 3 ou 7 dias
  FOR r IN
    SELECT j.id, j.title, j.end_date, j.created_by,
           (j.end_date - CURRENT_DATE) AS days_left
    FROM jobs j
    WHERE j.status IN ('aberto', 'em_andamento')
      AND j.end_date >= CURRENT_DATE
      AND (j.end_date - CURRENT_DATE) IN (1, 3, 7)
      AND j.created_by IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM user_notifications n
        WHERE n.entity_id = j.id
          AND n.entity_type = 'job'
          AND n.type = 'campaign_ending'
          AND n.created_at::date = CURRENT_DATE
      )
  LOOP
    INSERT INTO user_notifications (user_id, title, message, type, entity_type, entity_id)
    VALUES (
      r.created_by,
      CASE
        WHEN r.days_left = 1 THEN 'Campanha termina amanhã!'
        ELSE 'Campanha termina em ' || r.days_left || ' dias'
      END,
      'A campanha "' || r.title || '" termina em ' || to_char(r.end_date, 'DD/MM/YYYY') || '.',
      'campaign_ending',
      'job',
      r.id
    );
  END LOOP;

  -- Notificar entregáveis que vencem em 1, 3 ou 7 dias
  FOR r IN
    SELECT d.id, d.title, d.due_date, j.created_by, j.title AS job_title,
           (d.due_date - CURRENT_DATE) AS days_left
    FROM deliverables d
    JOIN jobs j ON j.id = d.job_id
    WHERE d.status IN ('pendente', 'em_producao')
      AND d.due_date IS NOT NULL
      AND d.due_date >= CURRENT_DATE
      AND (d.due_date - CURRENT_DATE) IN (1, 3, 7)
      AND j.created_by IS NOT NULL
      AND NOT EXISTS (
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
        ELSE 'Entregável vence em ' || r.days_left || ' dias'
      END,
      'O entregável "' || r.title || '" do job "' || r.job_title || '" vence em ' || to_char(r.due_date, 'DD/MM/YYYY') || '.',
      'deliverable_due',
      'deliverable',
      r.id
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Deprecar important_dates
COMMENT ON TABLE important_dates IS 'DEPRECATED: use deliverables with due_date for new data';

-- Permissão planner no permissions (para roles existentes)
INSERT INTO permissions (role_id, section, can_create, can_read, can_update, can_delete)
SELECT r.id, 'planner', TRUE, TRUE, TRUE, TRUE
FROM roles r WHERE r.name = 'Admin'
ON CONFLICT (role_id, section) DO NOTHING;

INSERT INTO permissions (role_id, section, can_create, can_read, can_update, can_delete)
SELECT r.id, 'planner', FALSE, TRUE, FALSE, FALSE
FROM roles r WHERE r.name != 'Admin'
ON CONFLICT (role_id, section) DO NOTHING;
