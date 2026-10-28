import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import type { Batch, Product } from '../types/api'

// Respuestas simuladas de la API (mismo formato que el contrato en docs/api del back-end).

export const API = 'http://api.test/api/v1'

export const employee = { id: 2, email: 'empleado@farma-check.com', role: 'employee' as const }

export const batch: Batch = {
  id: 7,
  product_id: 12,
  lot_number: 'L-2291',
  expiration_date: '2027-03-31',
  quantity: 12,
  location: 'A-3',
  status: 'active',
  expiration_status: 'ok',
  days_to_expiration: 154,
}

export const product: Product = {
  id: 12,
  name: 'Ibuprofeno 600 mg',
  active_ingredient: 'Ibuprofeno',
  laboratory: 'Bagó',
  presentation: 'Comprimidos x 20',
  barcode: '7790000100000',
  code: 'IBU001',
  therapeutic_action: 'Analgésico',
  gondola_location: 'A-3',
  min_stock: 20,
  safety_stock: 10,
  prescription_required: false,
  total_stock: 12,
  stock_status: 'stock_bajo',
  batches: [batch],
}

export const loginOk = http.post(`${API}/login`, async ({ request }) => {
  const body = (await request.json()) as { email_address: string; password: string }
  if (body.password !== 'demo1234') {
    return HttpResponse.json(
      { error: { code: 'invalid_credentials', message: 'Email o contraseña incorrectos', details: null } },
      { status: 401 },
    )
  }
  return HttpResponse.json({
    token: 'token-de-prueba',
    token_type: 'Bearer',
    expires_at: new Date(Date.now() + 12 * 3600_000).toISOString(),
    user: employee,
  })
})

export const dashboardOk = http.get(`${API}/dashboard`, () =>
  HttpResponse.json({
    data: {
      kpis: {
        total_products: 25,
        low_stock_products: 4,
        out_of_stock_products: 2,
        expired_batches: 3,
        critical_batches: 5,
        warning_batches: 5,
        pending_purchase_orders: 3,
      },
      alerts: [],
    },
  }),
)

export const productOk = http.get(`${API}/products/12`, () => HttpResponse.json({ data: product }))

export const server = setupServer(loginOk, dashboardOk, productOk)
