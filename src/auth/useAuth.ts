import { createContext, useContext } from 'react'
import type { User } from '../types/api'

export interface AuthContextValue {
  user: User | null
  isAdmin: boolean
  /** Aviso para mostrar en el login (por ejemplo, sesión expirada). */
  notice: string | null
  login: (email: string, password: string) => Promise<User>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return context
}
