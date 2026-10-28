import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ApiError, errorMessage } from '../api/client'
import { ordersApi, productsApi, suppliersApi } from '../api/endpoints'
import { FormError, SelectField, TextAreaField } from '../components/Field'
import { PageHeader } from '../components/PageHeader'
import { ErrorState, Loading } from '../components/States'
import { useToast } from '../components/useToast'
import { formatMoney } from '../lib/format'

interface ItemRow {
  key: number
  product_id: string
  quantity: string
  unit_price: string
}

let nextKey = 1
const emptyRow = (): ItemRow => ({ key: nextKey++, product_id: '', quantity: '', unit_price: '' })

/** Alta de orden de compra: proveedor + ítems dinámicos con total calculado en vivo. */
export function OrderNewPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { notify } = useToast()
  const [supplierId, setSupplierId] = useState(params.get('supplier') ?? '')
  const [notes, setNotes] = useState('')
  const [rows, setRows] = useState<ItemRow[]>([emptyRow()])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)

  const suppliers = useQuery({ queryKey: ['suppliers', { all: true }], queryFn: () => suppliersApi.list({ per_page: 100 }) })
  const products = useQuery({ queryKey: ['products', { all: true }], queryFn: () => productsApi.list({ per_page: 100 }) })

  const mutation = useMutation({
    mutationFn: ordersApi.create,
    onSuccess: async (response) => {
      notify(`Orden #${response.data.id} creada por ${formatMoney(response.data.total_amount)}.`)
      await queryClient.invalidateQueries({ queryKey: ['orders'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      navigate(`/ordenes/${response.data.id}`)
    },
    onError: (error) => {
      if (error instanceof ApiError && error.details) {
        const mapped: Record<string, string> = {}
        Object.entries(error.details).forEach(([key, messages]) => {
          mapped[key.replace('purchase_order_items', 'items')] = messages[0]
        })
        setErrors(mapped)
      }
      setFormError(errorMessage(error))
    },
  })

  const total = rows.reduce((sum, row) => sum + (Number(row.quantity) || 0) * (Number(row.unit_price) || 0), 0)

  function updateRow(key: number, changes: Partial<ItemRow>) {
    setRows((list) => list.map((row) => (row.key === key ? { ...row, ...changes } : row)))
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (mutation.isPending) return
    const next: Record<string, string> = {}
    if (!supplierId) next.supplier = 'Elegí un proveedor'
    rows.forEach((row, i) => {
      if (!row.product_id) next[`row-${i}-product`] = 'Elegí un producto'
      if (!Number.isInteger(Number(row.quantity)) || Number(row.quantity) <= 0) next[`row-${i}-quantity`] = 'Cantidad entera mayor que 0'
      if (row.unit_price === '' || Number(row.unit_price) < 0) next[`row-${i}-price`] = 'Precio mayor o igual a 0'
    })
    if (rows.length === 0) next.items = 'Agregá al menos un ítem'
    setErrors(next)
    setFormError(Object.keys(next).length ? 'Revisá los datos marcados.' : null)
    if (Object.keys(next).length) return
    mutation.mutate({
      supplier_id: Number(supplierId),
      notes: notes.trim() || undefined,
      items: rows.map((row) => ({ product_id: Number(row.product_id), quantity: Number(row.quantity), unit_price: Number(row.unit_price) })),
    })
  }

  if (suppliers.isPending || products.isPending) return <Loading label="Cargando proveedores y productos…" />
  if (suppliers.isError || products.isError) {
    return (
      <ErrorState
        error={suppliers.error ?? products.error}
        onRetry={() => {
          void suppliers.refetch()
          void products.refetch()
        }}
      />
    )
  }

  return (
    <>
      <PageHeader title="Nueva orden de compra" />
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <FormError message={formError} />
        <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
          <SelectField label="Proveedor" required value={supplierId} onChange={(e) => setSupplierId(e.target.value)} error={errors.supplier}>
            <option value="">Elegí un proveedor</option>
            {suppliers.data.data.map((s) => (
              <option key={s.id} value={s.id}>
                {s.company_name}
              </option>
            ))}
          </SelectField>
          <TextAreaField label="Notas" value={notes} onChange={(e) => setNotes(e.target.value)} className="sm:col-span-2" />
        </div>

        <fieldset>
          <legend className="mb-2 text-lg font-bold">Ítems</legend>
          {errors.items && (
            <p role="alert" className="mb-2 text-sm text-red-700">
              {errors.items}
            </p>
          )}
          <div className="space-y-3">
            {rows.map((row, i) => {
              const subtotal = (Number(row.quantity) || 0) * (Number(row.unit_price) || 0)
              return (
                <div key={row.key} className="grid gap-3 rounded-md border border-slate-300 p-3 md:grid-cols-[3fr_1fr_1fr_1fr_auto] md:items-end">
                  <SelectField label={`Producto ${i + 1}`} required value={row.product_id} onChange={(e) => updateRow(row.key, { product_id: e.target.value })} error={errors[`row-${i}-product`]}>
                    <option value="">Elegí un producto</option>
                    {products.data.data.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.total_stock} u en stock)
                      </option>
                    ))}
                  </SelectField>
                  <NumberInput label="Cantidad" value={row.quantity} onChange={(v) => updateRow(row.key, { quantity: v })} error={errors[`row-${i}-quantity`]} step="1" min="1" />
                  <NumberInput label="Precio unitario ($)" value={row.unit_price} onChange={(v) => updateRow(row.key, { unit_price: v })} error={errors[`row-${i}-price`]} step="0.01" min="0" />
                  <p className="text-sm">
                    <span className="block font-semibold text-slate-700">Subtotal</span>
                    {formatMoney(subtotal)}
                  </p>
                  <button
                    type="button"
                    className="btn-danger px-3 py-2 text-sm"
                    disabled={rows.length === 1}
                    onClick={() => setRows((list) => list.filter((r) => r.key !== row.key))}
                    aria-label={`Quitar ítem ${i + 1}`}
                  >
                    Quitar
                  </button>
                </div>
              )
            })}
          </div>
          <button type="button" className="btn-secondary mt-3" onClick={() => setRows((list) => [...list, emptyRow()])}>
            + Agregar ítem
          </button>
        </fieldset>

        <p className="text-xl" aria-live="polite">
          <strong>Total estimado:</strong> {formatMoney(total)}
          <span className="block text-sm text-slate-600">El total definitivo lo calcula el servidor al guardar.</span>
        </p>

        <div className="flex gap-3">
          <Link to="/ordenes" className="btn-secondary">
            Cancelar
          </Link>
          <button type="submit" className="btn-primary" disabled={mutation.isPending}>
            {mutation.isPending ? 'Guardando…' : 'Crear orden'}
          </button>
        </div>
      </form>
    </>
  )
}

function NumberInput({ label, value, onChange, error, step, min }: { label: string; value: string; onChange: (v: string) => void; error?: string; step: string; min: string }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-slate-800">
        {label} <span aria-hidden="true">*</span>
        <input
          type="number"
          inputMode="decimal"
          step={step}
          min={min}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={Boolean(error)}
          className={`input mt-1 font-normal ${error ? 'input-invalid' : ''}`}
        />
      </label>
      {error && <p className="mt-1 text-sm text-red-700">{error}</p>}
    </div>
  )
}
