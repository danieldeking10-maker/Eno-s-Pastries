import { createClient } from '@supabase/supabase-js'

const DEFAULT_URL = 'https://vfolwsqdizcnmpowptko.supabase.co'
const DEFAULT_KEY = 'sb_publishable_sdoHVJ7PCqg4SM4h5b9-uQ_8W2rUdk9'

let resolvedUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
if (!resolvedUrl || (!resolvedUrl.startsWith('http://') && !resolvedUrl.startsWith('https://'))) {
  resolvedUrl = DEFAULT_URL
} else {
  resolvedUrl = resolvedUrl.replace(/\/+$/, '')
}

let resolvedKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()
if (!resolvedKey) {
  resolvedKey = DEFAULT_KEY
}

export const supabase = createClient(resolvedUrl, resolvedKey)
