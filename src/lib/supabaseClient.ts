import { createClient, SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

declare global {
  // eslint-disable-next-line no-var
  var __pechincha_supabase__: SupabaseClient | undefined
}

export const supabase =
  globalThis.__pechincha_supabase__ ??
  (globalThis.__pechincha_supabase__ = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'pechincha_santarem_auth',
      storage: localStorage,
    },
  }))
