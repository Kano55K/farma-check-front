import { useEffect, type ReactNode } from 'react'

/** Título de la pantalla (también actualiza el <title> del documento). */
export function PageHeader({ title, actions, children }: { title: string; actions?: ReactNode; children?: ReactNode }) {
  useEffect(() => {
    document.title = `${title} · Farma-Check`
  }, [title])
  return (
    <header className="mb-6 border-b border-dashed border-slate-400 pb-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{title}</h1>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </header>
  )
}
