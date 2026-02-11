-- ================================================================
-- MIGRATION 004: Usuários de teste para cada perfil
-- Execute no SQL Editor do Supabase
-- Senha padrão para todos: Teste@123
--
-- IMPORTANTE: Execute este script APÓS as migrations 001, 002 e 003
-- ================================================================

-- Primeiro, limpar usuários de teste anteriores (caso precise re-executar)
DELETE FROM auth.users WHERE id IN (
  'a0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000005',
  'a0000000-0000-0000-0000-000000000006'
);

-- 1. Admin Master
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, role, aud,
  confirmation_token, recovery_token, email_change_token_new, email_change_token_current,
  created_at, updated_at
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'admin@maluborges.com',
  crypt('Teste@123', gen_salt('bf')),
  NOW(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"full_name": "Admin Master"}'::jsonb,
  'authenticated', 'authenticated',
  '', '', '', '',
  NOW(), NOW()
);

-- 2. Subadministrador
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, role, aud,
  confirmation_token, recovery_token, email_change_token_new, email_change_token_current,
  created_at, updated_at
) VALUES (
  'a0000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'subadmin@maluborges.com',
  crypt('Teste@123', gen_salt('bf')),
  NOW(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"full_name": "Sub Administrador"}'::jsonb,
  'authenticated', 'authenticated',
  '', '', '', '',
  NOW(), NOW()
);

-- 3. Marketing
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, role, aud,
  confirmation_token, recovery_token, email_change_token_new, email_change_token_current,
  created_at, updated_at
) VALUES (
  'a0000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000000',
  'marketing@maluborges.com',
  crypt('Teste@123', gen_salt('bf')),
  NOW(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"full_name": "Equipe Marketing"}'::jsonb,
  'authenticated', 'authenticated',
  '', '', '', '',
  NOW(), NOW()
);

-- 4. Criativo
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, role, aud,
  confirmation_token, recovery_token, email_change_token_new, email_change_token_current,
  created_at, updated_at
) VALUES (
  'a0000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000000',
  'criativo@maluborges.com',
  crypt('Teste@123', gen_salt('bf')),
  NOW(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"full_name": "Equipe Criativa"}'::jsonb,
  'authenticated', 'authenticated',
  '', '', '', '',
  NOW(), NOW()
);

-- 5. Produção
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, role, aud,
  confirmation_token, recovery_token, email_change_token_new, email_change_token_current,
  created_at, updated_at
) VALUES (
  'a0000000-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000000',
  'producao@maluborges.com',
  crypt('Teste@123', gen_salt('bf')),
  NOW(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"full_name": "Equipe Produção"}'::jsonb,
  'authenticated', 'authenticated',
  '', '', '', '',
  NOW(), NOW()
);

-- 6. Financeiro
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, role, aud,
  confirmation_token, recovery_token, email_change_token_new, email_change_token_current,
  created_at, updated_at
) VALUES (
  'a0000000-0000-0000-0000-000000000006',
  '00000000-0000-0000-0000-000000000000',
  'financeiro@maluborges.com',
  crypt('Teste@123', gen_salt('bf')),
  NOW(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"full_name": "Equipe Financeira"}'::jsonb,
  'authenticated', 'authenticated',
  '', '', '', '',
  NOW(), NOW()
);

-- ================================================================
-- Criar identidades (tabela auth.identities - obrigatória para login)
-- ================================================================

INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000001', '{"sub": "a0000000-0000-0000-0000-000000000001", "email": "admin@maluborges.com"}'::jsonb, 'email', 'a0000000-0000-0000-0000-000000000001', NOW(), NOW(), NOW()),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000002', '{"sub": "a0000000-0000-0000-0000-000000000002", "email": "subadmin@maluborges.com"}'::jsonb, 'email', 'a0000000-0000-0000-0000-000000000002', NOW(), NOW(), NOW()),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000003', '{"sub": "a0000000-0000-0000-0000-000000000003", "email": "marketing@maluborges.com"}'::jsonb, 'email', 'a0000000-0000-0000-0000-000000000003', NOW(), NOW(), NOW()),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000004', '{"sub": "a0000000-0000-0000-0000-000000000004", "email": "criativo@maluborges.com"}'::jsonb, 'email', 'a0000000-0000-0000-0000-000000000004', NOW(), NOW(), NOW()),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000005', '{"sub": "a0000000-0000-0000-0000-000000000005", "email": "producao@maluborges.com"}'::jsonb, 'email', 'a0000000-0000-0000-0000-000000000005', NOW(), NOW(), NOW()),
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000006', '{"sub": "a0000000-0000-0000-0000-000000000006", "email": "financeiro@maluborges.com"}'::jsonb, 'email', 'a0000000-0000-0000-0000-000000000006', NOW(), NOW(), NOW());

-- ================================================================
-- Atribuir papéis aos usuários
-- ================================================================

UPDATE public.users SET role_id = (SELECT id FROM roles WHERE name = 'Administrador') WHERE id = 'a0000000-0000-0000-0000-000000000001';
UPDATE public.users SET role_id = (SELECT id FROM roles WHERE name = 'Subadministrador') WHERE id = 'a0000000-0000-0000-0000-000000000002';
UPDATE public.users SET role_id = (SELECT id FROM roles WHERE name = 'Marketing') WHERE id = 'a0000000-0000-0000-0000-000000000003';
UPDATE public.users SET role_id = (SELECT id FROM roles WHERE name = 'Criativo') WHERE id = 'a0000000-0000-0000-0000-000000000004';
UPDATE public.users SET role_id = (SELECT id FROM roles WHERE name = 'Produção') WHERE id = 'a0000000-0000-0000-0000-000000000005';
UPDATE public.users SET role_id = (SELECT id FROM roles WHERE name = 'Financeiro') WHERE id = 'a0000000-0000-0000-0000-000000000006';
