import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { batchesApi } from '../api/endpoints'
import { Badge } from '../components/Badge'
import { PageHeader } from '../components/PageHeader'
import { Pagination } from '../components/Pagination'
import { EmptyState, ErrorState, Loading } from '../components/States'
import { formatDate } from '../lib/format'
import { expirationStatusLabel } from '../lib/labels'
import type { ExpirationStatus } from '../types/api'

const STATUSES: (ExpirationStatus | '')[] = ['', 'vencido', 'critico', 'alerta', 'ok']

/** Lotes ordenados por fecha de vencimiento, filtrables por semáforo. */
export function ExpirationsPage() {
  const [params, setParams] = useSearchParams()
  const status = (params.get('expiration_status') ?? '') as ExpirationStatus | ''
  const sort = params.get('sort') === '-expiration_date' ? '-expiration_date' : 'expiration_date'
  const withStock = params.get('with_stock') !== 'false'
  const page = Number(params.get('page') ?? 1)

  const query = useQuery({
    queryKey: ['batches', { status, sort, withStock, page }],
    queryFn: () => batchesApi.list({ expiration_status: status, sort, with_stock: withStock || undefined, page, per_page: 20 }),
    placeholderData: keepPreviousData,
  })

  function update(changes: Record<string, string>) {
    const next = new URLSearchParams(params)
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)))
    if (!('page' in changes)) next.delete('page')
    setParams(next, { replace: true })
  }

  return (
    <>
      <PageHeader title="Vencimientos" />
      <div className="mb-4 flex flex-wrap items-end gap-4">
        <fieldset>
          <legend className="mb-1 text-sm font-semibold">Estado de vencimiento</legend>
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((value) => (
              <button
                key={value || 'todos'}
                type="button"
                aria-pressed={status === value}
                onClick={() => update({ expiration_status: value })}
                className={`rounded border px-3 py-1.5 text-sm ${status === value ? 'border-brand-700 bg-brand-700 text-white' : 'border-slate-500 bg-white hover:bg-slate-100'}`}
              >
                {value ? expirationStatusLabel[value].label : 'Todos'}
              </button>
            ))}
          </div>
        </fieldset>
        <div>
          <label htmlFor="orden" className="mb-1 block text-sm font-semibold">
            Orden
          </label>
          <select id="orden" className="input" value={sort} onChange={(e) => update({ sort: e.target.value === 'expiration_date' ? '' : e.target.value })}>
            <option value="expiration_date">Vence antes primero</option>
            <option value="-expiration_date">Vence después primero</option>
          </select>
        </div>
        <label className="flex items-center gap-2 py-2 text-sm font-semibold">
          <input type="checkbox" className="size-5" checked={withStock} onChange={(e) => update({ with_stock: e.target.checked ? '' : 'false' })} />
          Solo lotes con stock
        </label>
      </div>

      {query.isPending && <Loading />}
      {query.isError && <ErrorState error={query.error} onRetry={() => void query.refetch()} />}
      {query.data && query.data.data.length === 0 && <EmptyState>No hay lotes con ese estado.</EmptyState>}
      {query.data && query.data.data.length > 0 && (
        <>
          <table className="table-cards" aria-busy={query.isFetching}>
            <caption className="sr-only">Lotes por fecha de vencimiento</caption>
            <thead>
              <tr>
                <th scope="col">Producto</th>
                <th scope="col">Lote</th>
                <th scope="col">Vence</th>
                <th scope="col">Días</th>
                <th scope="col">Cantidad</th>
                <th scope="col">Ubicación</th>
                <th scope="col">Estado</th>
              </tr>
            </thead>
            <tbody>
              {query.data.data.map((batch) => {
                const label = expirationStatusLabel[batch.expiration_status]
                return (
                  <tr key={batch.id}>
                    <td data-label="Producto">
                      <Link to={`/productos/${batch.product_id}`} className="link">
                        {batch.product?.name}
                      </Link>
                    </td>
                    <td data-label="Lote">{batch.lot_number}</td>
                    <td data-label="Vence">{formatDate(batch.expiration_date)}</td>
                    <td data-label="Días">{batch.days_to_expiration < 0 ? `hace ${-batch.days_to_expiration}` : batch.days_to_expiration}</td>
                    <td data-label="Cantidad">{batch.quantity} u</td>
                    <td data-label="Ubicación">{batch.location ?? '—'}</td>
                    <td data-label="Estado">
                      <Badge tone={label.tone} title={label.hint}>
                        {label.label}
                      </Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <Pagination meta={query.data.meta} onPageChange={(p) => update({ page: String(p) })} noun="lotes" />
        </>
      )}
    </>
  )
}
