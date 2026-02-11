-- ================================================================
-- MIGRATION 010: Seed de entregáveis, checklists e dados completos
-- Atualiza jobs existentes com informações completas, entregáveis
-- com categorias, checklists internos com budget e detalhes
-- ================================================================

-- ==================== GARANTIR QUE COLUNA BUDGET EXISTE ====================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'deliverable_checklist_items' 
    AND column_name = 'budget'
  ) THEN
    ALTER TABLE deliverable_checklist_items ADD COLUMN budget DECIMAL(12, 2);
    RAISE NOTICE 'Coluna budget adicionada à tabela deliverable_checklist_items';
  ELSE
    RAISE NOTICE 'Coluna budget já existe';
  END IF;
END $$;

-- ==================== ATUALIZAR JOBS EXISTENTES ====================
-- Buscar o primeiro job e atualizar com dados completos
DO $$
DECLARE
  v_job_id UUID;
  v_del1_id UUID;
  v_del2_id UUID;
  v_del3_id UUID;
  v_del4_id UUID;
BEGIN
  -- Buscar o primeiro job existente
  SELECT id INTO v_job_id FROM jobs ORDER BY created_at LIMIT 1;
  
  IF v_job_id IS NOT NULL THEN
    -- Atualizar com informações completas
    UPDATE jobs SET
      description = 'Campanha de lançamento do novo sérum Glow Drops, focando em pele iluminada e hidratação profunda.',
      scope = 'Produção de conteúdo digital (reels, stories), evento de lançamento presencial, publi em feed e captação de bastidores.',
      budget = 15000.00,
      briefing = E'BRIEFING - Campanha Glow Drops\n\nMarca: Glow Skin\nProduto: Sérum Glow Drops - nova linha de skincare\n\nObjetivo: Lançar produto no mercado brasileiro, gerando awareness e vendas\n\nPúblico: Mulheres 25-40 anos, classe A/B, interessadas em skincare\n\nEntregáveis:\n- 3 reels (unboxing, aplicação, resultado)\n- 5 stories (dia a dia usando o produto)\n- 1 post em feed (foto profissional)\n- Presença no evento de lançamento\n- Captação de bastidores do evento\n\nPrazos:\n- Captação: 15/03/2026\n- Entrega reels: 20/03/2026\n- Publicação stories: 21-25/03/2026\n- Evento: 28/03/2026\n\nOrçamento: R$ 15.000\n\nObservações:\n- Tom de voz: leve, natural, mostrando rotina real\n- Destacar textura e brilho do produto\n- Usar hashtags: #GlowDrops #GlowSkin #PeleIluminada',
      brainstorm = E'IDEIAS CRIATIVAS\n\n- Reel 1: Unboxing com transição "antes/depois" da pele\n- Reel 2: Rotina matinal em slowmo aplicando o sérum\n- Reel 3: "Get ready with me" para o evento usando o produto\n\n- Stories: mostrar uso diário por 5 dias, com depoimento real\n\n- Post feed: foto editorial clean, fundo branco, produto em destaque\n\n- Evento: look que combine com a identidade visual da marca (tons rosé e dourado)\n\nReferências:\n- @hyram (estilo educativo)\n- @marianna_hewitt (elegância)\n- Estética clean e minimalista'
    WHERE id = v_job_id;

    -- Deletar entregáveis antigos se existirem (para recriar com estrutura nova)
    DELETE FROM deliverables WHERE job_id = v_job_id;

    -- ==================== ENTREGÁVEL 1: Reels (Mídia) ====================
    INSERT INTO deliverables (id, job_id, title, type, category, description, status, due_date, due_time)
    VALUES (
      uuid_generate_v4(),
      v_job_id,
      'Produção de 3 Reels',
      'reel',
      'midia',
      'Três reels mostrando unboxing, aplicação e resultado do sérum Glow Drops',
      'em_producao',
      '2026-03-20',
      '18:00:00'
    )
    RETURNING id INTO v_del1_id;

    -- Checklist do entregável 1
    INSERT INTO deliverable_checklist_items (deliverable_id, label, completed, due_date, due_time, details, budget, sort_order)
    VALUES
      (v_del1_id, 'Gravar reel 1 - Unboxing', true, '2026-03-16', NULL, 'Luz natural, fundo clean, destacar embalagem dourada', 1200.00, 0),
      (v_del1_id, 'Gravar reel 2 - Aplicação', true, '2026-03-17', NULL, 'Slowmo da textura, close no rosto, música suave', 1200.00, 1),
      (v_del1_id, 'Gravar reel 3 - Get Ready', false, '2026-03-18', '10:00:00', 'Gravar pela manhã, look para o evento, pele iluminada', 1500.00, 2),
      (v_del1_id, 'Editar 3 reels', false, '2026-03-19', NULL, 'Transições suaves, color grading rosé/dourado, duração 15-30s cada', 2500.00, 3),
      (v_del1_id, 'Aprovar com cliente', false, '2026-03-19', '17:00:00', 'Enviar prévia por email e WhatsApp', NULL, 4),
      (v_del1_id, 'Agendar publicação', false, '2026-03-20', NULL, 'Melhor horário: 19h-21h', NULL, 5);

    -- ==================== ENTREGÁVEL 2: Stories (Mídia) ====================
    INSERT INTO deliverables (id, job_id, title, type, category, description, status, due_date, due_time)
    VALUES (
      uuid_generate_v4(),
      v_job_id,
      'Stories Diários - 5 dias',
      'stories',
      'midia',
      'Série de stories mostrando uso do produto durante 5 dias consecutivos',
      'pendente',
      '2026-03-25',
      '20:00:00'
    )
    RETURNING id INTO v_del2_id;

    -- Checklist do entregável 2
    INSERT INTO deliverable_checklist_items (deliverable_id, label, completed, due_date, details, budget, sort_order)
    VALUES
      (v_del2_id, 'Dia 1 - Primeiro contato', false, '2026-03-21', 'Unboxing, primeira impressão, expectativas', 500.00, 0),
      (v_del2_id, 'Dia 2 - Textura e aplicação', false, '2026-03-22', 'Close na textura, como aplicar, quantidade ideal', 500.00, 1),
      (v_del2_id, 'Dia 3 - Rotina matinal', false, '2026-03-23', 'Mostrar rotina completa de skincare, posição do sérum', 500.00, 2),
      (v_del2_id, 'Dia 4 - Resultados iniciais', false, '2026-03-24', 'Foto antes/agora, depoimento honesto', 500.00, 3),
      (v_del2_id, 'Dia 5 - Conclusão e link', false, '2026-03-25', 'Resultado final, vale a pena?, link na bio', 500.00, 4);

    -- ==================== ENTREGÁVEL 3: Post Feed (Mídia) ====================
    INSERT INTO deliverables (id, job_id, title, type, category, description, status, due_date)
    VALUES (
      uuid_generate_v4(),
      v_job_id,
      'Post Profissional em Feed',
      'post',
      'midia',
      'Foto editorial do produto para feed fixo do Instagram',
      'pendente',
      '2026-03-27'
    )
    RETURNING id INTO v_del3_id;

    -- Checklist do entregável 3
    INSERT INTO deliverable_checklist_items (deliverable_id, label, completed, due_date, details, budget, sort_order)
    VALUES
      (v_del3_id, 'Contratar fotógrafo', false, '2026-03-10', 'Fotógrafo especializado em produto, estilo clean', 2000.00, 0),
      (v_del3_id, 'Sessão de fotos', false, '2026-03-22', 'Estúdio com fundo branco, iluminação profissional, 50+ fotos', 3000.00, 1),
      (v_del3_id, 'Selecionar e editar foto', false, '2026-03-23', 'Escolher melhor ângulo, ajustar cores (tons rosé/gold), retocar', 800.00, 2),
      (v_del3_id, 'Escrever legenda', false, '2026-03-26', 'Texto educativo sobre benefícios, CTA para link na bio, hashtags', NULL, 3),
      (v_del3_id, 'Publicar no feed', false, '2026-03-27', 'Publicar às 19h, fixar no topo do perfil', NULL, 4);

    -- ==================== ENTREGÁVEL 4: Evento Presencial (Evento) ====================
    INSERT INTO deliverables (id, job_id, title, type, category, description, status, due_date, due_time)
    VALUES (
      uuid_generate_v4(),
      v_job_id,
      'Presença no Lançamento Glow Drops',
      'evento',
      'evento',
      'Comparecer ao evento de lançamento oficial do produto em SP',
      'pendente',
      '2026-03-28',
      '19:00:00'
    )
    RETURNING id INTO v_del4_id;

    -- Checklist do entregável 4
    INSERT INTO deliverable_checklist_items (deliverable_id, label, completed, due_date, due_time, details, budget, sort_order)
    VALUES
      (v_del4_id, 'Confirmar presença', false, '2026-03-15', NULL, 'RSVP com organizadores, confirmar +1', NULL, 0),
      (v_del4_id, 'Planejar look', false, '2026-03-20', NULL, 'Roupa que combine com identidade visual (rosé/dourado), elegante mas confortável', 1500.00, 1),
      (v_del4_id, 'Agendar make e hair', false, '2026-03-28', '15:00:00', 'Profissional para make natural + pele iluminada, cabelo solto', 800.00, 2),
      (v_del4_id, 'Transporte', false, '2026-03-28', '18:00:00', 'Carro de app ou transfer fornecido pela marca. Local: Shopping JK Iguatemi', 150.00, 3),
      (v_del4_id, 'Cobertura do evento', false, '2026-03-28', '19:00:00', 'Stories ao vivo, fotos no feed depois, interagir com outras influencers', NULL, 4),
      (v_del4_id, 'Agradecer marca', false, '2026-03-29', NULL, 'Post nos stories agradecendo convite e experiência', NULL, 5);

    RAISE NOTICE 'Job % atualizado com 4 entregáveis e % itens de checklist', v_job_id, 
      (SELECT COUNT(*) FROM deliverable_checklist_items WHERE deliverable_id IN (v_del1_id, v_del2_id, v_del3_id, v_del4_id));
  ELSE
    RAISE NOTICE 'Nenhum job encontrado para atualizar';
  END IF;
END $$;

-- ==================== CRIAR NOTIFICAÇÕES DE EXEMPLO ====================
DO $$
DECLARE
  v_job_id UUID;
  v_user_id UUID;
  v_del_id UUID;
BEGIN
  -- Buscar primeiro job e usuário
  SELECT id INTO v_job_id FROM jobs ORDER BY created_at LIMIT 1;
  SELECT created_by INTO v_user_id FROM jobs WHERE id = v_job_id;
  SELECT id INTO v_del_id FROM deliverables WHERE job_id = v_job_id ORDER BY due_date LIMIT 1;
  
  IF v_user_id IS NOT NULL AND v_job_id IS NOT NULL THEN
    -- Notificação de entregável próximo
    INSERT INTO user_notifications (user_id, title, message, type, entity_type, entity_id)
    VALUES (
      v_user_id,
      'Entregável vence em 3 dias!',
      'O entregável "Produção de 3 Reels" vence em 20/03/2026. Não esqueça de finalizar a edição!',
      'deliverable_due',
      'deliverable',
      v_del_id
    )
    ON CONFLICT DO NOTHING;

    -- Notificação de campanha
    INSERT INTO user_notifications (user_id, title, message, type, entity_type, entity_id)
    VALUES (
      v_user_id,
      'Campanha termina em 7 dias',
      'A campanha está chegando ao fim. Revise todos os entregáveis pendentes.',
      'campaign_ending',
      'job',
      v_job_id
    )
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Notificações criadas para usuário %', v_user_id;
  END IF;
END $$;

-- ==================== RESUMO ====================
DO $$
DECLARE
  v_total_jobs INT;
  v_total_deliverables INT;
  v_total_checklist INT;
  v_total_notifications INT;
BEGIN
  SELECT COUNT(*) INTO v_total_jobs FROM jobs;
  SELECT COUNT(*) INTO v_total_deliverables FROM deliverables;
  SELECT COUNT(*) INTO v_total_checklist FROM deliverable_checklist_items;
  SELECT COUNT(*) INTO v_total_notifications FROM user_notifications;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RESUMO DA MIGRATION 010';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Jobs no sistema: %', v_total_jobs;
  RAISE NOTICE 'Entregáveis criados: %', v_total_deliverables;
  RAISE NOTICE 'Itens de checklist: %', v_total_checklist;
  RAISE NOTICE 'Notificações: %', v_total_notifications;
  RAISE NOTICE '========================================';
END $$;
