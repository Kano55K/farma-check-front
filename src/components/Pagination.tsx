import type { PageMeta } from '../types/api'

export function Pagination({ meta, onPageChange, noun = 'resultados' }: { meta: PageMeta; onPageChange: (page: number) => void; noun?: string }) {
  const from = meta.total_count === 0 ? 0 : (meta.page - 1) * meta.per_page + 1
  const to = Math.min(meta.page * meta.per_page, meta.total_count)
  return (
    <nav aria-label="Paginación" className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-700">
      <p>
        Mostrando {from}–{to} de {meta.total_count} {noun}
      </p>
      <div className="flex items-center gap-2">
        <button type="button" className="btn-secondary" disabled={meta.page <= 1} onClick={() => onPageChange(meta.page - 1)}>
          ‹ Anterior
        </button>
        <span aria-current="page">
          Página {meta.page} de {Math.max(meta.total_pages, 1)}
        </span>
        <button type="button" className="btn-secondary" disabled={meta.page >= meta.total_pages} onClick={() => onPageChange(meta.page + 1)}>
          Siguiente ›
        </button>
      </div>
    </nav>
  )
}
