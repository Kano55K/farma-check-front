import type { ReactNode } from 'react'
import { errorMessage } from '../api/client'

export function Loading({ label = 'Cargando…', rows = 3 }: { label?: string; rows?: number }) {
  return (
    <div role="status" aria-live="polite" className="space-y-3">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-12 animate-pulse rounded bg-slate-200" aria-hidden="true" />
      ))}
    </div>
  )
}

export function ErrorState({ error, onRetry, title = 'No pudimos cargar los datos' }: { error: unknown; onRetry?: () => void; title?: string }) {
  return (
    <div role="alert" className="rounded-md border border-red-300 bg-red-50 p-4 text-red-900">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm">{errorMessage(error)}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-secondary mt-3">
          Reintentar
        </button>
      )}
    </div>
  )
}

export function EmptyState({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-slate-400 p-6 text-center text-slate-600">
      <p>{children}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}
