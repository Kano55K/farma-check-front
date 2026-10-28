import { Component, type ErrorInfo, type ReactNode } from 'react'

interface State {
  error: Error | null
}

/** Página de error genérica para fallas inesperadas de la interfaz. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Error no controlado en la interfaz', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <main role="alert" className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Algo salió mal</h1>
        <p className="mt-2 text-slate-600">Ocurrió un error inesperado en la aplicación. Podés reintentar o volver al inicio.</p>
        <div className="mt-6 flex justify-center gap-3">
          <button type="button" className="btn-primary" onClick={() => this.setState({ error: null })}>
            Reintentar
          </button>
          <a href="/" className="btn-secondary">
            Ir al inicio
          </a>
        </div>
      </main>
    )
  }
}
