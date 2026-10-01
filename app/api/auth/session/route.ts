import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { readSessionCookieValue } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const cookieStore = await cookies()
  const session = readSessionCookieValue(cookieStore.get('auth_session')?.value)
  return NextResponse.json(
    { authenticated: session?.role === 'ADMIN' },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}