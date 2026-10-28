import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './useAuth'

/** Rutas que requieren sesión: sin token redirige al login y recuerda a dónde quería ir. */
export function ProtectedRoute() {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }
  return <Outlet />
}

/** Muestra el contenido solo a administradores (las acciones de admin se ocultan al empleado). */
export function AdminOnly({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  const { isAdmin } = useAuth()
  return <>{isAdmin ? children : fallback}</>
}
