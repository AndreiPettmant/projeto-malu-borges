import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { logAudit } from '../lib/audit'
import { extrairDadosJob } from '../lib/groq'
import { useAuth } from '../contexts/AuthContext'
import type { JobStatus, DeliverableCategory } from '../types'
import { CATEGORY_LABELS } from '../types'
import {
  Save, ArrowLeft, Loader2, Plus, Trash2, Package, Sparkles, Bot,
  CheckSquare, Square, GripVertical, ChevronDown, ChevronUp, Clock,
} from 'lucide-react'

// ==================== TYPES ====================

interface JobForm {
  title: string
  brand: string
  description: string
  scope: string
  start_date: string
  end_date: string
  status: JobStatus
  briefing: string
  brainstorm: string
  budget: string
}

interface ChecklistItemForm {
  id?: string
  label: string
  completed: boolean
  due_date: string
  due_time: string
  details: string
  budget: string
}

interface DeliverableForm {
  id?: string
  title: string
  category: DeliverableCategory
  description: string
  due_date: string
  due_time: string
  checklist: ChecklistItemForm[]
  expanded: boolean
}

const emptyForm: JobForm = {
  title: '',
  brand: '',
  description: '',
  scope: '',
  start_date: '',
  end_date: '',
  status: 'aberto',
  briefing: '',
  brainstorm: '',
  budget: '',
}

const CATEGORIES: DeliverableCategory[] = ['midia', 'captacao', 'publicidade', 'evento', 'outros']

function newDeliverable(): DeliverableForm {
  return {
    title: '',
    category: 'midia',
    description: '',
    due_date: '',
    due_time: '',
    checklist: [],
    expanded: true,
  }
}

function newChecklistItem(): ChecklistItemForm {
  return { label: '', completed: false, due_date: '', due_time: '', details: '', budget: '' }
}

// ==================== CATEGORY COLORS ====================

const CATEGORY_COLORS: Record<DeliverableCategory, string> = {
  midia: 'bg-violet-100 text-violet-700 border-violet-200',
  captacao: 'bg-sky-100 text-sky-700 border-sky-200',
  publicidade: 'bg-amber-100 text-amber-700 border-amber-200',
  evento: 'bg-rose-100 text-rose-700 border-rose-200',
  outros: 'bg-gray-100 text-gray-600 border-gray-200',
}

// ==================== COMPONENT ====================

export default function JobFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { user } = useAuth()
  const [form, setForm] = useState<JobForm>(emptyForm)
  const [deliverables, setDeliverables] = useState<DeliverableForm[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(isEdit)
  const [error, setError] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [aiSuccess, setAiSuccess] = useState('')

  useEffect(() => {
    if (isEdit && id) loadJob(id)
  }, [id])

  // ==================== LOAD ====================

  async function loadJob(jobId: string) {
    try {
      const [jobRes, delRes] = await Promise.all([
        supabase.from('jobs').select('*').eq('id', jobId).single(),
        supabase.from('deliverables').select('*, deliverable_checklist_items(*)').eq('job_id', jobId).order('created_at'),
      ])

      if (jobRes.error) throw jobRes.error
      if (jobRes.data) {
        setForm({
          title: jobRes.data.title || '',
          brand: jobRes.data.brand || '',
          description: jobRes.data.description || '',
          scope: jobRes.data.scope || '',
          start_date: jobRes.data.start_date || '',
          end_date: jobRes.data.end_date || '',
          status: jobRes.data.status || 'aberto',
          briefing: jobRes.data.briefing || '',
          brainstorm: jobRes.data.brainstorm || '',
          budget: jobRes.data.budget?.toString() || '',
        })
      }
      if (delRes.data) {
        setDeliverables(delRes.data.map((d: Record<string, unknown>) => ({
          id: d.id as string,
          title: (d.title as string) || '',
          category: (d.category as DeliverableCategory) || 'outros',
          description: (d.description as string) || '',
          due_date: (d.due_date as string) || '',
          due_time: (d.due_time as string) || '',
          checklist: Array.isArray(d.deliverable_checklist_items)
            ? (d.deliverable_checklist_items as Record<string, unknown>[])
                .sort((a, b) => ((a.sort_order as number) || 0) - ((b.sort_order as number) || 0))
                .map((c) => ({
                  id: c.id as string,
                  label: (c.label as string) || '',
                  completed: (c.completed as boolean) || false,
                  due_date: (c.due_date as string) || '',
                  due_time: (c.due_time as string) || '',
                  details: (c.details as string) || '',
                  budget: c.budget != null ? String(c.budget) : '',
                }))
            : [],
          expanded: false,
        })))
      }
    } catch (err) {
      console.error('Erro ao carregar job:', err)
      setError('Não foi possível carregar o job.')
    } finally {
      setLoadingData(false)
    }
  }

  // ==================== FIELD HELPERS ====================

  function updateField(field: keyof JobForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  // Deliverables
  function addDeliverable() {
    setDeliverables((prev) => [...prev, newDeliverable()])
  }

  function updateDeliverable<K extends keyof DeliverableForm>(index: number, field: K, value: DeliverableForm[K]) {
    setDeliverables((prev) => prev.map((d, i) => i === index ? { ...d, [field]: value } : d))
  }

  function removeDeliverable(index: number) {
    setDeliverables((prev) => prev.filter((_, i) => i !== index))
  }

  function toggleExpand(index: number) {
    setDeliverables((prev) => prev.map((d, i) => i === index ? { ...d, expanded: !d.expanded } : d))
  }

  // Checklist inside deliverable
  function addChecklistItem(delIndex: number) {
    setDeliverables((prev) => prev.map((d, i) =>
      i === delIndex ? { ...d, checklist: [...d.checklist, newChecklistItem()] } : d
    ))
  }

  function updateChecklistItem(delIndex: number, itemIndex: number, field: keyof ChecklistItemForm, value: string | boolean) {
    setDeliverables((prev) => prev.map((d, di) =>
      di === delIndex
        ? {
            ...d,
            checklist: d.checklist.map((c, ci) =>
              ci === itemIndex ? { ...c, [field]: value } : c
            ),
          }
        : d
    ))
  }

  function removeChecklistItem(delIndex: number, itemIndex: number) {
    setDeliverables((prev) => prev.map((d, di) =>
      di === delIndex
        ? { ...d, checklist: d.checklist.filter((_, ci) => ci !== itemIndex) }
        : d
    ))
  }

  // ==================== IA ====================

  async function handleAiExtract() {
    const text = form.briefing || form.brainstorm
    if (!text.trim()) {
      setAiError('Preencha o campo "Briefing" ou "Brainstorm" antes de usar a IA.')
      return
    }

    setAiLoading(true)
    setAiError('')
    setAiSuccess('')

    try {
      const fullText = [form.briefing, form.brainstorm].filter(Boolean).join('\n\n---\n\n')
      const extracted = await extrairDadosJob(fullText)

      let fieldsChanged = 0

      setForm((prev) => {
        const updated = { ...prev }
        if (!prev.title && extracted.title) { updated.title = extracted.title; fieldsChanged++ }
        if (!prev.brand && extracted.brand) { updated.brand = extracted.brand; fieldsChanged++ }
        if (!prev.description && extracted.description) { updated.description = extracted.description; fieldsChanged++ }
        if (!prev.scope && extracted.scope) { updated.scope = extracted.scope; fieldsChanged++ }
        if (!prev.start_date && extracted.start_date) { updated.start_date = extracted.start_date; fieldsChanged++ }
        if (!prev.end_date && extracted.end_date) { updated.end_date = extracted.end_date; fieldsChanged++ }
        if (!prev.budget && extracted.budget) { updated.budget = extracted.budget; fieldsChanged++ }
        if (!prev.brainstorm && extracted.brainstorm) { updated.brainstorm = extracted.brainstorm; fieldsChanged++ }
        return updated
      })

      // Adicionar entregáveis extraídos (com categoria)
      const newDeliverables = (extracted.deliverables || []).filter((d) => d.title)
      if (newDeliverables.length > 0) {
        setDeliverables((prev) => [
          ...prev,
          ...newDeliverables.map((d) => ({
            title: d.title,
            category: (d.category || 'outros') as DeliverableCategory,
            description: d.description || '',
            due_date: d.due_date || '',
            due_time: '',
            checklist: (d.checklist || []).map((c) => ({
              label: c.label || '',
              completed: false,
              due_date: c.due_date || '',
              due_time: '',
              details: c.details || '',
              budget: '',
            })),
            expanded: true,
          })),
        ])
        fieldsChanged += newDeliverables.length
      }

      setAiSuccess(`IA preencheu ${fieldsChanged} campo(s), incluindo ${newDeliverables.length} entregável(is).`)
      setTimeout(() => setAiSuccess(''), 5000)
    } catch (err) {
      console.error('Erro na IA:', err)
      setAiError(err instanceof Error ? err.message : 'Erro ao extrair dados.')
    } finally {
      setAiLoading(false)
    }
  }

  // ==================== SUBMIT ====================

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const payload = {
      title: form.title,
      brand: form.brand,
      description: form.description || null,
      scope: form.scope || null,
      start_date: form.start_date,
      end_date: form.end_date,
      status: form.status,
      briefing: form.briefing || null,
      brainstorm: form.brainstorm || null,
      budget: form.budget ? parseFloat(form.budget) : null,
      ...(isEdit ? {} : { created_by: user?.id }),
    }

    try {
      let jobId = id

      if (isEdit && id) {
        const { error } = await supabase.from('jobs').update(payload).eq('id', id)
        if (error) throw error
        await logAudit({ action: 'update', entity_type: 'job', entity_id: id, details: { title: form.title, status: form.status } })

        // Deletar entregáveis antigos (cascade deleta checklist items)
        await supabase.from('deliverables').delete().eq('job_id', id)
      } else {
        const { data: newJob, error } = await supabase.from('jobs').insert(payload).select().single()
        if (error) throw error
        jobId = newJob?.id
        await logAudit({ action: 'create', entity_type: 'job', entity_id: jobId, details: { title: form.title } })
      }

      // Salvar entregáveis com checklist
      const validDeliverables = deliverables.filter((d) => d.title.trim())
      for (const del of validDeliverables) {
        if (!jobId) break

        const { data: savedDel, error: delError } = await supabase.from('deliverables').insert({
          job_id: jobId,
          title: del.title,
          type: del.category, // manter type por compatibilidade
          category: del.category,
          description: del.description || null,
          due_date: del.due_date || null,
          due_time: del.due_time || null,
          status: 'pendente',
        }).select('id').single()

        if (delError) {
          console.error('Erro ao salvar entregável:', delError)
          continue
        }

        // Salvar checklist items
        const validItems = del.checklist.filter((c) => c.label.trim())
        if (validItems.length > 0 && savedDel?.id) {
          const { error: checkError } = await supabase.from('deliverable_checklist_items').insert(
            validItems.map((c, idx) => ({
              deliverable_id: savedDel.id,
              label: c.label,
              completed: c.completed,
              due_date: c.due_date || null,
              due_time: c.due_time || null,
              details: c.details || null,
              budget: c.budget ? parseFloat(c.budget) : null,
              sort_order: idx,
            }))
          )
          if (checkError) console.error('Erro ao salvar checklist:', checkError)
        }
      }

      navigate('/jobs')
    } catch (err) {
      console.error('Erro ao salvar job:', err)
      setError('Erro ao salvar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const hasApiKey = !!import.meta.env.VITE_GROQ_API_KEY

  if (loadingData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{isEdit ? 'Editar Job' : 'Novo Job'}</h1>
          <p className="text-gray-500 text-sm mt-0.5">Preencha as informações da campanha</p>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Briefing & Brainstorm + IA */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Briefing & Brainstorm</h2>
            {hasApiKey && (
              <button
                type="button"
                onClick={handleAiExtract}
                disabled={aiLoading || (!form.briefing.trim() && !form.brainstorm.trim())}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {aiLoading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Extraindo...
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    Preencher com IA
                  </>
                )}
              </button>
            )}
          </div>

          {hasApiKey && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100">
              <Bot size={14} className="text-gray-400" />
              <p className="text-xs text-gray-500">
                Cole o briefing ou brainstorm e clique em <strong>"Preencher com IA"</strong> — a IA vai extrair título, marca, entregáveis com checklist e preencher o formulário automaticamente.
              </p>
            </div>
          )}

          {aiError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">{aiError}</div>
          )}

          {aiSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm flex items-center gap-2">
              <Sparkles size={14} />
              {aiSuccess}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Briefing</label>
            <p className="text-xs text-gray-400 mb-2">Cole aqui o briefing recebido (WhatsApp, e-mail, etc.)</p>
            <textarea
              value={form.briefing}
              onChange={(e) => updateField('briefing', e.target.value)}
              rows={6}
              placeholder="Cole o briefing aqui..."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent resize-none font-mono"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Brainstorm Criativo</label>
            <p className="text-xs text-gray-400 mb-2">Ideias, referências, inspirações para esta campanha</p>
            <textarea
              value={form.brainstorm}
              onChange={(e) => updateField('brainstorm', e.target.value)}
              rows={4}
              placeholder="Anote suas ideias aqui..."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent resize-none"
            />
          </div>
        </div>

        {/* Info básica */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Informações Básicas</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Título do Job *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => updateField('title', e.target.value)}
                required
                placeholder="Ex.: Campanha Verão 2026"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Marca / Cliente *</label>
              <input
                type="text"
                value={form.brand}
                onChange={(e) => updateField('brand', e.target.value)}
                required
                placeholder="Ex.: Marca XYZ"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
            <textarea
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              rows={3}
              placeholder="Breve descrição da campanha..."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Escopo</label>
            <textarea
              value={form.scope}
              onChange={(e) => updateField('scope', e.target.value)}
              rows={3}
              placeholder="O que está incluído neste job..."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent resize-none"
            />
          </div>
        </div>

        {/* Vigência e status */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Vigência e Status</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Início *</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => updateField('start_date', e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Fim *</label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => updateField('end_date', e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => updateField('status', e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent"
              >
                <option value="aberto">Em Aberto</option>
                <option value="em_andamento">Em Andamento</option>
                <option value="finalizado">Finalizado</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Orçamento (R$)</label>
            <input
              type="number"
              value={form.budget}
              onChange={(e) => updateField('budget', e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent"
            />
          </div>
        </div>

        {/* ==================== ENTREGÁVEIS (Escopo Completo) ==================== */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package size={18} className="text-gray-700" />
              <h2 className="font-semibold text-gray-900">Escopo &amp; Entregáveis</h2>
              {deliverables.length > 0 && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{deliverables.length}</span>
              )}
            </div>
            <button
              type="button"
              onClick={addDeliverable}
              className="inline-flex items-center gap-1 text-sm text-gray-900 font-medium hover:text-gray-700 transition"
            >
              <Plus size={16} /> Adicionar
            </button>
          </div>

          {deliverables.length === 0 ? (
            <div className="p-8 text-center">
              <Package size={32} className="mx-auto mb-2 text-gray-200" />
              <p className="text-sm text-gray-400">Nenhum entregável adicionado.</p>
              <p className="text-xs text-gray-300 mt-1">Use o botão "Preencher com IA" ou adicione manualmente.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {deliverables.map((del, i) => (
                <div key={i} className="group">
                  {/* Header do entregável */}
                  <div
                    className="p-4 flex items-center gap-3 cursor-pointer hover:bg-gray-50/50 transition"
                    onClick={() => toggleExpand(i)}
                  >
                    <GripVertical size={14} className="text-gray-300" />
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[del.category]}`}>
                      {CATEGORY_LABELS[del.category]}
                    </span>
                    <span className="font-medium text-sm text-gray-900 flex-1 truncate">
                      {del.title || <span className="text-gray-400 italic">Sem título</span>}
                    </span>
                    {del.checklist.length > 0 && (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <CheckSquare size={12} />
                        {del.checklist.filter((c) => c.completed).length}/{del.checklist.length}
                      </span>
                    )}
                    {del.due_date && (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock size={12} />
                        {new Date(del.due_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeDeliverable(i) }}
                      className="text-gray-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                    {del.expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                  </div>

                  {/* Body expandido */}
                  {del.expanded && (
                    <div className="px-4 pb-4 space-y-4 border-t border-gray-50 bg-gray-50/30">
                      {/* Campos principais */}
                      <div className="grid sm:grid-cols-2 gap-3 pt-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Título *</label>
                          <input
                            type="text"
                            value={del.title}
                            onChange={(e) => updateDeliverable(i, 'title', e.target.value)}
                            placeholder="Ex.: Reel de lançamento"
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-800"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Categoria</label>
                          <select
                            value={del.category}
                            onChange={(e) => updateDeliverable(i, 'category', e.target.value as DeliverableCategory)}
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-800"
                          >
                            {CATEGORIES.map((cat) => (
                              <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Descrição / Detalhes</label>
                        <textarea
                          value={del.description}
                          onChange={(e) => updateDeliverable(i, 'description', e.target.value)}
                          rows={2}
                          placeholder="Detalhes do entregável..."
                          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-800 resize-none"
                        />
                      </div>

                      <div className="grid sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Data de entrega</label>
                          <input
                            type="date"
                            value={del.due_date}
                            onChange={(e) => updateDeliverable(i, 'due_date', e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-800"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Horário (opcional)</label>
                          <input
                            type="time"
                            value={del.due_time}
                            onChange={(e) => updateDeliverable(i, 'due_time', e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-800"
                          />
                        </div>
                      </div>

                      {/* ===== CHECKLIST ===== */}
                      <div className="pt-2">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                            <CheckSquare size={12} /> Checklist
                          </span>
                          <button
                            type="button"
                            onClick={() => addChecklistItem(i)}
                            className="text-xs text-gray-500 hover:text-gray-900 font-medium flex items-center gap-1 transition"
                          >
                            <Plus size={12} /> Item
                          </button>
                        </div>

                        {del.checklist.length === 0 ? (
                          <p className="text-xs text-gray-300 text-center py-3">
                            Nenhum item. Adicione tarefas para este entregável.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {del.checklist.map((item, ci) => (
                              <div key={ci} className="flex items-start gap-2 bg-white rounded-lg border border-gray-100 p-2.5">
                                <button
                                  type="button"
                                  onClick={() => updateChecklistItem(i, ci, 'completed', !item.completed)}
                                  className="mt-0.5 flex-shrink-0"
                                >
                                  {item.completed
                                    ? <CheckSquare size={16} className="text-emerald-500" />
                                    : <Square size={16} className="text-gray-300" />
                                  }
                                </button>
                                <div className="flex-1 space-y-1.5">
                                  <input
                                    type="text"
                                    value={item.label}
                                    onChange={(e) => updateChecklistItem(i, ci, 'label', e.target.value)}
                                    placeholder="Descrição do item..."
                                    className={`w-full text-sm bg-transparent focus:outline-none ${item.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}
                                  />
                                  <div className="flex gap-2 flex-wrap">
                                    <input
                                      type="date"
                                      value={item.due_date}
                                      onChange={(e) => updateChecklistItem(i, ci, 'due_date', e.target.value)}
                                      className="px-2 py-1 rounded-lg border border-gray-100 text-xs bg-gray-50 focus:outline-none focus:ring-1 focus:ring-gray-800"
                                    />
                                    <input
                                      type="number"
                                      value={item.budget}
                                      onChange={(e) => updateChecklistItem(i, ci, 'budget', e.target.value)}
                                      placeholder="R$ Orçamento"
                                      step="0.01"
                                      min="0"
                                      className="w-[120px] px-2 py-1 rounded-lg border border-gray-100 text-xs bg-gray-50 focus:outline-none focus:ring-1 focus:ring-gray-800"
                                    />
                                  </div>
                                  <textarea
                                    value={item.details}
                                    onChange={(e) => updateChecklistItem(i, ci, 'details', e.target.value)}
                                    placeholder="Detalhes / observações..."
                                    rows={2}
                                    className="w-full px-2 py-1.5 rounded-lg border border-gray-100 text-xs bg-gray-50 focus:outline-none focus:ring-1 focus:ring-gray-800 resize-y"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeChecklistItem(i, ci)}
                                  className="text-gray-300 hover:text-red-500 transition flex-shrink-0 mt-0.5"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50 transition"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-900 text-white font-medium text-sm hover:bg-gray-800 transition disabled:opacity-50"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {isEdit ? 'Salvar Alterações' : 'Criar Job'}
          </button>
        </div>
      </form>
    </div>
  )
}
