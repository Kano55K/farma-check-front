import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { productsApi } from '../api/endpoints'
import { Badge } from '../components/Badge'
import { PageHeader } from '../components/PageHeader'
import { Pagination } from '../components/Pagination'
import { EmptyState, ErrorState, Loading } from '../components/States'
import { useDebounce } from '../hooks/useDebounce'
import { stockStatusLabel } from '../lib/labels'
import type { StockStatus } from '../types/api'

/** Buscador de productos. Los filtros viven en la URL para poder compartirlos o volver atrás. */
export function ProductsPage() {
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState(params.get('search') ?? '')
  const debouncedSearch = useDebounce(search, 300)

  const filters = {
    search: params.get('search') ?? '',
    laboratory: params.get('laboratory') ?? '',
    stock_status: (params.get('stock_status') ?? '') as StockStatus | '',
    prescription_required: (params.get('prescription_required') ?? '') as 'true' | '',
    page: Number(params.get('page') ?? 1),
  }

  function updateParams(changes: Record<string, string>) {
    const next = new URLSearchParams(params)
    Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)))
    if (!('page' in changes)) next.delete('page')
    setParams(next, { replace: true })
  }

  // El texto se aplica a la URL (y a la consulta) recién cuando el usuario deja de escribir.
  useEffect(() => {
    setParams(
      (current) => {
        if ((current.get('search') ?? '') === debouncedSearch) return current
        const next = new URLSearchParams(current)
        if (debouncedSearch) next.set('search', debouncedSearch)
        else next.delete('search')
        next.delete('page')
        return next
      },
      { replace: true },
    )
  }, [debouncedSearch, setParams])

  const query = useQuery({
    queryKey: ['products', filters],
    queryFn: () => productsApi.list({ ...filters, per_page: 15 }),
    placeholderData: keepPreviousData,
  })

  const hasFilters = Boolean(filters.search || filters.laboratory || filters.stock_status || filters.prescription_required)

  function clearFilters() {
    setSearch('')
    setParams(new URLSearchParams(), { replace: true })
  }

  return (
    <>
      <PageHeader title="Productos" />

      <div role="search" className="mb-4 grid gap-3 md:grid-cols-[2fr_1fr_1fr_auto] md:items-end">
        <div>
          <label htmlFor="buscar" className="mb-1 block text-sm font-semibold">
            Buscar por nombre, droga o código de barras
          </label>
          <input id="buscar" type="search" className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ej.: ibuprofeno" />
        </div>
        <div>
          <label htmlFor="laboratorio" className="mb-1 block text-sm font-semibold">
            Laboratorio
          </label>
          <select id="laboratorio" className="input" value={filters.laboratory} onChange={(e) => updateParams({ laboratory: e.target.value })}>
            <option value="">Todos</option>
            {query.data?.meta.laboratories.map((lab) => (
              <option key={lab} value={lab}>
                {lab}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="estado-stock" className="mb-1 block text-sm font-semibold">
            Estado de stock
          </label>
          <select id="estado-stock" className="input" value={filters.stock_status} onChange={(e) => updateParams({ stock_status: e.target.value })}>
            <option value="">Todos</option>
            <option value="sin_stock">Sin stock</option>
            <option value="stock_bajo">Stock bajo</option>
            <option value="ok">OK</option>
          </select>
        </div>
        <label className="flex items-center gap-2 py-2 text-sm font-semibold">
          <input
            type="checkbox"
            className="size-5"
            checked={filters.prescription_required === 'true'}
            onChange={(e) => updateParams({ prescription_required: e.target.checked ? 'true' : '' })}
          />
          Bajo receta
        </label>
      </div>

      {query.isPending && <Loading label="Buscando productos…" />}
      {query.isError && <ErrorState error={query.error} onRetry={() => void query.refetch()} />}
      {query.data && query.data.data.length === 0 && (
        <EmptyState
          action={
            hasFilters && (
              <button type="button" className="btn-secondary" onClick={clearFilters}>
                Limpiar filtros
              </button>
            )
          }
        >
          No encontramos productos con esos filtros.
        </EmptyState>
      )}
      {query.data && query.data.data.length > 0 && (
        <div aria-busy={query.isFetching}>
          <table className="table-cards">
            <caption className="sr-only">Listado de productos</caption>
            <thead>
              <tr>
                <th scope="col">Medicamento / Droga</th>
                <th scope="col">Laboratorio</th>
                <th scope="col">Presentación</th>
                <th scope="col">Góndola</th>
                <th scope="col">Stock</th>
                <th scope="col">Estado</th>
                <th scope="col">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {query.data.data.map((product) => (
                <tr key={product.id}>
                  <td data-label="Medicamento">
                    <span className="font-semibold">{product.name}</span>
                    <span className="block text-xs text-slate-600">
                      {product.active_ingredient}
                      {product.prescription_required && ' · Bajo receta'}
                    </span>
                  </td>
                  <td data-label="Laboratorio">{product.laboratory ?? '—'}</td>
                  <td data-label="Presentación">{product.presentation ?? '—'}</td>
                  <td data-label="Góndola">{product.gondola_location ?? '—'}</td>
                  <td data-label="Stock">{product.total_stock} u</td>
                  <td data-label="Estado">
                    <Badge tone={stockStatusLabel[product.stock_status].tone}>{stockStatusLabel[product.stock_status].label}</Badge>
                  </td>
                  <td data-label="">
                    <Link to={`/productos/${product.id}`} className="link" aria-label={`Ver detalle de ${product.name}`}>
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination meta={query.data.meta} onPageChange={(page) => updateParams({ page: String(page) })} noun="productos" />
        </div>
      )}
    </>
  )
}
