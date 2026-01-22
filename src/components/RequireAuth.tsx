import React, { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { authService } from '../services/authService'

type Role = 'admin' | 'partner' | 'customer'
type AccountStatus = 'active' | 'blocked'

type Props = {
  // ✅ novo: compatível com seu App.tsx (<RequireAuth role="partner">)
  role?: Role

  // ✅ mantém compatibilidade com o formato antigo
  allowedRoles?: Role[]

  children?: React.ReactNode
}

export default function RequireAuth({ role, allowedRoles, children }: Props) {
  const location = useLocation()

  // ✅ HashRouter: o caminho real fica no hash (#/rota)
  const path = (location.hash || '').replace('#', '') || '/'
  const isAdminRoute = path.startsWith('/admin')
  const isPartnerRoute = path.startsWith('/parceiro')

  const [ready, setReady] = useState(false)
  const [isAuthed, setIsAuthed] = useState(false)
  const [userRole, setUserRole] = useState<Role | null>(null)
  const [status, setStatus] = useState<AccountStatus | null>(null)

  const content = children ? <>{children}</> : <Outlet />

  // ✅ normaliza: se veio "role", vira allowedRoles = [role]
  const rolesToAllow: Role[] | undefined =
    role ? [role] : (allowedRoles && allowedRoles.length > 0 ? allowedRoles : undefined)

  async function resolveNow() {
    try {
      const session = await authService.getSession()

      if (!session?.user) {
        setIsAuthed(false)
        setUserRole(null)
        setStatus(null)
        setReady(true)
        return
      }

      setIsAuthed(true)

      const profile = await authService.getMyProfile()
      setUserRole((profile?.role as Role) ?? null)
      setStatus((profile?.status as AccountStatus) ?? null)

      setReady(true)
    } catch {
      setIsAuthed(true)
      setUserRole(null)
      setStatus(null)
      setReady(true)
    }
  }

  useEffect(() => {
    let mounted = true

    const run = async () => {
      if (!mounted) return
      await resolveNow()
    }

    run()

    const { data } = supabase.auth.onAuthStateChange(() => {
      run()
    })

    return () => {
      mounted = false
      data.subscription.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // não retornar null (evita tela branca)
  if (!ready) return content

  if (!isAuthed) {
    const to = isAdminRoute ? '/admin' : '/parceiro/login'
    return <Navigate to={to} replace state={{ from: location }} />
  }

  if (status === 'blocked') {
    const to = isAdminRoute ? '/admin' : '/parceiro/login'
    return <Navigate to={to} replace state={{ from: location }} />
  }

  // ✅ Admin exige role carregada (segurança)
  if (isAdminRoute) {
    if (!userRole) return <Navigate to="/admin" replace state={{ from: location }} />
  }

  // ✅ aplica regra (role OU allowedRoles)
  if (rolesToAllow && rolesToAllow.length > 0) {
    if (userRole && !rolesToAllow.includes(userRole)) {
      const to = isAdminRoute ? '/admin' : '/parceiro/login'
      return <Navigate to={to} replace state={{ from: location }} />
    }
  }

  // (opcional) se quiser garantir que rotas públicas não caiam aqui:
  if (!isAdminRoute && !isPartnerRoute) {
    return content
  }

  return content
}
