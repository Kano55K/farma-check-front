import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { productsApi } from '../api/endpoints'
import { Badge } from '../components/Badge'
import { Modal } from '../components/Modal'
import { MovementForm } from '../components/MovementForm'
import { PageHeader } from '../components/PageHeader'
import { EmptyState, ErrorState, Loading } from '../components/States'
import { formatDate } from '../lib/format'
import { expirationStatusLabel, stockStatusLabel } from '../lib/labels'
import type { Batch } from '../types/api'
import { NotFoundPage } from './NotFoundPage'
import { ApiError } from '../api/client'

export function ProductDetailPage() {
  const { id = '' } = useParams()
  const query = useQuery({ queryKey: ['product', id], queryFn: () => productsApi.get(id) })
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null)

  if (query.isError && query.error instanceof ApiError && query.error.status === 404) return <NotFoundPage what="El producto" />

  const product = query.data
  return (
    <>
      <PageHeader
        title={product?.name ?? 'Producto'}
        actions={
          product && (
            <Badge tone={stockStatusLabel[product.stock_status].tone}>
              {stockStatusLabel[product.stock_status].label} · {product.total_stock} u
            </Badge>
          )
        }
      />
      <p className="mb-4">
        <Link to="/productos" className="link text-sm">
          ← Volver a productos
        </Link>
      </p>

      {query.isPending && <Loading />}
      {query.isError && <ErrorState error={query.error} onRetry={() => void query.refetch()} />}
      {product && (
        <>
          <dl className="card mb-6 grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ['Droga', product.active_ingredient],
              ['Laboratorio', product.laboratory],
              ['Presentación', product.presentation],
              ['Acción terapéutica', product.therapeutic_action],
              ['Góndola', product.gondola_location],
              ['Código de barras', product.barcode],
              ['Stock mínimo', product.min_stock],
              ['Stock total (lotes activos)', `${product.total_stock} u`],
              ['Requiere receta', product.prescription_required ? 'Sí' : 'No'],
            ].map(([label, value]) => (
              <div key={String(label)}>
                <dt className="text-sm text-slate-600">{label}</dt>
                <dd className="font-medium">{value ?? '—'}</dd>
              </div>
            ))}
          </dl>

          <h2 className="mb-3 text-xl font-bold">Lotes</h2>
          {product.batches && product.batches.length > 0 ? (
            <table className="table-cards">
              <caption className="sr-only">Lotes de {product.name}</caption>
              <thead>
                <tr>
                  <th scope="col">Lote</th>
                  <th scope="col">Vencimiento</th>
                  <th scope="col">Cantidad</th>
                  <th scope="col">Ubicación</th>
                  <th scope="col">Estado</th>
                  <th scope="col">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {product.batches.map((batch) => {
                  const status = expirationStatusLabel[batch.expiration_status]
                  return (
                    <tr key={batch.id}>
                      <td data-label="Lote" className="font-semibold">
                        {batch.lot_number}
                      </td>
                      <td data-label="Vencimiento">{formatDate(batch.expiration_date)}</td>
                      <td data-label="Cantidad">{batch.quantity} u</td>
                      <td data-label="Ubicación">{batch.location ?? '—'}</td>
                      <td data-label="Estado">
                        <Badge tone={status.tone} title={status.hint}>
                          {status.label}
                        </Badge>
                        {batch.status !== 'active' && <span className="ml-2 text-xs text-slate-600">({batch.status === 'recalled' ? 'retirado' : 'dado de baja'})</span>}
                      </td>
                      <td data-label="">
                        <button type="button" className="btn-secondary px-3 py-1 text-sm" onClick={() => setSelectedBatch(batch)} aria-label={`Registrar movimiento en el lote ${batch.lot_number}`}>
                          + Movimiento
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <EmptyState>Este producto todavía no tiene lotes cargados.</EmptyState>
          )}
        </>
      )}

      {selectedBatch && (
        <Modal
          title={`Registrar movimiento · Lote ${selectedBatch.lot_number}`}
          subtitle={`${product?.name ?? ''} · Stock disponible: ${selectedBatch.quantity} u`}
          onClose={() => setSelectedBatch(null)}
        >
          <MovementForm batch={selectedBatch} onCancel={() => setSelectedBatch(null)} onSuccess={() => setSelectedBatch(null)} />
        </Modal>
      )}
    </>
  )
}
