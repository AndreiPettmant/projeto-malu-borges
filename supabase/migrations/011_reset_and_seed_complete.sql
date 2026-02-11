-- ================================================================
-- MIGRATION 011: Reset de dados e seed completo
-- Remove todos os jobs de teste e cria 5 novos jobs completos
-- com entregáveis, categorias, checklists, budgets e detalhes
-- ================================================================

-- ==================== LIMPAR DADOS EXISTENTES ====================
-- Cascade vai deletar automaticamente deliverables, checklist items, important_dates
DO $$
BEGIN
  DELETE FROM jobs;
  DELETE FROM user_notifications;
  RAISE NOTICE 'Dados de teste removidos';
END $$;

-- ==================== JOB 1: Campanha Glow Drops - Glow Skin ====================
DO $$
DECLARE
  v_job1_id UUID := uuid_generate_v4();
  v_user_id UUID;
  v_del1 UUID := uuid_generate_v4();
  v_del2 UUID := uuid_generate_v4();
  v_del3 UUID := uuid_generate_v4();
  v_del4 UUID := uuid_generate_v4();
BEGIN
  -- Buscar primeiro usuário para atribuir jobs
  SELECT id INTO v_user_id FROM users ORDER BY created_at LIMIT 1;

  -- Job 1
  INSERT INTO jobs (id, title, brand, description, scope, start_date, end_date, status, briefing, brainstorm, budget, created_by)
  VALUES (
    v_job1_id,
    'Campanha Glow Drops - Glow Skin',
    'Glow Skin',
    'Lançamento do novo sérum Glow Drops com foco em pele iluminada e hidratação profunda.',
    'Produção de conteúdo digital (3 reels, 5 stories), evento de lançamento presencial, post em feed e captação de bastidores.',
    '2026-03-10',
    '2026-03-30',
    'em_andamento',
    E'BRIEFING - Campanha Glow Drops\n\nMarca: Glow Skin\nProduto: Sérum Glow Drops\n\nObjetivo: Lançar produto gerando awareness e vendas\n\nPúblico: Mulheres 25-40 anos, classe A/B, skincare\n\nEntregáveis: 3 reels, 5 stories, 1 post feed, presença evento\n\nPrazos: Captação 15/03, Reels 20/03, Stories 21-25/03, Evento 28/03\n\nOrçamento: R$ 15.000',
    E'IDEIAS:\n- Reel unboxing com transição antes/depois\n- Rotina matinal em slowmo\n- Get ready para evento\n- Stories: 5 dias de uso real\n- Post editorial clean, fundo branco\n- Look evento: rosé/dourado',
    15000.00,
    v_user_id
  );

  -- Entregável 1.1: Reels
  INSERT INTO deliverables (id, job_id, title, type, category, description, status, due_date, due_time)
  VALUES (v_del1, v_job1_id, 'Produção de 3 Reels', 'reel', 'midia', 'Três reels mostrando unboxing, aplicação e resultado', 'em_producao', '2026-03-20', '18:00:00');

  INSERT INTO deliverable_checklist_items (deliverable_id, label, completed, due_date, details, budget, sort_order) VALUES
    (v_del1, 'Gravar reel 1 - Unboxing', true, '2026-03-16', 'Luz natural, fundo clean, embalagem dourada', 1200.00, 0),
    (v_del1, 'Gravar reel 2 - Aplicação', true, '2026-03-17', 'Slowmo da textura, close no rosto', 1200.00, 1),
    (v_del1, 'Gravar reel 3 - Get Ready', false, '2026-03-18', 'Gravar pela manhã, look evento, pele iluminada', 1500.00, 2),
    (v_del1, 'Editar 3 reels', false, '2026-03-19', 'Transições suaves, color grading rosé/dourado, 15-30s cada', 2500.00, 3),
    (v_del1, 'Aprovar com cliente', false, '2026-03-19', 'Enviar prévia por email e WhatsApp', NULL, 4),
    (v_del1, 'Agendar publicação', false, '2026-03-20', 'Melhor horário: 19h-21h', NULL, 5);

  -- Entregável 1.2: Stories
  INSERT INTO deliverables (id, job_id, title, type, category, description, status, due_date, due_time)
  VALUES (v_del2, v_job1_id, 'Stories Diários - 5 dias', 'stories', 'midia', 'Série de stories mostrando uso do produto durante 5 dias', 'pendente', '2026-03-25', '20:00:00');

  INSERT INTO deliverable_checklist_items (deliverable_id, label, completed, due_date, details, budget, sort_order) VALUES
    (v_del2, 'Dia 1 - Primeiro contato', false, '2026-03-21', 'Unboxing, primeira impressão', 500.00, 0),
    (v_del2, 'Dia 2 - Textura e aplicação', false, '2026-03-22', 'Close na textura, como aplicar', 500.00, 1),
    (v_del2, 'Dia 3 - Rotina matinal', false, '2026-03-23', 'Rotina completa de skincare', 500.00, 2),
    (v_del2, 'Dia 4 - Resultados iniciais', false, '2026-03-24', 'Foto antes/agora, depoimento', 500.00, 3),
    (v_del2, 'Dia 5 - Conclusão e link', false, '2026-03-25', 'Resultado final, link na bio', 500.00, 4);

  -- Entregável 1.3: Post Feed
  INSERT INTO deliverables (id, job_id, title, type, category, description, status, due_date)
  VALUES (v_del3, v_job1_id, 'Post Profissional em Feed', 'post', 'midia', 'Foto editorial do produto para feed fixo', 'pendente', '2026-03-27');

  INSERT INTO deliverable_checklist_items (deliverable_id, label, completed, due_date, details, budget, sort_order) VALUES
    (v_del3, 'Contratar fotógrafo', false, '2026-03-10', 'Especializado em produto, estilo clean', 2000.00, 0),
    (v_del3, 'Sessão de fotos', false, '2026-03-22', 'Estúdio fundo branco, 50+ fotos', 3000.00, 1),
    (v_del3, 'Selecionar e editar', false, '2026-03-23', 'Melhor ângulo, cores rosé/gold', 800.00, 2),
    (v_del3, 'Escrever legenda', false, '2026-03-26', 'Texto educativo, CTA, hashtags', NULL, 3);

  -- Entregável 1.4: Evento
  INSERT INTO deliverables (id, job_id, title, type, category, description, status, due_date, due_time)
  VALUES (v_del4, v_job1_id, 'Presença no Lançamento', 'evento', 'evento', 'Evento de lançamento oficial em SP', 'pendente', '2026-03-28', '19:00:00');

  INSERT INTO deliverable_checklist_items (deliverable_id, label, completed, due_date, details, budget, sort_order) VALUES
    (v_del4, 'Confirmar presença', false, '2026-03-15', 'RSVP com organizadores', NULL, 0),
    (v_del4, 'Planejar look', false, '2026-03-20', 'Roupa rosé/dourado, elegante', 1500.00, 1),
    (v_del4, 'Make e hair', false, '2026-03-28', 'Pele iluminada, cabelo solto', 800.00, 2),
    (v_del4, 'Transporte', false, '2026-03-28', 'Shopping JK Iguatemi', 150.00, 3);

  RAISE NOTICE 'Job 1 criado: Glow Drops';
END $$;

-- ==================== JOB 2: Campanha Verão Tropical - BeachWear Co ====================
DO $$
DECLARE
  v_job2_id UUID := uuid_generate_v4();
  v_user_id UUID;
  v_del1 UUID := uuid_generate_v4();
  v_del2 UUID := uuid_generate_v4();
  v_del3 UUID := uuid_generate_v4();
BEGIN
  SELECT id INTO v_user_id FROM users ORDER BY created_at LIMIT 1;

  INSERT INTO jobs (id, title, brand, description, scope, start_date, end_date, status, briefing, budget, created_by)
  VALUES (
    v_job2_id,
    'Campanha Verão Tropical - BeachWear Co',
    'BeachWear Co',
    'Coleção verão com biquínis e saídas de praia em cenário tropical.',
    'Captação de fotos na praia, 4 reels de looks, stories de bastidores e post fixo no feed.',
    '2026-02-15',
    '2026-03-05',
    'aberto',
    E'Campanha de verão BeachWear Co\n\nColeção 2026: biquínis, maiôs, saídas de praia\n\nLocal: Praia paradisíaca (Trancoso ou Arraial d''Ajuda)\n\nEntregáveis: captação fotos, 4 reels looks, 10 stories bastidores\n\nEstética: tropical, cores vibrantes, vibe descontraída',
    12000.00,
    v_user_id
  );

  -- Entregável 2.1: Captação
  INSERT INTO deliverables (id, job_id, title, type, category, description, status, due_date)
  VALUES (v_del1, v_job2_id, 'Captação na Praia', 'captacao', 'captacao', 'Sessão de fotos e vídeos em cenário paradisíaco', 'pendente', '2026-02-20');

  INSERT INTO deliverable_checklist_items (deliverable_id, label, completed, due_date, details, budget, sort_order) VALUES
    (v_del1, 'Reservar passagens e hotel', false, '2026-02-10', 'Trancoso, 3 dias, hotel frente mar', 3000.00, 0),
    (v_del1, 'Contratar fotógrafo local', false, '2026-02-12', 'Portfólio beach/fashion', 2500.00, 1),
    (v_del1, 'Day 1: Looks casuais', false, '2026-02-20', 'Biquínis coloridos, saídas leves, pôr do sol', NULL, 2),
    (v_del1, 'Day 2: Looks elegantes', false, '2026-02-21', 'Maiôs premium, fotos artísticas, água cristalina', NULL, 3),
    (v_del1, 'Selecionar melhores fotos', false, '2026-02-22', 'Escolher 30 fotos finais', NULL, 4);

  -- Entregável 2.2: Reels
  INSERT INTO deliverables (id, job_id, title, type, category, description, status, due_date)
  VALUES (v_del2, v_job2_id, '4 Reels de Looks', 'reel', 'midia', 'Reels mostrando diferentes combinações da coleção', 'pendente', '2026-02-28');

  INSERT INTO deliverable_checklist_items (deliverable_id, label, completed, due_date, details, budget, sort_order) VALUES
    (v_del2, 'Reel 1: Biquíni listrado', false, '2026-02-25', 'Transição praia/piscina', 400.00, 0),
    (v_del2, 'Reel 2: Conjunto floral', false, '2026-02-26', 'Caminhada na areia, música tropical', 400.00, 1),
    (v_del2, 'Reel 3: Maiô preto', false, '2026-02-27', 'Elegante, piscina infinita', 400.00, 2),
    (v_del2, 'Reel 4: Mix & match', false, '2026-02-28', 'Várias peças combinadas', 400.00, 3);

  -- Entregável 2.3: Stories bastidores
  INSERT INTO deliverables (id, job_id, title, type, category, description, status, due_date)
  VALUES (v_del3, v_job2_id, 'Stories de Bastidores', 'stories', 'midia', 'Stories mostrando making of da captação', 'pendente', '2026-02-22');

  INSERT INTO deliverable_checklist_items (deliverable_id, label, completed, due_date, details, budget, sort_order) VALUES
    (v_del3, 'Gravar chegada no destino', false, '2026-02-19', 'Aeroporto, transfer, primeira vista da praia', NULL, 0),
    (v_del3, 'Making of dia 1', false, '2026-02-20', 'Preparação, equipe, cenários', NULL, 1),
    (v_del3, 'Making of dia 2', false, '2026-02-21', 'Fotos artísticas, interação com fotógrafo', NULL, 2),
    (v_del3, 'Agradecimento e despedida', false, '2026-02-22', 'Compilado da viagem, agradecer marca', NULL, 3);

  RAISE NOTICE 'Job 1 criado: Glow Drops (4 entregáveis)';
END $$;

-- ==================== JOB 2: Campanha Verão Tropical ====================
DO $$
DECLARE
  v_job2_id UUID := uuid_generate_v4();
  v_user_id UUID;
  v_del1 UUID := uuid_generate_v4();
  v_del2 UUID := uuid_generate_v4();
  v_del3 UUID := uuid_generate_v4();
BEGIN
  SELECT id INTO v_user_id FROM users ORDER BY created_at LIMIT 1;

  INSERT INTO jobs (id, title, brand, description, scope, start_date, end_date, status, budget, created_by)
  VALUES (
    v_job2_id,
    'Collab Verão Tropical - Coco Beach',
    'Coco Beach Resort',
    'Parceria com resort para divulgar pacotes de verão e experiências gastronômicas.',
    'Captação no resort, 2 reels, stories diários por 3 dias, review completo.',
    '2026-02-25',
    '2026-03-08',
    'aberto',
    8500.00,
    v_user_id
  );

  -- Entregável 2.1: Captação resort
  INSERT INTO deliverables (id, job_id, title, type, category, description, status, due_date)
  VALUES (v_del1, v_job2_id, 'Captação no Resort', 'captacao', 'captacao', 'Fotos e vídeos das instalações, praia privativa, restaurante', 'pendente', '2026-02-28');

  INSERT INTO deliverable_checklist_items (deliverable_id, label, completed, due_date, details, budget, sort_order) VALUES
    (v_del1, 'Check-in e tour inicial', false, '2026-02-26', 'Gravar chegada, quarto, vista', NULL, 0),
    (v_del1, 'Fotos da piscina e praia', false, '2026-02-27', 'Golden hour, cores vibrantes', NULL, 1),
    (v_del1, 'Jantar no restaurante', false, '2026-02-27', 'Pratos principais, drinks, ambiente', NULL, 2),
    (v_del1, 'Café da manhã', false, '2026-02-28', 'Mesa farta, vista para o mar', NULL, 3);

  -- Entregável 2.2: Reels
  INSERT INTO deliverables (id, job_id, title, type, category, description, status, due_date)
  VALUES (v_del2, v_job2_id, '2 Reels do Resort', 'reel', 'midia', 'Reel tour do resort e reel gastronômico', 'pendente', '2026-03-05');

  INSERT INTO deliverable_checklist_items (deliverable_id, label, completed, due_date, details, budget, sort_order) VALUES
    (v_del2, 'Reel 1: Tour completo', false, '2026-03-03', 'Transições entre ambientes, música chill', 800.00, 0),
    (v_del2, 'Reel 2: Experiência gastro', false, '2026-03-04', 'Close nos pratos, drinks, chef', 800.00, 1);

  -- Entregável 2.3: Stories diários
  INSERT INTO deliverables (id, job_id, title, type, category, description, status, due_date)
  VALUES (v_del3, v_job2_id, 'Stories Diários - 3 dias', 'stories', 'midia', 'Cobertura completa da estadia', 'pendente', '2026-02-28');

  INSERT INTO deliverable_checklist_items (deliverable_id, label, completed, due_date, details, budget, sort_order) VALUES
    (v_del3, 'Stories dia 1', false, '2026-02-26', 'Chegada, primeira impressão', NULL, 0),
    (v_del3, 'Stories dia 2', false, '2026-02-27', 'Praia, piscina, atividades', NULL, 1),
    (v_del3, 'Stories dia 3', false, '2026-02-28', 'Café manhã, check-out, despedida', NULL, 2);

  RAISE NOTICE 'Job 2 criado: Verão Tropical (3 entregáveis)';
END $$;

-- ==================== JOB 3: Lançamento Linha Fitness - FitActive ====================
DO $$
DECLARE
  v_job3_id UUID := uuid_generate_v4();
  v_user_id UUID;
  v_del1 UUID := uuid_generate_v4();
  v_del2 UUID := uuid_generate_v4();
  v_del3 UUID := uuid_generate_v4();
BEGIN
  SELECT id INTO v_user_id FROM users ORDER BY created_at LIMIT 1;

  INSERT INTO jobs (id, title, brand, description, scope, start_date, end_date, status, budget, created_by)
  VALUES (
    v_job3_id,
    'Lançamento Linha Fitness - FitActive',
    'FitActive Wear',
    'Divulgação da nova linha de roupas fitness com tecnologia dry-fit.',
    '2 reels treino, 1 review detalhado, stories de rotina fitness.',
    '2026-03-01',
    '2026-03-20',
    'aberto',
    6000.00,
    v_user_id
  );

  -- Entregável 3.1: Reels treino
  INSERT INTO deliverables (id, job_id, title, type, category, description, status, due_date)
  VALUES (v_del1, v_job3_id, '2 Reels de Treino', 'reel', 'midia', 'Reels mostrando as roupas durante treino real', 'pendente', '2026-03-12');

  INSERT INTO deliverable_checklist_items (deliverable_id, label, completed, due_date, details, budget, sort_order) VALUES
    (v_del1, 'Reel 1: Treino pernas', false, '2026-03-10', 'Agachamento, leg press, look completo', 800.00, 0),
    (v_del1, 'Reel 2: Treino superior', false, '2026-03-11', 'Supino, rosca, focus no top', 800.00, 1),
    (v_del1, 'Editar ambos', false, '2026-03-12', 'Música motivacional, transições', 600.00, 2);

  -- Entregável 3.2: Review
  INSERT INTO deliverables (id, job_id, title, type, category, description, status, due_date)
  VALUES (v_del2, v_job3_id, 'Review Completo', 'review', 'midia', 'Análise detalhada da qualidade, tecido, caimento', 'pendente', '2026-03-15');

  INSERT INTO deliverable_checklist_items (deliverable_id, label, completed, due_date, details, budget, sort_order) VALUES
    (v_del2, 'Gravar review', false, '2026-03-14', 'Falar de tecido, conforto, durabilidade', 1000.00, 0),
    (v_del2, 'Editar e finalizar', false, '2026-03-15', 'Cortes dinâmicos, legendas', 500.00, 1);

  -- Entregável 3.3: Stories rotina
  INSERT INTO deliverables (id, job_id, title, type, category, description, status, due_date)
  VALUES (v_del3, v_job3_id, 'Stories Rotina Fitness', 'stories', 'midia', 'Stories mostrando uso das peças no dia a dia', 'pendente', '2026-03-18');

  INSERT INTO deliverable_checklist_items (deliverable_id, label, completed, due_date, details, budget, sort_order) VALUES
    (v_del3, 'Treino matinal', false, '2026-03-16', 'Academia pela manhã', NULL, 0),
    (v_del3, 'Pós-treino', false, '2026-03-17', 'Smoothie, recuperação', NULL, 1),
    (v_del3, 'Conforto no casual', false, '2026-03-18', 'Usando as peças no dia a dia', NULL, 2);

  RAISE NOTICE 'Job 2 criado: Linha Fitness (3 entregáveis)';
END $$;

-- ==================== JOB 3: Publi App de Meditação - MindfulMe ====================
DO $$
DECLARE
  v_job3_id UUID := uuid_generate_v4();
  v_user_id UUID;
  v_del1 UUID := uuid_generate_v4();
  v_del2 UUID := uuid_generate_v4();
BEGIN
  SELECT id INTO v_user_id FROM users ORDER BY created_at LIMIT 1;

  INSERT INTO jobs (id, title, brand, description, scope, start_date, end_date, status, budget, created_by)
  VALUES (
    v_job3_id,
    'Publi App MindfulMe',
    'MindfulMe App',
    'Publicidade de aplicativo de meditação e bem-estar mental.',
    '1 reel publi + stories diários por 7 dias + post feed.',
    '2026-03-15',
    '2026-04-10',
    'aberto',
    5000.00,
    v_user_id
  );

  -- Entregável: Publi em reel
  INSERT INTO deliverables (id, job_id, title, type, category, description, status, due_date)
  VALUES (v_del1, v_job3_id, 'Reel Publicitário', 'publi', 'publicidade', 'Reel de 30-60s mostrando benefícios do app', 'pendente', '2026-03-25');

  INSERT INTO deliverable_checklist_items (deliverable_id, label, completed, due_date, details, budget, sort_order) VALUES
    (v_del1, 'Roteiro e aprovação', false, '2026-03-18', 'Escrever roteiro, enviar para cliente', NULL, 0),
    (v_del1, 'Gravar conteúdo', false, '2026-03-22', 'Cenário tranquilo, tom calmo e acolhedor', 1500.00, 1),
    (v_del1, 'Editar com motion graphics', false, '2026-03-24', 'Inserir telas do app, call-to-action', 1000.00, 2),
    (v_del1, 'Publicar no feed e stories', false, '2026-03-25', 'Melhor horário: manhã', NULL, 3);

  -- Entregável: Stories 7 dias
  INSERT INTO deliverables (id, job_id, title, type, category, description, status, due_date)
  VALUES (v_del2, v_job3_id, 'Stories - 7 dias usando o app', 'stories', 'publicidade', 'Série mostrando experiência real com o app', 'pendente', '2026-04-05');

  INSERT INTO deliverable_checklist_items (deliverable_id, label, completed, due_date, details, budget, sort_order) VALUES
    (v_del2, 'Dia 1: Download e primeiro uso', false, '2026-03-29', 'Tela inicial, escolha de meditações', NULL, 0),
    (v_del2, 'Dia 2-3: Rotina matinal', false, '2026-03-31', 'Meditação guiada pela manhã', NULL, 1),
    (v_del2, 'Dia 4-5: Sono e relaxamento', false, '2026-04-02', 'Funções para dormir melhor', NULL, 2),
    (v_del2, 'Dia 6-7: Resultados e conclusão', false, '2026-04-05', 'Sensações, vale a pena?, código desconto', NULL, 3);

  RAISE NOTICE 'Job 3 criado: MindfulMe (2 entregáveis)';
END $$;

-- ==================== JOB 4: Evento Inauguração Café - Café da Vila ====================
DO $$
DECLARE
  v_job4_id UUID := uuid_generate_v4();
  v_user_id UUID;
  v_del1 UUID := uuid_generate_v4();
  v_del2 UUID := uuid_generate_v4();
BEGIN
  SELECT id INTO v_user_id FROM users ORDER BY created_at LIMIT 1;

  INSERT INTO jobs (id, title, brand, description, scope, start_date, end_date, status, budget, created_by)
  VALUES (
    v_job4_id,
    'Inauguração Café da Vila',
    'Café da Vila',
    'Cobertura da inauguração de novo café conceito na Vila Madalena.',
    'Presença no evento, cobertura ao vivo, reel do espaço e post feed.',
    '2026-04-05',
    '2026-04-12',
    'aberto',
    4000.00,
    v_user_id
  );

  -- Entregável 4.1: Evento
  INSERT INTO deliverables (id, job_id, title, type, category, description, status, due_date, due_time)
  VALUES (v_del1, v_job4_id, 'Presença na Inauguração', 'evento', 'evento', 'Comparecer ao evento de inauguração', 'pendente', '2026-04-08', '18:00:00');

  INSERT INTO deliverable_checklist_items (deliverable_id, label, completed, due_date, details, budget, sort_order) VALUES
    (v_del1, 'Confirmar presença', false, '2026-04-01', 'RSVP e escolher +1', NULL, 0),
    (v_del1, 'Look casual chic', false, '2026-04-07', 'Estilo boho, cores terrosas', 600.00, 1),
    (v_del1, 'Cobertura ao vivo', false, '2026-04-08', 'Stories do espaço, drinks, pratos', NULL, 2),
    (v_del1, 'Interagir com donos', false, '2026-04-08', 'Gravar entrevista rápida', NULL, 3);

  -- Entregável 4.2: Reel espaço
  INSERT INTO deliverables (id, job_id, title, type, category, description, status, due_date)
  VALUES (v_del2, v_job4_id, 'Reel Tour do Café', 'reel', 'midia', 'Reel mostrando decoração, ambiente e menu', 'pendente', '2026-04-10');

  INSERT INTO deliverable_checklist_items (deliverable_id, label, completed, due_date, details, budget, sort_order) VALUES
    (v_del2, 'Gravar tour', false, '2026-04-09', 'Manhã ou tarde com luz natural', 800.00, 0),
    (v_del2, 'Editar', false, '2026-04-10', 'Música indie, transições suaves', 400.00, 1),
    (v_del2, 'Publicar', false, '2026-04-10', 'Marcar localização e perfil do café', NULL, 2);

  RAISE NOTICE 'Job 4 criado: Café da Vila (2 entregáveis)';
END $$;

-- ==================== JOB 5: Campanha Maquiagem - Glamour Pro ====================
DO $$
DECLARE
  v_job5_id UUID := uuid_generate_v4();
  v_user_id UUID;
  v_del1 UUID := uuid_generate_v4();
  v_del2 UUID := uuid_generate_v4();
  v_del3 UUID := uuid_generate_v4();
BEGIN
  SELECT id INTO v_user_id FROM users ORDER BY created_at LIMIT 1;

  INSERT INTO jobs (id, title, brand, description, scope, start_date, end_date, status, budget, created_by)
  VALUES (
    v_job5_id,
    'Lançamento Paleta Sunset - Glamour Pro',
    'Glamour Pro Makeup',
    'Campanha de lançamento da paleta de sombras Sunset Collection.',
    '3 tutoriais de maquiagem, unboxing, stories e post fixo.',
    '2026-04-10',
    '2026-05-05',
    'aberto',
    10000.00,
    v_user_id
  );

  -- Entregável 5.1: Unboxing
  INSERT INTO deliverables (id, job_id, title, type, category, description, status, due_date)
  VALUES (v_del1, v_job5_id, 'Unboxing Paleta', 'unboxing', 'midia', 'Reel de unboxing e primeiras impressões', 'pendente', '2026-04-15');

  INSERT INTO deliverable_checklist_items (deliverable_id, label, completed, due_date, details, budget, sort_order) VALUES
    (v_del1, 'Receber produto', false, '2026-04-11', 'Confirmar recebimento e estado', NULL, 0),
    (v_del1, 'Gravar unboxing', false, '2026-04-14', 'Luz natural, close nas cores', 800.00, 1),
    (v_del1, 'Editar e publicar', false, '2026-04-15', 'Transição de cores, expectativa', 500.00, 2);

  -- Entregável 5.2: Tutoriais
  INSERT INTO deliverables (id, job_id, title, type, category, description, status, due_date)
  VALUES (v_del2, v_job5_id, '3 Tutoriais de Maquiagem', 'tutorial', 'midia', 'Três makes usando a paleta: dia, tarde, noite', 'pendente', '2026-04-25');

  INSERT INTO deliverable_checklist_items (deliverable_id, label, completed, due_date, details, budget, sort_order) VALUES
    (v_del2, 'Tutorial 1: Make dia', false, '2026-04-20', 'Soft glam com tons claros', 1200.00, 0),
    (v_del2, 'Tutorial 2: Make tarde', false, '2026-04-22', 'Transição dia/noite, tons médios', 1200.00, 1),
    (v_del2, 'Tutorial 3: Make noite', false, '2026-04-24', 'Esfumado dramático, brilho', 1200.00, 2),
    (v_del2, 'Editar compilado', false, '2026-04-25', 'Versões curtas para reels', 800.00, 3);

  -- Entregável 5.3: Post fixo
  INSERT INTO deliverables (id, job_id, title, type, category, description, status, due_date)
  VALUES (v_del3, v_job5_id, 'Post Feed Profissional', 'post', 'midia', 'Foto profissional com todas as makes da paleta', 'pendente', '2026-04-30');

  INSERT INTO deliverable_checklist_items (deliverable_id, label, completed, due_date, details, budget, sort_order) VALUES
    (v_del3, 'Contratar fotógrafo beauty', false, '2026-04-15', 'Especializado em makeup', 1500.00, 0),
    (v_del3, 'Sessão de fotos', false, '2026-04-27', '3 makes diferentes, 100+ fotos', 2000.00, 1),
    (v_del3, 'Editar e retocar', false, '2026-04-29', 'Color grading sunset, retoques', 600.00, 2),
    (v_del3, 'Legenda e publicação', false, '2026-04-30', 'Copy criativo, link e código desconto', NULL, 3);

  RAISE NOTICE 'Job 5 criado: Paleta Sunset (3 entregáveis)';
END $$;

-- ==================== JOB 6: Parceria Joias - Luna Acessórios ====================
DO $$
DECLARE
  v_job6_id UUID := uuid_generate_v4();
  v_user_id UUID;
  v_del1 UUID := uuid_generate_v4();
  v_del2 UUID := uuid_generate_v4();
BEGIN
  SELECT id INTO v_user_id FROM users ORDER BY created_at LIMIT 1;

  INSERT INTO jobs (id, title, brand, description, scope, start_date, end_date, status, budget, created_by)
  VALUES (
    v_job6_id,
    'Parceria Joias Delicadas - Luna',
    'Luna Acessórios',
    'Divulgação de coleção de joias delicadas e minimalistas.',
    '2 reels com looks usando as joias, carrossel no feed com close das peças.',
    '2026-05-01',
    '2026-05-20',
    'finalizado',
    3500.00,
    v_user_id
  );

  -- Entregável 6.1: Reels
  INSERT INTO deliverables (id, job_id, title, type, category, description, status, due_date, completed_at)
  VALUES (v_del1, v_job6_id, '2 Reels com as Joias', 'reel', 'midia', 'Reels mostrando joias em looks do dia a dia', 'entregue', '2026-05-10', NOW());

  INSERT INTO deliverable_checklist_items (deliverable_id, label, completed, completed_at, due_date, details, budget, sort_order) VALUES
    (v_del1, 'Reel 1: Casual chic', true, NOW(), '2026-05-08', 'Jeans, blazer, joias delicadas', 600.00, 0),
    (v_del1, 'Reel 2: Noite elegante', true, NOW(), '2026-05-09', 'Vestido preto, joias como destaque', 600.00, 1),
    (v_del1, 'Editar', true, NOW(), '2026-05-10', 'Música soft, close nas peças', 400.00, 2);

  -- Entregável 6.2: Carrossel feed
  INSERT INTO deliverables (id, job_id, title, type, category, description, status, due_date, completed_at)
  VALUES (v_del2, v_job6_id, 'Carrossel Feed com Close', 'post', 'midia', 'Carrossel com fotos detalhadas de cada peça', 'entregue', '2026-05-15', NOW());

  INSERT INTO deliverable_checklist_items (deliverable_id, label, completed, completed_at, due_date, details, budget, sort_order) VALUES
    (v_del2, 'Sessão de fotos macro', true, NOW(), '2026-05-12', 'Close extremo, fundo neutro', 1200.00, 0),
    (v_del2, 'Selecionar 8 fotos', true, NOW(), '2026-05-13', 'Uma foto por peça principal', NULL, 1),
    (v_del2, 'Editar e montar carrossel', true, NOW(), '2026-05-14', 'Ajuste de luz, consistência', 300.00, 2),
    (v_del2, 'Publicar com código desconto', true, NOW(), '2026-05-15', 'MALU15 para 15% off', NULL, 3);

  RAISE NOTICE 'Job 6 criado: Luna Joias (2 entregáveis) - FINALIZADO';
END $$;

-- ==================== CRIAR NOTIFICAÇÕES EXEMPLO ====================
DO $$
DECLARE
  v_user_id UUID;
  v_job_id UUID;
  v_del_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM users ORDER BY created_at LIMIT 1;
  SELECT id INTO v_job_id FROM jobs WHERE status = 'em_andamento' ORDER BY created_at LIMIT 1;
  SELECT id INTO v_del_id FROM deliverables WHERE status = 'em_producao' ORDER BY due_date LIMIT 1;
  
  IF v_user_id IS NOT NULL THEN
    -- Notificação de entregável próximo
    IF v_del_id IS NOT NULL THEN
      INSERT INTO user_notifications (user_id, title, message, type, entity_type, entity_id)
      VALUES (
        v_user_id,
        'Entregável vence em 3 dias!',
        'Não esqueça de finalizar a edição dos reels da campanha Glow Drops.',
        'deliverable_due',
        'deliverable',
        v_del_id
      );
    END IF;

    -- Notificação de campanha
    IF v_job_id IS NOT NULL THEN
      INSERT INTO user_notifications (user_id, title, message, type, entity_type, entity_id)
      VALUES (
        v_user_id,
        'Campanha em andamento',
        'A campanha Glow Drops está com 2 entregáveis pendentes. Revise o progresso!',
        'reminder',
        'job',
        v_job_id
      );
    END IF;

    RAISE NOTICE 'Notificações de exemplo criadas';
  END IF;
END $$;

-- ==================== RESUMO FINAL ====================
DO $$
DECLARE
  v_total_jobs INT;
  v_total_deliverables INT;
  v_total_checklist INT;
  v_total_budget DECIMAL;
  v_total_notifications INT;
BEGIN
  SELECT COUNT(*) INTO v_total_jobs FROM jobs;
  SELECT COUNT(*) INTO v_total_deliverables FROM deliverables;
  SELECT COUNT(*) INTO v_total_checklist FROM deliverable_checklist_items;
  SELECT COALESCE(SUM(budget), 0) INTO v_total_budget FROM jobs;
  SELECT COUNT(*) INTO v_total_notifications FROM user_notifications;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRATION 011 - SEED COMPLETO';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Jobs criados: %', v_total_jobs;
  RAISE NOTICE 'Entregáveis: %', v_total_deliverables;
  RAISE NOTICE 'Checklist items: %', v_total_checklist;
  RAISE NOTICE 'Orçamento total: R$ %', v_total_budget;
  RAISE NOTICE 'Notificações: %', v_total_notifications;
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Status dos jobs:';
  RAISE NOTICE '- Aberto: %', (SELECT COUNT(*) FROM jobs WHERE status = 'aberto');
  RAISE NOTICE '- Em andamento: %', (SELECT COUNT(*) FROM jobs WHERE status = 'em_andamento');
  RAISE NOTICE '- Finalizado: %', (SELECT COUNT(*) FROM jobs WHERE status = 'finalizado');
  RAISE NOTICE '========================================';
END $$;
