import { expect, test, type Page } from '@playwright/test'

// Guion de la demo, contra la API real (Rails en :3000 con `bin/rails db:seed`).
// Credenciales de los seeds: contraseña demo1234 para todos.

const EMPLOYEE = 'empleado@farma-check.com'
const ADMIN = 'admin@farma-check.com'
const PASSWORD = 'demo1234'

async function login(page: Page, email: string) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Contraseña').fill(PASSWORD)
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await expect(page.getByRole('heading', { name: 'Inicio' })).toBeVisible()
}

/** Stock total del producto, leído del badge del detalle ("OK · 145 u"). */
async function totalStock(page: Page) {
  const text = await page.locator('header').getByText(/· \d+ u$/).textContent()
  return Number(text!.match(/(\d+) u$/)![1])
}

test.describe.configure({ mode: 'serial' })

test('1 y 2 · empleado: buscar, registrar una salida y ver el error de stock insuficiente', async ({ page }) => {
  await login(page, EMPLOYEE)
  await expect(page.getByRole('link', { name: /^Productos \d+$/ })).toBeVisible()

  await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Productos' }).click()
  await page.getByLabel('Buscar por nombre, droga o código de barras').fill('ibuprofeno 400')
  await expect(page).toHaveURL(/search=ibuprofeno/)
  await page.getByRole('link', { name: 'Ver detalle de Ibuprofeno 400 mg' }).click()
  await expect(page.getByRole('heading', { name: 'Ibuprofeno 400 mg' })).toBeVisible()

  const before = await totalStock(page)

  // Flujo 1: salida válida.
  await page.getByRole('button', { name: 'Registrar movimiento en el lote IBU-2401' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Tipo de movimiento').selectOption('salida')
  await dialog.getByLabel(/Cantidad/).fill('2')
  await dialog.getByLabel('Motivo').fill('Venta en mostrador (e2e)')
  await dialog.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByText(/Movimiento registrado\. Stock del lote IBU-2401/)).toBeVisible()
  await expect(dialog).toBeHidden()
  await expect.poll(() => totalStock(page)).toBe(before - 2)

  // Flujo 2: salida mayor al stock → 422 de la API, sin romper nada.
  await page.getByRole('button', { name: 'Registrar movimiento en el lote IBU-2312' }).click()
  await dialog.getByLabel(/Cantidad/).fill('100000')
  await dialog.getByRole('button', { name: 'Guardar' }).click()
  await expect(dialog.getByText(/supera el stock disponible del lote \(\d+\)/)).toBeVisible()
  await expect(dialog.getByLabel(/Cantidad/)).toHaveAttribute('aria-invalid', 'true')
  await dialog.getByRole('button', { name: 'Cancelar' }).click()
  await expect.poll(() => totalStock(page)).toBe(before - 2)
})

test('3 · admin: crear, enviar y recibir una orden de compra; el lote nuevo suma stock', async ({ page }) => {
  const lot = `E2E-${Date.now()}`
  const nextYear = new Date().getFullYear() + 1
  await login(page, ADMIN)

  // Stock previo del producto.
  await page.goto('/productos?search=paracetamol')
  await page.getByRole('link', { name: 'Ver detalle de Paracetamol 500 mg' }).click()
  const before = await totalStock(page)
  const productUrl = page.url()

  await page.goto('/ordenes/nueva')
  await page.getByLabel(/Proveedor/).selectOption({ label: 'Droguería del Sur S.A.' })
  const productSelect = page.getByLabel(/Producto 1/)
  const productId = await productSelect.locator('option', { hasText: 'Paracetamol 500 mg' }).getAttribute('value')
  await productSelect.selectOption(productId!)
  await page.getByLabel(/Cantidad/).fill('10')
  await page.getByLabel(/Precio unitario/).fill('950.5')
  await expect(page.locator('p', { hasText: 'Total estimado:' })).toContainText('9.505,00')
  await page.getByRole('button', { name: 'Crear orden' }).click()

  await expect(page.getByRole('heading', { name: /Orden #\d+ · Droguería del Sur S\.A\./ })).toBeVisible()
  await expect(page.getByText('Pendiente', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Enviar al proveedor' }).click()
  await expect(page.getByText('Enviada', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Recibir mercadería' }).click()
  // Primero un vencimiento inválido: lo frena la validación del formulario.
  await page.getByLabel('Número de lote de Paracetamol 500 mg').fill(lot)
  await page.getByLabel('Vencimiento de Paracetamol 500 mg').fill('2020-01-01')
  await page.getByRole('button', { name: 'Confirmar recepción' }).click()
  await expect(page.getByText('Debe ser posterior a hoy')).toBeVisible()

  await page.getByLabel('Vencimiento de Paracetamol 500 mg').fill(`${nextYear}-06-30`)
  await page.getByLabel('Ubicación de Paracetamol 500 mg').fill('Depósito E2E')
  await page.getByRole('button', { name: 'Confirmar recepción' }).click()
  await expect(page.getByText(/Orden recibida: se cargaron 1 lote/)).toBeVisible()
  await expect(page.getByText('Recibida', { exact: true })).toBeVisible()

  await page.goto(productUrl)
  await expect(page.getByRole('cell', { name: lot, exact: true })).toBeVisible()
  await expect.poll(() => totalStock(page)).toBe(before + 10)
})

test('4 · cerrar sesión o token vencido vuelve al login', async ({ page }) => {
  await login(page, EMPLOYEE)
  await page.getByRole('button', { name: 'Cerrar sesión' }).click()
  await expect(page.getByRole('button', { name: 'Ingresar' })).toBeVisible()

  // Token vencido/inválido: la API responde 401 y la app vuelve al login con aviso.
  await login(page, EMPLOYEE)
  await page.evaluate(() => {
    const key = 'farma-check.session'
    const session = JSON.parse(localStorage.getItem(key)!)
    localStorage.setItem(key, JSON.stringify({ ...session, token: 'token-vencido' }))
  })
  await page.reload()
  await expect(page.getByText('Tu sesión expiró. Iniciá sesión nuevamente.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Ingresar' })).toBeVisible()
})

test('responsive · en celular el menú se colapsa y las tablas pasan a tarjetas @mobile', async ({ page }) => {
  await login(page, EMPLOYEE)
  const menu = page.getByRole('button', { name: 'Abrir menú' })
  await expect(menu).toBeVisible()
  await menu.click()
  await page.locator('#menu-movil').getByRole('link', { name: 'Vencimientos' }).click()
  await expect(page.getByRole('heading', { name: 'Vencimientos' })).toBeVisible()
  await expect(page.locator('#menu-movil')).toBeHidden()
  await expect(page.getByRole('cell').first()).toBeVisible()
  await page.screenshot({ path: 'test-results/celular-vencimientos.png', fullPage: false })
})

test('capturas de escritorio para revisar el diseño', async ({ page }) => {
  await login(page, EMPLOYEE)
  await expect(page.getByRole('heading', { name: 'Alertas' })).toBeVisible()
  await page.screenshot({ path: 'test-results/escritorio-inicio.png' })
  await page.goto('/productos?search=ibu')
  await expect(page.getByRole('cell').first()).toBeVisible()
  await page.screenshot({ path: 'test-results/escritorio-productos.png' })
})
