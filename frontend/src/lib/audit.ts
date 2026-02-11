import { supabase } from './supabase'

export async function logAudit(params: {
  action: string
  entity_type: string
  entity_id?: string
  details?: Record<string, unknown>
}) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('audit_logs').insert({
      user_id: user.id,
      user_email: user.email,
      action: params.action,
      entity_type: params.entity_type,
      entity_id: params.entity_id || null,
      details: params.details || null,
    })
  } catch (err) {
    console.error('Erro ao registrar auditoria:', err)
  }
}
