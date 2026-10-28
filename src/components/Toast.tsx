import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { FORBIDDEN_EVENT } from '../api/client'
import { ToastContext, type ToastKind } from './useToast'

interface Toast {
  id: number
  kind: ToastKind
  message: string
}

let nextId = 1

const styles: Record<ToastKind, string> = {
  success: 'border-emerald-700 bg-emerald-50 text-emerald-950',
  error: 'border-red-700 bg-red-50 text-red-950',
  info: 'border-slate-600 bg-white text-slate-900',
}

/** Mensajes de confirmación/error. La región usa aria-live para que los lectores de pantalla los anuncien. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), [])

  const notify = useCallback(
    (message: string, kind: ToastKind = 'success') => {
      const id = nextId++
      setToasts((list) => [...list, { id, kind, message }])
      window.setTimeout(() => dismiss(id), kind === 'error' ? 8000 : 5000)
    },
    [dismiss],
  )

  // Un 403 de la API en cualquier pantalla se informa con un toast.
  useEffect(() => {
    const onForbidden = () => notify('No tenés permisos para realizar esta acción.', 'error')
    window.addEventListener(FORBIDDEN_EVENT, onForbidden)
    return () => window.removeEventListener(FORBIDDEN_EVENT, onForbidden)
  }, [notify])

  const value = useMemo(() => ({ notify }), [notify])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" aria-atomic="false" className="fixed bottom-4 right-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">
        {toasts.map((toast) => (
          <div key={toast.id} role={toast.kind === 'error' ? 'alert' : 'status'} className={`flex items-start gap-3 rounded-md border-l-4 p-3 shadow-lg ${styles[toast.kind]}`}>
            <p className="flex-1 text-sm">{toast.message}</p>
            <button type="button" onClick={() => dismiss(toast.id)} className="rounded px-1 text-lg leading-none" aria-label="Cerrar mensaje">
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
