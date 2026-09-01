import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vfolwsqdizcnmpowptko.supabase.co/'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_sdoHVJ7PCqg4SM4h5b9-uQ_8W2rUdk9'

export const supabase = createClient(supabaseUrl, supabaseKey)
