import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { cookies } from 'next/headers'
import { createSessionCookieValue, hasAuthSecret, isAdminEmail, readSessionCookieValue, getAdminSecret } from '@/lib/auth'

export async function POST(request: Request) {
  const expectedPasscode = process.env.ADMIN_PASSCODE || ''
  if (!hasAuthSecret() || expectedPasscode.length < 8) {
    return NextResponse.json({ error: 'Admin authentication is not configured' }, { status: 503 })
  }

  const cookieStore = await cookies()
  const signedInUser = readSessionCookieValue(cookieStore.get('auth_session')?.value)
  if (!signedInUser || !isAdminEmail(signedInUser.email)) {
    return NextResponse.json({ error: 'This account is not allowed to access the admin panel' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const passcode = typeof body?.passcode === 'string' ? body.passcode : ''
  const expectedHash = crypto.createHash('sha256').update(expectedPasscode).digest()
  const suppliedHash = crypto.createHash('sha256').update(passcode).digest()

  if (!crypto.timingSafeEqual(suppliedHash, expectedHash)) {
    return NextResponse.json({ error: 'Invalid admin passcode' }, { status: 401 })
  }

  try {
    const response = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
    
    // Set auth_session with ADMIN role
    const authSessionCookie = createSessionCookieValue({ email: signedInUser.email, role: 'ADMIN' })
    response.cookies.set('auth_session', authSessionCookie, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 8 * 60 * 60,
    })
    
    // Also set admin_session cookie (required by middleware)
    const adminSecret = getAdminSecret()
    if (adminSecret) {
      const encodedPayload = Buffer.from(JSON.stringify({
        email: signedInUser.email,
        role: 'ADMIN',
        exp: Math.floor(Date.now() / 1000) + 8 * 60 * 60,
      })).toString('base64url')
      const adminSignature = crypto.createHmac('sha256', adminSecret).update(encodedPayload).digest('hex')
      const adminSessionCookie = `${encodedPayload}.${adminSignature}`
      response.cookies.set('admin_session', adminSessionCookie, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 8 * 60 * 60,
      })
    }
    
    return response
  } catch {
    return NextResponse.json({ error: 'Admin authentication is not configured' }, { status: 503 })
  }
}