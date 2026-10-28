import { getToken } from '../auth/session'
import type { ApiErrorBody, FieldErrors } from '../types/api'

// Cliente HTTP central: agrega el token, interpreta el formato único de error de la API
// y avisa al resto de la app cuando la sesión vence (401) o faltan permisos (403).

export const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1').replace(/\/$/, '')

export const UNAUTHORIZED_EVENT = 'farma:unauthorized'
export const FORBIDDEN_EVENT = 'farma:forbidden'

export class ApiError extends Error {
  status: number
  code: string
  details: FieldErrors | null

  constructor(status: number, code: string, message: string, details: FieldErrors | null = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }

  /** Primer mensaje de error de un campo (para mostrarlo debajo del input). */
  fieldError(field: string): string | undefined {
    return this.details?.[field]?.[0]
  }
}

type Query = Record<string, string | number | boolean | null | undefined>

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  query?: Query
  body?: unknown
  /** El login no debe disparar el cierre de sesión ante un 401. */
  skipAuthRedirect?: boolean
}

export function buildUrl(path: string, query?: Query) {
  const url = new URL(`${API_URL}${path}`)
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value))
  })
  return url.toString()
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'

  let response: Response
  try {
    response = await fetch(buildUrl(path, options.query), {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    })
  } catch {
    throw new ApiError(0, 'network_error', 'No pudimos conectar con el servidor. Revisá tu conexión e intentá de nuevo.')
  }

  const text = await response.text()
  const data = text ? safeParse(text) : null

  if (!response.ok) {
    const body = data as Partial<ApiErrorBody> | null
    const error = new ApiError(
      response.status,
      body?.error?.code ?? 'http_error',
      body?.error?.message ?? defaultMessage(response.status),
      body?.error?.details ?? null,
    )
    if (response.status === 401 && !options.skipAuthRedirect) {
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT, { detail: error }))
    }
    if (response.status === 403) {
      window.dispatchEvent(new CustomEvent(FORBIDDEN_EVENT, { detail: error }))
    }
    throw error
  }

  return data as T
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function defaultMessage(status: number) {
  if (status === 401) return 'Tu sesión expiró. Iniciá sesión nuevamente.'
  if (status === 403) return 'No tenés permisos para realizar esta acción.'
  if (status === 404) return 'No encontramos lo que buscabas.'
  if (status >= 500) return 'El servidor tuvo un problema. Intentá de nuevo en unos minutos.'
  return 'Ocurrió un error inesperado.'
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return 'Ocurrió un error inesperado.'
}
