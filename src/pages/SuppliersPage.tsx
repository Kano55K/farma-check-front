import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { suppliersApi } from '../api/endpoints'
import { AdminOnly } from '../auth/ProtectedRoute'
import { PageHeader } from '../components/PageHeader'
import { Pagination } from '../components/Pagination'
import { EmptyState, ErrorState, Loading } from '../components/States'
import { useDebounce } from '../hooks/useDebounce'

export function SuppliersPage() {
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState(params.get('search') ?? '')
  const debounced = useDebounce(search, 300)
  const page = Number(params.get('page') ?? 1)

  const query = useQuery({
    queryKey: ['suppliers', { search: debounced, page }],
    queryFn: () => suppliersApi.list({ search: debounced, page, per_page: 20 }),
    placeholderData: keepPreviousData,
  })

  return (
    <>
      <PageHeader
        title="Proveedores"
        actions={
          <AdminOnly>
            <Link to="/proveedores/nuevo" className="btn-primary">
              Nuevo proveedor
            </Link>
          </AdminOnly>
        }
      />
      <div role="search" className="mb-4 max-w-md">
        <label htmlFor="buscar-proveedor" className="mb-1 block text-sm font-semibold">
          Buscar por razón social o CUIT
        </label>
        <input
          id="buscar-proveedor"
          type="search"
          className="input"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setParams(new URLSearchParams(e.target.value ? { search: e.target.value } : {}), { replace: true })
          }}
        />
      </div>

      {query.isPending && <Loading />}
      {query.isError && <ErrorState error={query.error} onRetry={() => void query.refetch()} />}
      {query.data && query.data.data.length === 0 && <EmptyState>No hay proveedores que coincidan con la búsqueda.</EmptyState>}
      {query.data && query.data.data.length > 0 && (
        <>
          <table className="table-cards" aria-busy={query.isFetching}>
            <caption className="sr-only">Proveedores</caption>
            <thead>
              <tr>
                <th scope="col">Razón social</th>
                <th scope="col">CUIT</th>
                <th scope="col">Contacto</th>
                <th scope="col">Teléfono</th>
                <th scope="col">Email</th>
                <th scope="col">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {query.data.data.map((s) => (
                <tr key={s.id}>
                  <td data-label="Razón social" className="font-semibold">
                    {s.company_name}
                  </td>
                  <td data-label="CUIT">{s.cuit}</td>
                  <td data-label="Contacto">{s.contact_name ?? '—'}</td>
                  <td data-label="Teléfono">{s.phone ?? '—'}</td>
                  <td data-label="Email">{s.email ?? '—'}</td>
                  <td data-label="">
                    <Link to={`/proveedores/${s.id}`} className="link" aria-label={`Ver ${s.company_name}`}>
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
            noun="proveedores"
          />
        </>
      )}
    </>
  )
}
