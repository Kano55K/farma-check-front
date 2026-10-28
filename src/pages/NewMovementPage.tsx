import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { batchesApi, productsApi } from '../api/endpoints'
import { MovementForm } from '../components/MovementForm'
import { PageHeader } from '../components/PageHeader'
import { ErrorState, Loading } from '../components/States'
import { useDebounce } from '../hooks/useDebounce'
import { formatDate } from '../lib/format'
import { expirationStatusLabel } from '../lib/labels'

/** Registro de movimiento desde el acceso rápido: primero se elige el producto y el lote. */
export function NewMovementPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const debounced = useDebounce(search, 300)
  const productId = params.get('product') ?? ''
  const batchId = params.get('batch') ?? ''

  const products = useQuery({
    queryKey: ['products', { search: debounced, per_page: 50, picker: true }],
    queryFn: () => productsApi.list({ search: debounced, per_page: 50 }),
  })
  const batches = useQuery({
    queryKey: ['batches', { product_id: productId }],
    queryFn: () => batchesApi.list({ product_id: productId, per_page: 100 }),
    enabled: Boolean(productId),
  })
  const batch = batches.data?.data.find((b) => String(b.id) === batchId)

  function select(key: 'product' | 'batch', value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key === 'product') next.delete('batch')
    setParams(next, { replace: true })
  }

  return (
    <>
      <PageHeader title="Registrar movimiento" />
      <div className="grid max-w-2xl gap-4">
        <div>
          <label htmlFor="buscar-producto" className="mb-1 block text-sm font-semibold">
            Buscar producto
          </label>
          <input id="buscar-producto" type="search" className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nombre o droga" />
        </div>
        <div>
          <label htmlFor="producto" className="mb-1 block text-sm font-semibold">
            Producto <span aria-hidden="true">*</span>
          </label>
          {products.isError ? (
            <ErrorState error={products.error} onRetry={() => void products.refetch()} />
          ) : (
            <select id="producto" className="input" value={productId} onChange={(e) => select('product', e.target.value)} disabled={products.isPending}>
              <option value="">{products.isPending ? 'Cargando…' : 'Elegí un producto'}</option>
              {products.data?.data.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.total_stock} u
                </option>
              ))}
            </select>
          )}
        </div>
        {productId && (
          <div>
            <label htmlFor="lote" className="mb-1 block text-sm font-semibold">
              Lote <span aria-hidden="true">*</span>
            </label>
            {batches.isPending && <Loading rows={1} />}
            {batches.isError && <ErrorState error={batches.error} onRetry={() => void batches.refetch()} />}
            {batches.data && (
              <select id="lote" className="input" value={batchId} onChange={(e) => select('batch', e.target.value)}>
                <option value="">{batches.data.data.length ? 'Elegí un lote' : 'El producto no tiene lotes'}</option>
                {batches.data.data.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.lot_number} · vence {formatDate(b.expiration_date)} · {b.quantity} u · {expirationStatusLabel[b.expiration_status].label}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
        {batch && (
          <section className="card" aria-label={`Movimiento en el lote ${batch.lot_number}`}>
            <MovementForm
              key={batch.id}
              batch={batch}
              onCancel={() => navigate(-1)}
              onSuccess={() => navigate(`/productos/${batch.product_id}`)}
            />
          </section>
        )}
        <p>
          <Link to="/movimientos" className="link text-sm">
            Ver historial de movimientos
          </Link>
        </p>
      </div>
    </>
  )
}
