import { createClient, SupabaseClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const DEFAULT_URL = 'https://vfolwsqdizcnmpowptko.supabase.co'
const DEFAULT_KEY = 'sb_publishable_sdoHVJ7PCqg4SM4h5b9-uQ_8W2rUdk9'

// Helper to safely read from .env file in server-side Node runtime
function readEnvKey(key: string): string {
  if (typeof window !== 'undefined') return ''
  try {
    const envPath = path.resolve(process.cwd(), '.env')
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8')
      const lines = content.split('\n')
      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed && !trimmed.startsWith('#') && trimmed.startsWith(key + '=')) {
          return trimmed.substring(key.length + 1).replace(/['"\r]/g, '').trim()
        }
      }
    }
  } catch {}
  return ''
}

// 1. Sanitize and resolve Project URL
let resolvedUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/['"\r\n\s]/g, '').trim()
if (!resolvedUrl || (!resolvedUrl.startsWith('http://') && !resolvedUrl.startsWith('https://'))) {
  const fromFile = readEnvKey('NEXT_PUBLIC_SUPABASE_URL')
  if (fromFile && (fromFile.startsWith('http://') || fromFile.startsWith('https://'))) {
    resolvedUrl = fromFile.replace(/\/+$/, '')
  } else {
    resolvedUrl = DEFAULT_URL
  }
} else {
  resolvedUrl = resolvedUrl.replace(/\/+$/, '')
}

export const supabaseUrl = resolvedUrl

// 2. Sanitize and resolve Anonymous / Publishable Key
let resolvedKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').replace(/['"\r\n\s]/g, '').trim()
if (!resolvedKey || resolvedKey.length < 20) {
  const fromFile = readEnvKey('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  if (fromFile && fromFile.length >= 20) {
    resolvedKey = fromFile
  } else {
    resolvedKey = DEFAULT_KEY
  }
}

// Helper to validate service role keys (must be valid JWT or sb_secret_)
function isValidServiceRoleKey(key: string): boolean {
  if (!key || key.length < 30) return false
  if (key.startsWith('sb_secret_') || key.startsWith('sbp_')) return true
  const parts = key.split('.')
  return parts.length === 3 && parts[0].startsWith('ey')
}

// 3. Administrative / Service Role Client (bypasses RLS on server-side)
let rawServiceRoleKey = (
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  ''
).replace(/['"\r\n\s]/g, '').trim()

// If process.env is stale or invalid, prioritize the valid key from .env file
if (!isValidServiceRoleKey(rawServiceRoleKey)) {
  const fromFile = readEnvKey('SUPABASE_SERVICE_ROLE_KEY') || readEnvKey('SUPABASE_SECRET_KEY')
  if (isValidServiceRoleKey(fromFile)) {
    rawServiceRoleKey = fromFile
  }
}

const serviceRoleKey = isValidServiceRoleKey(rawServiceRoleKey) ? rawServiceRoleKey : ''

if (rawServiceRoleKey && !serviceRoleKey) {
  console.warn(
    '[Supabase Config Notice] SUPABASE_SERVICE_ROLE_KEY is set but does not appear to be a valid JWT secret. Falling back to anon key.'
  )
}

// Standard public/anon client
export const supabase: SupabaseClient = createClient(resolvedUrl, resolvedKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

// Administrative Supabase client
export const supabaseAdmin: SupabaseClient | null = serviceRoleKey
  ? createClient(resolvedUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null

// Configured cart sessions bucket
export const SUPABASE_CART_BUCKET: string = (
  process.env.SUPABASE_CART_BUCKET ||
  readEnvKey('SUPABASE_CART_BUCKET') ||
  'cart-sessions'
).replace(/['"\r\n\s]/g, '').trim() || 'cart-sessions'

/**
 * Returns the administrative Supabase client if configured and valid,
 * otherwise falls back to the standard anonymous client.
 */
export function getSupabaseClient(): SupabaseClient {
  return supabaseAdmin || supabase
}

export function hasServiceRole(): boolean {
  return !!supabaseAdmin
}
