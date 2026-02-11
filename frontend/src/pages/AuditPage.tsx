import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { AuditLog } from '../types'
import {
  ClipboardList, Search, Filter, Calendar,
  LogIn, Plus, Pencil, Trash2, RefreshCw, ChevronDown,
} from 'lucide-react'

// ======================== MAPEAMENTOS ========================

const ACTION_CONFIG: Record<string, { label: string; icon: typeof Plus; color: string; bgColor: string }> = {
  login: { label: 'Login', icon: LogIn, color: 'text-gray-700', bgColor: 'bg-gray-100' },
  create: { label: 'Criação', icon: Plus, color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
  update: { label: 'Edição', icon: Pencil, color: 'text-blue-700', bgColor: 'bg-blue-100' },
  delete: { label: 'Exclusão', icon: Trash2, color: 'text-red-700', bgColor: 'bg-red-100' },
  status_change: { label: 'Status alterado', icon: RefreshCw, color: 'text-amber-700', bgColor: 'bg-amber-100' },
}

const ENTITY_LABELS: Record<string, string> = {
  job: 'Job',
  deliverable: 'Entregável',
  checklist_item: 'Item de Checklist',
  notification: 'Notificação',
  user: 'Usuário',
  role: 'Papel',
  permission: 'Permissão',
  permissions: 'Permissões',
  notification_settings: 'Configurações de Notificação',
  system_config: 'Configuração do Sistema',
  session: 'Sessão',
}

// Formata os detalhes do log de forma legível
function formatDetails(action: string, entityType: string, details: Record<string, unknown> | null | undefined): string {
  if (!details) return ''

  const parts: string[] = []

  // ========== CHECKLIST ITEM ==========
  if (entityType === 'checklist_item') {
    if (details.label) parts.push(`"${details.label}"`)
    if (details.job_title) parts.push(`• Job: ${details.job_title}`)
    if (details.deliverable_title) parts.push(`• Entregável: ${details.deliverable_title}`)
    if (details.completed !== undefined) {
      parts.push(details.completed ? '→ ✓ Concluído' : '→ ○ Reaberto')
    }
    return parts.join(' ')
  }

  // ========== NOTIFICATION SETTINGS ==========
  if (entityType === 'notification_settings') {
    if (details.total_configs) parts.push(`${details.total_configs} configurações`)
    if (details.roles) parts.push(`• ${details.roles} papéis`)
    if (Array.isArray(details.types)) {
      const typeLabels: Record<string, string> = {
        project_deadline: 'Projetos',
        midia: 'Mídia',
        captacao: 'Captação',
        publicidade: 'Publicidade',
        evento: 'Eventos',
        outros: 'Outros',
        financial: 'Financeiro'
      }
      const formatted = details.types.map((t: string) => typeLabels[t] || t).join(', ')
      parts.push(`• Categorias: ${formatted}`)
    }
    return parts.join(' ')
  }

  // ========== SYSTEM CONFIG ==========
  if (entityType === 'system_config') {
    if (details.schedule) parts.push(`Horário: ${details.schedule}`)
    if (details.cron_expression) parts.push(`• Cron: ${details.cron_expression}`)
    return parts.join(' ')
  }

  // ========== NOTIFICATION ==========
  if (entityType === 'notification') {
    if (details.message) parts.push(`"${details.message}"`)
    if (details.action) parts.push(`→ ${details.action}`)
    if (details.count) parts.push(`(${details.count} notificações)`)
    return parts.join(' ')
  }

  // ========== PERMISSIONS ==========
  if (entityType === 'permission' || entityType === 'permissions') {
    if (details.papel || details.role) parts.push(`Papel: ${details.papel || details.role}`)
    if (details.alteracoes && details.alteracoes !== 'Nenhuma alteração') {
      parts.push(`→ ${details.alteracoes}`)
    }
    if (details.section) {
      const sectionLabels: Record<string, string> = {
        dashboard: 'Dashboard',
        jobs: 'Jobs',
        entregaveis: 'Entregáveis',
        graficos: 'Gráficos',
        ia: 'IA Assistente',
        config_home: 'Config. Home',
        usuarios: 'Usuários',
        papeis_permissoes: 'Papéis & Permissões',
        auditoria: 'Auditoria',
        planner: 'Planner',
        notification_settings: 'Notificações'
      }
      parts.push(`• Seção: ${sectionLabels[details.section as string] || details.section}`)
    }
    const perms: string[] = []
    if (details.can_create) perms.push('criar')
    if (details.can_read) perms.push('ler')
    if (details.can_update) perms.push('editar')
    if (details.can_delete) perms.push('deletar')
    if (perms.length > 0) parts.push(`• Permissões: ${perms.join(', ')}`)
    return parts.join(' ')
  }

  // ========== PADRÃO (JOB, DELIVERABLE, USER, etc) ==========
  
  // Título/nome do item
  if (details.title) parts.push(`"${details.title}"`)
  if (details.name) parts.push(`"${details.name}"`)
  if (details.full_name) parts.push(`"${details.full_name}"`)

  // Email
  if (details.email && entityType !== 'session') parts.push(`(${details.email})`)

  // Para deliverables com checklist, mostrar progresso
  if (entityType === 'deliverable' && details.itens_concluidos !== undefined) {
    parts.push(`→ ${details.progresso || `${details.itens_concluidos}/${details.total_itens}`}`)
  }

  // Status
  if (details.status) {
    const statusLabels: Record<string, string> = {
      aberto: 'Em Aberto',
      em_andamento: 'Em Andamento',
      finalizado: 'Finalizado',
      cancelado: 'Cancelado',
      pendente: 'Pendente',
      em_producao: 'Em Produção',
      entregue: 'Entregue',
      Pendente: 'Pendente',
      'Em Produção': 'Em Produção',
      Entregue: 'Entregue'
    }
    parts.push(`• Status: ${statusLabels[details.status as string] || details.status}`)
  }

  // Marca
  if (details.brand) parts.push(`• Marca: ${details.brand}`)

  // Job referência
  if (details.job_title) parts.push(`• Job: ${details.job_title}`)
  else if (details.job_id && entityType === 'deliverable') parts.push(`• No job`)

  // Role
  if (details.role_name) parts.push(`• Papel: ${details.role_name}`)

  return parts.join(' ')
}

// Gera a frase descritiva da ação
function buildDescription(log: AuditLog): string {
  const actionConfig = ACTION_CONFIG[log.action]
  const actionLabel = actionConfig?.label?.toLowerCase() || log.action
  const entityLabel = ENTITY_LABELS[log.entity_type] || log.entity_type

  // Pegar o nome do usuário (parte antes do @)
  const userName = log.user_email
    ? log.user_email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : 'Sistema'

  switch (log.action) {
    case 'login':
      return `${userName} fez login no sistema`
    case 'create':
      return `${userName} criou um(a) ${entityLabel.toLowerCase()}`
    case 'update':
      return `${userName} editou um(a) ${entityLabel.toLowerCase()}`
    case 'delete':
      return `${userName} excluiu um(a) ${entityLabel.toLowerCase()}`
    case 'status_change':
      return `${userName} alterou o status de um(a) ${entityLabel.toLowerCase()}`
    default:
      return `${userName} realizou ${actionLabel} em ${entityLabel.toLowerCase()}`
  }
}

function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMin / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMin < 1) return 'agora mesmo'
  if (diffMin < 60) return `há ${diffMin}min`
  if (diffHours < 24) return `há ${diffHours}h`
  if (diffDays === 1) return 'ontem'
  if (diffDays < 7) return `há ${diffDays} dias`
  return date.toLocaleDateString('pt-BR')
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterAction, setFilterAction] = useState('todos')
  const [filterEntity, setFilterEntity] = useState('todos')
  const [expandedLog, setExpandedLog] = useState<string | null>(null)
  const [limit, setLimit] = useState(50)

  useEffect(() => {
    loadLogs()
  }, [limit])

  async function loadLogs() {
    try {
      const { data } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      setLogs(data || [])
    } catch (err) {
      console.error('Erro ao carregar logs:', err)
    } finally {
      setLoading(false)
    }
  }

  const actions = [...new Set(logs.map((l) => l.action))]
  const entities = [...new Set(logs.map((l) => l.entity_type))]

  const filtered = logs.filter((log) => {
    const searchLower = search.toLowerCase()
    const details = formatDetails(log.action, log.entity_type, log.details)
    const description = buildDescription(log)

    const matchSearch =
      !search ||
      (log.user_email || '').toLowerCase().includes(searchLower) ||
      description.toLowerCase().includes(searchLower) ||
      details.toLowerCase().includes(searchLower)
    const matchAction = filterAction === 'todos' || log.action === filterAction
    const matchEntity = filterEntity === 'todos' || log.entity_type === filterEntity
    return matchSearch && matchAction && matchEntity
  })

  // Agrupar por data
  const grouped: Record<string, AuditLog[]> = {}
  for (const log of filtered) {
    const dateKey = new Date(log.created_at).toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    if (!grouped[dateKey]) grouped[dateKey] = []
    grouped[dateKey].push(log)
  }

  // Contadores para resumo
  const todayStr = new Date().toLocaleDateString('pt-BR')
  const todayLogs = logs.filter((l) => new Date(l.created_at).toLocaleDateString('pt-BR') === todayStr)
  const todayLogins = todayLogs.filter((l) => l.action === 'login').length
  const todayCreates = todayLogs.filter((l) => l.action === 'create').length
  const todayUpdates = todayLogs.filter((l) => l.action === 'update').length
  const todayDeletes = todayLogs.filter((l) => l.action === 'delete').length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ClipboardList size={24} /> Painel de Auditoria
        </h1>
        <p className="text-gray-500 mt-1">Acompanhe todas as ações realizadas no sistema</p>
      </div>

      {/* Resumo do dia */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gray-100 mx-auto mb-2">
            <LogIn size={18} className="text-gray-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{todayLogins}</p>
          <p className="text-xs text-gray-400">Logins hoje</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-100 mx-auto mb-2">
            <Plus size={18} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{todayCreates}</p>
          <p className="text-xs text-gray-400">Criações hoje</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-100 mx-auto mb-2">
            <Pencil size={18} className="text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{todayUpdates}</p>
          <p className="text-xs text-gray-400">Edições hoje</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-red-100 mx-auto mb-2">
            <Trash2 size={18} className="text-red-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{todayDeletes}</p>
          <p className="text-xs text-gray-400">Exclusões hoje</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por usuário, ação ou item..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-800"
          />
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="pl-9 pr-8 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-800 appearance-none"
            >
              <option value="todos">Todas as ações</option>
              {actions.map((a) => (
                <option key={a} value={a}>{ACTION_CONFIG[a]?.label || a}</option>
              ))}
            </select>
          </div>
          <div className="relative">
            <select
              value={filterEntity}
              onChange={(e) => setFilterEntity(e.target.value)}
              className="px-4 pr-8 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-800 appearance-none"
            >
              <option value="todos">Todos os tipos</option>
              {entities.map((e) => (
                <option key={e} value={e}>{ENTITY_LABELS[e] || e}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Timeline de logs */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <ClipboardList size={40} className="mx-auto mb-3 text-gray-200" />
          <p className="text-gray-400">Nenhum registro encontrado.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([dateLabel, dateLogs]) => (
            <div key={dateLabel}>
              {/* Cabeçalho do dia */}
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600">
                  <Calendar size={14} />
                  <span className="text-xs font-medium capitalize">{dateLabel}</span>
                </div>
                <span className="text-xs text-gray-300">{dateLogs.length} ação(ões)</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>

              {/* Lista de ações do dia */}
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="divide-y divide-gray-50">
                  {dateLogs.map((log) => {
                    const config = ACTION_CONFIG[log.action] || { label: log.action, icon: ClipboardList, color: 'text-gray-600', bgColor: 'bg-gray-100' }
                    const ActionIcon = config.icon
                    const description = buildDescription(log)
                    const details = formatDetails(log.action, log.entity_type, log.details)
                    const isExpanded = expandedLog === log.id

                    return (
                      <div
                        key={log.id}
                        className="p-4 hover:bg-gray-50/50 transition cursor-pointer"
                        onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                      >
                        <div className="flex items-start gap-3">
                          {/* Ícone da ação */}
                          <div className={`w-9 h-9 rounded-xl ${config.bgColor} flex items-center justify-center flex-shrink-0`}>
                            <ActionIcon size={16} className={config.color} />
                          </div>

                          {/* Conteúdo */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm text-gray-900 font-medium">{description}</p>
                            </div>

                            {/* Detalhes formatados */}
                            {details && (
                              <p className="text-sm text-gray-500 mt-0.5">{details}</p>
                            )}

                            {/* Tags */}
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}>
                                {config.label}
                              </span>
                              <span className="text-xs text-gray-300 bg-gray-50 px-2 py-0.5 rounded-full">
                                {ENTITY_LABELS[log.entity_type] || log.entity_type}
                              </span>
                              <span className="text-xs text-gray-300">{log.user_email}</span>
                            </div>

                            {/* Detalhes expandidos */}
                            {isExpanded && log.details && (
                              <div className="mt-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                                <p className="text-xs font-medium text-gray-500 mb-2">Detalhes completos</p>
                                <div className="space-y-1.5">
                                  {Object.entries(log.details).map(([key, value]) => {
                                    // Mapear chaves técnicas para labels legíveis
                                    const keyLabels: Record<string, string> = {
                                      title: 'Título',
                                      name: 'Nome',
                                      full_name: 'Nome Completo',
                                      email: 'Email',
                                      status: 'Status',
                                      brand: 'Marca',
                                      job_id: 'ID do Job',
                                      job_title: 'Job',
                                      deliverable_title: 'Entregável',
                                      label: 'Item',
                                      completed: 'Concluído',
                                      role: 'Papel',
                                      role_name: 'Papel',
                                      papel: 'Papel',
                                      section: 'Seção',
                                      can_create: 'Pode Criar',
                                      can_read: 'Pode Ler',
                                      can_update: 'Pode Editar',
                                      can_delete: 'Pode Deletar',
                                      total_configs: 'Total de Configurações',
                                      total_secoes: 'Total de Seções',
                                      alteracoes: 'Alterações',
                                      roles: 'Papéis',
                                      types: 'Tipos',
                                      schedule: 'Horário',
                                      cron_expression: 'Expressão Cron',
                                      message: 'Mensagem',
                                      action: 'Ação',
                                      count: 'Quantidade',
                                      itens_concluidos: 'Itens Concluídos',
                                      total_itens: 'Total de Itens',
                                      progresso: 'Progresso',
                                      itens_alterados: 'Itens Alterados',
                                      newStatus: 'Novo Status',
                                      progress: 'Progresso'
                                    }
                                    
                                    const displayKey = keyLabels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                                    
                                    // Formatar valores booleanos
                                    let displayValue = String(value)
                                    if (typeof value === 'boolean') {
                                      displayValue = value ? 'Sim' : 'Não'
                                    }
                                    
                                    // Formatar arrays
                                    if (Array.isArray(value)) {
                                      displayValue = value.join(', ')
                                    }

                                    // Verificar se é um campo com múltiplas linhas (separado por | ou ;)
                                    const isMultiline = typeof displayValue === 'string' && 
                                      (displayValue.includes(' | ') || displayValue.includes('; '))

                                    return (
                                      <div key={key} className={`flex ${isMultiline ? 'flex-col' : 'items-start'} gap-2 text-xs`}>
                                        <span className="text-gray-600 font-semibold min-w-[140px]">{displayKey}:</span>
                                        {isMultiline ? (
                                          <div className="space-y-1 pl-2 border-l-2 border-gray-200">
                                            {displayValue.split(/\s*[|;]\s*/).map((line, idx) => (
                                              <div key={idx} className="text-gray-700">• {line}</div>
                                            ))}
                                          </div>
                                        ) : (
                                          <span className="text-gray-700 flex-1">{displayValue}</span>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Horário */}
                          <div className="text-right flex-shrink-0">
                            <p className="text-xs text-gray-400">
                              {new Date(log.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <p className="text-xs text-gray-300 mt-0.5">{timeAgo(log.created_at)}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ))}

          {/* Carregar mais */}
          {filtered.length >= limit && (
            <div className="text-center">
              <button
                onClick={() => setLimit((prev) => prev + 50)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 font-medium hover:bg-gray-50 transition"
              >
                <ChevronDown size={16} />
                Carregar mais registros
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
