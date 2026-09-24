import { NextResponse } from 'next/server'
import { checkSupabaseStatus } from '@/lib/supabase-service'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const status = await checkSupabaseStatus()
  return NextResponse.json(status, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
    },
  })
}

