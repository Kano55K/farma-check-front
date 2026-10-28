import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { movementsApi } from '../api/endpoints'
import { Badge } from '../components/Badge'
import { PageHeader } from '../components/PageHeader'
import { Pagination } from '../components/Pagination'
import { EmptyState, ErrorState, Loading } from '../components/States'
import { formatDateTime } from '../lib/format'
import { movementTypeLabel } from '../lib/labels'
import type { MovementType } from '../types/api'

const TYPES = Object.keys(movementTypeLabel) as MovementType[]

/** Historial de movimientos con filtros por tipo y rango de fechas. */
export function MovementsPage() {
  const [params, setParams] = useSearchParams()
  const filters = {
    movement_type: (params.get('movement_type') ?? '') as MovementType | '',
    from: params.get('from') ?? '',
    to: params.get('to') ?? '',
    page: Number(params.get('page') ?? 1),
  }
  const [from, setFrom] = useState(filters.from)
  const [to, setTo] = useState(filters.to)
  const [rangeError, setRangeError] = useState<string | null>(null)

  const query = useQuery({
    queryKey: ['movements', filters],
    queryFn: () => movementsApi.list({ ...filters, per_page: 20 }),
    placeholderData: keepPreviousData,
  })

  function update(changes: Record<string, string>) {
    const next = new URLSearchParams(params)
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)))
    if (!('page' in changes)) next.delete('page')
    setParams(next, { replace: true })
  }

  function applyRange(event: FormEvent) {
    event.preventDefault()
    if (from && to && from > to) {
      setRangeError('La fecha "desde" no puede ser posterior a "hasta".')
      return
    }
    setRangeError(null)
    update({ from, to })
  }

  return (
    <>
      <PageHeader
        title="Movimientos"
        actions={
          <Link to="/movimientos/nuevo" className="btn-primary">
            Registrar movimiento
          </Link>
        }
      />
      <form onSubmit={applyRange} className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end" noValidate>
        <div>
          <label htmlFor="tipo" className="mb-1 block text-sm font-semibold">
            Tipo
          </label>
          <select id="tipo" className="input" value={filters.movement_type} onChange={(e) => update({ movement_type: e.target.value })}>
            <option value="">Todos</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {movementTypeLabel[t]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="desde" className="mb-1 block text-sm font-semibold">
            Desde
          </label>
          <input id="desde" type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} aria-describedby={rangeError ? 'error-rango' : undefined} />
        </div>
        <div>
          <label htmlFor="hasta" className="mb-1 block text-sm font-semibold">
            Hasta
          </label>
          <input id="hasta" type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="btn-secondary">
            Aplicar fechas
          </button>
          {(filters.from || filters.to || filters.movement_type) && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setFrom('')
                setTo('')
                setParams(new URLSearchParams(), { replace: true })
              }}
            >
              Limpiar
            </button>
          )}
        </div>
        {rangeError && (
          <p id="error-rango" role="alert" className="text-sm text-red-700 sm:col-span-2 lg:col-span-4">
            {rangeError}
          </p>
        )}
      </form>

      {query.isPending && <Loading />}
      {query.isError && <ErrorState error={query.error} onRetry={() => void query.refetch()} />}
      {query.data && query.data.data.length === 0 && <EmptyState>No hay movimientos con esos filtros.</EmptyState>}
      {query.data && query.data.data.length > 0 && (
        <>
          <table className="table-cards" aria-busy={query.isFetching}>
            <caption className="sr-only">Historial de movimientos de stock</caption>
            <thead>
              <tr>
                <th scope="col">Fecha</th>
                <th scope="col">Producto</th>
                <th scope="col">Lote</th>
                <th scope="col">Tipo</th>
                <th scope="col">Cantidad</th>
                <th scope="col">Motivo</th>
                <th scope="col">Usuario</th>
              </tr>
            </thead>
            <tbody>
              {query.data.data.map((m) => (
                <tr key={m.id}>
                  <td data-label="Fecha">{formatDateTime(m.created_at)}</td>
                  <td data-label="Producto">
                    <Link to={`/productos/${m.product.id}`} className="link">
                      {m.product.name}
                    </Link>
                  </td>
                  <td data-label="Lote">{m.batch.lot_number}</td>
                  <td data-label="Tipo">
                    <Badge tone={m.movement_type === 'entrada' ? 'success' : m.movement_type === 'ajuste' ? 'info' : 'warning'}>{movementTypeLabel[m.movement_type]}</Badge>
                  </td>
                  <td data-label="Cantidad">{m.quantity} u</td>
                  <td data-label="Motivo">{m.reason ?? '—'}</td>
                  <td data-label="Usuario">{m.user.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination meta={query.data.meta} onPageChange={(p) => update({ page: String(p) })} noun="movimientos" />
        </>
      )}
    </>
  )
}
