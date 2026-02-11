const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || ''
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface GroqResponse {
  choices?: { message: { content: string } }[]
  error?: { message: string }
}

async function callGroq(messages: ChatMessage[], temperature = 0.3): Promise<string> {
  if (!GROQ_API_KEY) {
    throw new Error('Chave do Groq não configurada. Adicione VITE_GROQ_API_KEY no .env.')
  }

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages,
      temperature,
      max_tokens: 2000,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({})) as GroqResponse
    throw new Error(err?.error?.message || `Erro na API Groq: ${response.status}`)
  }

  const data: GroqResponse = await response.json()
  const text = data.choices?.[0]?.message?.content
  if (!text) throw new Error('Resposta vazia da IA.')
  return text
}

// ======================== ORGANIZAR BRIEFING ========================

const BRIEFING_SYSTEM_PROMPT = `Você é uma assistente de produção de conteúdo para influenciadoras digitais.
Sua tarefa é receber um briefing bagunçado (mensagens de WhatsApp, e-mails, notas soltas) e organizá-lo de forma profissional.

Organize o briefing nas seguintes seções (use apenas as que fizerem sentido):

📋 BRIEFING ORGANIZADO
═══════════════════════

▸ MARCA / CLIENTE
Nome da marca e contexto.

▸ OBJETIVO DA CAMPANHA
O que a marca quer alcançar.

▸ ENTREGÁVEIS
Lista de conteúdos a produzir (reels, stories, posts, etc.) com detalhes.

▸ PÚBLICO-ALVO
Quem é o público da campanha.

▸ DIRETRIZES E RESTRIÇÕES
Do's e don'ts, tom de voz, hashtags obrigatórias, etc.

▸ DATAS E PRAZOS
Datas mencionadas para entrega, publicação, eventos.

▸ OBSERVAÇÕES
Qualquer informação adicional relevante.

Seja conciso mas completo. Use bullet points. Mantenha o tom profissional mas acessível.
Se alguma informação estiver faltando, sinalize com "[PENDENTE: ...]".
Responda sempre em português brasileiro.`

export async function organizarBriefing(text: string): Promise<string> {
  return callGroq([
    { role: 'system', content: BRIEFING_SYSTEM_PROMPT },
    { role: 'user', content: `Organize o seguinte briefing:\n\n${text}` },
  ])
}

// ======================== ANALISAR PENDÊNCIAS ========================

function buildPendenciasPrompt(): string {
  return `Você é uma assistente de gestão de projetos para uma influenciadora digital.
Sua tarefa é analisar os dados de um job (campanha) e gerar um relatório inteligente de pendências e recomendações.

Analise os dados fornecidos e gere um relatório com:

📊 ANÁLISE DE PENDÊNCIAS
═══════════════════════

▸ STATUS GERAL
Resumo do andamento do job.

▸ ALERTAS URGENTES
Itens atrasados, prazos muito próximos (< 3 dias), problemas.

▸ PENDÊNCIAS
Lista detalhada dos entregáveis pendentes com sugestão de prioridade.

▸ PRÓXIMAS DATAS
Datas importantes nos próximos 7 dias.

▸ RECOMENDAÇÕES
Sugestões práticas para avançar o job (ex: briefing vazio, entregáveis faltando, reorganizar prioridades).

▸ PROGRESSO
Resumo percentual simples do progresso do job.

Seja direto, prático e objetivo. Use emojis para facilitar a leitura.
Responda sempre em português brasileiro.
A data de hoje é: ${new Date().toLocaleDateString('pt-BR')}.`
}

interface JobData {
  title: string
  brand: string
  status: string
  start_date: string
  end_date: string
  briefing?: string
  scope?: string
  budget?: string
}

interface DeliverableData {
  title: string
  type: string
  status: string
  due_date?: string
}

interface DateData {
  label: string
  date: string
}

export async function analisarPendencias(
  job: JobData,
  deliverables: DeliverableData[],
  dates: DateData[]
): Promise<string> {
  const jobContext = `
JOB: ${job.title}
MARCA: ${job.brand}
STATUS: ${job.status}
PERÍODO: ${job.start_date} até ${job.end_date}
BRIEFING: ${job.briefing || '(vazio)'}
ESCOPO: ${job.scope || '(vazio)'}
ORÇAMENTO: ${job.budget || '(não informado)'}

ENTREGÁVEIS (${deliverables.length} total):
${deliverables.map((d) =>
  `- ${d.title} | Tipo: ${d.type} | Status: ${d.status} | Prazo: ${d.due_date || 'sem prazo'}`
).join('\n') || '(nenhum cadastrado)'}

DATAS IMPORTANTES:
${dates.map((d) =>
  `- ${d.label}: ${d.date}`
).join('\n') || '(nenhuma cadastrada)'}
`.trim()

  return callGroq([
    { role: 'system', content: buildPendenciasPrompt() },
    { role: 'user', content: `Analise as pendências deste job:\n\n${jobContext}` },
  ])
}

// ======================== EXTRAIR DADOS DO BRIEFING ========================

export interface ExtractedJobData {
  title: string
  brand: string
  description: string
  scope: string
  start_date: string
  end_date: string
  briefing: string
  brainstorm: string
  budget: string
  deliverables: {
    title: string
    category: string
    description: string
    due_date: string
    checklist: {
      label: string
      due_date: string
      details: string
    }[]
  }[]
}

function buildExtractPrompt(): string {
  const year = new Date().getFullYear()
  return `Você é uma assistente que extrai dados estruturados de textos sobre campanhas de influenciadores digitais.

TAREFA: Leia o texto do usuário com MUITA ATENÇÃO e extraia SOMENTE as informações que estão EXPLICITAMENTE mencionadas no texto. NÃO invente, NÃO suponha, NÃO adicione informações que não estejam no texto.

Retorne APENAS um JSON válido (sem markdown, sem \`\`\`), neste formato:

{
  "title": "Campanha [nome do produto/marca] - [marca]",
  "brand": "",
  "description": "",
  "scope": "",
  "start_date": "",
  "end_date": "",
  "briefing": "",
  "brainstorm": "",
  "budget": "",
  "deliverables": []
}

REGRAS CRÍTICAS:

1. TITLE: Crie um título curto e descritivo baseado no texto. Formato: "Campanha [Produto/Tema] - [Marca]". Se não tiver marca, use só o tema.

2. BRAND: Extraia o nome EXATO da marca mencionada. Se não tiver, deixe "".

3. DATAS: Ano padrão é ${year}. Formate como YYYY-MM-DD.
   - "15/03" → "${year}-03-15"
   - "28 de março" → "${year}-03-28"
   - Se mencionar período (ex: "entre 25 e 28 de março"), use a primeira como start_date e a última como end_date.

4. BUDGET: Apenas o número. "R$ 8.500" → "8500". "8.500,00" → "8500". Se não mencionado, "".

5. DELIVERABLES: Cada entregável com categoria, checklist interno e data.
   O campo "category" DEVE ser exatamente um destes valores: midia, captacao, publicidade, evento, outros

   Mapeamento de conteúdo para categoria:
   - midia: reel, stories, post, feed, vídeo, foto, live, review, unboxing
   - captacao: filmagem, gravação, sessão de fotos, bastidores
   - publicidade: publi, anúncio, campanha paga, mídia paga, ads
   - evento: presença, lançamento, inauguração, coquetel, ativação
   - outros: qualquer coisa que não se encaixe

   Se o texto diz "3 reels", crie 3 entregáveis separados:
   {"title": "Reel 1 - [tema do texto]", "category": "midia", "description": "...", "due_date": "", "checklist": [{"label": "Gravar conteúdo", "due_date": "", "details": ""}]}

   Cada entregável DEVE ter um "checklist" com tarefas internas. Crie pelo menos 1-3 itens relevantes baseados no contexto (ex: "Gravar conteúdo", "Editar vídeo", "Enviar para aprovação", "Publicar").

   Datas de reuniões, envios, prazos de aprovação devem virar itens de checklist dentro do entregável mais relevante.

6. BRIEFING: Reorganize o texto original de forma limpa e organizada com bullet points.

7. BRAINSTORM: Extraia APENAS ideias criativas mencionadas no texto (referências, tom, estilo). Se não tiver, "".

8. SCOPE: Liste o que está incluído no trabalho baseado nos entregáveis.

IMPORTANTE: NÃO use dados de exemplo. Use APENAS o que está no texto do usuário. Se uma informação não existe no texto, o campo deve ser "".`
}

export async function extrairDadosJob(text: string): Promise<ExtractedJobData> {
  const raw = await callGroq([
    { role: 'system', content: buildExtractPrompt() },
    {
      role: 'user',
      content: `Leia o texto abaixo e extraia os dados. Retorne APENAS o JSON, nada mais.\n\nTEXTO:\n"""\n${text}\n"""`,
    },
  ], 0.05)

  // Limpar possíveis marcadores markdown
  let cleaned = raw.trim()
  // Remover ```json ... ``` se presente
  const jsonBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonBlockMatch) {
    cleaned = jsonBlockMatch[1].trim()
  }
  // Tentar encontrar o JSON se tiver texto antes/depois
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    cleaned = jsonMatch[0]
  }

  try {
    const parsed = JSON.parse(cleaned) as ExtractedJobData

    const validCategories = ['midia', 'captacao', 'publicidade', 'evento', 'outros']

    // Sanitizar: garantir arrays e tipos corretos
    return {
      title: parsed.title || '',
      brand: parsed.brand || '',
      description: parsed.description || '',
      scope: parsed.scope || '',
      start_date: parsed.start_date || '',
      end_date: parsed.end_date || '',
      briefing: parsed.briefing || '',
      brainstorm: parsed.brainstorm || '',
      budget: parsed.budget ? String(parsed.budget).replace(/[^\d.]/g, '') : '',
      deliverables: Array.isArray(parsed.deliverables)
        ? parsed.deliverables.map((d) => ({
            title: d.title || '',
            category: validCategories.includes((d.category || '').toLowerCase().trim())
              ? (d.category || 'outros').toLowerCase().trim()
              : 'outros',
            description: d.description || '',
            due_date: d.due_date || '',
            checklist: Array.isArray(d.checklist)
              ? d.checklist.map((c: { label?: string; due_date?: string; details?: string }) => ({
                  label: c.label || '',
                  due_date: c.due_date || '',
                  details: c.details || '',
                }))
              : [],
          }))
        : [],
    }
  } catch {
    throw new Error('A IA não retornou um formato válido. Tente novamente com um texto mais detalhado.')
  }
}
