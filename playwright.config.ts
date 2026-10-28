import { defineConfig, devices } from '@playwright/test'

// E2E contra la API real: requiere el back-end corriendo en http://localhost:3000 con los seeds cargados
// (ver README). Vite se levanta solo si no está corriendo.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    locale: 'es-AR',
  },
  projects: [
    { name: 'escritorio', use: { ...devices['Desktop Chrome'] }, grepInvert: /@mobile/ },
    { name: 'celular', use: { ...devices['Pixel 7'] }, grep: /@mobile/ },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
