import type { Handler } from '@netlify/functions'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const SYSTEM_PROMPT = `Você é uma assistente de produção de conteúdo para influenciadoras digitais.
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

const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método não permitido.' }) }
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const { text } = body

    if (!text || typeof text !== 'string') {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'O campo "text" é obrigatório.' }) }
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Organize o seguinte briefing:\n\n${text}` },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    })

    const result = completion.choices[0]?.message?.content || 'Sem resultado da IA.'
    return { statusCode: 200, headers, body: JSON.stringify({ result }) }
  } catch (err: unknown) {
    console.error('Erro ao organizar briefing:', err)
    const message = err instanceof Error ? err.message : 'Erro interno'
    return { statusCode: 500, headers, body: JSON.stringify({ error: `Erro ao processar: ${message}` }) }
  }
}

export { handler }
