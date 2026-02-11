import { useState, useEffect } from 'react'
import {
  Sparkles, FileText, AlertTriangle, Loader2, Copy, Check, ChevronDown, Bot,
  Tag, Target, Package, Users, ShieldAlert, Calendar, MessageSquare,
  TrendingUp, AlertCircle, Lightbulb, BarChart3, Clock,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { organizarBriefing, analisarPendencias } from '../lib/groq'

interface JobOption {
  id: string
  title: string
  brand: string
  status: string
}

// ======================== RENDERIZADOR VISUAL ========================

interface ParsedSection {
  icon: string
  title: string
  content: string[]
}

function parseAIResponse(text: string): ParsedSection[] {
  const sections: ParsedSection[] = []
  const lines = text.split('\n')
  let currentSection: ParsedSection | null = null

  for (const line of lines) {
    const trimmed = line.trim()

    // Pular linhas decorativas
    if (/^[═─━─]+$/.test(trimmed) || trimmed === '') continue

    // Detectar título de seção (▸ TÍTULO ou ## TÍTULO ou **TÍTULO**)
    const sectionMatch = trimmed.match(/^(?:▸|►|▶|##?|📋|📊)\s*(.+)$/i)
    if (sectionMatch) {
      const title = sectionMatch[1].replace(/\*\*/g, '').trim()
      // Pular o título principal do documento
      if (title.includes('BRIEFING ORGANIZADO') || title.includes('ANÁLISE DE PENDÊNCIAS')) continue

      currentSection = { icon: detectIcon(title), title, content: [] }
      sections.push(currentSection)
      continue
    }

    // Adicionar conteúdo à seção atual
    if (currentSection) {
      if (trimmed) {
        // Limpar marcadores de bullet
        const cleaned = trimmed.replace(/^[•\-\*]\s*/, '').replace(/^\d+\.\s*/, '')
        currentSection.content.push(cleaned)
      }
    } else if (trimmed && !trimmed.startsWith('📋') && !trimmed.startsWith('📊')) {
      // Conteúdo antes da primeira seção → criar seção "Resumo"
      currentSection = { icon: 'summary', title: 'Resumo', content: [trimmed] }
      sections.push(currentSection)
    }
  }

  return sections.filter((s) => s.content.length > 0)
}

function detectIcon(title: string): string {
  const lower = title.toLowerCase()
  if (lower.includes('marca') || lower.includes('cliente')) return 'brand'
  if (lower.includes('objetivo')) return 'target'
  if (lower.includes('entregáve') || lower.includes('entregave')) return 'deliverables'
  if (lower.includes('público') || lower.includes('publico')) return 'audience'
  if (lower.includes('diretriz') || lower.includes('restriç')) return 'rules'
  if (lower.includes('data') || lower.includes('prazo') || lower.includes('próxim')) return 'dates'
  if (lower.includes('observaç')) return 'notes'
  if (lower.includes('status')) return 'status'
  if (lower.includes('alerta') || lower.includes('urgente')) return 'alert'
  if (lower.includes('pendência') || lower.includes('pendencia')) return 'pending'
  if (lower.includes('recomend') || lower.includes('sugest')) return 'suggestions'
  if (lower.includes('progresso')) return 'progress'
  return 'default'
}

const SECTION_STYLES: Record<string, { icon: typeof Tag; color: string; bg: string; border: string }> = {
  brand: { icon: Tag, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100' },
  target: { icon: Target, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
  deliverables: { icon: Package, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
  audience: { icon: Users, color: 'text-pink-600', bg: 'bg-pink-50', border: 'border-pink-100' },
  rules: { icon: ShieldAlert, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' },
  dates: { icon: Calendar, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
  notes: { icon: MessageSquare, color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' },
  status: { icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
  alert: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' },
  pending: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
  suggestions: { icon: Lightbulb, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-100' },
  progress: { icon: BarChart3, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
  summary: { icon: FileText, color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' },
  default: { icon: FileText, color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' },
}

function AIResultRenderer({ text, type }: { text: string; type: 'briefing' | 'pendencias' }) {
  const sections = parseAIResponse(text)

  // Fallback: se o parser não conseguir extrair seções, mostrar formatado
  if (sections.length === 0) {
    return (
      <div className="space-y-3">
        {text.split('\n\n').filter(Boolean).map((block, i) => (
          <div key={i} className="text-sm text-gray-700 leading-relaxed">
            {block.split('\n').map((line, j) => (
              <p key={j} className={line.trim().startsWith('•') || line.trim().startsWith('-') ? 'pl-4 py-0.5' : 'py-0.5'}>
                {line}
              </p>
            ))}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Badge de tipo */}
      <div className="flex items-center gap-2">
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
          type === 'briefing' ? 'bg-gray-100 text-gray-700' : 'bg-amber-50 text-amber-700'
        }`}>
          <Sparkles size={12} />
          {type === 'briefing' ? 'Briefing Organizado pela IA' : 'Análise de Pendências pela IA'}
        </div>
      </div>

      {/* Seções */}
      {sections.map((section, i) => {
        const style = SECTION_STYLES[section.icon] || SECTION_STYLES.default
        const SectionIcon = style.icon

        return (
          <div key={i} className={`rounded-xl border ${style.border} overflow-hidden`}>
            {/* Header da seção */}
            <div className={`px-4 py-2.5 ${style.bg} flex items-center gap-2`}>
              <SectionIcon size={15} className={style.color} />
              <h3 className={`text-sm font-semibold ${style.color}`}>
                {section.title.replace(/[*_]/g, '')}
              </h3>
            </div>

            {/* Conteúdo */}
            <div className="px-4 py-3 bg-white">
              <ul className="space-y-1.5">
                {section.content.map((item, j) => {
                  // Detectar itens de alerta/urgente
                  const isAlert = item.includes('⚠️') || item.includes('ATRASADO') || item.includes('URGENTE')
                  const isOk = item.includes('✅') || item.includes('concluíd')
                  const isPending = item.includes('⏳') || item.includes('PENDENTE') || item.includes('[PENDENTE')

                  return (
                    <li
                      key={j}
                      className={`text-sm leading-relaxed flex items-start gap-2 ${
                        isAlert ? 'text-red-700 font-medium' :
                        isOk ? 'text-emerald-700' :
                        isPending ? 'text-amber-600' :
                        'text-gray-700'
                      }`}
                    >
                      <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        isAlert ? 'bg-red-400' :
                        isOk ? 'bg-emerald-400' :
                        isPending ? 'bg-amber-400' :
                        'bg-gray-300'
                      }`} />
                      <span>{item}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ======================== PÁGINA PRINCIPAL ========================

export default function AIAssistantPage() {
  const [briefingInput, setBriefingInput] = useState('')
  const [briefingResult, setBriefingResult] = useState('')
  const [selectedJobId, setSelectedJobId] = useState('')
  const [jobs, setJobs] = useState<JobOption[]>([])
  const [pendenciasResult, setPendenciasResult] = useState('')
  const [loadingBriefing, setLoadingBriefing] = useState(false)
  const [loadingPendencias, setLoadingPendencias] = useState(false)
  const [copiedBriefing, setCopiedBriefing] = useState(false)
  const [copiedPendencias, setCopiedPendencias] = useState(false)
  const [errorBriefing, setErrorBriefing] = useState('')
  const [errorPendencias, setErrorPendencias] = useState('')

  useEffect(() => {
    loadJobs()
  }, [])

  async function loadJobs() {
    const { data } = await supabase
      .from('jobs')
      .select('id, title, brand, status')
      .order('created_at', { ascending: false })
    if (data) setJobs(data)
  }

  async function handleOrganizarBriefing() {
    if (!briefingInput.trim()) return
    setLoadingBriefing(true)
    setBriefingResult('')
    setErrorBriefing('')

    try {
      const result = await organizarBriefing(briefingInput)
      setBriefingResult(result)
    } catch (err) {
      console.error('Erro na IA:', err)
      setErrorBriefing(err instanceof Error ? err.message : 'Erro ao processar.')
    } finally {
      setLoadingBriefing(false)
    }
  }

  async function handleBuscarPendencias() {
    if (!selectedJobId) return
    setLoadingPendencias(true)
    setPendenciasResult('')
    setErrorPendencias('')

    try {
      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', selectedJobId)
        .single()

      if (jobError || !job) {
        setErrorPendencias('Job não encontrado.')
        return
      }

      const { data: deliverables } = await supabase
        .from('deliverables')
        .select('*')
        .eq('job_id', selectedJobId)

      const { data: dates } = await supabase
        .from('important_dates')
        .select('*')
        .eq('job_id', selectedJobId)

      const result = await analisarPendencias(job, deliverables || [], dates || [])
      setPendenciasResult(result)
    } catch (err) {
      console.error('Erro na IA:', err)
      setErrorPendencias(err instanceof Error ? err.message : 'Erro ao processar.')
    } finally {
      setLoadingPendencias(false)
    }
  }

  function copyToClipboard(text: string, type: 'briefing' | 'pendencias') {
    navigator.clipboard.writeText(text)
    if (type === 'briefing') {
      setCopiedBriefing(true)
      setTimeout(() => setCopiedBriefing(false), 2000)
    } else {
      setCopiedPendencias(true)
      setTimeout(() => setCopiedPendencias(false), 2000)
    }
  }

  const statusLabel: Record<string, string> = {
    aberto: 'Aberto',
    em_andamento: 'Em andamento',
    concluido: 'Concluído',
    cancelado: 'Cancelado',
  }

  const statusColor: Record<string, string> = {
    aberto: 'bg-blue-100 text-blue-700',
    em_andamento: 'bg-amber-100 text-amber-700',
    concluido: 'bg-green-100 text-green-700',
    cancelado: 'bg-red-100 text-red-700',
  }

  const hasApiKey = !!import.meta.env.VITE_GROQ_API_KEY

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <div className="p-2 bg-gray-900 rounded-xl">
            <Bot size={20} className="text-white" />
          </div>
          IA Assistente
        </h1>
        <p className="text-gray-500 mt-1">
          Inteligência artificial para organizar briefings e analisar pendências dos seus jobs
        </p>
        <div className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
          hasApiKey ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${hasApiKey ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          {hasApiKey ? 'Conectado ao Groq (Llama 3.3)' : 'API Key não configurada'}
        </div>
      </div>

      {/* Organizar Briefing */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-gray-700" />
            <h2 className="font-semibold text-gray-900">Organizar Briefing</h2>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Cole mensagens de WhatsApp, e-mails ou notas soltas e a IA organiza tudo em formato profissional.
          </p>
        </div>

        <div className="p-6 space-y-4">
          <textarea
            value={briefingInput}
            onChange={(e) => setBriefingInput(e.target.value)}
            rows={8}
            placeholder={`Exemplo:\n\nOi Malu! Tudo bem?\nEntão, a campanha da marca XYZ é pra lançamento de um sérum facial.\nPrecisamos de 2 reels + 3 stories.\nData de publicação: 15/03.\nHashtag obrigatória: #XYZGlow\nPúblico: mulheres 25-35 anos.\nPode gravar na golden hour? Tom leve e natural.`}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-gray-800 resize-none transition"
          />

          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">
              {briefingInput.length > 0 ? `${briefingInput.length} caracteres` : ''}
            </span>
            <button
              onClick={handleOrganizarBriefing}
              disabled={loadingBriefing || !briefingInput.trim() || !hasApiKey}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-900 text-white font-medium text-sm hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingBriefing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Organizar com IA
                </>
              )}
            </button>
          </div>

          {errorBriefing && (
            <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">
              {errorBriefing}
            </div>
          )}

          {briefingResult && (
            <div className="relative">
              <AIResultRenderer text={briefingResult} type="briefing" />
              <button
                onClick={() => copyToClipboard(briefingResult, 'briefing')}
                className="absolute top-0 right-0 p-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition shadow-sm"
                title="Copiar texto original"
              >
                {copiedBriefing ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Analisar Pendências */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-500" />
            <h2 className="font-semibold text-gray-900">Analisar Pendências de um Job</h2>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Selecione um job e a IA analisa o status, alerta prazos e sugere próximos passos.
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div className="relative">
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="w-full appearance-none px-4 py-3 pr-10 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-gray-800 transition cursor-pointer"
            >
              <option value="">Selecione um job...</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title} — {job.brand} ({statusLabel[job.status] || job.status})
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {selectedJobId && (() => {
            const job = jobs.find(j => j.id === selectedJobId)
            if (!job) return null
            return (
              <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{job.title}</p>
                  <p className="text-xs text-gray-500">{job.brand}</p>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor[job.status] || 'bg-gray-100 text-gray-600'}`}>
                  {statusLabel[job.status] || job.status}
                </span>
              </div>
            )
          })()}

          <div className="flex justify-end">
            <button
              onClick={handleBuscarPendencias}
              disabled={loadingPendencias || !selectedJobId || !hasApiKey}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-900 text-white font-medium text-sm hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingPendencias ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Analisando...
                </>
              ) : (
                <>
                  <AlertTriangle size={16} />
                  Analisar com IA
                </>
              )}
            </button>
          </div>

          {errorPendencias && (
            <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">
              {errorPendencias}
            </div>
          )}

          {pendenciasResult && (
            <div className="relative">
              <AIResultRenderer text={pendenciasResult} type="pendencias" />
              <button
                onClick={() => copyToClipboard(pendenciasResult, 'pendencias')}
                className="absolute top-0 right-0 p-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition shadow-sm"
                title="Copiar texto original"
              >
                {copiedPendencias ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-4">
        <p className="text-xs text-gray-400">
          Powered by Groq Llama 3.3 70B • As respostas são geradas por inteligência artificial e podem precisar de revisão.
        </p>
      </div>
    </div>
  )
}
