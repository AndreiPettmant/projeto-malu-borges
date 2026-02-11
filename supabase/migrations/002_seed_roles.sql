-- ================================================================
-- MIGRATION 002: Seed de papéis iniciais
-- Cria os papéis de sistema: Admin, Subadmin e papéis padrão
-- ================================================================

-- Papéis de sistema
INSERT INTO roles (name, description, is_system) VALUES
  ('Administrador', 'Acesso total ao sistema. Gerencia usuários, papéis e permissões.', TRUE),
  ('Subadministrador', 'Acesso restrito. Pode gerenciar jobs e delegar tarefas.', TRUE),
  ('Marketing', 'Equipe de marketing. Acesso a campanhas e conteúdos.', FALSE),
  ('Criativo', 'Equipe criativa. Acesso a briefings, brainstorm e entregáveis.', FALSE),
  ('Produção', 'Equipe de produção. Acesso a cronogramas e status de entregas.', FALSE),
  ('Financeiro', 'Equipe financeira. Acesso a orçamentos e custos.', FALSE)
ON CONFLICT (name) DO NOTHING;

-- Seções do sistema
-- dashboard, jobs, entregaveis, graficos, ia, config_home, papeis_permissoes, auditoria

-- Permissões: Administrador (tudo liberado)
INSERT INTO permissions (role_id, section, can_create, can_read, can_update, can_delete)
SELECT r.id, s.section, TRUE, TRUE, TRUE, TRUE
FROM roles r
CROSS JOIN (VALUES
  ('dashboard'), ('jobs'), ('entregaveis'), ('graficos'),
  ('ia'), ('config_home'), ('papeis_permissoes'), ('auditoria')
) AS s(section)
WHERE r.name = 'Administrador'
ON CONFLICT (role_id, section) DO NOTHING;

-- Permissões: Subadministrador (quase tudo, sem papeis_permissoes e auditoria write)
INSERT INTO permissions (role_id, section, can_create, can_read, can_update, can_delete)
SELECT r.id, s.section, s.c, s.r, s.u, s.d
FROM roles r
CROSS JOIN (VALUES
  ('dashboard',         TRUE,  TRUE,  TRUE,  FALSE),
  ('jobs',              TRUE,  TRUE,  TRUE,  TRUE),
  ('entregaveis',       TRUE,  TRUE,  TRUE,  TRUE),
  ('graficos',          FALSE, TRUE,  FALSE, FALSE),
  ('ia',                TRUE,  TRUE,  FALSE, FALSE),
  ('config_home',       FALSE, TRUE,  FALSE, FALSE),
  ('papeis_permissoes', FALSE, TRUE,  FALSE, FALSE),
  ('auditoria',         FALSE, TRUE,  FALSE, FALSE)
) AS s(section, c, r, u, d)
WHERE r.name = 'Subadministrador'
ON CONFLICT (role_id, section) DO NOTHING;

-- Permissões: Marketing
INSERT INTO permissions (role_id, section, can_create, can_read, can_update, can_delete)
SELECT r.id, s.section, s.c, s.r, s.u, s.d
FROM roles r
CROSS JOIN (VALUES
  ('dashboard',         FALSE, TRUE,  FALSE, FALSE),
  ('jobs',              FALSE, TRUE,  FALSE, FALSE),
  ('entregaveis',       TRUE,  TRUE,  TRUE,  FALSE),
  ('graficos',          FALSE, TRUE,  FALSE, FALSE),
  ('ia',                TRUE,  TRUE,  FALSE, FALSE),
  ('config_home',       FALSE, FALSE, FALSE, FALSE),
  ('papeis_permissoes', FALSE, FALSE, FALSE, FALSE),
  ('auditoria',         FALSE, FALSE, FALSE, FALSE)
) AS s(section, c, r, u, d)
WHERE r.name = 'Marketing'
ON CONFLICT (role_id, section) DO NOTHING;

-- Permissões: Criativo
INSERT INTO permissions (role_id, section, can_create, can_read, can_update, can_delete)
SELECT r.id, s.section, s.c, s.r, s.u, s.d
FROM roles r
CROSS JOIN (VALUES
  ('dashboard',         FALSE, TRUE,  FALSE, FALSE),
  ('jobs',              FALSE, TRUE,  FALSE, FALSE),
  ('entregaveis',       TRUE,  TRUE,  TRUE,  FALSE),
  ('graficos',          FALSE, TRUE,  FALSE, FALSE),
  ('ia',                TRUE,  TRUE,  FALSE, FALSE),
  ('config_home',       FALSE, FALSE, FALSE, FALSE),
  ('papeis_permissoes', FALSE, FALSE, FALSE, FALSE),
  ('auditoria',         FALSE, FALSE, FALSE, FALSE)
) AS s(section, c, r, u, d)
WHERE r.name = 'Criativo'
ON CONFLICT (role_id, section) DO NOTHING;

-- Permissões: Produção
INSERT INTO permissions (role_id, section, can_create, can_read, can_update, can_delete)
SELECT r.id, s.section, s.c, s.r, s.u, s.d
FROM roles r
CROSS JOIN (VALUES
  ('dashboard',         FALSE, TRUE,  FALSE, FALSE),
  ('jobs',              FALSE, TRUE,  TRUE,  FALSE),
  ('entregaveis',       FALSE, TRUE,  TRUE,  FALSE),
  ('graficos',          FALSE, TRUE,  FALSE, FALSE),
  ('ia',                FALSE, TRUE,  FALSE, FALSE),
  ('config_home',       FALSE, FALSE, FALSE, FALSE),
  ('papeis_permissoes', FALSE, FALSE, FALSE, FALSE),
  ('auditoria',         FALSE, FALSE, FALSE, FALSE)
) AS s(section, c, r, u, d)
WHERE r.name = 'Produção'
ON CONFLICT (role_id, section) DO NOTHING;

-- Permissões: Financeiro
INSERT INTO permissions (role_id, section, can_create, can_read, can_update, can_delete)
SELECT r.id, s.section, s.c, s.r, s.u, s.d
FROM roles r
CROSS JOIN (VALUES
  ('dashboard',         FALSE, TRUE,  FALSE, FALSE),
  ('jobs',              FALSE, TRUE,  FALSE, FALSE),
  ('entregaveis',       FALSE, TRUE,  FALSE, FALSE),
  ('graficos',          FALSE, TRUE,  FALSE, FALSE),
  ('ia',                FALSE, FALSE, FALSE, FALSE),
  ('config_home',       FALSE, FALSE, FALSE, FALSE),
  ('papeis_permissoes', FALSE, FALSE, FALSE, FALSE),
  ('auditoria',         FALSE, FALSE, FALSE, FALSE)
) AS s(section, c, r, u, d)
WHERE r.name = 'Financeiro'
ON CONFLICT (role_id, section) DO NOTHING;

-- ==================== SEED: Configurações padrão da Home ====================
INSERT INTO home_config (section, key, value) VALUES
  ('hero', 'titulo', 'Malu Borges'),
  ('hero', 'subtitulo', 'Criadora de conteúdo, influenciadora digital e estrategista de campanhas.'),
  ('sobre', 'texto', 'Apaixonada por criar conteúdos autênticos que conectam marcas a pessoas reais. Com experiência em campanhas para diversas marcas, transformo briefings em histórias que engajam.'),
  ('sobre', 'imagem', ''),
  ('carrossel', 'videos', '[]')
ON CONFLICT (section, key) DO NOTHING;
