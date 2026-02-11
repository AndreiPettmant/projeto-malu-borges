import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { User as AppUser, PermissionsMap } from '../types'
import type { Session, User as SupabaseUser } from '@supabase/supabase-js'

interface AuthContextType {
  session: Session | null
  user: SupabaseUser | null
  profile: AppUser | null
  permissions: PermissionsMap
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  canAccess: (section: string, action?: 'can_create' | 'can_read' | 'can_update' | 'can_delete') => boolean
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [profile, setProfile] = useState<AppUser | null>(null)
  const [permissions, setPermissions] = useState<PermissionsMap>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setPermissions({})
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId: string) {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (profileError) throw profileError
      setProfile(profileData)

      // Buscar permissões pelo role_id
      if (profileData?.role_id) {
        const { data: permsData } = await supabase
          .from('permissions')
          .select('*')
          .eq('role_id', profileData.role_id)

        if (permsData) {
          const map: PermissionsMap = {}
          permsData.forEach((p) => {
            map[p.section] = {
              can_create: p.can_create,
              can_read: p.can_read,
              can_update: p.can_update,
              can_delete: p.can_delete,
            }
          })
          setPermissions(map)
        }
      }
    } catch (err) {
      console.error('Erro ao buscar perfil:', err)
    } finally {
      setLoading(false)
    }
  }

  async function refreshProfile() {
    if (user?.id) {
      await fetchProfile(user.id)
    }
  }

  function canAccess(section: string, action: 'can_create' | 'can_read' | 'can_update' | 'can_delete' = 'can_read'): boolean {
    // Se não tem permissões carregadas ainda, bloqueia
    if (Object.keys(permissions).length === 0) return false
    const perm = permissions[section]
    if (!perm) return false
    return perm[action]
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error as Error | null }
  }

  async function signUp(email: string, password: string, fullName: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    return { error: error as Error | null }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setProfile(null)
    setPermissions({})
  }

  return (
    <AuthContext.Provider value={{ session, user, profile, permissions, loading, signIn, signUp, signOut, canAccess, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  return context
}
