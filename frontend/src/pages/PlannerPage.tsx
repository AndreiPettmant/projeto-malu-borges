import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addMonths, subMonths, format, isSameMonth, isSameDay, eachDayOfInterval, isToday,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  ChevronLeft, ChevronRight, Calendar, Package, Briefcase,
} from 'lucide-react'
import type { DeliverableCategory } from '../types'
import { CATEGORY_LABELS } from '../types'

// ==================== TYPES ====================

interface CalendarEvent {
  id: string
  type: 'job_start' | 'job_end' | 'deliverable'
  title: string
  subtitle: string
  date: string
  time?: string
  jobId: string
  category?: DeliverableCategory
  status?: string
}

const CATEGORY_DOT: Record<DeliverableCategory, string> = {
  midia: 'bg-violet-500',
  captacao: 'bg-sky-500',
  publicidade: 'bg-amber-500',
  evento: 'bg-rose-500',
  outros: 'bg-gray-400',
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  job_start: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  job_end: 'bg-red-100 text-red-700 border-red-200',
  deliverable: 'bg-blue-100 text-blue-700 border-blue-200',
}

const CATEGORY_COLORS: Record<DeliverableCategory, string> = {
  midia: 'bg-violet-100 text-violet-700',
  captacao: 'bg-sky-100 text-sky-700',
  publicidade: 'bg-amber-100 text-amber-700',
  evento: 'bg-rose-100 text-rose-700',
  outros: 'bg-gray-100 text-gray-600',
}

// ==================== COMPONENT ====================

export default function PlannerPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  useEffect(() => {
    loadEvents()
  }, [currentMonth])

  async function loadEvents() {
    setLoading(true)
    try {
      const monthStart = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
      const monthEnd = format(endOfMonth(currentMonth), 'yyyy-MM-dd')

      // Buscar jobs que intersectam com o mês
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id, title, brand, start_date, end_date, status')
        .or(`start_date.lte.${monthEnd},end_date.gte.${monthStart}`)
        .not('status', 'eq', 'cancelado')

      // Buscar entregáveis com due_date neste mês
      const { data: deliverables } = await supabase
        .from('deliverables')
        .select('id, title, due_date, due_time, category, status, job_id, jobs(title)')
        .gte('due_date', monthStart)
        .lte('due_date', monthEnd)

      const evts: CalendarEvent[] = []

      // Eventos de job
      for (const job of (jobs || [])) {
        if (job.start_date >= monthStart && job.start_date <= monthEnd) {
          evts.push({
            id: `job-start-${job.id}`,
            type: 'job_start',
            title: `Início: ${job.title}`,
            subtitle: job.brand,
            date: job.start_date,
            jobId: job.id,
            status: job.status,
          })
        }
        if (job.end_date >= monthStart && job.end_date <= monthEnd) {
          evts.push({
            id: `job-end-${job.id}`,
            type: 'job_end',
            title: `Fim: ${job.title}`,
            subtitle: job.brand,
            date: job.end_date,
            jobId: job.id,
            status: job.status,
          })
        }
      }

      // Eventos de entregáveis
      for (const del of (deliverables || [])) {
        if (!del.due_date) continue
        const jobTitle = (del.jobs as { title?: string })?.title || ''
        evts.push({
          id: `del-${del.id}`,
          type: 'deliverable',
          title: del.title,
          subtitle: jobTitle,
          date: del.due_date,
          time: del.due_time?.slice(0, 5),
          jobId: del.job_id,
          category: del.category as DeliverableCategory,
          status: del.status,
        })
      }

      setEvents(evts)
    } catch (err) {
      console.error('Erro ao carregar planner:', err)
    } finally {
      setLoading(false)
    }
  }

  // ==================== CALENDAR GRID ====================

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const start = startOfWeek(monthStart, { locale: ptBR })
    const end = endOfWeek(monthEnd, { locale: ptBR })
    return eachDayOfInterval({ start, end })
  }, [currentMonth])

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {}
    for (const evt of events) {
      const key = evt.date
      if (!map[key]) map[key] = []
      map[key].push(evt)
    }
    return map
  }, [events])

  const selectedDateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null
  const selectedEvents = selectedDateStr ? eventsByDate[selectedDateStr] || [] : []

  const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  // Upcoming events (next 7 days from today)
  const upcomingEvents = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd')
    const weekFromNow = format(new Date(Date.now() + 7 * 86400000), 'yyyy-MM-dd')
    return events
      .filter((e) => e.date >= today && e.date <= weekFromNow)
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [events])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Calendar size={24} /> Planner
        </h1>
        <p className="text-gray-500 mt-1">Calendário de campanhas e entregáveis</p>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        {/* Calendar */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-5">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition">
              <ChevronLeft size={18} />
            </button>
            <h2 className="text-lg font-semibold text-gray-900 capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </h2>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition">
              <ChevronRight size={18} />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Weekday headers */}
              <div className="grid grid-cols-7 mb-1">
                {weekdays.map((wd) => (
                  <div key={wd} className="text-center text-xs font-semibold text-gray-400 py-2">{wd}</div>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7">
                {calendarDays.map((day) => {
                  const dateStr = format(day, 'yyyy-MM-dd')
                  const dayEvents = eventsByDate[dateStr] || []
                  const isCurrentMonth = isSameMonth(day, currentMonth)
                  const isSelected = selectedDate ? isSameDay(day, selectedDate) : false
                  const isTodayDate = isToday(day)

                  return (
                    <button
                      key={dateStr}
                      onClick={() => setSelectedDate(isSelected ? null : day)}
                      className={`relative min-h-[72px] p-1.5 border border-gray-50 text-left transition rounded-lg
                        ${!isCurrentMonth ? 'opacity-30' : ''}
                        ${isSelected ? 'bg-gray-900 text-white' : 'hover:bg-gray-50'}
                        ${isTodayDate && !isSelected ? 'bg-blue-50' : ''}
                      `}
                    >
                      <span className={`text-xs font-medium ${isSelected ? 'text-white' : isTodayDate ? 'text-blue-600 font-bold' : 'text-gray-700'}`}>
                        {format(day, 'd')}
                      </span>

                      {/* Event dots */}
                      {dayEvents.length > 0 && (
                        <div className="flex flex-wrap gap-0.5 mt-1">
                          {dayEvents.slice(0, 3).map((evt) => (
                            <div
                              key={evt.id}
                              className={`w-1.5 h-1.5 rounded-full ${
                                evt.type === 'deliverable'
                                  ? CATEGORY_DOT[evt.category || 'outros']
                                  : evt.type === 'job_start'
                                    ? 'bg-emerald-500'
                                    : 'bg-red-500'
                              }`}
                            />
                          ))}
                          {dayEvents.length > 3 && (
                            <span className={`text-[9px] ${isSelected ? 'text-gray-300' : 'text-gray-400'}`}>+{dayEvents.length - 3}</span>
                          )}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100 flex-wrap">
                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Início de campanha
                </span>
                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="w-2 h-2 rounded-full bg-red-500" /> Fim de campanha
                </span>
                {(['midia', 'captacao', 'publicidade', 'evento'] as DeliverableCategory[]).map((cat) => (
                  <span key={cat} className="flex items-center gap-1.5 text-xs text-gray-500">
                    <span className={`w-2 h-2 rounded-full ${CATEGORY_DOT[cat]}`} /> {CATEGORY_LABELS[cat]}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          {/* Selected day events */}
          {selectedDate && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-900 mb-3">
                {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
              </h3>
              {selectedEvents.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">Nenhum evento neste dia.</p>
              ) : (
                <div className="space-y-2">
                  {selectedEvents.map((evt) => (
                    <Link
                      key={evt.id}
                      to={`/jobs/${evt.jobId}`}
                      className={`block p-3 rounded-xl border text-sm transition hover:shadow-sm ${EVENT_TYPE_COLORS[evt.type]}`}
                    >
                      <div className="flex items-center gap-2">
                        {evt.type === 'deliverable' ? <Package size={14} /> : <Briefcase size={14} />}
                        <span className="font-medium">{evt.title}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 opacity-75">
                        <span className="text-xs">{evt.subtitle}</span>
                        {evt.time && <span className="text-xs">às {evt.time}</span>}
                        {evt.category && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${CATEGORY_COLORS[evt.category]}`}>
                            {CATEGORY_LABELS[evt.category]}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Upcoming */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Próximos 7 dias</h3>
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">Nenhum evento nos próximos 7 dias.</p>
            ) : (
              <div className="space-y-2">
                {upcomingEvents.slice(0, 8).map((evt) => (
                  <Link
                    key={evt.id}
                    to={`/jobs/${evt.jobId}`}
                    className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-gray-50 transition"
                  >
                    <div className={`w-1.5 h-8 rounded-full ${
                      evt.type === 'deliverable'
                        ? CATEGORY_DOT[evt.category || 'outros']
                        : evt.type === 'job_start'
                          ? 'bg-emerald-500'
                          : 'bg-red-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{evt.title}</p>
                      <p className="text-xs text-gray-500">{evt.subtitle}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-medium text-gray-700">
                        {format(new Date(evt.date + 'T00:00:00'), 'dd/MM')}
                      </p>
                      {evt.time && <p className="text-xs text-gray-400">{evt.time}</p>}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
