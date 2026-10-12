'use client'

import { createClient, SupabaseClient } from '@supabase/supabase-js'

const DEFAULT_URL = 'https://vfolwsqdizcnmpowptko.supabase.co'
const DEFAULT_KEY = 'sb_publishable_sdoHVJ7PCqg4SM4h5b9-uQ_8W2rUdk9'

let browserClient: SupabaseClient | null = null

/**
 * Sanitizes and validates a Supabase project URL for browser execution.
 * Guarantees a valid http(s) origin, falling back to the known project URL if invalid or missing.
 */
export function sanitizeSupabaseUrl(rawUrl?: string | null): string {
  if (!rawUrl) return DEFAULT_URL
  let clean = String(rawUrl).replace(/[\s'"\r\n]/g, '').trim()
  if (!clean || clean === 'undefined' || clean === 'null') return DEFAULT_URL

  // Prepend https:// if domain was passed without protocol
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    if (clean.includes('.')) {
      clean = `https://${clean}`
    } else {
      return DEFAULT_URL
    }
  }

  // Remove trailing slashes
  clean = clean.replace(/\/+$/, '')

  try {
    const parsed = new URL(clean)
    if (!parsed.protocol.startsWith('http') || !parsed.hostname) {
      return DEFAULT_URL
    }
    return parsed.origin
  } catch {
    return DEFAULT_URL
  }
}

/**
 * Sanitizes and validates a Supabase publishable / anon key.
 */
export function sanitizeSupabaseKey(rawKey?: string | null): string {
  if (!rawKey) return DEFAULT_KEY
  const clean = String(rawKey).replace(/[\s'"\r\n]/g, '').trim()
  if (!clean || clean === 'undefined' || clean === 'null' || clean.length < 20) {
    return DEFAULT_KEY
  }
  return clean
}

export function getSupabaseBrowserClient(): SupabaseClient {
  if (browserClient) return browserClient

  const url = sanitizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)
  const key = sanitizeSupabaseKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

  try {
    browserClient = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
    })
  } catch (err) {
    console.warn('[Supabase Browser] Client initialization warning with provided credentials, falling back to default:', err)
    browserClient = createClient(DEFAULT_URL, DEFAULT_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
    })
  }

  return browserClient
}