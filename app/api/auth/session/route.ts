import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { readSessionCookieValue, readAdminSessionCookieValue } from '@/lib/auth'
import { isAdminEmail } from '@/lib/admin-access'

export const dynamic = 'force-dynamic'

export async function GET() {
  const cookieStore = await cookies()
  const authSession = readSessionCookieValue(cookieStore.get('auth_session')?.value)
  const adminSession = readAdminSessionCookieValue(cookieStore.get('admin_session')?.value)

  const activeEmail = authSession?.email || adminSession?.email || null
  const isAuthAdmin =
    (authSession?.role === 'ADMIN' && isAdminEmail(authSession.email)) ||
    (adminSession?.role === 'ADMIN' && isAdminEmail(adminSession.email))

  const canAccessAdmin = isAuthAdmin || (!!activeEmail && isAdminEmail(activeEmail))

  return NextResponse.json(
    {
      authenticated: isAuthAdmin,
      signedIn: !!authSession || !!adminSession,
      canAccessAdmin,
      email: activeEmail,
      role: authSession?.role || adminSession?.role || 'CUSTOMER',
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}