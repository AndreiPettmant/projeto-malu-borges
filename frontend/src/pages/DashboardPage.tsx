import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Job } from '../types'
import {
  Briefcase, Clock, CheckCircle2, AlertCircle, Plus, ArrowRight,
} from 'lucide-react'

interface Stats {
  total: number
  aberto: number
  em_andamento: number
  finalizado: number
}

export default function DashboardPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, aberto: 0, em_andamento: 0, finalizado: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*, deliverables(*)')
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error

      const allJobs = data || []
      setJobs(allJobs)
      setStats({
        total: allJobs.length,
        aberto: allJobs.filter((j) => j.status === 'aberto').length,
        em_andamento: allJobs.filter((j) => j.status === 'em_andamento').length,
        finalizado: allJobs.filter((j) => j.status === 'finalizado').length,
      })
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    { label: 'Total de Jobs', value: stats.total, icon: Briefcase, color: 'bg-gray-50 text-gray-900' },
    { label: 'Em Aberto', value: stats.aberto, icon: AlertCircle, color: 'bg-amber-50 text-amber-600' },
    { label: 'Em Andamento', value: stats.em_andamento, icon: Clock, color: 'bg-blue-50 text-blue-600' },
    { label: 'Finalizados', value: stats.finalizado, icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-600' },
  ]

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Visão geral das suas campanhas</p>
        </div>
        <Link
          to="/jobs/novo"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 text-white font-medium text-sm hover:bg-gray-800 transition"
        >
          <Plus size={18} />
          Novo Job
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className={`w-10 h-10 rounded-xl ${card.color} flex items-center justify-center mb-3`}>
              <card.icon size={20} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            <p className="text-sm text-gray-500 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Jobs recentes */}
      <div className="bg-white rounded-2xl border border-gray-100">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Jobs Recentes</h2>
          <Link to="/jobs" className="text-sm text-gray-900 hover:text-gray-800 font-medium inline-flex items-center gap-1">
            Ver todos <ArrowRight size={14} />
          </Link>
        </div>
        {jobs.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Briefcase size={40} className="mx-auto mb-3 opacity-50" />
            <p>Nenhum job cadastrado ainda.</p>
            <Link
              to="/jobs/novo"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl bg-gray-50 text-gray-900 font-medium text-sm hover:bg-gray-100 transition"
            >
              <Plus size={16} />
              Criar primeiro job
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {jobs.map((job) => {
              const deliverableCount = job.deliverables?.length || 0
              const deliveredCount = job.deliverables?.filter((d) => d.status === 'entregue').length || 0
              return (
                <Link
                  key={job.id}
                  to={`/jobs/${job.id}`}
                  className="flex items-center justify-between p-5 hover:bg-gray-50 transition"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium text-gray-900 truncate">{job.title}</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor[job.status]}`}>
                        {statusLabel[job.status]}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{job.brand}</p>
                  </div>
                  <div className="text-right ml-4 flex-shrink-0">
                    <p className="text-sm font-medium text-gray-900">{deliveredCount}/{deliverableCount}</p>
                    <p className="text-xs text-gray-400">entregáveis</p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
