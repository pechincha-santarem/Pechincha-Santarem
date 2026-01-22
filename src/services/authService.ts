import { supabase } from '../lib/supabaseClient'
import { UserRole } from '../types'

export type Profile = {
  id: string
  name: string | null
  role: string
  status?: 'active' | 'blocked'
}

type LoginResult =
  | { success: true; profile: Profile }
  | { success: false; message: string }

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms))
}

export const authService = {
  // Sessão atual do Supabase
  getSession: async () => {
    const { data } = await supabase.auth.getSession()
    return data.session
  },

  // Retorna o profile do usuário logado
  getMyProfile: async (): Promise<Profile | null> => {
    const { data: sessionData } = await supabase.auth.getSession()
    const user = sessionData.session?.user
    if (!user) return null

    // tentativa 1
    let { data, error } = await supabase
      .from('profiles')
      .select('id, name, role, status')
      .eq('id', user.id)
      .single<Profile>()

    // retry 1x (para 500 intermitente)
    if (error) {
      await sleep(250)
      const retry = await supabase
        .from('profiles')
        .select('id, name, role, status')
        .eq('id', user.id)
        .single<Profile>()

      data = retry.data
      error = retry.error
    }

    if (error) return null
    return data ?? null
  },

  // Login ADMIN: email/senha + valida role
  loginAdmin: async (email: string, password: string): Promise<LoginResult> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: (email || '').trim().toLowerCase(),
      password: (password || '').trim(),
    })

    if (error || !data.user) {
  const msg = (error?.message || '').trim()
  return { success: false, message: msg || 'Email ou senha inválidos.' }
}

  // garante sessão válida
    const { data: userData, error: uErr } = await supabase.auth.getUser()
    const uid = userData.user?.id

    if (uErr || !uid) {
      await supabase.auth.signOut()
      return { success: false, message: 'Falha ao validar sessão. Faça login novamente.' }
    }

    // tenta profile 1x + retry
    let { data: profile, error: pErr } = await supabase
      .from('profiles')
      .select('id, role, name, status')
      .eq('id', uid)
      .single<Profile>()

    if (pErr) {
      await sleep(250)
      const retry = await supabase
        .from('profiles')
        .select('id, role, name, status')
        .eq('id', uid)
        .single<Profile>()
      profile = retry.data
      pErr = retry.error
    }

    if (pErr || !profile) {
      await supabase.auth.signOut()
      return { success: false, message: 'Seu usuário não possui perfil configurado.' }
    }

    if ((profile.status ?? 'active') !== 'active') {
      await supabase.auth.signOut()
      return { success: false, message: 'Conta bloqueada.' }
    }

    const dbRole = String(profile.role || '').trim().toLowerCase()
    if (dbRole !== 'admin') {
      await supabase.auth.signOut()
      return { success: false, message: 'Acesso negado. Esta conta não é ADMIN.' }
    }

    return { success: true, profile }
  },

  // Login PARCEIRO: email/senha + valida role
  loginPartner: async (email: string, password: string): Promise<LoginResult> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: (email || '').trim().toLowerCase(),
      password: (password || '').trim(),
    })

    if (error || !data.user) {
  const msg = (error?.message || '').trim()
  // mostra erro real (ex: "Invalid login credentials")
  return { success: false, message: msg || 'E-mail ou senha incorretos.' }
}

// garante sessão válida
    const { data: userData, error: uErr } = await supabase.auth.getUser()
    const uid = userData.user?.id

    if (uErr || !uid) {
      await supabase.auth.signOut()
      return { success: false, message: 'Falha ao validar sessão. Faça login novamente.' }
    }

    // tenta profile 1x + retry
    let { data: profile, error: pErr } = await supabase
      .from('profiles')
      .select('id, role, name, status')
      .eq('id', uid)
      .single<Profile>()

    if (pErr) {
      await sleep(250)
      const retry = await supabase
        .from('profiles')
        .select('id, role, name, status')
        .eq('id', uid)
        .single<Profile>()
      profile = retry.data
      pErr = retry.error
    }

    // ✅ MUDANÇA CIRÚRGICA:
    // Se profiles falhar (500 intermitente), NÃO faz signOut.
    // Deixa a sessão existir e o RequireAuth deixa passar para área do parceiro.
    if (pErr || !profile) {
      return {
        success: true,
        profile: {
          id: uid,
          name: null,
          role: 'partner',
          status: 'active',
        },
      }
    }

    if ((profile.status ?? 'active') !== 'active') {
      await supabase.auth.signOut()
      return { success: false, message: 'Conta bloqueada. Fale com o administrador.' }
    }

    const dbRole = String(profile.role || '').trim().toLowerCase()
    if (dbRole !== 'partner') {
      await supabase.auth.signOut()
      return { success: false, message: 'Acesso negado. Esta conta não é de parceiro.' }
    }

    return { success: true, profile }
  },

  logout: async () => {
    await supabase.auth.signOut()
  },

  // Trocar senha (parceiro/admin)
  updatePassword: async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) return { success: false, message: error.message }
    return { success: true }
  },

    // Compatibilidade (Layout e outras telas)
  // Compatibilidade (Layout e outras telas)
getCurrentSession: async () => {
  const { data } = await supabase.auth.getSession()
  const user = data.session?.user
  if (!user) return null

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, name, role, status')
    .eq('id', user.id)
    .single<Profile>()

  // ✅ NÃO derruba sessão por falha no profiles
  if (error || !profile) {
    return {
      role: 'partner' as UserRole, // fallback pra não expulsar
      userId: user.id,
      userName: undefined,
      email: user.email ?? undefined,
    }
  }

  return {
    role: (String(profile.role || '').trim().toLowerCase() as UserRole),
    userId: profile.id,
    userName: profile.name ?? undefined,
    email: user.email ?? undefined,
  }
},

  initialize: () => {
    // não faz nada no Supabase (era usado no localStorage)
  },
}
