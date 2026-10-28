import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import { suppliersApi } from '../api/endpoints'
import { AdminOnly } from '../auth/ProtectedRoute'
import { Badge } from '../components/Badge'
import { PageHeader } from '../components/PageHeader'
import { EmptyState, ErrorState, Loading } from '../components/States'
import { formatDate, formatMoney } from '../lib/format'
import { orderStatusLabel } from '../lib/labels'
import { NotFoundPage } from './NotFoundPage'

export function SupplierDetailPage() {
  const { id = '' } = useParams()
  const query = useQuery({ queryKey: ['supplier', id], queryFn: () => suppliersApi.get(id) })

  if (query.isError && query.error instanceof ApiError && query.error.status === 404) return <NotFoundPage what="El proveedor" />
  const supplier = query.data

  return (
    <>
      <PageHeader
        title={supplier?.company_name ?? 'Proveedor'}
        actions={
          supplier && (
            <AdminOnly>
              <Link to={`/proveedores/${supplier.id}/editar`} className="btn-secondary">
                Editar
              </Link>
            </AdminOnly>
          )
        }
      />
      <p className="mb-4">
        <Link to="/proveedores" className="link text-sm">
          ← Volver a proveedores
        </Link>
      </p>
      {query.isPending && <Loading />}
      {query.isError && <ErrorState error={query.error} onRetry={() => void query.refetch()} />}
      {supplier && (
        <>
          <dl className="card mb-6 grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {[
              ['CUIT', supplier.cuit],
              ['Contacto', supplier.contact_name],
              ['Teléfono', supplier.phone],
              ['Email', supplier.email],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-sm text-slate-600">{label}</dt>
                <dd className="font-medium">{value ?? '—'}</dd>
              </div>
            ))}
          </dl>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-bold">Órdenes de compra recientes</h2>
            <Link to={`/ordenes/nueva?supplier=${supplier.id}`} className="btn-secondary">
              Nueva orden a este proveedor
            </Link>
          </div>
          {supplier.recent_purchase_orders?.length ? (
            <ul className="divide-y divide-slate-200 rounded-md border border-slate-300">
              {supplier.recent_purchase_orders.map((order) => (
                <li key={order.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                  <Link to={`/ordenes/${order.id}`} className="link">
                    Orden #{order.id} · {formatDate(order.created_at)}
                  </Link>
                  <span className="flex items-center gap-3">
                    {formatMoney(order.total_amount)}
                    <Badge tone={orderStatusLabel[order.status].tone}>{orderStatusLabel[order.status].label}</Badge>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState>Todavía no hay órdenes para este proveedor.</EmptyState>
          )}
        </>
      )}
    </>
  )
}
