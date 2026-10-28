import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { roleLabel } from '../lib/labels'

const links = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/productos', label: 'Productos' },
  { to: '/vencimientos', label: 'Vencimientos' },
  { to: '/movimientos', label: 'Movimientos' },
  { to: '/proveedores', label: 'Proveedores' },
  { to: '/ordenes', label: 'Órdenes de compra' },
]

function Brand() {
  return (
    <span className="text-xl font-bold">
      <span aria-hidden="true" className="text-slate-900">
        [+]{' '}
      </span>
      <span className="text-brand-700">Farma-Check</span>
    </span>
  )
}

/** Estructura general: barra lateral en escritorio y menú colapsable en celulares. */
export function Layout() {
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  const nav = (
    <nav aria-label="Principal">
      <ul className="space-y-1">
        {links.map((link) => (
          <li key={link.to}>
            <NavLink
              to={link.to}
              end={link.end}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `block rounded px-3 py-2 text-base ${isActive ? 'bg-brand-100 font-bold text-brand-900' : 'text-slate-800 hover:bg-slate-200'}`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && <span aria-hidden="true">» </span>}
                  {link.label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )

  const userBox = user && (
    <div className="text-sm text-slate-700">
      <p className="truncate" title={user.email}>
        {user.email}
      </p>
      <p>Rol: {roleLabel[user.role]}</p>
      <button type="button" onClick={() => void logout()} className="mt-1 underline hover:text-slate-900">
        Cerrar sesión
      </button>
    </div>
  )

  return (
    <div className="min-h-screen bg-white lg:flex">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:p-2">
        Saltar al contenido
      </a>

      {/* Barra superior en celulares */}
      <header className="flex items-center justify-between border-b border-slate-300 bg-slate-50 px-4 py-3 lg:hidden">
        <button
          type="button"
          className="rounded p-2 text-2xl leading-none"
          aria-expanded={menuOpen}
          aria-controls="menu-movil"
          aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? '✕' : '☰'}
        </button>
        <Brand />
        <button type="button" className="text-sm text-slate-700 underline" onClick={() => void logout()}>
          Salir
        </button>
      </header>
      {menuOpen && (
        <div id="menu-movil" className="border-b border-slate-300 bg-slate-50 px-4 py-4 lg:hidden">
          {nav}
          <div className="mt-4 border-t border-slate-300 pt-4">{userBox}</div>
        </div>
      )}

      {/* Barra lateral en escritorio */}
      <aside className="hidden w-64 shrink-0 flex-col gap-8 border-r-2 border-slate-800 bg-slate-50 px-5 py-6 lg:flex">
        <Brand />
        {nav}
        {userBox}
      </aside>

      <main id="contenido" tabIndex={-1} className="min-w-0 flex-1 px-4 py-6 sm:px-8">
        <Outlet />
      </main>
    </div>
  )
}
