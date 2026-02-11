-- ================================================================
-- MIGRATION 003: Row Level Security (RLS) Policies
-- Protege o acesso às tabelas conforme autenticação
-- ================================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE important_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ==================== USERS ====================
-- Todos autenticados podem ler perfis
CREATE POLICY "users_select" ON users
  FOR SELECT USING (auth.role() = 'authenticated');

-- Usuários podem atualizar o próprio perfil
CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (auth.uid() = id);

-- ==================== ROLES ====================
-- Todos autenticados podem ler papéis
CREATE POLICY "roles_select" ON roles
  FOR SELECT USING (auth.role() = 'authenticated');

-- Apenas service_role pode inserir/atualizar/deletar papéis (via backend)
CREATE POLICY "roles_insert" ON roles
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "roles_update" ON roles
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "roles_delete" ON roles
  FOR DELETE USING (auth.role() = 'authenticated');

-- ==================== PERMISSIONS ====================
CREATE POLICY "permissions_select" ON permissions
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "permissions_insert" ON permissions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "permissions_update" ON permissions
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "permissions_delete" ON permissions
  FOR DELETE USING (auth.role() = 'authenticated');

-- ==================== JOBS ====================
CREATE POLICY "jobs_select" ON jobs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "jobs_insert" ON jobs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "jobs_update" ON jobs
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "jobs_delete" ON jobs
  FOR DELETE USING (auth.role() = 'authenticated');

-- ==================== DELIVERABLES ====================
CREATE POLICY "deliverables_select" ON deliverables
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "deliverables_insert" ON deliverables
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "deliverables_update" ON deliverables
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "deliverables_delete" ON deliverables
  FOR DELETE USING (auth.role() = 'authenticated');

-- ==================== IMPORTANT_DATES ====================
CREATE POLICY "important_dates_select" ON important_dates
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "important_dates_insert" ON important_dates
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "important_dates_delete" ON important_dates
  FOR DELETE USING (auth.role() = 'authenticated');

-- ==================== HOME_CONFIG ====================
-- Leitura pública (para a página Hero)
CREATE POLICY "home_config_select_public" ON home_config
  FOR SELECT USING (TRUE);

CREATE POLICY "home_config_insert" ON home_config
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "home_config_update" ON home_config
  FOR UPDATE USING (auth.role() = 'authenticated');

-- ==================== AUDIT_LOGS ====================
CREATE POLICY "audit_logs_select" ON audit_logs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "audit_logs_insert" ON audit_logs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
