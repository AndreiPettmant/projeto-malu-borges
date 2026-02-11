-- ================================================================
-- MIGRATION 005: Adicionar campo phone + seção 'usuarios' nas permissões
-- + RLS policies adicionais para gerenciar usuários
-- ================================================================

-- Adicionar campo telefone na tabela users
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- Adicionar seção 'usuarios' nas permissões de todos os papéis existentes
INSERT INTO permissions (role_id, section, can_create, can_read, can_update, can_delete)
SELECT r.id, 'usuarios', 
  CASE WHEN r.name = 'Administrador' THEN TRUE ELSE FALSE END,
  CASE WHEN r.name IN ('Administrador', 'Subadministrador') THEN TRUE ELSE FALSE END,
  CASE WHEN r.name = 'Administrador' THEN TRUE ELSE FALSE END,
  CASE WHEN r.name = 'Administrador' THEN TRUE ELSE FALSE END
FROM roles r
WHERE NOT EXISTS (
  SELECT 1 FROM permissions p WHERE p.role_id = r.id AND p.section = 'usuarios'
);

-- Permitir que usuários autenticados possam atualizar outros (admin gerenciando)
-- A lógica de permissão (quem é admin) é feita no frontend via tabela permissions
CREATE POLICY "users_update_all" ON users
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Permitir inserir novos usuários (trigger do Supabase Auth já faz isso, mas libera pra segurança)
CREATE POLICY "users_insert" ON users
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Permitir deletar usuários (admin)
CREATE POLICY "users_delete" ON users
  FOR DELETE USING (auth.role() = 'authenticated');
