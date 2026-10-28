import type { User } from '../types/api'

// Persistencia de la sesión en localStorage (token + vencimiento + usuario).

const STORAGE_KEY = 'farma-check.session'

export interface StoredSession {
  token: string
  expiresAt: string
  user: User
}

export function loadSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const session = JSON.parse(raw) as StoredSession
    if (!session.token || isExpired(session)) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return session
  } catch {
    return null
  }
}

export function saveSession(session: StoredSession) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  } catch {
    // Sin almacenamiento disponible: la sesión dura lo que dure la pestaña.
  }
  currentToken = session.token
}

export function clearSession() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // nada que limpiar
  }
  currentToken = null
}

export function isExpired(session: Pick<StoredSession, 'expiresAt'>) {
  return new Date(session.expiresAt).getTime() <= Date.now()
}

// El cliente de la API lee el token desde acá, sin depender de React.
let currentToken: string | null = loadSession()?.token ?? null

export function getToken() {
  return currentToken
}
