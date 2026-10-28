import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError, errorMessage } from '../api/client'
import { ordersApi, type ReceptionItem } from '../api/endpoints'
import { AdminOnly } from '../auth/ProtectedRoute'
import { Badge } from '../components/Badge'
import { FormError } from '../components/Field'
import { Modal } from '../components/Modal'
import { PageHeader } from '../components/PageHeader'
import { ErrorState, Loading } from '../components/States'
import { useToast } from '../components/useToast'
import { formatDate, formatMoney, todayIso } from '../lib/format'
import { orderStatusLabel } from '../lib/labels'
import type { PurchaseOrder } from '../types/api'
import { NotFoundPage } from './NotFoundPage'

export function OrderDetailPage() {
  const { id = '' } = useParams()
  const query = useQuery({ queryKey: ['order', id], queryFn: () => ordersApi.get(id) })
  const queryClient = useQueryClient()
  const { notify } = useToast()
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [receiving, setReceiving] = useState(false)

  const refresh = async (order: PurchaseOrder) => {
    queryClient.setQueryData(['order', id], order)
    await Promise.all(['orders', 'dashboard', 'products', 'product', 'batches', 'movements', 'supplier'].map((key) => queryClient.invalidateQueries({ queryKey: [key] })))
  }

  const sendMutation = useMutation({
    mutationFn: ordersApi.send,
    onSuccess: async (r) => {
      notify(r.message ?? 'Orden enviada')
      await refresh(r.data)
    },
    onError: (e) => notify(errorMessage(e), 'error'),
  })
  const cancelMutation = useMutation({
    mutationFn: ordersApi.cancel,
    onSuccess: async (r) => {
      setConfirmCancel(false)
      notify(r.message ?? 'Orden cancelada')
      await refresh(r.data)
    },
    onError: (e) => {
      setConfirmCancel(false)
      if (!(e instanceof ApiError && e.status === 403)) notify(errorMessage(e), 'error')
    },
  })

  if (query.isError && query.error instanceof ApiError && query.error.status === 404) return <NotFoundPage what="La orden" />
  const order = query.data
  const busy = sendMutation.isPending || cancelMutation.isPending

  return (
    <>
      <PageHeader
        title={order ? `Orden #${order.id} · ${order.supplier.company_name}` : 'Orden de compra'}
        actions={order && <Badge tone={orderStatusLabel[order.status].tone}>{orderStatusLabel[order.status].label}</Badge>}
      />
      <p className="mb-4">
        <Link to="/ordenes" className="link text-sm">
          ← Volver a órdenes
        </Link>
      </p>
      {query.isPending && <Loading />}
      {query.isError && <ErrorState error={query.error} onRetry={() => void query.refetch()} />}
      {order && (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-slate-700">
              Creada {formatDate(order.created_at)} · Total <strong>{formatMoney(order.total_amount)}</strong>
              {order.notes && <span className="block text-sm">Notas: {order.notes}</span>}
            </p>
            <div className="flex flex-wrap gap-2">
              {order.status === 'pending' && (
                <button type="button" className="btn-primary" disabled={busy} onClick={() => sendMutation.mutate(order.id)}>
                  {sendMutation.isPending ? 'Enviando…' : 'Enviar al proveedor'}
                </button>
              )}
              {order.status === 'sent' && !receiving && (
                <button type="button" className="btn-primary" disabled={busy} onClick={() => setReceiving(true)}>
                  Recibir mercadería
                </button>
              )}
              {(order.status === 'pending' || order.status === 'sent') && (
                <AdminOnly>
                  <button type="button" className="btn-danger" disabled={busy} onClick={() => setConfirmCancel(true)}>
                    Cancelar orden
                  </button>
                </AdminOnly>
              )}
            </div>
          </div>

          {receiving && order.status === 'sent' ? (
            <ReceiveForm order={order} onCancel={() => setReceiving(false)} onReceived={async (o) => {
              setReceiving(false)
              await refresh(o)
            }} />
          ) : (
            <table className="table-cards">
              <caption className="sr-only">Ítems de la orden</caption>
              <thead>
                <tr>
                  <th scope="col">Producto</th>
                  <th scope="col">Cantidad</th>
                  <th scope="col">Precio unitario</th>
                  <th scope="col">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {order.items?.map((item) => (
                  <tr key={item.id}>
                    <td data-label="Producto">
                      <Link to={`/productos/${item.product.id}`} className="link">
                        {item.product.name}
                      </Link>
                    </td>
                    <td data-label="Cantidad">{item.quantity}</td>
                    <td data-label="Precio unitario">{formatMoney(item.unit_price)}</td>
                    <td data-label="Subtotal">{formatMoney(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {confirmCancel && order && (
        <Modal title={`¿Cancelar la orden #${order.id}?`} subtitle="La orden pasa a Cancelada y ya no se puede enviar ni recibir." onClose={() => setConfirmCancel(false)}>
          <div className="flex justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={() => setConfirmCancel(false)} disabled={cancelMutation.isPending}>
              Volver
            </button>
            <button type="button" className="btn-danger" onClick={() => cancelMutation.mutate(order.id)} disabled={cancelMutation.isPending}>
              {cancelMutation.isPending ? 'Cancelando…' : 'Sí, cancelar orden'}
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}

interface ReceiveRow {
  lot_number: string
  expiration_date: string
  location: string
}

/** Recepción: por cada ítem se indica lote, vencimiento y ubicación. Crea lotes y entradas de stock. */
function ReceiveForm({ order, onCancel, onReceived }: { order: PurchaseOrder; onCancel: () => void; onReceived: (order: PurchaseOrder) => Promise<void> }) {
  const items = order.items ?? []
  const [rows, setRows] = useState<Record<number, ReceiveRow>>(() =>
    Object.fromEntries(items.map((item) => [item.id, { lot_number: '', expiration_date: '', location: '' }])),
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const { notify } = useToast()

  const mutation = useMutation({
    mutationFn: (data: ReceptionItem[]) => ordersApi.receive(order.id, data),
    onSuccess: async (r) => {
      notify(`Orden recibida: se cargaron ${items.length} lote(s) y ${items.length} movimiento(s) de entrada.`)
      await onReceived(r.data)
    },
    onError: (error) => {
      if (error instanceof ApiError && error.details) {
        // La API devuelve claves como "items[0].expiration_date".
        const mapped: Record<string, string> = {}
        Object.entries(error.details).forEach(([key, messages]) => {
          const match = key.match(/^items\[(\d+)\]\.?(\w+)?$/)
          if (match) mapped[`${match[1]}-${match[2] ?? 'lot_number'}`] = messages[0]
        })
        setErrors(mapped)
        setFormError('Revisá los datos marcados.')
      } else setFormError(errorMessage(error))
    },
  })

  function update(itemId: number, changes: Partial<ReceiveRow>) {
    setRows((current) => ({ ...current, [itemId]: { ...current[itemId], ...changes } }))
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (mutation.isPending) return
    const today = todayIso()
    const next: Record<string, string> = {}
    items.forEach((item, i) => {
      const row = rows[item.id]
      if (!row.lot_number.trim()) next[`${i}-lot_number`] = 'Ingresá el número de lote'
      if (!row.expiration_date) next[`${i}-expiration_date`] = 'Ingresá el vencimiento'
      else if (row.expiration_date <= today) next[`${i}-expiration_date`] = 'Debe ser posterior a hoy'
    })
    setErrors(next)
    setFormError(Object.keys(next).length ? 'Revisá los datos marcados.' : null)
    if (Object.keys(next).length) return
    mutation.mutate(
      items.map((item) => ({
        id: item.id,
        lot_number: rows[item.id].lot_number.trim(),
        expiration_date: rows[item.id].expiration_date,
        location: rows[item.id].location.trim() || undefined,
      })),
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-labelledby="recibir-titulo">
      <h2 id="recibir-titulo" className="mb-3 text-xl font-bold">
        Recibir mercadería
      </h2>
      <FormError message={formError} />
      <table className="table-cards mt-3">
        <thead>
          <tr>
            <th scope="col">Producto</th>
            <th scope="col">Cant.</th>
            <th scope="col">P. unit.</th>
            <th scope="col">N.º de lote *</th>
            <th scope="col">Vencimiento *</th>
            <th scope="col">Ubicación</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={item.id}>
              <td data-label="Producto">{item.product.name}</td>
              <td data-label="Cant.">{item.quantity}</td>
              <td data-label="P. unit.">{formatMoney(item.unit_price)}</td>
              <td data-label="N.º de lote">
                <ReceiveInput label={`Número de lote de ${item.product.name}`} value={rows[item.id].lot_number} onChange={(v) => update(item.id, { lot_number: v })} error={errors[`${i}-lot_number`]} placeholder="L-4410" />
              </td>
              <td data-label="Vencimiento">
                <ReceiveInput label={`Vencimiento de ${item.product.name}`} type="date" value={rows[item.id].expiration_date} onChange={(v) => update(item.id, { expiration_date: v })} error={errors[`${i}-expiration_date`]} />
              </td>
              <td data-label="Ubicación">
                <ReceiveInput label={`Ubicación de ${item.product.name}`} value={rows[item.id].location} onChange={(v) => update(item.id, { location: v })} placeholder="A-3" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4 flex justify-end gap-3">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={mutation.isPending}>
          Volver
        </button>
        <button type="submit" className="btn-primary" disabled={mutation.isPending}>
          {mutation.isPending ? 'Confirmando recepción…' : 'Confirmar recepción'}
        </button>
      </div>
    </form>
  )
}

function ReceiveInput({ label, value, onChange, error, type = 'text', placeholder }: { label: string; value: string; onChange: (v: string) => void; error?: string; type?: string; placeholder?: string }) {
  const errorId = error ? `err-${label.replace(/\W+/g, '-')}` : undefined
  return (
    <div className="w-full min-w-32">
      <input
        type={type}
        aria-label={label}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`input ${error ? 'input-invalid' : ''}`}
      />
      {error && (
        <p id={errorId} className="mt-1 text-left text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}
