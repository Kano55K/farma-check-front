import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ApiError, errorMessage } from '../api/client'
import { useAuth } from '../auth/useAuth'
import { FormError, TextField } from '../components/Field'

interface LocationState {
  from?: string
}

export function LoginPage() {
  const { user, login, notice } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const state = (location.state ?? {}) as LocationState
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    document.title = 'Iniciar sesión · Farma-Check'
  }, [])

  if (user) return <Navigate to={state.from ?? '/'} replace />

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (submitting) return
    const next: typeof fieldErrors = {}
    if (!email.trim()) next.email = 'Ingresá tu email'
    else if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = 'Ingresá un email válido'
    if (!password) next.password = 'Ingresá tu contraseña'
    setFieldErrors(next)
    setError(null)
    if (Object.keys(next).length > 0) return

    setSubmitting(true)
    try {
      await login(email.trim(), password)
      navigate(state.from ?? '/', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? 'Email o contraseña incorrectos.' : errorMessage(err))
      setSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-md border border-slate-700 bg-white p-8 shadow-sm">
        <h1 className="text-center text-2xl font-bold">
          <span aria-hidden="true">[+] </span>
          <span className="text-brand-700">Farma-Check</span>
        </h1>
        <p className="mt-2 text-center text-slate-600">Ingresá con tu usuario de la farmacia</p>

        {notice && !error && (
          <div role="status" className="mt-6 rounded-md border border-amber-400 bg-amber-50 p-3 text-sm text-amber-950">
            {notice}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
          <FormError message={error} />
          <TextField
            label="Email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldErrors.email}
            placeholder="empleado@farma-check.com"
          />
          <TextField
            label="Contraseña"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldErrors.password}
          />
          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
      </div>
    </main>
  )
}
