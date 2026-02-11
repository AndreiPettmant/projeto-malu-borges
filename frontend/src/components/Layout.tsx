import { useState, useEffect, useRef } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { logAudit } from '../lib/audit'
import {
  LayoutDashboard,
  Briefcase,
  Settings,
  Shield,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Home,
  BarChart3,
  Sparkles,
  User,
  Users,
  Menu,
  X,
  CalendarDays,
  Bell,
  Check,
} from 'lucide-react'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, section: 'dashboard' },
  { to: '/jobs', label: 'Jobs', icon: Briefcase, section: 'jobs' },
  { to: '/planner', label: 'Planner', icon: CalendarDays, section: 'planner' },
  { to: '/graficos', label: 'Gráficos', icon: BarChart3, section: 'graficos' },
  { to: '/ia', label: 'IA Assistente', icon: Sparkles, section: 'ia' },
  { to: '/notificacoes', label: 'Notificações', icon: Bell, section: 'notification_settings' },
  { to: '/config-home', label: 'Config. Home', icon: Settings, section: 'config_home' },
  { to: '/usuarios', label: 'Usuários', icon: Users, section: 'usuarios' },
  { to: '/papeis-permissoes', label: 'Papéis & Permissões', icon: Shield, section: 'papeis_permissoes' },
  { to: '/auditoria', label: 'Auditoria', icon: ClipboardList, section: 'auditoria' },
]

interface UserNotification {
  id: string
  title: string
  message: string
  type: string
  entity_type?: string
  entity_id?: string
  read_at?: string
  created_at: string
}

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [notifications, setNotifications] = useState<UserNotification[]>([])
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const { profile, canAccess, signOut, user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    loadNotifications()
    // Recarregar notificações a cada 30 segundos
    const interval = setInterval(loadNotifications, 30000)
    return () => clearInterval(interval)
  }, [user])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false)
      }
    }
    if (notifOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [notifOpen])

  async function loadNotifications() {
    if (!user?.id) return
    try {
      const { data } = await supabase
        .from('user_notifications')
        .select('*')
        .eq('user_id', user.id)
        .is('read_at', null)
        .order('created_at', { ascending: false })
        .limit(10)
      setNotifications(data || [])
    } catch (err) {
      console.error('Erro ao carregar notificações:', err)
    }
  }

  async function markAsRead(notifId: string) {
    const notif = notifications.find(n => n.id === notifId)
    await supabase
      .from('user_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notifId)
    
    // Log de auditoria
    if (notif) {
      await logAudit('update', 'notification', notifId, {
        message: notif.message,
        action: 'marcada como lida'
      })
    }
    
    setNotifications((prev) => prev.filter((n) => n.id !== notifId))
  }

  async function markAllAsRead() {
    if (!user?.id || notifications.length === 0) return
    const ids = notifications.map((n) => n.id)
    await supabase
      .from('user_notifications')
      .update({ read_at: new Date().toISOString() })
      .in('id', ids)
    
    // Log de auditoria
    await logAudit('update', 'notification', 'batch', {
      count: ids.length,
      action: 'todas marcadas como lidas'
    })
    
    setNotifications([])
  }

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  // Filtra os itens do menu com base na permissão can_read
  const visibleNavItems = navItems.filter((item) => canAccess(item.section, 'can_read'))

  function SidebarContent() {
    return (
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="p-4 flex items-center gap-3 border-b border-gray-100">
          <div className="w-9 h-9 rounded-xl bg-gray-900 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
            MB
          </div>
          {sidebarOpen && (
            <span className="font-bold text-gray-900 text-lg whitespace-nowrap">Malu Borges</span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                  isActive
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <item.icon size={20} className="flex-shrink-0" />
              {sidebarOpen && <span className="whitespace-nowrap">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-gray-100 space-y-1">
          <NavLink
            to="/"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition"
          >
            <Home size={20} className="flex-shrink-0" />
            {sidebarOpen && <span>Ver Site</span>}
          </NavLink>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition"
          >
            <LogOut size={20} className="flex-shrink-0" />
            {sidebarOpen && <span>Sair</span>}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar Desktop */}
      <aside
        className={`hidden lg:flex flex-col bg-white border-r border-gray-100 transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-[72px]'
        }`}
      >
        <SidebarContent />
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-3 border-t border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition"
        >
          {sidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-xl z-50">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden text-gray-600 hover:text-gray-900"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-4">
            {/* Sino de Notificações */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition"
              >
                <Bell size={20} />
                {notifications.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {notifications.length > 9 ? '9+' : notifications.length}
                  </span>
                )}
              </button>

              {/* Dropdown de Notificações */}
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-lg border border-gray-100 z-50 max-h-[500px] flex flex-col">
                  <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Notificações</h3>
                    {notifications.length > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Marcar todas como lidas
                      </button>
                    )}
                  </div>

                  <div className="overflow-y-auto flex-1">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-gray-400 text-sm">
                        <Bell size={32} className="mx-auto mb-2 opacity-50" />
                        Nenhuma notificação nova
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {notifications.map((notif) => (
                          <div
                            key={notif.id}
                            className="p-4 hover:bg-gray-50 transition group"
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 mb-1">
                                  {notif.title}
                                </p>
                                <p className="text-xs text-gray-600 line-clamp-2">
                                  {notif.message}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                  {new Date(notif.created_at).toLocaleString('pt-BR', {
                                    day: '2-digit',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </p>
                              </div>
                              <button
                                onClick={() => markAsRead(notif.id)}
                                className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition opacity-0 group-hover:opacity-100"
                                title="Marcar como lida"
                              >
                                <Check size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Avatar e Nome */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-900 flex items-center justify-center">
                <User size={16} />
              </div>
              <span className="text-sm font-medium text-gray-700 hidden sm:inline">
                {profile?.full_name || profile?.email || 'Usuário'}
              </span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
