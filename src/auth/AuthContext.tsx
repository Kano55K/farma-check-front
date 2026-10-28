import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { UNAUTHORIZED_EVENT } from '../api/client'
import { authApi } from '../api/endpoints'
import { AuthContext, type AuthContextValue } from './useAuth'
import { clearSession, loadSession, saveSession, type StoredSession } from './session'

const SESSION_EXPIRED_MESSAGE = 'Tu sesión expiró. Iniciá sesión nuevamente.'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<StoredSession | null>(() => loadSession())
  const [notice, setNotice] = useState<string | null>(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const endSession = useCallback(
    (message?: string) => {
      clearSession()
      setNotice(message ?? null)
      setSession(null)
      queryClient.clear()
      navigate('/login', { replace: true })
    },
    [navigate, queryClient],
  )

  // 401 en cualquier pantalla → volver al login con aviso.
  useEffect(() => {
    const onUnauthorized = () => endSession(SESSION_EXPIRED_MESSAGE)
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
  }, [endSession])

  // Cierra la sesión cuando vence el token, aunque no haya peticiones en curso.
  useEffect(() => {
    if (!session) return
    const ms = new Date(session.expiresAt).getTime() - Date.now()
    if (ms > 2 ** 31 - 1) return // más de ~24 días: setTimeout no lo soporta
    const timer = window.setTimeout(() => endSession(SESSION_EXPIRED_MESSAGE), Math.max(ms, 0))
    return () => window.clearTimeout(timer)
  }, [session, endSession])

  const login = useCallback(async (email: string, password: string) => {
    const response = await authApi.login(email, password)
    const next = { token: response.token, expiresAt: response.expires_at, user: response.user }
    saveSession(next)
    setNotice(null)
    setSession(next)
    return response.user
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // Si el token ya no era válido igual cerramos la sesión local.
    }
    endSession()
  }, [endSession])

  const value = useMemo<AuthContextValue>(
    () => ({ user: session?.user ?? null, isAdmin: session?.user.role === 'admin', notice, login, logout }),
    [session, notice, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
