'use client'

import { createClient, SupabaseClient } from '@supabase/supabase-js'

let browserClient: SupabaseClient | null = null

/**
 * Returns a singleton Supabase client safe for use in browser/client components.
 * Uses NEXT_PUBLIC_* environment variables with fallback to project config.
 */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (browserClient) return browserClient

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vfolwsqdizcnmpowptko.supabase.co'
  const url = rawUrl.replace(/['"\r\n\s]/g, '').replace(/\/+$/, '')
  const key = (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'sb_publishable_sdoHVJ7PCqg4SM4h5b9-uQ_8W2rUdk9'
  ).replace(/['"\r\n\s]/g, '')

  browserClient = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  })

  return browserClient
}
