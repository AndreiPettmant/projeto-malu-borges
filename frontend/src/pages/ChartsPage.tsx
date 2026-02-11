import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Job, Deliverable, DeliverableCategory } from '../types'
import { CATEGORY_LABELS } from '../types'
import { BarChart3, CheckCircle2, Clock, Package, Download, Filter, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// ==================== TYPES ====================

interface JobWithDeliverables extends Omit<Job, 'deliverables'> {
  deliverables: (Deliverable & {
    deliverable_checklist_items?: { id: string; completed: boolean }[]
  })[]
}

// ==================== CATEGORY COLORS ====================

const CATEGORY_CHART_COLORS: Record<DeliverableCategory, string> = {
  midia: '#8b5cf6',
  captacao: '#0ea5e9',
  publicidade: '#f59e0b',
  evento: '#f43f5e',
  outros: '#94a3b8',
}

// ==================== COMPONENT ====================

export default function ChartsPage() {
  const [jobs, setJobs] = useState<JobWithDeliverables[]>([])
  const [loading, setLoading] = useState(true)
  
  // Filtros
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterBrand, setFilterBrand] = useState<string>('all')
  const [filterPeriod, setFilterPeriod] = useState<string>('all') // all, 30d, 60d, 90d
  
  // Paginação
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    loadData()
  }, [])
  
  useEffect(() => {
    setCurrentPage(1) // Reset para página 1 quando filtros mudam
  }, [filterStatus, filterBrand, filterPeriod])

  async function loadData() {
    try {
      const { data } = await supabase
        .from('jobs')
        .select('*, deliverables(*, deliverable_checklist_items(id, completed, label, due_date, details, budget))')
        .order('created_at', { ascending: false })
      setJobs((data as JobWithDeliverables[]) || [])
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
    } finally {
      setLoading(false)
    }
  }
  
  // Função para exportar job em PDF
  function exportJobToPDF(job: JobWithDeliverables) {
    const doc = new jsPDF({ orientation: 'landscape' })
    const pageWidth = doc.internal.pageSize.width
    const pageHeight = doc.internal.pageSize.height
    
    // ========== PÁGINA 1: CAPA ==========
    // Logo MB estilizado (assinatura elegante)
    doc.setTextColor(17, 24, 39)
    doc.setFontSize(72)
    doc.setFont('times', 'bolditalic')
    doc.text('MB', pageWidth / 2, 65, { align: 'center' })
    
    // Linha decorativa abaixo do MB
    doc.setDrawColor(17, 24, 39)
    doc.setLineWidth(0.5)
    const lineWidth = 40
    doc.line((pageWidth - lineWidth) / 2, 70, (pageWidth + lineWidth) / 2, 70)
    
    // Nome do Job
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(17, 24, 39)
    doc.text(job.title, pageWidth / 2, 100, { align: 'center' })
    
    // Marca
    doc.setFontSize(14)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(107, 114, 128)
    doc.text(job.brand, pageWidth / 2, 110, { align: 'center' })
    
    // Data
    const hoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    doc.setFontSize(12)
    doc.setTextColor(107, 114, 128)
    doc.text(hoje, pageWidth / 2, 125, { align: 'center' })
    
    // Status (badge grande e centralizado)
    const statusLabels: Record<string, string> = {
      aberto: 'EM ABERTO',
      em_andamento: 'EM ANDAMENTO',
      finalizado: 'FINALIZADO',
      cancelado: 'CANCELADO'
    }
    const statusColors: Record<string, [number, number, number]> = {
      aberto: [245, 158, 11],
      em_andamento: [59, 130, 246],
      finalizado: [16, 185, 129],
      cancelado: [148, 163, 184]
    }
    
    const statusColor = statusColors[job.status] || [0, 0, 0]
    doc.setFillColor(...statusColor)
    const statusText = statusLabels[job.status] || job.status.toUpperCase()
    const statusWidth = doc.getTextWidth(statusText) + 20
    doc.roundedRect((pageWidth - statusWidth) / 2, 135, statusWidth, 12, 3, 3, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(statusText, pageWidth / 2, 143, { align: 'center' })
    
    // Orçamento e Período (se existirem)
    let infoY = 160
    if (job.budget) {
      doc.setFontSize(10)
      doc.setTextColor(107, 114, 128)
      doc.setFont('helvetica', 'normal')
      doc.text('ORÇAMENTO TOTAL', pageWidth / 2, infoY, { align: 'center' })
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(17, 24, 39)
      doc.text(`R$ ${job.budget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, pageWidth / 2, infoY + 8, { align: 'center' })
      infoY += 20
    }
    
    if (job.start_date || job.end_date) {
      doc.setFontSize(10)
      doc.setTextColor(107, 114, 128)
      doc.setFont('helvetica', 'normal')
      doc.text('PERÍODO', pageWidth / 2, infoY, { align: 'center' })
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(17, 24, 39)
      const periodo = `${job.start_date ? new Date(job.start_date).toLocaleDateString('pt-BR') : '—'} até ${job.end_date ? new Date(job.end_date).toLocaleDateString('pt-BR') : '—'}`
      doc.text(periodo, pageWidth / 2, infoY + 8, { align: 'center' })
    }
    
    // ========== PÁGINAS SEGUINTES: ESCOPO E ENTREGÁVEIS ==========
    const dels = job.deliverables || []
    if (dels.length > 0) {
      doc.addPage()
      
      // Header de cada página
      doc.setFillColor(17, 24, 39)
      doc.rect(0, 0, pageWidth, 25, 'F')
      
      // Logo MB estilizado no header
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(18)
      doc.setFont('times', 'bolditalic')
      doc.text('MB', 15, 16)
      
      // Título no header
      doc.setFontSize(14)
      doc.setFont('helvetica', 'normal')
      doc.text('Escopo & Entregáveis', 32, 15)
      
      // Nome do job no header (direita)
      doc.setFontSize(10)
      doc.setTextColor(200, 200, 200)
      doc.text(job.title, pageWidth - 15, 15, { align: 'right' })
      
      let yPos = 40
      
      // Resumo geral do escopo
      const totalDels = dels.length
      const delivered = dels.filter((d) => d.status === 'entregue').length
      const inProgress = dels.filter((d) => d.status === 'em_producao').length
      const pending = dels.filter((d) => d.status === 'pendente').length
      const progress = totalDels > 0 ? Math.round((delivered / totalDels) * 100) : 0
      
      doc.setFillColor(249, 250, 251)
      doc.roundedRect(20, yPos, pageWidth - 40, 25, 3, 3, 'F')
      
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(17, 24, 39)
      doc.text('Status Geral do Escopo', 25, yPos + 8)
      
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(75, 85, 99)
      doc.text(`Total: ${totalDels} entregáveis`, 25, yPos + 16)
      doc.text(`|`, 90, yPos + 16)
      doc.setTextColor(16, 185, 129)
      doc.text(`${delivered} entregues`, 95, yPos + 16)
      doc.setTextColor(75, 85, 99)
      doc.text(`|`, 145, yPos + 16)
      doc.setTextColor(59, 130, 246)
      doc.text(`${inProgress} em produção`, 150, yPos + 16)
      doc.setTextColor(75, 85, 99)
      doc.text(`|`, 210, yPos + 16)
      doc.setTextColor(245, 158, 11)
      doc.text(`${pending} pendentes`, 215, yPos + 16)
      
      // Barra de progresso
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(17, 24, 39)
      doc.text(`${progress}%`, pageWidth - 35, yPos + 13)
      
      yPos += 35
      
      // Tabela de entregáveis
      dels.forEach((del, idx) => {
        // Verifica se precisa de nova página
        if (yPos > pageHeight - 60) {
          doc.addPage()
          
          // Repetir header
          doc.setFillColor(17, 24, 39)
          doc.rect(0, 0, pageWidth, 25, 'F')
          doc.setTextColor(255, 255, 255)
          doc.setFontSize(18)
          doc.setFont('times', 'bolditalic')
          doc.text('MB', 15, 16)
          doc.setFontSize(14)
          doc.setFont('helvetica', 'normal')
          doc.text('Escopo & Entregáveis', 32, 15)
          doc.setFontSize(10)
          doc.setTextColor(200, 200, 200)
          doc.text(job.title, pageWidth - 15, 15, { align: 'right' })
          
          yPos = 40
        }
        
        // Título do entregável com status
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(17, 24, 39)
        
        const delStatusLabels: Record<string, string> = {
          pendente: 'PENDENTE',
          em_producao: 'EM PRODUÇÃO',
          entregue: 'ENTREGUE',
          cancelado: 'CANCELADO'
        }
        const delStatusColors: Record<string, [number, number, number]> = {
          pendente: [245, 158, 11],
          em_producao: [59, 130, 246],
          entregue: [16, 185, 129],
          cancelado: [148, 163, 184]
        }
        
        const delColor = delStatusColors[del.status] || [0, 0, 0]
        doc.setFillColor(...delColor)
        doc.roundedRect(20, yPos - 3, 8, 6, 1, 1, 'F')
        
        doc.text(`${idx + 1}. ${del.title}`, 32, yPos)
        
        // Status do entregável (direita)
        const statusLabel = delStatusLabels[del.status] || del.status
        doc.setFillColor(...delColor)
        const statusBadgeWidth = doc.getTextWidth(statusLabel) + 8
        doc.roundedRect(pageWidth - 20 - statusBadgeWidth, yPos - 4, statusBadgeWidth, 7, 2, 2, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.text(statusLabel, pageWidth - 20 - statusBadgeWidth / 2, yPos, { align: 'center' })
        
        yPos += 8
        
        // Checklist
        const checklist = del.deliverable_checklist_items || []
        if (checklist.length > 0) {
          const checklistData = checklist.map((item: any) => {
            return [
              item.completed ? 'CONCLUÍDO' : 'PENDENTE',
              item.label,
              item.due_date ? new Date(item.due_date).toLocaleDateString('pt-BR') : '—',
              item.budget ? `R$ ${Number(item.budget).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'
            ]
          })
          
          autoTable(doc, {
            startY: yPos,
            head: [['Status', 'Tarefa', 'Prazo', 'Orçamento']],
            body: checklistData,
            theme: 'striped',
            styles: { 
              fontSize: 9, 
              cellPadding: 4,
              textColor: [55, 65, 81],
              lineColor: [229, 231, 235],
              lineWidth: 0.1
            },
            headStyles: {
              fillColor: [17, 24, 39],
              textColor: [255, 255, 255],
              fontStyle: 'bold',
              fontSize: 9
            },
            alternateRowStyles: {
              fillColor: [249, 250, 251]
            },
            columnStyles: {
              0: { cellWidth: 28, halign: 'center', fontStyle: 'bold' },
              1: { cellWidth: 152 },
              2: { cellWidth: 30, halign: 'center' },
              3: { cellWidth: 35, halign: 'right' }
            },
            margin: { left: 20, right: 20 },
            didParseCell: (data) => {
              // Estilizar células de status
              if (data.section === 'body' && data.column.index === 0) {
                if (data.cell.text[0] === 'CONCLUÍDO') {
                  data.cell.styles.textColor = [16, 185, 129]
                  data.cell.styles.fontStyle = 'bold'
                  data.cell.styles.fontSize = 8
                } else if (data.cell.text[0] === 'PENDENTE') {
                  data.cell.styles.textColor = [245, 158, 11]
                  data.cell.styles.fontStyle = 'bold'
                  data.cell.styles.fontSize = 8
                }
              }
            }
          })
          
          yPos = (doc as any).lastAutoTable.finalY + 12
        } else {
          yPos += 10
        }
      })
    }
    
    // ========== FOOTER EM TODAS AS PÁGINAS ==========
    const totalPages = doc.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      const footerY = pageHeight - 10
      doc.setFontSize(8)
      doc.setTextColor(156, 163, 175)
      doc.text('Malu Borges - Gestão de Projetos', pageWidth / 2, footerY, { align: 'center' })
      doc.text(`Página ${i} de ${totalPages}`, pageWidth - 15, footerY, { align: 'right' })
    }
    
    // Salvar PDF
    const fileName = `${job.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.pdf`
    doc.save(fileName)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
      </div>
    )
  }

  // ==================== FILTROS ====================
  
  // Aplicar filtros
  const filteredJobs = jobs.filter((job) => {
    // Filtro de status
    if (filterStatus !== 'all' && job.status !== filterStatus) return false
    
    // Filtro de marca
    if (filterBrand !== 'all' && job.brand !== filterBrand) return false
    
    // Filtro de período
    if (filterPeriod !== 'all') {
      const createdAt = new Date(job.created_at)
      const now = new Date()
      const diffDays = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
      
      if (filterPeriod === '30d' && diffDays > 30) return false
      if (filterPeriod === '60d' && diffDays > 60) return false
      if (filterPeriod === '90d' && diffDays > 90) return false
    }
    
    return true
  })
  
  // Lista única de marcas para o filtro
  const brands = Array.from(new Set(jobs.map((j) => j.brand))).sort()

  // ==================== DATA ====================

  const statusData = [
    { name: 'Em Aberto', value: filteredJobs.filter((j) => j.status === 'aberto').length, color: '#f59e0b' },
    { name: 'Em Andamento', value: filteredJobs.filter((j) => j.status === 'em_andamento').length, color: '#3b82f6' },
    { name: 'Finalizado', value: filteredJobs.filter((j) => j.status === 'finalizado').length, color: '#10b981' },
    { name: 'Cancelado', value: filteredJobs.filter((j) => j.status === 'cancelado').length, color: '#94a3b8' },
  ].filter((d) => d.value > 0)

  const deliverableStats = filteredJobs.map((job) => {
    const dels = job.deliverables || []
    return {
      name: job.title.length > 20 ? job.title.substring(0, 20) + '...' : job.title,
      Pendente: dels.filter((d) => d.status === 'pendente').length,
      'Em Produção': dels.filter((d) => d.status === 'em_producao').length,
      Entregue: dels.filter((d) => d.status === 'entregue').length,
    }
  }).filter((d) => d.Pendente + d['Em Produção'] + d.Entregue > 0)

  // Category distribution
  const allDeliverables = filteredJobs.flatMap((j) => j.deliverables || [])
  const categoryData = (['midia', 'captacao', 'publicidade', 'evento', 'outros'] as DeliverableCategory[])
    .map((cat) => ({
      name: CATEGORY_LABELS[cat],
      value: allDeliverables.filter((d) => d.category === cat).length,
      color: CATEGORY_CHART_COLORS[cat],
    }))
    .filter((d) => d.value > 0)

  const totalBudget = filteredJobs.reduce((sum, j) => sum + (j.budget || 0), 0)
  const totalDeliverables = allDeliverables.length
  const totalDelivered = allDeliverables.filter((d) => d.status === 'entregue').length
  const totalChecklist = allDeliverables.reduce((sum, d) => sum + (d.deliverable_checklist_items?.length || 0), 0)
  const doneChecklist = allDeliverables.reduce((sum, d) => sum + (d.deliverable_checklist_items?.filter((c) => c.completed).length || 0), 0)

  // Jobs with deliverables for per-job chart
  const jobsWithDels = filteredJobs.filter((j) => (j.deliverables || []).length > 0)
  
  // ==================== PAGINAÇÃO ====================
  
  const totalPages = Math.ceil(jobsWithDels.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedJobs = jobsWithDels.slice(startIndex, endIndex)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BarChart3 size={24} /> Gráficos e Indicadores
        </h1>
        <p className="text-gray-500 mt-1">Visão analítica das suas campanhas</p>
      </div>
      
      {/* ==================== FILTROS ==================== */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={18} className="text-gray-700" />
          <h2 className="font-semibold text-gray-900">Filtros</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Filtro de Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="all">Todos</option>
              <option value="aberto">Em Aberto</option>
              <option value="em_andamento">Em Andamento</option>
              <option value="finalizado">Finalizado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
          
          {/* Filtro de Marca */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Marca</label>
            <select
              value={filterBrand}
              onChange={(e) => setFilterBrand(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="all">Todas</option>
              {brands.map((brand) => (
                <option key={brand} value={brand}>{brand}</option>
              ))}
            </select>
          </div>
          
          {/* Filtro de Período */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Período</label>
            <select
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="all">Todos</option>
              <option value="30d">Últimos 30 dias</option>
              <option value="60d">Últimos 60 dias</option>
              <option value="90d">Últimos 90 dias</option>
            </select>
          </div>
        </div>
        
        {(filterStatus !== 'all' || filterBrand !== 'all' || filterPeriod !== 'all') && (
          <button
            onClick={() => {
              setFilterStatus('all')
              setFilterBrand('all')
              setFilterPeriod('all')
            }}
            className="mt-4 text-sm text-gray-600 hover:text-gray-900 underline"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Métricas resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-2xl font-bold text-gray-900">{filteredJobs.length}</p>
          <p className="text-sm text-gray-500">Total de Jobs</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-2xl font-bold text-gray-900">{totalDeliverables}</p>
          <p className="text-sm text-gray-500">Total Entregáveis</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-2xl font-bold text-emerald-600">{totalDelivered}</p>
          <p className="text-sm text-gray-500">Entregues</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-2xl font-bold text-blue-600">{doneChecklist}/{totalChecklist}</p>
          <p className="text-sm text-gray-500">Checklist Feitos</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-2xl font-bold text-gray-900">
            {totalBudget > 0 ? `R$ ${totalBudget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
          </p>
          <p className="text-sm text-gray-500">Orçamento Total</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pizza: Status dos jobs */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Status dos Jobs</h2>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value">
                  {statusData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-sm text-center py-12">Sem dados para exibir.</p>
          )}
        </div>

        {/* Pizza: Categorias */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Entregáveis por Categoria</h2>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value">
                  {categoryData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-sm text-center py-12">Sem dados para exibir.</p>
          )}
        </div>
      </div>

      {/* Barras empilhadas: Entregáveis por job */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Entregáveis por Job (Status)</h2>
        {deliverableStats.length > 0 ? (
          <ResponsiveContainer width="100%" height={Math.max(280, deliverableStats.length * 50)}>
            <BarChart data={deliverableStats} layout="vertical" margin={{ left: 10 }}>
              <XAxis type="number" allowDecimals={false} />
              <YAxis dataKey="name" type="category" width={160} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Entregue" fill="#10b981" stackId="a" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Em Produção" fill="#3b82f6" stackId="a" />
              <Bar dataKey="Pendente" fill="#f59e0b" stackId="a" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-400 text-sm text-center py-12">Sem dados para exibir.</p>
        )}
      </div>

      {/* ==================== PROGRESSO POR JOB (visual cards) ==================== */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Progresso por Job</h2>
          {jobsWithDels.length > 0 && (
            <span className="text-sm text-gray-500">
              {jobsWithDels.length} job{jobsWithDels.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        
        {jobsWithDels.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">Nenhum job com entregáveis cadastrados.</p>
        ) : (
          <>
            <div className="space-y-4">
              {paginatedJobs.map((job) => {
                const dels = job.deliverables || []
                const delivered = dels.filter((d) => d.status === 'entregue').length
                const inProgress = dels.filter((d) => d.status === 'em_producao').length
                const pending = dels.filter((d) => d.status === 'pendente').length
                const total = dels.length
                const progress = total > 0 ? Math.round((delivered / total) * 100) : 0

                const checkTotal = dels.reduce((s, d) => s + (d.deliverable_checklist_items?.length || 0), 0)
                const checkDone = dels.reduce((s, d) => s + (d.deliverable_checklist_items?.filter((c) => c.completed).length || 0), 0)

                return (
                  <div
                    key={job.id}
                    className="p-4 rounded-xl border border-gray-100 hover:border-gray-200 transition"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Link
                        to={`/jobs/${job.id}`}
                        className="flex items-center gap-2 min-w-0 flex-1 hover:text-gray-700"
                      >
                        <h3 className="font-medium text-gray-900 truncate">{job.title}</h3>
                        <span className="text-xs text-gray-500">{job.brand}</span>
                      </Link>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-sm font-bold text-gray-900">{progress}%</span>
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            exportJobToPDF(job)
                          }}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Exportar para PDF"
                        >
                          <Download size={16} className="text-gray-600" />
                        </button>
                      </div>
                    </div>

                    {/* Progress bar stacked */}
                    <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden flex">
                      {delivered > 0 && (
                        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(delivered / total) * 100}%` }} />
                      )}
                      {inProgress > 0 && (
                        <div className="h-full bg-blue-500 transition-all" style={{ width: `${(inProgress / total) * 100}%` }} />
                      )}
                      {pending > 0 && (
                        <div className="h-full bg-amber-400 transition-all" style={{ width: `${(pending / total) * 100}%` }} />
                      )}
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 size={12} className="text-emerald-500" /> {delivered} entregues
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} className="text-blue-500" /> {inProgress} em produção
                      </span>
                      <span className="flex items-center gap-1">
                        <Package size={12} className="text-amber-500" /> {pending} pendentes
                      </span>
                      {checkTotal > 0 && (
                        <span className="flex items-center gap-1 ml-auto">
                          Checklist: {checkDone}/{checkTotal}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            
            {/* ==================== PAGINAÇÃO ==================== */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft size={16} />
                  Anterior
                </button>
                
                <span className="text-sm text-gray-600">
                  Página {currentPage} de {totalPages}
                </span>
                
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Próxima
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
