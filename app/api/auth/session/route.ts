import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { readSessionCookieValue, readAdminSessionCookieValue } from '@/lib/auth'
import { isAdminEmail } from '@/lib/admin-access'

export const dynamic = 'force-dynamic'

export async function GET() {
  const cookieStore = await cookies()
  const authSession = readSessionCookieValue(cookieStore.get('auth_session')?.value)
  const adminSession = readAdminSessionCookieValue(cookieStore.get('admin_session')?.value)
<<<<<<< HEAD
  
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
=======

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
>>>>>>> fa1e5daf740243493ffb201daae84fd8baadd0fd
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}