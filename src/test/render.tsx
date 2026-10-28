import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AppRoutes } from '../App'
import { AppProviders } from '../AppProviders'
import { createQueryClient } from '../lib/queryClient'
import { saveSession } from '../auth/session'
import { employee } from './server'

/** Renderiza la app completa en una ruta, con o sin sesión iniciada. */
export function renderApp(path: string, { loggedIn = false } = {}) {
  if (loggedIn) {
    saveSession({ token: 'token-de-prueba', expiresAt: new Date(Date.now() + 3600_000).toISOString(), user: employee })
  }
  const queryClient = createQueryClient()
  queryClient.setDefaultOptions({ queries: { ...queryClient.getDefaultOptions().queries, retry: false } })
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppProviders queryClient={queryClient}>
        <AppRoutes />
      </AppProviders>
    </MemoryRouter>,
  )
}
