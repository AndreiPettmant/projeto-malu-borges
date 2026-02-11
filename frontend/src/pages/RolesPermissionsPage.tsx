import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { logAudit } from '../lib/audit'
import type { Role, Permission } from '../types'
import { Shield, Plus, Trash2, Save, Loader2, X, ChevronDown, ChevronUp } from 'lucide-react'

const SECTIONS = [
  'dashboard', 'jobs', 'entregaveis', 'graficos', 'ia', 'config_home', 'usuarios', 'papeis_permissoes', 'auditoria', 'planner', 'notification_settings',
]

const SECTION_LABELS: Record<string, string> = {
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
  notification_settings: 'Notificações',
}

export default function RolesPermissionsPage() {
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)

  // Role form
  const [showRoleForm, setShowRoleForm] = useState(false)
  const [roleName, setRoleName] = useState('')
  const [roleDescription, setRoleDescription] = useState('')
  const [savingRole, setSavingRole] = useState(false)

  // Expanded role
  const [expandedRole, setExpandedRole] = useState<string | null>(null)

  // Saving permissions per role
  const [savingPerms, setSavingPerms] = useState<string | null>(null)
  const [savedPerms, setSavedPerms] = useState<string | null>(null)

  // Local edits for permissions (tracks unsaved changes)
  const [localPermissions, setLocalPermissions] = useState<Permission[]>([])

  useEffect(() => {
    loadAll()
  }, [])

  useEffect(() => {
    setLocalPermissions(permissions)
  }, [permissions])

  async function loadAll() {
    try {
      const [rolesRes, permsRes] = await Promise.all([
        supabase.from('roles').select('*').order('created_at'),
        supabase.from('permissions').select('*'),
      ])
      setRoles(rolesRes.data || [])
      setPermissions(permsRes.data || [])
    } catch (err) {
      console.error('Erro:', err)
    } finally {
      setLoading(false)
    }
  }

  async function createRole(e: FormEvent) {
    e.preventDefault()
    if (!roleName.trim()) return
    setSavingRole(true)

    try {
      const { data: newRole } = await supabase.from('roles').insert({
        name: roleName, description: roleDescription || null, is_system: false,
      }).select().single()

      if (newRole) {
        const perms = SECTIONS.map((section) => ({
          role_id: newRole.id, section, can_create: false, can_read: false, can_update: false, can_delete: false,
        }))
        await supabase.from('permissions').insert(perms)
        await logAudit({ action: 'create', entity_type: 'role', entity_id: newRole.id, details: { name: roleName } })
      }

      setRoleName(''); setRoleDescription('')
      setShowRoleForm(false)
      loadAll()
    } catch (err) {
      console.error('Erro ao criar papel:', err)
    } finally {
      setSavingRole(false)
    }
  }

  async function deleteRole(roleId: string) {
    if (!confirm('Excluir este papel e todas as suas permissões?')) return
    const role = roles.find((r) => r.id === roleId)
    await supabase.from('permissions').delete().eq('role_id', roleId)
    await supabase.from('roles').delete().eq('id', roleId)
    await logAudit({ action: 'delete', entity_type: 'role', entity_id: roleId, details: { name: role?.name } })
    loadAll()
  }

  function toggleLocalPermission(permId: string, field: 'can_create' | 'can_read' | 'can_update' | 'can_delete') {
    setLocalPermissions((prev) =>
      prev.map((p) => p.id === permId ? { ...p, [field]: !p[field] } : p)
    )
  }

  async function saveRolePermissions(roleId: string) {
    setSavingPerms(roleId)
    const rolePerms = localPermissions.filter((p) => p.role_id === roleId)
    const originalPerms = permissions.filter((p) => p.role_id === roleId)

    try {
      // Identificar quais permissões foram alteradas
      const changes: string[] = []
      for (const perm of rolePerms) {
        const original = originalPerms.find(o => o.id === perm.id)
        if (!original) continue

        const changedFields: string[] = []
        if (perm.can_create !== original.can_create) changedFields.push(perm.can_create ? '+criar' : '-criar')
        if (perm.can_read !== original.can_read) changedFields.push(perm.can_read ? '+ler' : '-ler')
        if (perm.can_update !== original.can_update) changedFields.push(perm.can_update ? '+editar' : '-editar')
        if (perm.can_delete !== original.can_delete) changedFields.push(perm.can_delete ? '+deletar' : '-deletar')

        if (changedFields.length > 0) {
          const sectionLabel = SECTION_LABELS[perm.section] || perm.section
          changes.push(`${sectionLabel}: ${changedFields.join(', ')}`)
        }

        await supabase.from('permissions').update({
          can_create: perm.can_create,
          can_read: perm.can_read,
          can_update: perm.can_update,
          can_delete: perm.can_delete,
        }).eq('id', perm.id)
      }

      const role = roles.find((r) => r.id === roleId)
      await logAudit({ 
        action: 'update', 
        entity_type: 'permissions', 
        entity_id: roleId, 
        details: { 
          papel: role?.name,
          total_secoes: rolePerms.length,
          alteracoes: changes.length > 0 ? changes.join(' | ') : 'Nenhuma alteração'
        } 
      })

      // Sincronizar permissions com localPermissions
      setPermissions(localPermissions)
      setSavedPerms(roleId)
      setTimeout(() => setSavedPerms(null), 2000)
    } catch (err) {
      console.error('Erro ao salvar permissões:', err)
    } finally {
      setSavingPerms(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Shield size={24} /> Papéis & Permissões
        </h1>
        <p className="text-gray-500 mt-1">Gerencie os papéis e o que cada um pode fazer no sistema</p>
      </div>

      <div className="flex justify-end">
        <button onClick={() => setShowRoleForm(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 text-white font-medium text-sm hover:bg-gray-800 transition">
          <Plus size={16} /> Novo Papel
        </button>
      </div>

      {showRoleForm && (
        <form onSubmit={createRole} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
          <input type="text" value={roleName} onChange={(e) => setRoleName(e.target.value)} placeholder="Nome do papel *" required className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-800" />
          <input type="text" value={roleDescription} onChange={(e) => setRoleDescription(e.target.value)} placeholder="Descrição (opcional)" className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-800" />
          <div className="flex gap-2">
            <button type="submit" disabled={savingRole} className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
              {savingRole ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Criar
            </button>
            <button type="button" onClick={() => setShowRoleForm(false)} className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-500"><X size={14} /></button>
          </div>
        </form>
      )}

      {roles.map((role) => {
        const rolePerms = localPermissions.filter((p) => p.role_id === role.id)
        const isExpanded = expandedRole === role.id
        const isSaving = savingPerms === role.id
        const isSaved = savedPerms === role.id

        // Verificar se tem mudanças não salvas
        const originalPerms = permissions.filter((p) => p.role_id === role.id)
        const hasChanges = rolePerms.some((lp) => {
          const op = originalPerms.find((p) => p.id === lp.id)
          return op && (op.can_create !== lp.can_create || op.can_read !== lp.can_read || op.can_update !== lp.can_update || op.can_delete !== lp.can_delete)
        })

        return (
          <div key={role.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <button onClick={() => setExpandedRole(isExpanded ? null : role.id)} className="w-full p-5 flex items-center justify-between text-left">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">{role.name}</h3>
                  {role.is_system && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Sistema</span>}
                </div>
                {role.description && <p className="text-sm text-gray-500 mt-0.5">{role.description}</p>}
              </div>
              <div className="flex items-center gap-2">
                {!role.is_system && (
                  <button onClick={(e) => { e.stopPropagation(); deleteRole(role.id) }} className="text-gray-300 hover:text-red-500 transition p-1">
                    <Trash2 size={16} />
                  </button>
                )}
                {isExpanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
              </div>
            </button>
            {isExpanded && (
              <div className="border-t border-gray-100 p-5">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 text-left">
                      <th className="pb-2 font-medium">Seção</th>
                      <th className="pb-2 font-medium text-center">Criar</th>
                      <th className="pb-2 font-medium text-center">Ler</th>
                      <th className="pb-2 font-medium text-center">Editar</th>
                      <th className="pb-2 font-medium text-center">Excluir</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rolePerms.map((perm) => (
                      <tr key={perm.id} className="border-t border-gray-50">
                        <td className="py-2 text-gray-700">{SECTION_LABELS[perm.section] || perm.section}</td>
                        {(['can_create', 'can_read', 'can_update', 'can_delete'] as const).map((field) => (
                          <td key={field} className="py-2 text-center">
                            <button
                              onClick={() => toggleLocalPermission(perm.id, field)}
                              className={`w-6 h-6 rounded-md border-2 inline-flex items-center justify-center transition ${
                                perm[field] ? 'bg-gray-900 border-gray-900 text-white' : 'border-gray-300 text-transparent hover:border-gray-400'
                              }`}
                            >
                              {perm[field] && '✓'}
                            </button>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Botão Salvar */}
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <div>
                    {isSaved && (
                      <span className="text-sm text-emerald-600 font-medium">Permissões salvas!</span>
                    )}
                    {hasChanges && !isSaved && (
                      <span className="text-sm text-amber-600">Alterações não salvas</span>
                    )}
                  </div>
                  <button
                    onClick={() => saveRolePermissions(role.id)}
                    disabled={isSaving || !hasChanges}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition disabled:opacity-40"
                  >
                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    Salvar Permissões
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
