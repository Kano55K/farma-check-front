import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { ordersApi } from '../api/endpoints'
import { Badge } from '../components/Badge'
import { PageHeader } from '../components/PageHeader'
import { Pagination } from '../components/Pagination'
import { EmptyState, ErrorState, Loading } from '../components/States'
import { formatDate, formatMoney } from '../lib/format'
import { orderStatusLabel } from '../lib/labels'
import type { OrderStatus } from '../types/api'

const STATUSES: (OrderStatus | '')[] = ['', 'pending', 'sent', 'received', 'cancelled']

export function OrdersPage() {
  const [params, setParams] = useSearchParams()
  const status = (params.get('status') ?? '') as OrderStatus | ''
  const page = Number(params.get('page') ?? 1)
  const query = useQuery({
    queryKey: ['orders', { status, page }],
    queryFn: () => ordersApi.list({ status, page, per_page: 20 }),
    placeholderData: keepPreviousData,
  })

  return (
    <>
      <PageHeader
        title="Órdenes de compra"
        actions={
          <Link to="/ordenes/nueva" className="btn-primary">
            Nueva orden
          </Link>
        }
      />
      <fieldset className="mb-4">
        <legend className="mb-1 text-sm font-semibold">Estado</legend>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((value) => (
            <button
              key={value || 'todas'}
              type="button"
              aria-pressed={status === value}
              onClick={() => setParams(new URLSearchParams(value ? { status: value } : {}), { replace: true })}
              className={`rounded border px-3 py-1.5 text-sm ${status === value ? 'border-brand-700 bg-brand-700 text-white' : 'border-slate-500 bg-white hover:bg-slate-100'}`}
            >
              {value ? orderStatusLabel[value].label : 'Todas'}
            </button>
          ))}
        </div>
      </fieldset>

      {query.isPending && <Loading />}
      {query.isError && <ErrorState error={query.error} onRetry={() => void query.refetch()} />}
      {query.data && query.data.data.length === 0 && <EmptyState>No hay órdenes con ese estado.</EmptyState>}
      {query.data && query.data.data.length > 0 && (
        <>
          <table className="table-cards" aria-busy={query.isFetching}>
            <caption className="sr-only">Órdenes de compra</caption>
            <thead>
              <tr>
                <th scope="col">N.º</th>
                <th scope="col">Proveedor</th>
                <th scope="col">Fecha</th>
                <th scope="col">Ítems</th>
                <th scope="col">Total</th>
                <th scope="col">Estado</th>
                <th scope="col">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {query.data.data.map((order) => (
                <tr key={order.id}>
                  <td data-label="N.º">#{order.id}</td>
                  <td data-label="Proveedor">{order.supplier.company_name}</td>
                  <td data-label="Fecha">{formatDate(order.created_at)}</td>
                  <td data-label="Ítems">{order.items_count}</td>
                  <td data-label="Total">{formatMoney(order.total_amount)}</td>
                  <td data-label="Estado">
                    <Badge tone={orderStatusLabel[order.status].tone}>{orderStatusLabel[order.status].label}</Badge>
                  </td>
                  <td data-label="">
                    <Link to={`/ordenes/${order.id}`} className="link" aria-label={`Ver orden ${order.id}`}>
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination
            meta={query.data.meta}
            onPageChange={(p) => {
              const next = new URLSearchParams(params)
              next.set('page', String(p))
              setParams(next, { replace: true })
            }}
            noun="órdenes"
          />
        </>
      )}
    </>
  )
}
