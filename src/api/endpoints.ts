import { apiRequest } from './client'
import type {
  Batch,
  Dashboard,
  ExpirationStatus,
  LoginResponse,
  MovementType,
  OrderStatus,
  Paginated,
  Product,
  ProductsMeta,
  PurchaseOrder,
  StockMovement,
  StockStatus,
  Supplier,
  User,
} from '../types/api'

// Una función por endpoint de la API. Las pantallas usan estas funciones con TanStack Query.

export const authApi = {
  login: (email_address: string, password: string) =>
    apiRequest<LoginResponse>('/login', { method: 'POST', body: { email_address, password }, skipAuthRedirect: true }),
  logout: () => apiRequest<{ message: string }>('/logout', { method: 'DELETE', skipAuthRedirect: true }),
  profile: () => apiRequest<User & { token_expires_at: string }>('/profile'),
}

export const dashboardApi = {
  get: () => apiRequest<{ data: Dashboard }>('/dashboard').then((r) => r.data),
}

export interface ProductFilters {
  search?: string
  laboratory?: string
  stock_status?: StockStatus | ''
  prescription_required?: 'true' | 'false' | ''
  page?: number
  per_page?: number
}

export const productsApi = {
  list: (filters: ProductFilters) => apiRequest<Paginated<Product, ProductsMeta>>('/products', { query: { ...filters } }),
  get: (id: number | string) => apiRequest<{ data: Product }>(`/products/${id}`).then((r) => r.data),
}

export interface BatchFilters {
  expiration_status?: ExpirationStatus | ''
  product_id?: number | string
  sort?: 'expiration_date' | '-expiration_date'
  with_stock?: boolean
  page?: number
  per_page?: number
}

export const batchesApi = {
  list: (filters: BatchFilters) => apiRequest<Paginated<Batch>>('/batches', { query: { ...filters } }),
  get: (id: number | string) => apiRequest<{ data: Batch }>(`/batches/${id}`).then((r) => r.data),
}

export interface MovementFilters {
  movement_type?: MovementType | ''
  batch_id?: number | string
  product_id?: number | string
  from?: string
  to?: string
  page?: number
  per_page?: number
}

export interface NewMovement {
  batch_id: number
  movement_type: MovementType
  quantity: number
  reason?: string
}

export const movementsApi = {
  list: (filters: MovementFilters) => apiRequest<Paginated<StockMovement>>('/stock_movements', { query: { ...filters } }),
  create: (movement: NewMovement) =>
    apiRequest<{ message: string; data: StockMovement }>('/stock_movements', { method: 'POST', body: { stock_movement: movement } }),
}

export type SupplierInput = Pick<Supplier, 'company_name' | 'cuit'> & Partial<Pick<Supplier, 'email' | 'phone' | 'contact_name'>>

export const suppliersApi = {
  list: (filters: { search?: string; page?: number; per_page?: number }) =>
    apiRequest<Paginated<Supplier>>('/suppliers', { query: { ...filters } }),
  get: (id: number | string) => apiRequest<{ data: Supplier }>(`/suppliers/${id}`).then((r) => r.data),
  create: (supplier: SupplierInput) =>
    apiRequest<{ message: string; data: Supplier }>('/suppliers', { method: 'POST', body: { supplier } }),
  update: (id: number | string, supplier: Partial<SupplierInput>) =>
    apiRequest<{ message: string; data: Supplier }>(`/suppliers/${id}`, { method: 'PATCH', body: { supplier } }),
}

export interface NewPurchaseOrder {
  supplier_id: number
  notes?: string
  items: { product_id: number; quantity: number; unit_price: number }[]
}

export interface ReceptionItem {
  id: number
  lot_number: string
  expiration_date: string
  location?: string
}

type OrderResponse = { message?: string; data: PurchaseOrder }

export const ordersApi = {
  list: (filters: { status?: OrderStatus | ''; supplier_id?: number | string; page?: number; per_page?: number }) =>
    apiRequest<Paginated<PurchaseOrder>>('/purchase_orders', { query: { ...filters } }),
  get: (id: number | string) => apiRequest<OrderResponse>(`/purchase_orders/${id}`).then((r) => r.data),
  create: (order: NewPurchaseOrder) =>
    apiRequest<OrderResponse>('/purchase_orders', { method: 'POST', body: { purchase_order: order } }),
  send: (id: number) => apiRequest<OrderResponse>(`/purchase_orders/${id}/send`, { method: 'PATCH' }),
  cancel: (id: number) => apiRequest<OrderResponse>(`/purchase_orders/${id}/cancel`, { method: 'PATCH' }),
  receive: (id: number, items: ReceptionItem[]) =>
    apiRequest<OrderResponse>(`/purchase_orders/${id}/receive`, { method: 'POST', body: { purchase_order: { items } } }),
}
