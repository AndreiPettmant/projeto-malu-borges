import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { logAudit } from '../lib/audit'
import { Bell, Save, Check, Calendar, Video, Camera, Megaphone, PartyPopper, Package, DollarSign, Clock } from 'lucide-react'

interface Role {
  id: string
  name: string
  description?: string
}

interface NotificationSetting {
  id: string
  role_id: string
  notification_type: string
  enabled: boolean
}

const NOTIFICATION_TYPES = [
  { key: 'project_deadline', label: 'Vencimento de Projeto', description: 'Quando um job está próximo do prazo final', Icon: Calendar, color: 'text-blue-600' },
  { key: 'midia', label: 'Mídia', description: 'Entregáveis de mídia (reels, stories, posts)', Icon: Video, color: 'text-purple-600' },
  { key: 'captacao', label: 'Captação', description: 'Entregáveis de captação (fotos, vídeos)', Icon: Camera, color: 'text-cyan-600' },
  { key: 'publicidade', label: 'Publicidade', description: 'Entregáveis de publicidade', Icon: Megaphone, color: 'text-orange-600' },
  { key: 'evento', label: 'Evento', description: 'Entregáveis relacionados a eventos', Icon: PartyPopper, color: 'text-pink-600' },
  { key: 'outros', label: 'Outros', description: 'Demais entregáveis', Icon: Package, color: 'text-gray-600' },
  { key: 'financial', label: 'Financeiro', description: 'Itens com orçamento pendente', Icon: DollarSign, color: 'text-green-600' },
]

export default function NotificationSettingsPage() {
  const [roles, setRoles] = useState<Role[]>([])
  const [settings, setSettings] = useState<NotificationSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [cronSchedule, setCronSchedule] = useState('0 11 * * *') // Padrão: 11:00 UTC (08:00 BRT)
  const [cronHour, setCronHour] = useState('08')
  const [cronMinute, setCronMinute] = useState('00')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [rolesRes, settingsRes] = await Promise.all([
        supabase.from('roles').select('*').order('name'),
        supabase.from('notification_settings').select('*')
      ])

      if (rolesRes.error) throw rolesRes.error
      if (settingsRes.error) throw settingsRes.error

      setRoles(rolesRes.data || [])
      setSettings(settingsRes.data || [])
      
      // Carregar horário do cron (com tratamento de erro)
      try {
        const cronRes = await supabase
          .from('system_config')
          .select('value')
          .eq('key', 'notification_cron_schedule')
          .maybeSingle()

        if (cronRes.data?.value) {
          const schedule = cronRes.data.value
          setCronSchedule(schedule)
          // Extrair hora e minuto do cron (formato: "0 11 * * *" = 11:00 UTC)
          const parts = schedule.split(' ')
          if (parts.length >= 2) {
            const utcHour = parseInt(parts[1])
            const minute = parts[0]
            // Converter UTC para BRT (UTC-3)
            const brtHour = (utcHour - 3 + 24) % 24
            setCronHour(brtHour.toString().padStart(2, '0'))
            setCronMinute(minute.padStart(2, '0'))
          }
        }
      } catch (cronErr) {
        console.log('system_config não disponível ainda (execute migrations)')
      }
    } catch (err) {
      console.error('Erro ao carregar configurações:', err)
    } finally {
      setLoading(false)
    }
  }

  function isEnabled(roleId: string, notifType: string): boolean {
    const setting = settings.find((s) => s.role_id === roleId && s.notification_type === notifType)
    return setting?.enabled ?? false
  }

  function toggleSetting(roleId: string, notifType: string) {
    const existingSetting = settings.find((s) => s.role_id === roleId && s.notification_type === notifType)
    
    if (existingSetting) {
      // Atualizar existente
      setSettings((prev) =>
        prev.map((s) =>
          s.role_id === roleId && s.notification_type === notifType
            ? { ...s, enabled: !s.enabled }
            : s
        )
      )
    } else {
      // Criar novo
      setSettings((prev) => [
        ...prev,
        {
          id: `temp-${Date.now()}`,
          role_id: roleId,
          notification_type: notifType,
          enabled: true,
        },
      ])
    }
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)

    try {
      // 1. Deletar todas as configurações existentes e recriar
      await supabase.from('notification_settings').delete().neq('id', '00000000-0000-0000-0000-000000000000')

      // 2. Inserir novas configurações
      const settingsToInsert = settings
        .filter((s) => s.enabled) // Só salvar as habilitadas
        .map((s) => ({
          role_id: s.role_id,
          notification_type: s.notification_type,
          enabled: s.enabled,
        }))

      if (settingsToInsert.length > 0) {
        const { error } = await supabase.from('notification_settings').insert(settingsToInsert)
        if (error) throw error
        
        // Log de auditoria
        await logAudit('update', 'notification_settings', 'global', {
          total_configs: settingsToInsert.length,
          roles: [...new Set(settingsToInsert.map(s => s.role_id))].length,
          types: [...new Set(settingsToInsert.map(s => s.notification_type))]
        })
      }

      // 3. Converter BRT para UTC e criar cron schedule
      const brtHour = parseInt(cronHour)
      const utcHour = (brtHour + 3) % 24
      const newCronSchedule = `${cronMinute} ${utcHour} * * *`

      // 4. Salvar horário do cron (com tratamento de erro)
      try {
        await supabase.from('system_config').upsert({
          key: 'notification_cron_schedule',
          value: newCronSchedule,
          description: 'Horário de execução das notificações automáticas'
        })

        // Log de auditoria
        await logAudit('update', 'system_config', 'notification_cron_schedule', {
          schedule: `${cronHour}:${cronMinute} BRT`,
          cron_expression: newCronSchedule
        })

        // 5. Atualizar cron job no Supabase
        const { error: cronError } = await supabase.rpc('update_notification_cron', {
          new_schedule: newCronSchedule
        })

        if (cronError) {
          console.error('Erro ao atualizar cron:', cronError)
          console.log('Configurações salvas, mas o agendamento do cron precisa ser atualizado manualmente.')
        }
      } catch (cronErr) {
        console.log('system_config não disponível, horário não foi salvo')
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      await loadData() // Recarregar para pegar IDs do banco
    } catch (err) {
      console.error('Erro ao salvar:', err)
      alert('Erro ao salvar configurações')
    } finally {
      setSaving(false)
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell size={24} /> Configuração de Notificações
          </h1>
          <p className="text-gray-500 mt-1">Defina quais papéis recebem notificações de cada categoria</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-900 text-white font-medium text-sm hover:bg-gray-800 transition disabled:opacity-50"
        >
          {saved ? (
            <>
              <Check size={18} />
              Salvo!
            </>
          ) : saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save size={18} />
              Salvar Configurações
            </>
          )}
        </button>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
        <p className="text-sm text-blue-900">
          <Bell size={14} className="inline mr-1" />
          <strong>Como funciona:</strong> Marque as categorias que cada papel deve receber notificações. 
          Notificações são enviadas automaticamente quando itens estão próximos do prazo.
        </p>
      </div>

      {/* Configuração de Horário */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={20} className="text-gray-700" />
          <h2 className="font-semibold text-gray-900">Horário de Execução</h2>
        </div>
        
        <p className="text-sm text-gray-600 mb-4">
          Defina o horário em que as notificações serão geradas automaticamente todo dia.
        </p>

        <div className="flex items-center gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Hora (BRT)</label>
            <select
              value={cronHour}
              onChange={(e) => setCronHour(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 text-center"
            >
              {Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0')).map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>

          <span className="text-2xl text-gray-400 mt-6">:</span>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Minuto</label>
            <select
              value={cronMinute}
              onChange={(e) => setCronMinute(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 text-center"
            >
              {['00', '15', '30', '45'].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="mt-6">
            <span className="text-sm text-gray-500">
              = Todo dia às <strong className="text-gray-900">{cronHour}:{cronMinute}</strong> (horário de Brasília)
            </span>
          </div>
        </div>
      </div>

      {/* Matriz de Configuração */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 sticky left-0 bg-gray-50 z-10">
                  Papel
                </th>
                {NOTIFICATION_TYPES.map((type) => (
                  <th key={type.key} className="px-4 py-4 text-center">
                    <div className="flex flex-col items-center gap-1 min-w-[120px]">
                      <type.Icon size={24} className={type.color} />
                      <span className="text-sm font-semibold text-gray-900">{type.label}</span>
                      <span className="text-xs text-gray-500 font-normal text-center">{type.description}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {roles.map((role) => (
                <tr key={role.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 sticky left-0 bg-white z-10">
                    <div>
                      <p className="font-medium text-gray-900">{role.name}</p>
                      {role.description && (
                        <p className="text-xs text-gray-500 mt-0.5">{role.description}</p>
                      )}
                    </div>
                  </td>
                  {NOTIFICATION_TYPES.map((type) => {
                    const enabled = isEnabled(role.id, type.key)
                    return (
                      <td key={type.key} className="px-4 py-4 text-center">
                        <button
                          onClick={() => toggleSetting(role.id, type.key)}
                          className={`w-8 h-8 rounded-lg border-2 transition flex items-center justify-center mx-auto ${
                            enabled
                              ? 'bg-green-500 border-green-500 text-white'
                              : 'bg-white border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {enabled && <Check size={16} strokeWidth={3} />}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legenda */}
      <div className="bg-gray-50 rounded-xl p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Exemplos de Notificações por Categoria:</h3>
        <div className="grid md:grid-cols-2 gap-3 text-sm">
          {NOTIFICATION_TYPES.slice(0, 4).map((type, idx) => {
            const examples = [
              '"Job \'Campanha X\' finaliza em 3 dias"',
              '"Entregável \'Reel Instagram\' vence amanhã"',
              '"Entregável \'Fotos Produto\' vence em 7 dias"',
              '"Item com orçamento R$ 5.000 pendente"'
            ]
            return (
              <div key={type.key} className="flex items-start gap-2">
                <type.Icon size={16} className={`${type.color} flex-shrink-0 mt-0.5`} />
                <div>
                  <strong className="text-gray-900">{type.label}:</strong>
                  <p className="text-gray-600">{examples[idx]}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
