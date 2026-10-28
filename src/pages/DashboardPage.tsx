import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { dashboardApi } from '../api/endpoints'
import { Badge } from '../components/Badge'
import { PageHeader } from '../components/PageHeader'
import { EmptyState, ErrorState, Loading } from '../components/States'
import { formatDate, formatDateTime } from '../lib/format'
import type { DashboardAlert } from '../types/api'

function Kpi({ label, value, tone = 'neutral', to }: { label: string; value: string | number; tone?: 'neutral' | 'danger' | 'warning'; to: string }) {
  const tones = { neutral: 'bg-white', danger: 'bg-red-50 border-red-400', warning: 'bg-amber-50 border-amber-400' }
  return (
    <Link to={to} className={`card block hover:shadow-md ${tones[tone]}`}>
      <p className="text-sm text-slate-700">{label}</p>
      <p className="mt-1 text-3xl font-bold text-slate-900">{value}</p>
    </Link>
  )
}

const alertLabel: Record<DashboardAlert['type'], string> = {
  batch_expired: 'Vencido',
  batch_critical: 'Crítico',
  out_of_stock: 'Sin stock',
  low_stock: 'Stock bajo',
}

export function DashboardPage() {
  const query = useQuery({ queryKey: ['dashboard'], queryFn: dashboardApi.get })

  return (
    <>
      <PageHeader
        title="Inicio"
        actions={
          <p className="text-sm text-slate-600">
            {query.dataUpdatedAt > 0 && <>Actualizado {formatDateTime(new Date(query.dataUpdatedAt).toISOString())} · </>}
            <button type="button" className="link" onClick={() => void query.refetch()} disabled={query.isFetching}>
              {query.isFetching ? 'Actualizando…' : 'Actualizar'}
            </button>
          </p>
        }
      />

      {query.isPending && <Loading label="Cargando indicadores…" rows={4} />}
      {query.isError && <ErrorState error={query.error} onRetry={() => void query.refetch()} />}
      {query.data && (
        <>
          <section aria-label="Indicadores" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi label="Productos" value={query.data.kpis.total_products} to="/productos" />
            <Kpi label="Sin stock" value={query.data.kpis.out_of_stock_products} tone="danger" to="/productos?stock_status=sin_stock" />
            <Kpi label="Stock bajo" value={query.data.kpis.low_stock_products} tone="warning" to="/productos?stock_status=stock_bajo" />
            <Kpi
              label="Lotes vencidos / críticos"
              value={`${query.data.kpis.expired_batches} / ${query.data.kpis.critical_batches}`}
              tone="danger"
              to="/vencimientos?expiration_status=vencido"
            />
          </section>

          <div className="mt-6 grid gap-6 xl:grid-cols-3">
            <section className="card xl:col-span-2" aria-labelledby="alertas">
              <h2 id="alertas" className="mb-3 text-lg font-bold">
                Alertas
              </h2>
              {query.data.alerts.length === 0 ? (
                <EmptyState>No hay alertas: el stock y los vencimientos están en orden.</EmptyState>
              ) : (
                <ul className="divide-y divide-slate-200">
                  {query.data.alerts.map((alert, index) => (
                    <li key={`${alert.type}-${alert.batch_id ?? alert.product_id}-${index}`} className="flex flex-wrap items-center justify-between gap-2 py-2">
                      <Link to={`/productos/${alert.product_id}`} className="link">
                        {alert.message}
                      </Link>
                      <span className="flex items-center gap-2 text-sm text-slate-600">
                        {alert.date && formatDate(alert.date)}
                        <Badge tone={alert.severity}>{alertLabel[alert.type]}</Badge>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <Link to="/vencimientos" className="link mt-3 inline-block text-sm">
                Ver todos los vencimientos →
              </Link>
            </section>

            <section className="card" aria-labelledby="accesos">
              <h2 id="accesos" className="mb-3 text-lg font-bold">
                Accesos rápidos
              </h2>
              <div className="flex flex-col gap-3">
                <Link to="/productos" className="btn-secondary justify-start">
                  Buscar producto
                </Link>
                <Link to="/movimientos/nuevo" className="btn-secondary justify-start">
                  Registrar movimiento
                </Link>
                <Link to="/ordenes/nueva" className="btn-secondary justify-start">
                  Nueva orden de compra
                </Link>
              </div>
              <p className="mt-4">
                <strong>Órdenes pendientes:</strong>{' '}
                <Link to="/ordenes?status=pending" className="link">
                  {query.data.kpis.pending_purchase_orders}
                </Link>
              </p>
              <p className="mt-1 text-sm text-slate-600">Lotes en alerta (vencen en menos de 90 días): {query.data.kpis.warning_batches}</p>
            </section>
          </div>
        </>
      )}
    </>
  )
}
