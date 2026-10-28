import { useEffect, useId, useRef, type ReactNode } from 'react'

/**
 * Diálogo modal accesible basado en <dialog>: atrapa el foco, se cierra con Escape
 * y devuelve el foco al elemento que lo abrió.
 */
export function Modal({ title, subtitle, onClose, children }: { title: string; subtitle?: ReactNode; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    const opener = document.activeElement as HTMLElement | null
    if (dialog && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal()
      else dialog.setAttribute('open', '') // jsdom (tests)
    }
    return () => opener?.focus?.()
  }, [])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-lg border border-slate-800 p-0 shadow-xl backdrop:bg-slate-900/50"
    >
      <div className="p-6">
        <h2 id={titleId} className="text-xl font-bold text-slate-900">
          {title}
        </h2>
        {subtitle && <div className="mt-1 text-sm text-slate-600">{subtitle}</div>}
        <div className="mt-4">{children}</div>
      </div>
    </dialog>
  )
}
