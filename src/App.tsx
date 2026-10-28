import { Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { Layout } from './components/Layout'
import { DashboardPage } from './pages/DashboardPage'
import { ExpirationsPage } from './pages/ExpirationsPage'
import { LoginPage } from './pages/LoginPage'
import { MovementsPage } from './pages/MovementsPage'
import { NewMovementPage } from './pages/NewMovementPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { OrderDetailPage } from './pages/OrderDetailPage'
import { OrderNewPage } from './pages/OrderNewPage'
import { OrdersPage } from './pages/OrdersPage'
import { ProductDetailPage } from './pages/ProductDetailPage'
import { ProductsPage } from './pages/ProductsPage'
import { SupplierDetailPage } from './pages/SupplierDetailPage'
import { SupplierFormPage } from './pages/SupplierFormPage'
import { SuppliersPage } from './pages/SuppliersPage'

/** Mapa de pantallas (ver docs/checkpoint.md en el back-end). */
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="productos" element={<ProductsPage />} />
          <Route path="productos/:id" element={<ProductDetailPage />} />
          <Route path="vencimientos" element={<ExpirationsPage />} />
          <Route path="movimientos" element={<MovementsPage />} />
          <Route path="movimientos/nuevo" element={<NewMovementPage />} />
          <Route path="proveedores" element={<SuppliersPage />} />
          <Route path="proveedores/nuevo" element={<SupplierFormPage />} />
          <Route path="proveedores/:id" element={<SupplierDetailPage />} />
          <Route path="proveedores/:id/editar" element={<SupplierFormPage />} />
          <Route path="ordenes" element={<OrdersPage />} />
          <Route path="ordenes/nueva" element={<OrderNewPage />} />
          <Route path="ordenes/:id" element={<OrderDetailPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  )
}
