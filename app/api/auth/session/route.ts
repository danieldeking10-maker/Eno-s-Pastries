import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { readSessionCookieValue, readAdminSessionCookieValue } from '@/lib/auth'
import { isAdminEmail } from '@/lib/admin-access'

export const dynamic = 'force-dynamic'

export async function GET() {
  const cookieStore = await cookies()
  const authSession = readSessionCookieValue(cookieStore.get('auth_session')?.value)
  const adminSession = readAdminSessionCookieValue(cookieStore.get('admin_session')?.value)
  
  const effectiveEmail = authSession?.email?.trim().toLowerCase() || adminSession?.email?.trim().toLowerCase() || null
  const isAdmin = !!effectiveEmail && isAdminEmail(effectiveEmail)
  const isFullyAdmin = isAdmin && (authSession?.role === 'ADMIN' || adminSession?.role === 'ADMIN')

  return NextResponse.json(
    {
      signedIn: !!(authSession || adminSession),
      email: effectiveEmail,
      role: authSession?.role || adminSession?.role || 'CUSTOMER',
      isAdmin,
      canAccessAdmin: isAdmin,
      authenticated: isFullyAdmin,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}