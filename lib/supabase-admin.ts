import { createClient } from '@supabase/supabase-js'
import { supabaseUrl } from './supabase'

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

if (serviceRoleKey && (!serviceRoleKey.startsWith('eyJ') || serviceRoleKey.split('.').length !== 3)) {
  throw new Error(
    'SUPABASE_SERVICE_ROLE_KEY must be the JWT service_role key from Supabase Project Settings > API. Do not use the database password.',
  )
}

export const supabaseAdmin = serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null
