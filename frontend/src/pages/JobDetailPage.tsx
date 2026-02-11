import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { logAudit } from '../lib/audit'
import type { Job, Deliverable, DeliverableStatus, DeliverableCategory, DeliverableChecklistItem } from '../types'
import { CATEGORY_LABELS } from '../types'
import {
  ArrowLeft, Edit, Plus, Trash2, CheckCircle2, Clock, AlertCircle,
  FileText, Lightbulb, Package, Save,
  CheckSquare, Square, ChevronDown, ChevronRight, DollarSign,
} from 'lucide-react'

// ==================== HELPERS ====================

const CATEGORY_COLORS: Record<DeliverableCategory, string> = {
  midia: 'bg-violet-100 text-violet-700',
  captacao: 'bg-sky-100 text-sky-700',
  publicidade: 'bg-amber-100 text-amber-700',
  evento: 'bg-rose-100 text-rose-700',
  outros: 'bg-gray-100 text-gray-600',
}

const statusIcon: Record<DeliverableStatus, typeof CheckCircle2> = {
  pendente: AlertCircle,
  em_producao: Clock,
  entregue: CheckCircle2,
}
const statusColorDel: Record<DeliverableStatus, string> = {
  pendente: 'text-amber-500',
  em_producao: 'text-blue-500',
  entregue: 'text-emerald-500',
}
const statusBgDel: Record<DeliverableStatus, string> = {
  pendente: 'bg-amber-50 hover:bg-amber-100 border-amber-200',
  em_producao: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
  entregue: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200',
}
const statusLabelDel: Record<DeliverableStatus, string> = {
  pendente: 'Pendente',
  em_producao: 'Em Produção',
  entregue: 'Entregue',
}

interface DeliverableWithChecklist extends Deliverable {
  checklist_items: DeliverableChecklistItem[]
}

// ==================== COMPONENT ====================

export default function JobDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [job, setJob] = useState<Job | null>(null)
  const [deliverables, setDeliverables] = useState<DeliverableWithChecklist[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'entregaveis' | 'briefing' | 'brainstorm'>('entregaveis')

  // Expanded deliverables
  const [expandedDels, setExpandedDels] = useState<Set<string>>(new Set())

  // New checklist item
  const [newCheckLabel, setNewCheckLabel] = useState<Record<string, string>>({})
  
  // Checklist changes tracking (local state before save)
  const [checklistChanges, setChecklistChanges] = useState<Record<string, boolean>>({})
  const [savingChanges, setSavingChanges] = useState(false)

  useEffect(() => {
    if (id) loadAll(id)
  }, [id])

  // ==================== LOAD ====================

  async function loadAll(jobId: string) {
    try {
      const [jobRes, delRes] = await Promise.all([
        supabase.from('jobs').select('*').eq('id', jobId).single(),
        supabase
          .from('deliverables')
          .select('*, deliverable_checklist_items(*)')
          .eq('job_id', jobId)
          .order('created_at', { ascending: true })
          .order('id', { ascending: true }),
      ])
      if (jobRes.data) setJob(jobRes.data)
      if (delRes.data) {
        setDeliverables(
          delRes.data.map((d: Record<string, unknown>) => ({
            ...d,
            checklist_items: Array.isArray(d.deliverable_checklist_items)
              ? (d.deliverable_checklist_items as DeliverableChecklistItem[]).sort((a, b) => a.sort_order - b.sort_order)
              : [],
          })) as DeliverableWithChecklist[]
        )
      }
    } catch (err) {
      console.error('Erro ao carregar job:', err)
    } finally {
      setLoading(false)
    }
  }

  // ==================== DELIVERABLE ACTIONS ====================


  function toggleDelExpanded(delId: string) {
    setExpandedDels((prev) => {
      const next = new Set(prev)
      if (next.has(delId)) next.delete(delId)
      else next.add(delId)
      return next
    })
  }

  // ==================== CHECKLIST ACTIONS ====================

  function toggleCheckItem(item: DeliverableChecklistItem) {
    setChecklistChanges((prev) => {
      // Calcular novo valor
      const currentValue = prev[item.id] !== undefined ? prev[item.id] : item.completed
      const newValue = !currentValue
      
      // Se voltou ao estado original, remover das mudanças
      if (newValue === item.completed) {
        const { [item.id]: _, ...rest } = prev
        return rest
      }
      
      // Caso contrário, adicionar/manter a mudança
      return {
        ...prev,
        [item.id]: newValue,
      }
    })
  }

  function getItemCompletedState(item: DeliverableChecklistItem): boolean {
    // Se tem mudança pendente, usar o novo valor; caso contrário, usar o valor do banco
    return checklistChanges[item.id] !== undefined ? checklistChanges[item.id] : item.completed
  }

  function calculateVisualStatus(del: DeliverableWithChecklist): DeliverableStatus {
    const items = del.checklist_items
    if (items.length === 0) return del.status

    const completedCount = items.filter((item) => getItemCompletedState(item)).length
    const totalCount = items.length

    if (completedCount === 0) return 'pendente'
    if (completedCount === totalCount) return 'entregue'
    return 'em_producao'
  }

  async function saveChecklistChanges() {
    if (Object.keys(checklistChanges).length === 0) return

    // Salvar estado atual antes de recarregar
    const currentExpandedState = new Set(expandedDels)
    const currentScrollY = window.scrollY

    setSavingChanges(true)
    try {
      // Agrupar mudanças por entregável para atualizar status depois
      const deliverableIds = new Set<string>()

      // Atualizar cada item modificado
      for (const [itemId, completed] of Object.entries(checklistChanges)) {
        const item = deliverables
          .flatMap((d) => d.checklist_items)
          .find((i) => i.id === itemId)

        if (item) {
          await supabase.from('deliverable_checklist_items').update({
            completed,
            completed_at: completed ? new Date().toISOString() : null,
          }).eq('id', itemId)

          // Log de auditoria
          await logAudit(
            'update',
            'checklist_item',
            itemId,
            { 
              label: item.label,
              completed: completed,
              deliverable_title: deliverables.find(d => d.id === item.deliverable_id)?.title,
              job_title: job?.title
            }
          )

          deliverableIds.add(item.deliverable_id)
        }
      }

      // Atualizar status de cada entregável afetado
      for (const deliverableId of deliverableIds) {
        const del = deliverables.find((d) => d.id === deliverableId)
        if (!del) continue

        const completedCount = del.checklist_items.filter((item) => 
          getItemCompletedState(item)
        ).length
        const totalCount = del.checklist_items.length

        let newStatus: DeliverableStatus
        if (completedCount === 0) {
          newStatus = 'pendente'
        } else if (completedCount === totalCount) {
          newStatus = 'entregue'
        } else {
          newStatus = 'em_producao'
        }

        const updatePayload: Record<string, unknown> = { status: newStatus }
        if (newStatus === 'entregue') {
          updatePayload.completed_at = new Date().toISOString()
        } else {
          updatePayload.completed_at = null
        }

        await supabase.from('deliverables').update(updatePayload).eq('id', deliverableId)
        
        // Coletar informações dos itens alterados
        const changedItems = del.checklist_items
          .filter(item => checklistChanges[item.id] !== undefined)
          .map(item => ({
            label: item.label,
            status: checklistChanges[item.id] ? 'Concluído' : 'Reaberto'
          }))

        const statusLabels: Record<DeliverableStatus, string> = {
          pendente: 'Pendente',
          em_producao: 'Em Produção',
          entregue: 'Entregue'
        }

        await logAudit({ 
          action: 'update', 
          entity_type: 'deliverable', 
          entity_id: deliverableId, 
          details: { 
            title: del.title,
            job_title: job?.title,
            status: statusLabels[newStatus],
            itens_concluidos: completedCount,
            total_itens: totalCount,
            progresso: `${Math.round((completedCount / totalCount) * 100)}%`,
            itens_alterados: changedItems.map(i => `${i.label} → ${i.status}`).join('; ')
          } 
        })
      }

      // Limpar mudanças e recarregar
      setChecklistChanges({})
      if (id) await loadAll(id)
      
      // Restaurar estado de expansão e posição do scroll após recarregar
      setTimeout(() => {
        setExpandedDels(currentExpandedState)
        window.scrollTo({ top: currentScrollY, behavior: 'instant' })
      }, 0)
    } catch (err) {
      console.error('Erro ao salvar mudanças:', err)
    } finally {
      setSavingChanges(false)
    }
  }

  async function addCheckItem(deliverableId: string) {
    const label = newCheckLabel[deliverableId]?.trim()
    if (!label) return

    const del = deliverables.find((d) => d.id === deliverableId)
    const nextOrder = del ? del.checklist_items.length : 0

    const { data: newItem } = await supabase.from('deliverable_checklist_items').insert({
      deliverable_id: deliverableId,
      label,
      sort_order: nextOrder,
    }).select().single()

    // Log de auditoria
    if (newItem) {
      await logAudit('create', 'checklist_item', newItem.id, {
        label: label,
        deliverable_title: del?.title,
        job_title: job?.title
      })
    }

    setNewCheckLabel((prev) => ({ ...prev, [deliverableId]: '' }))
    if (id) loadAll(id)
  }

  async function deleteCheckItem(itemId: string) {
    await supabase.from('deliverable_checklist_items').delete().eq('id', itemId)
    if (id) loadAll(id)
  }

  // ==================== RENDER ====================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
      </div>
    )
  }

  if (!job) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400">Job não encontrado.</p>
        <Link to="/jobs" className="text-gray-900 mt-2 inline-block">Voltar para Jobs</Link>
      </div>
    )
  }

  const deliveredCount = deliverables.filter((d) => d.status === 'entregue').length
  const totalChecklist = deliverables.reduce((sum, d) => sum + d.checklist_items.length, 0)
  const doneChecklist = deliverables.reduce((sum, d) => sum + d.checklist_items.filter((c) => c.completed).length, 0)
  const progress = deliverables.length > 0 ? Math.round((deliveredCount / deliverables.length) * 100) : 0

  const statusLabel: Record<string, string> = {
    aberto: 'Em Aberto', em_andamento: 'Em Andamento', finalizado: 'Finalizado', cancelado: 'Cancelado',
  }
  const statusColor: Record<string, string> = {
    aberto: 'bg-amber-100 text-amber-700', em_andamento: 'bg-blue-100 text-blue-700',
    finalizado: 'bg-emerald-100 text-emerald-700', cancelado: 'bg-gray-100 text-gray-500',
  }

  const tabs = [
    { key: 'entregaveis' as const, label: 'Entregáveis', icon: Package, count: deliverables.length },
    { key: 'briefing' as const, label: 'Briefing', icon: FileText },
    { key: 'brainstorm' as const, label: 'Brainstorm', icon: Lightbulb },
  ]

  const hasUnsavedChanges = Object.keys(checklistChanges).length > 0

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Floating save button */}
      {hasUnsavedChanges && !savingChanges && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4">
          <button
            onClick={saveChecklistChanges}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gray-900 text-white font-medium text-sm shadow-lg hover:bg-gray-800 transition"
          >
            <Save size={18} />
            Salvar Alterações ({Object.keys(checklistChanges).length})
          </button>
        </div>
      )}

      {/* Full screen loading overlay */}
      {savingChanges && (
        <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-xl bg-gray-900 text-white flex items-center justify-center text-2xl font-bold animate-pulse">
              MB
            </div>
            <p className="text-gray-600 font-medium">Salvando alterações...</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-3">
        <button onClick={() => navigate(-1)} className="mt-1 w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition flex-shrink-0">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900 truncate">{job.title}</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor[job.status]}`}>
              {statusLabel[job.status]}
            </span>
          </div>
          <p className="text-gray-500 mt-1">{job.brand}</p>
        </div>
        <Link
          to={`/jobs/${id}/editar`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition flex-shrink-0"
        >
          <Edit size={16} /> Editar
        </Link>
      </div>

      {/* Progress */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-700">Progresso de entregas</span>
          <span className="text-sm font-bold text-gray-900">{progress}%</span>
        </div>
        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-gray-800 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
          <span>{deliveredCount} de {deliverables.length} entregáveis concluídos{totalChecklist > 0 ? ` · ${doneChecklist}/${totalChecklist} itens do checklist` : ''}</span>
          <span>{new Date(job.start_date).toLocaleDateString('pt-BR')} – {new Date(job.end_date).toLocaleDateString('pt-BR')}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition ${
              activeTab === tab.key ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon size={16} />
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.count !== undefined && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.key ? 'bg-gray-100 text-gray-900' : 'bg-gray-200 text-gray-500'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab: Entregáveis */}
      {activeTab === 'entregaveis' && (
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="p-5 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Escopo &amp; Entregáveis</h2>
            <p className="text-xs text-gray-500 mt-1">
              Para adicionar ou remover entregáveis, use o botão "Editar" no topo da página.
            </p>
          </div>

          {deliverables.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <Package size={36} className="mx-auto mb-2 opacity-50" />
              <p>Nenhum entregável cadastrado.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {deliverables.map((del) => {
                const visualStatus = calculateVisualStatus(del)
                const Icon = statusIcon[visualStatus]
                const isExpanded = expandedDels.has(del.id)
                const checkDone = del.checklist_items.filter((c) => getItemCompletedState(c)).length
                const checkTotal = del.checklist_items.length

                return (
                  <div key={del.id}>
                    {/* Deliverable row */}
                    <div className="p-4 flex items-center gap-3 group">
                      {/* Status indicator (visual only, based on checklist) */}
                      <div 
                        className={`w-9 h-9 rounded-lg flex items-center justify-center ${statusBgDel[visualStatus]}`}
                        title={`Status: ${statusLabelDel[visualStatus]} (baseado no checklist)`}
                      >
                        <Icon size={20} className={statusColorDel[visualStatus]} />
                      </div>

                      <button onClick={() => toggleDelExpanded(del.id)} className="flex-1 min-w-0 flex items-center gap-2 text-left">
                        {isExpanded ? <ChevronDown size={14} className="text-gray-400 flex-shrink-0" /> : <ChevronRight size={14} className="text-gray-400 flex-shrink-0" />}
                        <span className={`font-medium text-sm ${del.status === 'entregue' ? 'line-through text-gray-400' : 'text-gray-900'}`}>{del.title}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${CATEGORY_COLORS[del.category || 'outros']}`}>
                          {CATEGORY_LABELS[del.category || 'outros']}
                        </span>
                        {checkTotal > 0 && (
                          <span className="text-xs text-gray-400 flex items-center gap-1 ml-auto">
                            <CheckSquare size={12} /> {checkDone}/{checkTotal}
                          </span>
                        )}
                      </button>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {del.due_date && (
                          <span className="text-xs text-gray-400">
                            {new Date(del.due_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                            {del.due_time ? ` ${del.due_time.slice(0, 5)}` : ''}
                          </span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${statusBgDel[visualStatus]} ${statusColorDel[visualStatus]}`}>
                          {statusLabelDel[visualStatus]}
                        </span>
                      </div>
                    </div>

                    {/* Expanded: description + checklist */}
                    {isExpanded && (
                      <div className="px-4 pb-4 ml-10 space-y-3">
                        {del.description && (
                          <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">{del.description}</p>
                        )}

                        {/* Checklist items */}
                        <div className="space-y-1">
                          {del.checklist_items.map((item) => {
                            const isCompleted = getItemCompletedState(item)
                            const hasChange = checklistChanges[item.id] !== undefined
                            
                            return (
                              <div key={item.id} className={`flex items-start gap-2 py-2 px-2 rounded-lg hover:bg-gray-50 group/check transition ${hasChange ? 'bg-amber-50/50' : ''}`}>
                                <button 
                                  onClick={() => toggleCheckItem(item)} 
                                  className="mt-0.5"
                                >
                                  {isCompleted ? (
                                    <CheckSquare size={16} className="text-emerald-500" />
                                  ) : (
                                    <Square size={16} className="text-gray-300" />
                                  )}
                                </button>
                                <div className="flex-1 min-w-0">
                                  <span className={`text-sm ${isCompleted ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                                    {item.label}
                                  </span>
                                  {item.details && (
                                    <p className="text-xs text-gray-400 mt-0.5 whitespace-pre-wrap">{item.details}</p>
                                  )}
                                  <div className="flex items-center gap-3 mt-1">
                                    {item.due_date && (
                                      <span className="text-xs text-gray-400 flex items-center gap-1">
                                        <Clock size={10} />
                                        {new Date(item.due_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                                      </span>
                                    )}
                                    {item.budget != null && Number(item.budget) > 0 && (
                                      <span className="text-xs text-gray-400 flex items-center gap-1">
                                        <DollarSign size={10} />
                                        R$ {Number(item.budget).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <button 
                                  onClick={() => deleteCheckItem(item.id)} 
                                  className="text-gray-300 hover:text-red-500 opacity-0 group-hover/check:opacity-100 transition mt-0.5"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            )
                          })}
                        </div>

                        {/* Add new checklist item inline */}
                        <div className="flex items-center gap-2">
                          <Plus size={14} className="text-gray-300" />
                          <input
                            type="text"
                            value={newCheckLabel[del.id] || ''}
                            onChange={(e) => setNewCheckLabel((prev) => ({ ...prev, [del.id]: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCheckItem(del.id) } }}
                            placeholder="Novo item do checklist..."
                            className="flex-1 text-sm bg-transparent focus:outline-none text-gray-600 placeholder-gray-300"
                          />
                          {(newCheckLabel[del.id] || '').trim() && (
                            <button onClick={() => addCheckItem(del.id)} className="text-xs text-gray-500 hover:text-gray-900 font-medium">
                              Adicionar
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: Briefing */}
      {activeTab === 'briefing' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><FileText size={18} /> Briefing</h2>
          {job.briefing ? (
            <div className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 rounded-xl p-4 font-mono leading-relaxed">{job.briefing}</div>
          ) : (
            <p className="text-gray-400 text-sm">Nenhum briefing adicionado. <Link to={`/jobs/${id}/editar`} className="text-gray-900 hover:underline">Editar job</Link> para adicionar.</p>
          )}
        </div>
      )}

      {/* Tab: Brainstorm */}
      {activeTab === 'brainstorm' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Lightbulb size={18} /> Brainstorm Criativo</h2>
          {job.brainstorm ? (
            <div className="whitespace-pre-wrap text-sm text-gray-700 bg-amber-50 rounded-xl p-4 leading-relaxed">{job.brainstorm}</div>
          ) : (
            <p className="text-gray-400 text-sm">Nenhuma ideia adicionada. <Link to={`/jobs/${id}/editar`} className="text-gray-900 hover:underline">Editar job</Link> para adicionar.</p>
          )}
        </div>
      )}
    </div>
  )
}
