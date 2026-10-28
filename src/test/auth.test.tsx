import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { clearSession } from '../auth/session'
import { renderApp } from './render'
import { API, server } from './server'

describe('Inicio de sesión', () => {
  it('con credenciales correctas entra al inicio y muestra los indicadores', async () => {
    clearSession()
    const user = userEvent.setup()
    renderApp('/login')

    await user.type(screen.getByLabelText('Email'), 'empleado@farma-check.com')
    await user.type(screen.getByLabelText('Contraseña'), 'demo1234')
    await user.click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(await screen.findByRole('heading', { name: 'Inicio' })).toBeInTheDocument()
    expect(await screen.findByText('Productos', { selector: 'p' })).toBeInTheDocument()
    expect(screen.getByText('25')).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('farma-check.session')!).token).toBe('token-de-prueba')
  })

  it('con credenciales incorrectas muestra el error de la API y no entra', async () => {
    clearSession()
    const user = userEvent.setup()
    renderApp('/login')

    await user.type(screen.getByLabelText('Email'), 'empleado@farma-check.com')
    await user.type(screen.getByLabelText('Contraseña'), 'mala')
    await user.click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Email o contraseña incorrectos.')
    expect(screen.getByRole('button', { name: 'Ingresar' })).toBeEnabled()
    expect(localStorage.getItem('farma-check.session')).toBeNull()
  })

  it('valida los campos antes de llamar a la API', async () => {
    clearSession()
    const user = userEvent.setup()
    renderApp('/login')

    await user.click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(screen.getByText('Ingresá tu email')).toBeInTheDocument()
    expect(screen.getByText('Ingresá tu contraseña')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
  })
})

describe('Rutas protegidas', () => {
  it('sin sesión redirige al login', async () => {
    clearSession()
    renderApp('/productos')
    expect(await screen.findByRole('button', { name: 'Ingresar' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Productos' })).not.toBeInTheDocument()
  })

  it('si la API responde 401 (token vencido) vuelve al login con aviso', async () => {
    server.use(
      http.get(`${API}/dashboard`, () =>
        HttpResponse.json({ error: { code: 'token_expired', message: 'La sesión expiró.', details: null } }, { status: 401 }),
      ),
    )
    renderApp('/', { loggedIn: true })

    expect(await screen.findByText('Tu sesión expiró. Iniciá sesión nuevamente.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ingresar' })).toBeInTheDocument()
    expect(localStorage.getItem('farma-check.session')).toBeNull()
  })
})
