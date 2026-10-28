import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ApiError, errorMessage } from '../api/client'
import { suppliersApi, type SupplierInput } from '../api/endpoints'
import { useAuth } from '../auth/useAuth'
import { FormError, TextField } from '../components/Field'
import { PageHeader } from '../components/PageHeader'
import { ErrorState, Loading } from '../components/States'
import { useToast } from '../components/useToast'
import type { FieldErrors, Supplier } from '../types/api'

const EMPTY: SupplierInput = { company_name: '', cuit: '', email: '', phone: '', contact_name: '' }

function toInput(s: Supplier): SupplierInput {
  return { company_name: s.company_name, cuit: s.cuit, email: s.email ?? '', phone: s.phone ?? '', contact_name: s.contact_name ?? '' }
}

/** Alta y edición de proveedores (solo administradores). */
export function SupplierFormPage() {
  const { id } = useParams()
  const { isAdmin } = useAuth()
  const existing = useQuery({ queryKey: ['supplier', id], queryFn: () => suppliersApi.get(id!), enabled: Boolean(id) && isAdmin })

  if (!isAdmin) return <Navigate to="/proveedores" replace />

  return (
    <>
      <PageHeader title={id ? 'Editar proveedor' : 'Nuevo proveedor'} />
      {id && existing.isPending && <Loading />}
      {existing.isError && <ErrorState error={existing.error} onRetry={() => void existing.refetch()} />}
      {!id && <SupplierForm initial={EMPTY} />}
      {id && existing.data && <SupplierForm key={existing.data.id} id={id} initial={toInput(existing.data)} />}
    </>
  )
}

function SupplierForm({ id, initial }: { id?: string; initial: SupplierInput }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { notify } = useToast()
  const [form, setForm] = useState<SupplierInput>(initial)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: (data: SupplierInput) => (id ? suppliersApi.update(id, data) : suppliersApi.create(data)),
    onSuccess: async (response) => {
      notify(response.message)
      await queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      await queryClient.invalidateQueries({ queryKey: ['supplier'] })
      navigate(`/proveedores/${response.data.id}`)
    },
    onError: (error) => {
      if (error instanceof ApiError && error.details) {
        setErrors(error.details)
        setFormError('Revisá los datos marcados.')
      } else setFormError(errorMessage(error))
    },
  })

  function set<K extends keyof SupplierInput>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (mutation.isPending) return
    const next: FieldErrors = {}
    if (!form.company_name.trim()) next.company_name = ['Ingresá la razón social']
    if (!/^\d{2}-\d{8}-\d$/.test(form.cuit.trim())) next.cuit = ['El CUIT debe tener el formato XX-XXXXXXXX-X']
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) next.email = ['Ingresá un email válido']
    setErrors(next)
    setFormError(null)
    if (Object.keys(next).length) return
    mutation.mutate({ ...form, company_name: form.company_name.trim(), cuit: form.cuit.trim() })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid max-w-2xl gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <FormError message={formError} />
      </div>
      <TextField label="Razón social" required value={form.company_name} onChange={(e) => set('company_name', e.target.value)} error={errors.company_name?.[0]} className="sm:col-span-2" />
      <TextField label="CUIT" required value={form.cuit} onChange={(e) => set('cuit', e.target.value)} error={errors.cuit?.[0]} hint="Formato XX-XXXXXXXX-X" placeholder="30-71234567-1" />
      <TextField label="Contacto" value={form.contact_name ?? ''} onChange={(e) => set('contact_name', e.target.value)} error={errors.contact_name?.[0]} />
      <TextField label="Teléfono" type="tel" value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} error={errors.phone?.[0]} />
      <TextField label="Email" type="email" value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} error={errors.email?.[0]} />
      <div className="flex gap-3 sm:col-span-2">
        <Link to={id ? `/proveedores/${id}` : '/proveedores'} className="btn-secondary">
          Cancelar
        </Link>
        <button type="submit" className="btn-primary" disabled={mutation.isPending}>
          {mutation.isPending ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </form>
  )
}
