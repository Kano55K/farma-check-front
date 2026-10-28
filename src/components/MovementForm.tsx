import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { ApiError, errorMessage } from '../api/client'
import { movementsApi } from '../api/endpoints'
import { movementTypeLabel } from '../lib/labels'
import type { Batch, FieldErrors, MovementType, StockMovement } from '../types/api'
import { FormError, SelectField, TextField } from './Field'
import { useToast } from './useToast'

const TYPES: MovementType[] = ['salida', 'entrada', 'ajuste', 'devaluacion_vencimiento']

interface Props {
  batch: Pick<Batch, 'id' | 'lot_number' | 'quantity' | 'expiration_status'>
  onSuccess?: (movement: StockMovement) => void
  onCancel?: () => void
}

/**
 * Registro de un movimiento sobre un lote. Valida en el cliente lo básico (tipo y cantidad)
 * y muestra por campo los errores que devuelve la API (por ejemplo, stock insuficiente: 422).
 */
export function MovementForm({ batch, onSuccess, onCancel }: Props) {
  const expired = batch.expiration_status === 'vencido'
  const [movementType, setMovementType] = useState<MovementType>(expired ? 'devaluacion_vencimiento' : 'salida')
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const { notify } = useToast()

  const mutation = useMutation({
    mutationFn: movementsApi.create,
    onSuccess: async (response) => {
      notify(`Movimiento registrado. Stock del lote ${response.data.batch.lot_number}: ${response.data.batch.quantity} u.`)
      await Promise.all(
        ['products', 'product', 'batches', 'batch', 'movements', 'dashboard'].map((key) => queryClient.invalidateQueries({ queryKey: [key] })),
      )
      onSuccess?.(response.data)
    },
    onError: (error) => {
      if (error instanceof ApiError && error.details) {
        setErrors(error.details)
        setFormError(error.status === 422 ? 'Revisá los datos marcados.' : error.message)
      } else {
        setFormError(errorMessage(error))
      }
    },
  })

  function validate(): FieldErrors {
    const next: FieldErrors = {}
    const value = Number(quantity)
    if (!movementType) next.movement_type = ['Elegí el tipo de movimiento']
    if (quantity.trim() === '') next.quantity = ['Ingresá la cantidad']
    else if (!Number.isInteger(value)) next.quantity = ['La cantidad debe ser un número entero']
    else if (movementType === 'ajuste' ? value < 0 : value <= 0) {
      next.quantity = [movementType === 'ajuste' ? 'La cantidad no puede ser negativa' : 'La cantidad debe ser mayor que 0']
    }
    return next
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (mutation.isPending) return
    setFormError(null)
    const clientErrors = validate()
    setErrors(clientErrors)
    if (Object.keys(clientErrors).length > 0) return
    mutation.mutate({ batch_id: batch.id, movement_type: movementType, quantity: Number(quantity), reason: reason.trim() || undefined })
  }

  const quantityHint =
    movementType === 'ajuste' ? 'El ajuste fija el stock del lote en esta cantidad.' : `Stock disponible en el lote: ${batch.quantity} u.`

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <FormError message={formError ?? errors.batch?.[0] ?? null} />
      <SelectField
        label="Tipo de movimiento"
        required
        value={movementType}
        onChange={(e) => setMovementType(e.target.value as MovementType)}
        error={errors.movement_type?.[0]}
        hint={expired ? 'El lote está vencido: solo admite baja por vencimiento o ajuste.' : undefined}
      >
        {TYPES.map((type) => (
          <option key={type} value={type} disabled={expired && type === 'salida'}>
            {movementTypeLabel[type]}
          </option>
        ))}
      </SelectField>
      <TextField
        label="Cantidad"
        required
        type="number"
        inputMode="numeric"
        min={movementType === 'ajuste' ? 0 : 1}
        step={1}
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        error={errors.quantity?.[0]}
        hint={quantityHint}
      />
      <TextField label="Motivo" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej.: venta en mostrador" maxLength={255} error={errors.reason?.[0]} />
      <div className="flex justify-end gap-3 pt-2">
        {onCancel && (
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={mutation.isPending}>
            Cancelar
          </button>
        )}
        <button type="submit" className="btn-primary" disabled={mutation.isPending}>
          {mutation.isPending ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </form>
  )
}
