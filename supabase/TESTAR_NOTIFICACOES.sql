-- ========================================
-- TESTE COMPLETO: Sistema de Notificações
-- ========================================
-- Execute estas queries no Supabase SQL Editor para testar o sistema

-- ========================================
-- 1. VER SEU USUÁRIO E PAPEL
-- ========================================
SELECT 
  u.id,
  u.email,
  u.full_name,
  r.name AS papel
FROM users u
LEFT JOIN roles r ON r.id = u.role_id
ORDER BY u.created_at DESC;


-- ========================================
-- 2. LIMPAR TODAS AS NOTIFICAÇÕES
-- ========================================
DELETE FROM user_notifications;


-- ========================================
-- 3. CRIAR CENÁRIO DE TESTE
-- ========================================
-- Atualizar alguns entregáveis com prazos próximos e categorias diferentes

DO $$
DECLARE
  v_del1 UUID;
  v_del2 UUID;
  v_del3 UUID;
  v_del4 UUID;
  v_job1 UUID;
BEGIN
  -- Pegar IDs de entregáveis
  SELECT id INTO v_del1 FROM deliverables ORDER BY created_at LIMIT 1 OFFSET 0;
  SELECT id INTO v_del2 FROM deliverables ORDER BY created_at LIMIT 1 OFFSET 1;
  SELECT id INTO v_del3 FROM deliverables ORDER BY created_at LIMIT 1 OFFSET 2;
  SELECT id INTO v_del4 FROM deliverables ORDER BY created_at LIMIT 1 OFFSET 3;
  SELECT id INTO v_job1 FROM jobs ORDER BY created_at LIMIT 1;

  -- Entregável de MÍDIA que vence amanhã
  UPDATE deliverables 
  SET due_date = CURRENT_DATE + INTERVAL '1 day',
      status = 'pendente',
      category = 'midia'
  WHERE id = v_del1;

  -- Entregável de CAPTAÇÃO que vence em 3 dias
  UPDATE deliverables 
  SET due_date = CURRENT_DATE + INTERVAL '3 days',
      status = 'pendente',
      category = 'captacao'
  WHERE id = v_del2;

  -- Entregável de PUBLICIDADE que vence em 7 dias
  UPDATE deliverables 
  SET due_date = CURRENT_DATE + INTERVAL '7 days',
      status = 'em_producao',
      category = 'publicidade'
  WHERE id = v_del3;

  -- Entregável FINANCEIRO (com orçamento) que vence em 15 dias
  UPDATE deliverables 
  SET due_date = CURRENT_DATE + INTERVAL '15 days',
      status = 'pendente',
      category = 'midia'
  WHERE id = v_del4;

  -- Adicionar orçamento pendente no checklist
  UPDATE deliverable_checklist_items
  SET budget = 5000.00,
      completed = false
  WHERE id = (SELECT id FROM deliverable_checklist_items WHERE deliverable_id = v_del4 LIMIT 1);

  -- Job que finaliza em 3 dias
  UPDATE jobs
  SET end_date = CURRENT_DATE + INTERVAL '3 days',
      status = 'em_andamento'
  WHERE id = v_job1;

  RAISE NOTICE 'Cenário de teste criado com sucesso!';
END $$;


-- ========================================
-- 4. GERAR NOTIFICAÇÕES
-- ========================================
SELECT generate_notifications();


-- ========================================
-- 5. VER NOTIFICAÇÕES CRIADAS
-- ========================================
SELECT 
  u.email,
  r.name AS papel,
  n.title,
  n.message,
  n.type,
  n.created_at
FROM user_notifications n
JOIN users u ON u.id = n.user_id
LEFT JOIN roles r ON r.id = u.role_id
ORDER BY n.created_at DESC;


-- ========================================
-- 6. VER ESTATÍSTICAS
-- ========================================
-- Quantas notificações por tipo
SELECT 
  type,
  COUNT(*) AS quantidade
FROM user_notifications
GROUP BY type
ORDER BY quantidade DESC;

-- Quantas notificações por papel
SELECT 
  r.name AS papel,
  COUNT(n.id) AS quantidade_notificacoes
FROM roles r
LEFT JOIN users u ON u.role_id = r.id
LEFT JOIN user_notifications n ON n.user_id = u.id
GROUP BY r.name
ORDER BY quantidade_notificacoes DESC;


-- ========================================
-- 7. VER CONFIGURAÇÕES ATIVAS
-- ========================================
-- Quais papéis recebem quais notificações
SELECT 
  r.name AS papel,
  ns.notification_type AS categoria,
  ns.enabled AS ativo
FROM notification_settings ns
JOIN roles r ON r.id = ns.role_id
WHERE ns.enabled = true
ORDER BY r.name, ns.notification_type;


-- ========================================
-- 8. VER HORÁRIO CONFIGURADO
-- ========================================
-- Ver horário salvo (se migration 016 já foi executada)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_config') THEN
    RAISE NOTICE 'Horário configurado:';
    PERFORM * FROM system_config WHERE key = 'notification_cron_schedule';
  ELSE
    RAISE NOTICE '⚠️  Tabela system_config ainda não existe. Execute: npm run db:migrate';
  END IF;
END $$;

-- Ver job do cron (sempre disponível)
SELECT 
  jobname,
  schedule,
  command,
  active
FROM cron.job
WHERE jobname = 'generate-daily-notifications';


-- ========================================
-- 9. TESTAR NOTIFICAÇÃO ESPECÍFICA
-- ========================================
-- Se quiser testar uma categoria específica:

-- Criar entregável de EVENTO que vence HOJE
/*
UPDATE deliverables 
SET due_date = CURRENT_DATE,
    status = 'pendente',
    category = 'evento'
WHERE id = (SELECT id FROM deliverables LIMIT 1);

SELECT generate_notifications();

SELECT * FROM user_notifications 
WHERE created_at >= NOW() - INTERVAL '1 minute'
ORDER BY created_at DESC;
*/


-- ========================================
-- 10. LIMPAR TUDO E COMEÇAR DE NOVO
-- ========================================
-- Se quiser resetar e testar novamente:
/*
DELETE FROM user_notifications;

-- Voltar entregáveis ao estado original
UPDATE deliverables 
SET due_date = NULL,
    status = 'pendente';

-- Voltar jobs ao estado original
UPDATE jobs
SET end_date = NULL,
    status = 'aberto';
*/


-- ========================================
-- RESULTADO ESPERADO
-- ========================================
-- Após executar queries 1-5, você deve ver:
--
-- ✅ Admin recebe TODAS as notificações (7)
-- ✅ Marketing recebe: Mídia, Publicidade, Vencimento de Projeto (3)
-- ✅ Produção recebe: Mídia, Captação, Vencimento de Projeto (3)
-- ✅ Financeiro recebe: Financeiro (item com orçamento) (1)
-- ✅ Cliente recebe: Vencimento de Projeto (1)
--
-- Total esperado:
-- - Admin: 5 notificações (mídia + captação + publicidade + financeiro + projeto)
-- - Marketing: 3 notificações (mídia + publicidade + projeto)
-- - Produção: 3 notificações (mídia + captação + projeto)
-- - Financeiro: 1 notificação (financeiro)
-- - Cliente: 1 notificação (projeto)
-- ========================================
