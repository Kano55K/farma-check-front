// Tipos de la API de Farma-Check (ver docs/api en el repo del back-end).

export type Role = 'employee' | 'admin'
export type StockStatus = 'sin_stock' | 'stock_bajo' | 'ok'
export type ExpirationStatus = 'vencido' | 'critico' | 'alerta' | 'ok'
export type BatchStatus = 'active' | 'expired' | 'recalled'
export type MovementType = 'entrada' | 'salida' | 'ajuste' | 'devaluacion_vencimiento'
export type OrderStatus = 'pending' | 'sent' | 'received' | 'cancelled'

export interface User {
  id: number
  email: string
  role: Role
}

export interface LoginResponse {
  token: string
  token_type: 'Bearer'
  expires_at: string
  user: User
}

export interface PageMeta {
  page: number
  per_page: number
  total_count: number
  total_pages: number
}

export interface Paginated<T, M = PageMeta> {
  data: T[]
  meta: M
}

export interface ProductSummary {
  id: number
  name: string
  active_ingredient: string | null
  laboratory: string | null
  presentation: string | null
}

export interface Batch {
  id: number
  product_id: number
  lot_number: string
  expiration_date: string
  quantity: number
  location: string | null
  status: BatchStatus
  expiration_status: ExpirationStatus
  days_to_expiration: number
  product?: ProductSummary
}

export interface Product extends ProductSummary {
  barcode: string | null
  code: string | null
  therapeutic_action: string | null
  gondola_location: string | null
  min_stock: number | null
  safety_stock: number | null
  prescription_required: boolean
  total_stock: number
  stock_status: StockStatus
  batches?: Batch[]
}

export interface ProductsMeta extends PageMeta {
  laboratories: string[]
}

export interface StockMovement {
  id: number
  movement_type: MovementType
  quantity: number
  reason: string | null
  created_at: string
  batch: { id: number; lot_number: string; quantity: number; expiration_date: string }
  product: { id: number; name: string }
  user: { id: number; email: string }
}

export interface Supplier {
  id: number
  company_name: string
  cuit: string
  email: string | null
  phone: string | null
  contact_name: string | null
  created_at: string
  updated_at: string
  recent_purchase_orders?: PurchaseOrder[]
}

export interface PurchaseOrderItem {
  id: number
  product: { id: number; name: string; presentation: string | null }
  quantity: number
  unit_price: number | null
  subtotal: number
}

export interface PurchaseOrder {
  id: number
  status: OrderStatus
  notes: string | null
  total_amount: number
  items_count: number
  supplier: { id: number; company_name: string }
  created_at: string
  updated_at: string
  items?: PurchaseOrderItem[]
}

export interface DashboardAlert {
  type: 'batch_expired' | 'batch_critical' | 'out_of_stock' | 'low_stock'
  severity: 'danger' | 'warning'
  message: string
  product_id: number
  batch_id: number | null
  date: string | null
}

export interface Dashboard {
  kpis: {
    total_products: number
    low_stock_products: number
    out_of_stock_products: number
    expired_batches: number
    critical_batches: number
    warning_batches: number
    pending_purchase_orders: number
  }
  alerts: DashboardAlert[]
}

export type FieldErrors = Record<string, string[]>

export interface ApiErrorBody {
  error: { code: string; message: string; details: FieldErrors | null }
}
