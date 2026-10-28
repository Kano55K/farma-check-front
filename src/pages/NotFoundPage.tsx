import { useEffect } from 'react'
import { Link } from 'react-router-dom'

export function NotFoundPage({ what = 'La página' }: { what?: string }) {
  useEffect(() => {
    document.title = 'No encontrado · Farma-Check'
  }, [])
  return (
    <section className="mx-auto max-w-lg py-16 text-center">
      <p className="text-6xl font-bold text-slate-300" aria-hidden="true">
        404
      </p>
      <h1 className="mt-4 text-2xl font-bold">{what} que buscás no existe</h1>
      <p className="mt-2 text-slate-600">Puede que el enlace esté mal escrito o que el registro haya sido eliminado.</p>
      <Link to="/" className="btn-primary mt-6">
        Volver al inicio
      </Link>
    </section>
  )
}
