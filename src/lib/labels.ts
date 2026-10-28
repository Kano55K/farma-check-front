import type { ExpirationStatus, MovementType, OrderStatus, Role, StockStatus } from '../types/api'

export type Tone = 'danger' | 'warning' | 'success' | 'neutral' | 'info'

export const stockStatusLabel: Record<StockStatus, { label: string; tone: Tone }> = {
  sin_stock: { label: 'Sin stock', tone: 'danger' },
  stock_bajo: { label: 'Stock bajo', tone: 'warning' },
  ok: { label: 'OK', tone: 'success' },
}

export const expirationStatusLabel: Record<ExpirationStatus, { label: string; tone: Tone; hint: string }> = {
  vencido: { label: 'Vencido', tone: 'danger', hint: 'ya venció' },
  critico: { label: 'Crítico', tone: 'danger', hint: 'vence en 30 días o menos' },
  alerta: { label: 'Alerta', tone: 'warning', hint: 'vence en 90 días o menos' },
  ok: { label: 'OK', tone: 'success', hint: 'vence en más de 90 días' },
}

export const movementTypeLabel: Record<MovementType, string> = {
  entrada: 'Entrada',
  salida: 'Salida',
  ajuste: 'Ajuste de inventario',
  devaluacion_vencimiento: 'Baja por vencimiento',
}

export const orderStatusLabel: Record<OrderStatus, { label: string; tone: Tone }> = {
  pending: { label: 'Pendiente', tone: 'neutral' },
  sent: { label: 'Enviada', tone: 'warning' },
  received: { label: 'Recibida', tone: 'success' },
  cancelled: { label: 'Cancelada', tone: 'danger' },
}

export const roleLabel: Record<Role, string> = { admin: 'Administrador', employee: 'Empleado' }
