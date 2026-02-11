// ==================== USUÁRIOS E PERMISSÕES ====================

export interface User {
  id: string
  email: string
  full_name: string
  phone?: string
  avatar_url?: string
  role_id: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Role {
  id: string
  name: string
  description?: string
  is_system: boolean
  created_at: string
}

export interface Permission {
  id: string
  role_id: string
  section: string
  can_create: boolean
  can_read: boolean
  can_update: boolean
  can_delete: boolean
}

export type PermissionsMap = Record<string, {
  can_create: boolean
  can_read: boolean
  can_update: boolean
  can_delete: boolean
}>

// ==================== JOBS E ENTREGÁVEIS ====================

export type JobStatus = 'aberto' | 'em_andamento' | 'finalizado' | 'cancelado'
export type DeliverableStatus = 'pendente' | 'em_producao' | 'entregue'
export type DeliverableCategory = 'midia' | 'captacao' | 'publicidade' | 'evento' | 'outros'

export const CATEGORY_LABELS: Record<DeliverableCategory, string> = {
  midia: 'Mídia',
  captacao: 'Captação',
  publicidade: 'Publicidade',
  evento: 'Evento',
  outros: 'Outros',
}

export interface DeliverableChecklistItem {
  id: string
  deliverable_id: string
  label: string
  completed: boolean
  completed_at?: string
  due_date?: string
  due_time?: string
  details?: string
  budget?: number
  sort_order: number
  created_at: string
  updated_at: string
}

export interface Deliverable {
  id: string
  job_id: string
  title: string
  type?: string
  category: DeliverableCategory
  description?: string
  status: DeliverableStatus
  due_date?: string
  due_time?: string
  completed_at?: string
  created_at: string
  updated_at: string
  checklist_items?: DeliverableChecklistItem[]
}

export interface Job {
  id: string
  title: string
  brand: string
  description?: string
  scope?: string
  start_date: string
  end_date: string
  status: JobStatus
  briefing?: string
  brainstorm?: string
  budget?: number
  created_by: string
  created_at: string
  updated_at: string
  deliverables?: Deliverable[]
}

/** @deprecated Use deliverables with due_date instead */
export interface ImportantDate {
  id: string
  job_id: string
  label: string
  date: string
  description?: string
  created_at: string
}

// ==================== CONFIGURAÇÃO DA HOME ====================

export interface HomeConfig {
  id: string
  section: string
  key: string
  value: string
  updated_at: string
}

// ==================== AUDITORIA ====================

export interface AuditLog {
  id: string
  user_id: string
  user_email?: string
  action: string
  entity_type: string
  entity_id?: string
  details?: Record<string, unknown>
  ip_address?: string
  created_at: string
}

// ==================== NOTIFICAÇÕES ====================

export interface UserNotification {
  id: string
  user_id: string
  title: string
  message: string
  type: string
  entity_type?: string
  entity_id?: string
  read_at?: string
  created_at: string
}

// ==================== FOTOS (Hero Page) ====================

export interface PhotoItem {
  url: string
  caption: string
  active?: boolean
}
