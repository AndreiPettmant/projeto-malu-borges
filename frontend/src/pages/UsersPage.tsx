import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { logAudit } from '../lib/audit'
import { useAuth } from '../contexts/AuthContext'
import type { Role, User as AppUser } from '../types'
import {
  Users, Plus, Edit, Trash2, Loader2, X, Save,
  Search, Phone, Mail, Shield, User,
} from 'lucide-react'

interface UserFormData {
  email: string
  full_name: string
  phone: string
  role_id: string
  password: string
}

const emptyForm: UserFormData = { email: '', full_name: '', phone: '', role_id: '', password: '' }

export default function UsersPage() {
  const { canAccess } = useAuth()
  const [users, setUsers] = useState<AppUser[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editUserId, setEditUserId] = useState<string | null>(null)
  const [formData, setFormData] = useState<UserFormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const canCreate = canAccess('usuarios', 'can_create')
  const canEdit = canAccess('usuarios', 'can_update')
  const canDelete = canAccess('usuarios', 'can_delete')

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    try {
      const [usersRes, rolesRes] = await Promise.all([
        supabase.from('users').select('*').order('full_name'),
        supabase.from('roles').select('*').order('name'),
      ])
      setUsers(usersRes.data || [])
      setRoles(rolesRes.data || [])
    } catch (err) {
      console.error('Erro:', err)
    } finally {
      setLoading(false)
    }
  }

  function openCreateModal() {
    setFormData(emptyForm)
    setIsEditing(false)
    setEditUserId(null)
    setFormError('')
    setShowModal(true)
  }

  function openEditModal(user: AppUser) {
    setFormData({
      email: user.email,
      full_name: user.full_name || '',
      phone: (user as AppUser & { phone?: string }).phone || '',
      role_id: user.role_id || '',
      password: '',
    })
    setIsEditing(true)
    setEditUserId(user.id)
    setFormError('')
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setFormData(emptyForm)
    setFormError('')
    setEditUserId(null)
    setIsEditing(false)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError('')
    setSaving(true)

    try {
      if (isEditing && editUserId) {
        // Atualizar usuário existente na tabela public.users
        const updateData: Record<string, unknown> = {
          full_name: formData.full_name,
          phone: formData.phone || null,
          role_id: formData.role_id || null,
        }

        const { error } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', editUserId)

        if (error) throw error

        await logAudit({
          action: 'update',
          entity_type: 'user',
          entity_id: editUserId,
          details: { full_name: formData.full_name, role: roles.find((r) => r.id === formData.role_id)?.name },
        })
      } else {
        // Criar novo usuário via Supabase Auth
        if (!formData.email || !formData.password) {
          setFormError('E-mail e senha são obrigatórios para novo usuário.')
          setSaving(false)
          return
        }

        if (formData.password.length < 6) {
          setFormError('A senha deve ter no mínimo 6 caracteres.')
          setSaving(false)
          return
        }

        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: { full_name: formData.full_name },
          },
        })

        if (authError) throw authError

        // Atualizar o perfil com phone e role_id (o trigger já cria o registro em public.users)
        if (authData.user) {
          // Aguardar um pouco para o trigger criar o registro
          await new Promise((resolve) => setTimeout(resolve, 500))

          const { error: updateError } = await supabase
            .from('users')
            .update({
              phone: formData.phone || null,
              role_id: formData.role_id || null,
              full_name: formData.full_name,
            })
            .eq('id', authData.user.id)

          if (updateError) {
            console.error('Erro ao atualizar perfil:', updateError)
          }

          await logAudit({
            action: 'create',
            entity_type: 'user',
            entity_id: authData.user.id,
            details: { email: formData.email, full_name: formData.full_name },
          })
        }
      }

      closeModal()
      loadAll()
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setFormError(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(userId: string) {
    const user = users.find((u) => u.id === userId)
    if (!confirm(`Excluir o usuário "${user?.full_name || user?.email}"? Esta ação não pode ser desfeita.`)) return

    try {
      await supabase.from('users').delete().eq('id', userId)
      await logAudit({
        action: 'delete',
        entity_type: 'user',
        entity_id: userId,
        details: { email: user?.email, full_name: user?.full_name },
      })
      loadAll()
    } catch (err) {
      console.error('Erro ao excluir:', err)
    }
  }

  const filtered = users.filter((u) => {
    const s = search.toLowerCase()
    return (
      (u.full_name || '').toLowerCase().includes(s) ||
      u.email.toLowerCase().includes(s)
    )
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users size={24} /> Usuários
          </h1>
          <p className="text-gray-500 mt-1">Gerencie os usuários do sistema</p>
        </div>
        {canCreate && (
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 text-white font-medium text-sm hover:bg-gray-800 transition"
          >
            <Plus size={16} /> Novo Usuário
          </button>
        )}
      </div>

      {/* Busca */}
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou e-mail..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-800"
        />
      </div>

      {/* Lista de usuários */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Users size={40} className="mx-auto mb-3 opacity-50" />
            <p>Nenhum usuário encontrado.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map((u) => {
              const role = roles.find((r) => r.id === u.role_id)
              return (
                <div key={u.id} className="p-4 flex items-center gap-4">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center flex-shrink-0 text-sm font-bold">
                    {u.full_name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{u.full_name || 'Sem nome'}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Mail size={11} /> {u.email}
                      </span>
                      {(u as AppUser & { phone?: string }).phone && (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Phone size={11} /> {(u as AppUser & { phone?: string }).phone}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Role badge */}
                  <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full flex items-center gap-1 flex-shrink-0">
                    <Shield size={11} /> {role?.name || 'Sem papel'}
                  </span>

                  {/* Ações */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {canEdit && (
                      <button
                        onClick={() => openEditModal(u)}
                        className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition"
                        title="Editar"
                      >
                        <Edit size={15} />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(u.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                        title="Excluir"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 text-center">{filtered.length} usuário(s) encontrado(s)</p>

      {/* Modal de criação/edição */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-white rounded-2xl w-full max-w-md shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gray-900 text-white flex items-center justify-center">
                  <User size={16} />
                </div>
                <h2 className="font-semibold text-gray-900">
                  {isEditing ? 'Editar Usuário' : 'Novo Usuário'}
                </h2>
              </div>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition">
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">
                  {formError}
                </div>
              )}

              {/* Nome */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Nome do usuário"
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-800 focus:bg-white"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@exemplo.com"
                  required
                  disabled={isEditing}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-800 focus:bg-white disabled:opacity-60 disabled:cursor-not-allowed"
                />
                {isEditing && <p className="text-xs text-gray-400 mt-1">O e-mail não pode ser alterado</p>}
              </div>

              {/* Telefone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(11) 99999-9999"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-800 focus:bg-white"
                />
              </div>

              {/* Papel */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Papel</label>
                <select
                  value={formData.role_id}
                  onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-800 focus:bg-white"
                >
                  <option value="">Selecionar papel</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              {/* Senha (só para novo usuário) */}
              {!isEditing && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Mínimo 6 caracteres"
                    required
                    minLength={6}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-800 focus:bg-white"
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {isEditing ? 'Salvar' : 'Criar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
