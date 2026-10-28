import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { renderApp } from './render'
import { API, batch, product, server } from './server'

async function openMovementModal() {
  const user = userEvent.setup()
  renderApp('/productos/12', { loggedIn: true })
  await user.click(await screen.findByRole('button', { name: 'Registrar movimiento en el lote L-2291' }))
  const dialog = await screen.findByRole('dialog', { name: /Registrar movimiento · Lote L-2291/ })
  return { user, dialog }
}

describe('Registrar movimiento', () => {
  it('registra una salida, confirma y refresca el stock', async () => {
    let sentBody: unknown = null
    let stock = 12
    server.use(
      http.get(`${API}/products/12`, () =>
        HttpResponse.json({ data: { ...product, total_stock: stock, batches: [{ ...batch, quantity: stock }] } }),
      ),
      http.post(`${API}/stock_movements`, async ({ request }) => {
        sentBody = await request.json()
        stock = 7
        return HttpResponse.json(
          {
            message: 'Movimiento registrado',
            data: {
              id: 99,
              movement_type: 'salida',
              quantity: 5,
              reason: 'Venta mostrador',
              created_at: new Date().toISOString(),
              batch: { id: 7, lot_number: 'L-2291', quantity: 7, expiration_date: '2027-03-31' },
              product: { id: 12, name: 'Ibuprofeno 600 mg' },
              user: { id: 2, email: 'empleado@farma-check.com' },
            },
          },
          { status: 201 },
        )
      }),
    )

    const { user, dialog } = await openMovementModal()
    await user.type(within(dialog).getByLabelText(/Cantidad/), '5')
    await user.type(within(dialog).getByLabelText('Motivo'), 'Venta mostrador')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText(/Movimiento registrado\. Stock del lote L-2291: 7 u\./)).toBeInTheDocument()
    expect(sentBody).toEqual({ stock_movement: { batch_id: 7, movement_type: 'salida', quantity: 5, reason: 'Venta mostrador' } })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(await screen.findByText('Stock bajo · 7 u')).toBeInTheDocument()
  })

  it('muestra el error 422 de stock insuficiente debajo del campo cantidad', async () => {
    server.use(
      http.post(`${API}/stock_movements`, () =>
        HttpResponse.json(
          {
            error: {
              code: 'validation_failed',
              message: 'Los datos enviados no son válidos: Cantidad supera el stock disponible del lote (12)',
              details: { quantity: ['supera el stock disponible del lote (12)'] },
            },
          },
          { status: 422 },
        ),
      ),
    )

    const { user, dialog } = await openMovementModal()
    await user.type(within(dialog).getByLabelText(/Cantidad/), '20')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }))

    const quantity = within(dialog).getByLabelText(/Cantidad/)
    expect(await within(dialog).findByText('supera el stock disponible del lote (12)')).toBeInTheDocument()
    expect(quantity).toHaveAttribute('aria-invalid', 'true')
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Revisá los datos marcados.')
    expect(within(dialog).getByRole('button', { name: 'Guardar' })).toBeEnabled()
  })

  it('valida la cantidad en el cliente sin llamar a la API', async () => {
    const { user, dialog } = await openMovementModal()
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }))
    expect(within(dialog).getByText('Ingresá la cantidad')).toBeInTheDocument()
  })

  it('deshabilita el botón y muestra "Guardando…" mientras se envía', async () => {
    let release: () => void = () => {}
    server.use(
      http.post(`${API}/stock_movements`, async () => {
        await new Promise<void>((resolve) => (release = resolve))
        return HttpResponse.json({ error: { code: 'x', message: 'x', details: null } }, { status: 500 })
      }),
    )
    const { user, dialog } = await openMovementModal()
    await user.type(within(dialog).getByLabelText(/Cantidad/), '1')
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }))

    expect(await within(dialog).findByRole('button', { name: 'Guardando…' })).toBeDisabled()
    release()
  })
})
