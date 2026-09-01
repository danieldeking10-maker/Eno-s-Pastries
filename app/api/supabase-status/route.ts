import { NextResponse } from 'next/server'
import { checkSupabaseStatus } from '@/lib/supabase-service'

export const dynamic = 'force-dynamic'

export async function GET() {
  const status = await checkSupabaseStatus()
  return NextResponse.json(status)
}
