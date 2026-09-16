import { createClient, SupabaseClient } from '@supabase/supabase-js'

const DEFAULT_URL = 'https://vfolwsqdizcnmpowptko.supabase.co'
const DEFAULT_KEY = 'sb_publishable_sdoHVJ7PCqg4SM4h5b9-uQ_8W2rUdk9'

// 1. Sanitize and resolve Project URL
let resolvedUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/['"\r\n\s]/g, '').trim()
if (!resolvedUrl || (!resolvedUrl.startsWith('http://') && !resolvedUrl.startsWith('https://'))) {
  resolvedUrl = DEFAULT_URL
} else {
  resolvedUrl = resolvedUrl.replace(/\/+$/, '')
}

// 2. Sanitize and resolve Anonymous / Publishable Key
let resolvedKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').replace(/['"\r\n\s]/g, '').trim()
if (!resolvedKey) {
  resolvedKey = DEFAULT_KEY
}

// Standard public/anon client
export const supabase: SupabaseClient = createClient(resolvedUrl, resolvedKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

// 3. Optional Administrative / Service Role Client (bypasses RLS on server-side)
const serviceRoleKey = (
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  ''
).replace(/['"\r\n\s]/g, '').trim()

export const supabaseAdmin: SupabaseClient | null = serviceRoleKey
  ? createClient(resolvedUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null

/**
 * Returns the administrative Supabase client if configured,
 * otherwise falls back to the standard anonymous client.
 */
export function getSupabaseClient(): SupabaseClient {
  return supabaseAdmin || supabase
}

export function hasServiceRole(): boolean {
  return !!supabaseAdmin
}
