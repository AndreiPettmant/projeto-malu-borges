import type { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const SYSTEM_PROMPT = `Você é uma assistente de gestão de projetos para uma influenciadora digital.
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

const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método não permitido.' }) }
  }

  try {
    const jobId = event.queryStringParameters?.jobId

    if (!jobId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'O parâmetro "jobId" é obrigatório.' }) }
    }

    // Buscar dados do job
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Job não encontrado.' }) }
    }

    const { data: deliverables } = await supabase
      .from('deliverables')
      .select('*')
      .eq('job_id', jobId)

    const { data: dates } = await supabase
      .from('important_dates')
      .select('*')
      .eq('job_id', jobId)

    // Montar contexto para a IA
    const jobContext = `
JOB: ${job.title}
MARCA: ${job.brand}
STATUS: ${job.status}
PERÍODO: ${job.start_date} até ${job.end_date}
BRIEFING: ${job.briefing || '(vazio)'}
ESCOPO: ${job.scope || '(vazio)'}
ORÇAMENTO: ${job.budget || '(não informado)'}

ENTREGÁVEIS (${(deliverables || []).length} total):
${(deliverables || []).map((d: Record<string, string>) =>
  `- ${d.title} | Tipo: ${d.type} | Status: ${d.status} | Prazo: ${d.due_date || 'sem prazo'}`
).join('\n') || '(nenhum cadastrado)'}

DATAS IMPORTANTES:
${(dates || []).map((d: Record<string, string>) =>
  `- ${d.label}: ${d.date}`
).join('\n') || '(nenhuma cadastrada)'}
`.trim()

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Analise as pendências deste job:\n\n${jobContext}` },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    })

    const result = completion.choices[0]?.message?.content || 'Sem resultado da IA.'
    return { statusCode: 200, headers, body: JSON.stringify({ result }) }
  } catch (err: unknown) {
    console.error('Erro ao analisar pendências:', err)
    const message = err instanceof Error ? err.message : 'Erro interno'
    return { statusCode: 500, headers, body: JSON.stringify({ error: `Erro ao processar: ${message}` }) }
  }
}

export { handler }
