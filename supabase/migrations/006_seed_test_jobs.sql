-- ================================================================
-- MIGRATION 006: Seed de 5 Jobs de teste com entregáveis e datas
-- Execute no SQL Editor do Supabase APÓS as migrations anteriores
-- 
-- created_by usa o admin se existir, senão NULL
-- ================================================================

-- UUIDs fixos para facilitar re-execução
-- Jobs
-- b0000000-0000-0000-0000-000000000001  Job 1 - Campanha Verão
-- b0000000-0000-0000-0000-000000000002  Job 2 - Lançamento Skincare
-- b0000000-0000-0000-0000-000000000003  Job 3 - Collab Moda Fitness
-- b0000000-0000-0000-0000-000000000004  Job 4 - Festival de Música
-- b0000000-0000-0000-0000-000000000005  Job 5 - Campanha Dia das Mães

-- Limpar dados de teste anteriores (caso re-execute)
DELETE FROM important_dates WHERE job_id IN (
  'b0000000-0000-0000-0000-000000000001'::uuid,
  'b0000000-0000-0000-0000-000000000002'::uuid,
  'b0000000-0000-0000-0000-000000000003'::uuid,
  'b0000000-0000-0000-0000-000000000004'::uuid,
  'b0000000-0000-0000-0000-000000000005'::uuid
);
DELETE FROM deliverables WHERE job_id IN (
  'b0000000-0000-0000-0000-000000000001'::uuid,
  'b0000000-0000-0000-0000-000000000002'::uuid,
  'b0000000-0000-0000-0000-000000000003'::uuid,
  'b0000000-0000-0000-0000-000000000004'::uuid,
  'b0000000-0000-0000-0000-000000000005'::uuid
);
DELETE FROM jobs WHERE id IN (
  'b0000000-0000-0000-0000-000000000001'::uuid,
  'b0000000-0000-0000-0000-000000000002'::uuid,
  'b0000000-0000-0000-0000-000000000003'::uuid,
  'b0000000-0000-0000-0000-000000000004'::uuid,
  'b0000000-0000-0000-0000-000000000005'::uuid
);

-- ================================================================
-- JOB 1: Campanha Verão - Marca de Protetor Solar (em andamento)
-- ================================================================
INSERT INTO jobs (id, title, brand, description, scope, start_date, end_date, status, briefing, brainstorm, budget, created_by) VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'Campanha Verão 2026 - Sol Protect',
  'Sol Protect',
  'Campanha de verão para divulgação da nova linha de protetor solar com vitamina C. Foco em público jovem, praia e lifestyle.',
  '3 Reels, 5 Stories, 1 Post carrossel, 1 GRWM com produto',
  '2026-01-15',
  '2026-03-15',
  'em_andamento',
  'Oi Malu! Queremos uma campanha bem verão, com vibe de praia. A ideia é mostrar o protetor sendo usado no dia a dia - praia, piscina, rolê ao ar livre. O diferencial do produto é a vitamina C que ilumina a pele. Público: mulheres 18-30 anos. Pode usar música trending no Reels. Queremos ver o antes/depois da aplicação. Hashtags obrigatórias: #SolProtect #PeleIluminada #VerãoComProteção',
  'Ideias: 
- Reel "minha rotina de praia" mostrando o produto no necessaire
- GRWM de "dia de praia" com o protetor como protagonista
- Stories de "mitos e verdades sobre protetor solar"
- Carrossel com dicas de skincare no verão
- Transição antes/depois com a pele glow',
  8500.00,
  (SELECT id FROM auth.users WHERE id = 'a0000000-0000-0000-0000-000000000001'::uuid)
);

-- Entregáveis do Job 1
INSERT INTO deliverables (job_id, title, type, description, status, due_date) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'Reel - Rotina de praia', 'reel', 'Reel mostrando o protetor na rotina de praia, 30-60s', 'entregue', '2026-01-30'),
  ('b0000000-0000-0000-0000-000000000001', 'Reel - Antes e depois', 'reel', 'Transição com pele sem e com protetor, efeito glow', 'em_producao', '2026-02-15'),
  ('b0000000-0000-0000-0000-000000000001', 'Reel - Dia de sol', 'reel', 'Lifestyle ao ar livre com o produto', 'pendente', '2026-02-28'),
  ('b0000000-0000-0000-0000-000000000001', 'Carrossel - Dicas skincare verão', 'post', 'Carrossel com 5-7 slides sobre cuidados no verão', 'em_producao', '2026-02-10'),
  ('b0000000-0000-0000-0000-000000000001', 'GRWM - Dia de praia', 'reel', 'Get Ready With Me preparando para a praia', 'pendente', '2026-03-01'),
  ('b0000000-0000-0000-0000-000000000001', 'Stories - Mitos e verdades', 'stories', '5 stories com quiz/enquete sobre protetor solar', 'entregue', '2026-01-25'),
  ('b0000000-0000-0000-0000-000000000001', 'Stories - Dia a dia', 'stories', 'Sequência de stories usando o produto em momentos diferentes', 'pendente', '2026-02-20');

-- Datas importantes do Job 1
INSERT INTO important_dates (job_id, label, date, description) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'Recebimento dos produtos', '2026-01-20', 'Kit com 3 protetores + necessaire de verão'),
  ('b0000000-0000-0000-0000-000000000001', 'Captação praia', '2026-02-05', 'Diária de gravação na praia com fotógrafo'),
  ('b0000000-0000-0000-0000-000000000001', 'Deadline aprovação', '2026-02-25', 'Marca precisa aprovar todos os conteúdos'),
  ('b0000000-0000-0000-0000-000000000001', 'Publicação final', '2026-03-10', 'Todos os conteúdos devem estar publicados');

-- ================================================================
-- JOB 2: Lançamento Skincare (em aberto)
-- ================================================================
INSERT INTO jobs (id, title, brand, description, scope, start_date, end_date, status, briefing, brainstorm, budget, created_by) VALUES (
  'b0000000-0000-0000-0000-000000000002',
  'Lançamento Sérum Hidratante - Glow Lab',
  'Glow Lab',
  'Divulgação do novo sérum hidratante com ácido hialurônico. Produto premium, foco em resultados e rotina de skincare.',
  '2 Reels, 3 Stories, 1 Unboxing',
  '2026-03-01',
  '2026-04-15',
  'aberto',
  'Malu, estamos lançando nosso sérum com ácido hialurônico concentrado. Queremos conteúdo que mostre a textura do produto, a aplicação, e se possível um diário de uso (antes/depois ao longo dos dias). O público é mulher 25-40, que investe em skincare. Tom: sofisticado mas acessível. Não pode comparar com concorrentes. Obrigatório: link na bio para compra.',
  'Ideias:
- Unboxing premium com close no packaging
- "7 dias usando" com diário em stories
- Reel ASMR com a textura do sérum
- Reel educativo sobre ácido hialurônico',
  6000.00,
  (SELECT id FROM auth.users WHERE id = 'a0000000-0000-0000-0000-000000000001'::uuid)
);

-- Entregáveis do Job 2
INSERT INTO deliverables (job_id, title, type, description, status, due_date) VALUES
  ('b0000000-0000-0000-0000-000000000002', 'Unboxing premium', 'reel', 'Vídeo de unboxing mostrando o packaging e primeira impressão', 'pendente', '2026-03-10'),
  ('b0000000-0000-0000-0000-000000000002', 'Reel - ASMR textura', 'reel', 'Close-up da textura do sérum, estilo ASMR satisfatório', 'pendente', '2026-03-20'),
  ('b0000000-0000-0000-0000-000000000002', 'Stories - Diário 7 dias', 'stories', 'Sequência diária mostrando o uso e evolução da pele', 'pendente', '2026-03-25'),
  ('b0000000-0000-0000-0000-000000000002', 'Stories - Rotina noturna', 'stories', '3 stories da rotina noturna com o sérum', 'pendente', '2026-04-01'),
  ('b0000000-0000-0000-0000-000000000002', 'Stories - FAQ', 'stories', 'Respondendo perguntas sobre o produto via caixinha', 'pendente', '2026-04-10');

-- Datas importantes do Job 2
INSERT INTO important_dates (job_id, label, date, description) VALUES
  ('b0000000-0000-0000-0000-000000000002', 'Envio do produto', '2026-02-25', 'Marca envia o sérum + kit de boas-vindas'),
  ('b0000000-0000-0000-0000-000000000002', 'Início do diário', '2026-03-05', 'Começar o diário de 7 dias de uso'),
  ('b0000000-0000-0000-0000-000000000002', 'Data de lançamento oficial', '2026-03-15', 'O produto entra no mercado oficialmente');

-- ================================================================
-- JOB 3: Collab Moda Fitness (finalizado)
-- ================================================================
INSERT INTO jobs (id, title, brand, description, scope, start_date, end_date, status, briefing, brainstorm, budget, created_by) VALUES (
  'b0000000-0000-0000-0000-000000000003',
  'Collab Coleção Fitness - Move Wear',
  'Move Wear',
  'Parceria para divulgação da nova coleção fitness outono/inverno. Peças com tecnologia dry-fit e design moderno.',
  '2 Reels, 4 Stories, 1 Try-on haul',
  '2025-11-01',
  '2025-12-20',
  'finalizado',
  'Malu! Estamos lançando a coleção Outono/Inverno de roupas fitness. Queremos que você mostre as peças sendo usadas no treino e no dia a dia (athleisure). Peças em tons de terracota, verde musgo e preto. Pode misturar com peças suas pra dar o toque pessoal. Cupom de desconto exclusivo: MALU15. Stories com provador + link.',
  'Ideias já aprovadas:
- Try-on haul com todos os looks
- Reel treinando com a roupa (academia)
- Stories "do treino pro café" mostrando versatilidade
- Caixinha de perguntas "onde comprar"',
  5500.00,
  (SELECT id FROM auth.users WHERE id = 'a0000000-0000-0000-0000-000000000001'::uuid)
);

-- Entregáveis do Job 3 (todos entregues)
INSERT INTO deliverables (job_id, title, type, description, status, due_date, completed_at) VALUES
  ('b0000000-0000-0000-0000-000000000003', 'Try-on haul completo', 'reel', 'Vídeo provando todas as peças da coleção', 'entregue', '2025-11-15', '2025-11-14T18:30:00Z'),
  ('b0000000-0000-0000-0000-000000000003', 'Reel - Treino com look', 'reel', 'Reel treinando na academia com os looks', 'entregue', '2025-11-25', '2025-11-23T10:00:00Z'),
  ('b0000000-0000-0000-0000-000000000003', 'Stories - Do treino ao café', 'stories', '4 stories mostrando versatilidade das peças', 'entregue', '2025-12-01', '2025-11-30T14:00:00Z'),
  ('b0000000-0000-0000-0000-000000000003', 'Stories - Cupom MALU15', 'stories', '2 stories divulgando o cupom de desconto', 'entregue', '2025-12-05', '2025-12-04T09:00:00Z'),
  ('b0000000-0000-0000-0000-000000000003', 'Stories - Caixinha FAQ', 'stories', 'Respondendo perguntas sobre tamanhos, tecido, etc.', 'entregue', '2025-12-10', '2025-12-09T16:00:00Z'),
  ('b0000000-0000-0000-0000-000000000003', 'Stories - Repost UGC', 'stories', 'Repostar stories das seguidoras usando a coleção', 'entregue', '2025-12-15', '2025-12-14T11:00:00Z');

-- Datas importantes do Job 3
INSERT INTO important_dates (job_id, label, date, description) VALUES
  ('b0000000-0000-0000-0000-000000000003', 'Recebimento das peças', '2025-10-28', 'Kit com 6 peças + cartão personalizado'),
  ('b0000000-0000-0000-0000-000000000003', 'Captação academia', '2025-11-10', 'Gravação na academia parceira'),
  ('b0000000-0000-0000-0000-000000000003', 'Relatório de métricas', '2025-12-22', 'Enviar print de métricas para a marca');

-- ================================================================
-- JOB 4: Festival de Música (em andamento)
-- ================================================================
INSERT INTO jobs (id, title, brand, description, scope, start_date, end_date, status, briefing, brainstorm, budget, created_by) VALUES (
  'b0000000-0000-0000-0000-000000000004',
  'Cobertura Festival SoundWave 2026',
  'SoundWave Festival',
  'Cobertura completa do festival de música eletrônica. Criação de conteúdo ao vivo e pós-evento com foco em experiência e lifestyle.',
  '4 Reels, Stories ao vivo, 1 Vlog',
  '2026-02-01',
  '2026-03-01',
  'em_andamento',
  'Malu, você foi convidada como creator oficial do SoundWave 2026! O festival acontece dias 22 e 23 de fevereiro. Queremos: cobertura ao vivo nos stories, reels dos melhores momentos, e um vlog recap depois. Vamos fornecer pulseira VIP + acompanhante. Dress code: neon/futurista. Mencionar @soundwavefest em tudo. Conteúdo mais espontâneo possível, sem roteiro rígido.',
  'Ideias:
- Reel "get ready for the festival" com look neon
- Stories ao vivo dos shows principais
- Reel recap com melhores momentos (slow motion + música)
- Vlog "um dia no festival" estilo vlog casual
- Before/after do look de festival',
  12000.00,
  (SELECT id FROM auth.users WHERE id = 'a0000000-0000-0000-0000-000000000001'::uuid)
);

-- Entregáveis do Job 4
INSERT INTO deliverables (job_id, title, type, description, status, due_date) VALUES
  ('b0000000-0000-0000-0000-000000000004', 'Reel - GRWM Festival', 'reel', 'Get ready with me para o festival, look neon', 'entregue', '2026-02-21'),
  ('b0000000-0000-0000-0000-000000000004', 'Stories - Cobertura Dia 1', 'stories', 'Stories ao vivo do primeiro dia do festival', 'entregue', '2026-02-22'),
  ('b0000000-0000-0000-0000-000000000004', 'Stories - Cobertura Dia 2', 'stories', 'Stories ao vivo do segundo dia do festival', 'entregue', '2026-02-23'),
  ('b0000000-0000-0000-0000-000000000004', 'Reel - Recap melhores momentos', 'reel', 'Compilação dos melhores momentos, slow motion', 'em_producao', '2026-02-28'),
  ('b0000000-0000-0000-0000-000000000004', 'Reel - After movie', 'reel', 'Mini documentário do festival, 90s', 'pendente', '2026-03-05'),
  ('b0000000-0000-0000-0000-000000000004', 'Vlog completo', 'vlog', 'Vlog "meu dia no festival" para YouTube/Reels longo', 'pendente', '2026-03-10');

-- Datas importantes do Job 4
INSERT INTO important_dates (job_id, label, date, description) VALUES
  ('b0000000-0000-0000-0000-000000000004', 'Retirada pulseiras VIP', '2026-02-20', 'Retirar credenciais no hotel parceiro'),
  ('b0000000-0000-0000-0000-000000000004', 'Dia 1 do Festival', '2026-02-22', 'Line-up: DJ Alpha, Neon Pulse, Midnight Bass'),
  ('b0000000-0000-0000-0000-000000000004', 'Dia 2 do Festival', '2026-02-23', 'Line-up: Solar Beats, Echo Wave, Grand Finale'),
  ('b0000000-0000-0000-0000-000000000004', 'Deadline entrega conteúdo', '2026-03-10', 'Todo conteúdo pós-evento deve estar pronto');

-- ================================================================
-- JOB 5: Campanha Dia das Mães (cancelado - exemplo de status)
-- ================================================================
INSERT INTO jobs (id, title, brand, description, scope, start_date, end_date, status, briefing, brainstorm, budget, created_by) VALUES (
  'b0000000-0000-0000-0000-000000000005',
  'Campanha Dia das Mães - Joia Rara',
  'Joia Rara',
  'Campanha para o Dia das Mães com foco em jóias e acessórios. A marca decidiu cancelar por reestruturação interna.',
  '2 Reels, 3 Stories, 1 Post estático',
  '2026-04-01',
  '2026-05-10',
  'cancelado',
  'Oi Malu! Estamos preparando uma campanha linda pro Dia das Mães. Queremos que você faça conteúdo mostrando nossas jóias como presente ideal. Foco em emoção e conexão mãe-filha. Peças: colar coração, brinco pérola, pulseira infinito. Tom: delicado e emocional. Música suave nos reels.',
  'Ideias pensadas (antes do cancelamento):
- Reel "presenteando minha mãe" com reação
- Reel "jóias que contam histórias" estilo emocional
- Stories mostrando as peças de perto
- Post com frase sobre mães + foto usando as jóias',
  4000.00,
  (SELECT id FROM auth.users WHERE id = 'a0000000-0000-0000-0000-000000000001'::uuid)
);

-- Entregáveis do Job 5 (todos pendentes - cancelado)
INSERT INTO deliverables (job_id, title, type, description, status, due_date) VALUES
  ('b0000000-0000-0000-0000-000000000005', 'Reel - Presenteando minha mãe', 'reel', 'Vídeo surpresa presenteando a mãe com a jóia', 'pendente', '2026-04-25'),
  ('b0000000-0000-0000-0000-000000000005', 'Reel - Jóias que contam histórias', 'reel', 'Conteúdo emocional sobre significado das jóias', 'pendente', '2026-05-01'),
  ('b0000000-0000-0000-0000-000000000005', 'Stories - Close nas peças', 'stories', 'Stories mostrando detalhes das jóias', 'pendente', '2026-04-20'),
  ('b0000000-0000-0000-0000-000000000005', 'Post - Frase + look', 'post', 'Foto usando as jóias com frase sobre mães', 'pendente', '2026-05-05');

-- Datas importantes do Job 5
INSERT INTO important_dates (job_id, label, date, description) VALUES
  ('b0000000-0000-0000-0000-000000000005', 'Envio das jóias', '2026-03-28', 'Marca envia kit com 3 peças'),
  ('b0000000-0000-0000-0000-000000000005', 'Dia das Mães', '2026-05-10', 'Data oficial - conteúdo deve estar publicado');
