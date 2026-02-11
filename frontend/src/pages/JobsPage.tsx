import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Job, JobStatus } from '../types'
import { Plus, Search, Filter, Briefcase } from 'lucide-react'

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<JobStatus | 'todos'>('todos')

  useEffect(() => {
    loadJobs()
  }, [])

  async function loadJobs() {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*, deliverables(*)')
        .order('created_at', { ascending: false })

      if (error) throw error
      setJobs(data || [])
    } catch (err) {
      console.error('Erro ao carregar jobs:', err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = jobs.filter((job) => {
    const matchSearch = job.title.toLowerCase().includes(search.toLowerCase()) ||
      job.brand.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'todos' || job.status === filterStatus
    return matchSearch && matchStatus
  })

  const statusLabel: Record<string, string> = {
    aberto: 'Em Aberto',
    em_andamento: 'Em Andamento',
    finalizado: 'Finalizado',
    cancelado: 'Cancelado',
  }

  const statusColor: Record<string, string> = {
    aberto: 'bg-amber-100 text-amber-700',
    em_andamento: 'bg-blue-100 text-blue-700',
    finalizado: 'bg-emerald-100 text-emerald-700',
    cancelado: 'bg-gray-100 text-gray-500',
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
          <p className="text-gray-500 mt-1">Gerencie todas as suas campanhas</p>
        </div>
        <Link
          to="/jobs/novo"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 text-white font-medium text-sm hover:bg-gray-800 transition"
        >
          <Plus size={18} />
          Novo Job
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou marca..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent"
          />
        </div>
        <div className="relative">
          <Filter size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as JobStatus | 'todos')}
            className="pl-10 pr-8 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent appearance-none"
          >
            <option value="todos">Todos os status</option>
            <option value="aberto">Em Aberto</option>
            <option value="em_andamento">Em Andamento</option>
            <option value="finalizado">Finalizado</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Briefcase size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-400">Nenhum job encontrado.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((job) => {
            const deliverableCount = job.deliverables?.length || 0
            const deliveredCount = job.deliverables?.filter((d) => d.status === 'entregue').length || 0
            const progress = deliverableCount > 0 ? Math.round((deliveredCount / deliverableCount) * 100) : 0

            return (
              <Link
                key={job.id}
                to={`/jobs/${job.id}`}
                className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md hover:border-gray-100 transition"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">{job.title}</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor[job.status]}`}>
                        {statusLabel[job.status]}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{job.brand}</p>
                    {job.scope && (
                      <p className="text-sm text-gray-400 mt-2 line-clamp-2">{job.scope}</p>
                    )}
                  </div>
                  <div className="ml-4 text-right flex-shrink-0">
                    <p className="text-lg font-bold text-gray-900">{progress}%</p>
                    <p className="text-xs text-gray-400">{deliveredCount}/{deliverableCount} entregas</p>
                  </div>
                </div>
                {deliverableCount > 0 && (
                  <div className="mt-4 w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gray-800 rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
                <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                  <span>Início: {new Date(job.start_date).toLocaleDateString('pt-BR')}</span>
                  <span>Fim: {new Date(job.end_date).toLocaleDateString('pt-BR')}</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
