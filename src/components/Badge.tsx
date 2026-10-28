import type { ReactNode } from 'react'
import type { Tone } from '../lib/labels'

const tones: Record<Tone, string> = {
  danger: 'bg-red-100 text-red-900 border-red-300',
  warning: 'bg-amber-100 text-amber-900 border-amber-300',
  success: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  neutral: 'bg-slate-100 text-slate-800 border-slate-300',
  info: 'bg-sky-100 text-sky-900 border-sky-300',
}

/** Etiqueta del semáforo. El texto siempre acompaña al color (no depende solo del color). */
export function Badge({ tone, children, title }: { tone: Tone; children: ReactNode; title?: string }) {
  return (
    <span
      title={title}
      className={`inline-flex items-center whitespace-nowrap rounded border px-2 py-0.5 text-xs font-bold uppercase tracking-wide ${tones[tone]}`}
    >
      {children}
    </span>
  )
}
