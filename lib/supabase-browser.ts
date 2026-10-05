'use client'

import { createClient, SupabaseClient } from '@supabase/supabase-js'

let browserClient: SupabaseClient | null = null

export function getSupabaseBrowserClient() {
  if (browserClient) return browserClient

  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vfolwsqdizcnmpowptko.supabase.co')
    .replace(/[\s'"\r\n]/g, '')
    .replace(/\/+$/, '')
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_sdoHVJ7PCqg4SM4h5b9-uQ_8W2rUdk9')
    .replace(/[\s'"\r\n]/g, '')

  browserClient = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  })

  return browserClient
}