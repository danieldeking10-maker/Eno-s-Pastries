import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { cookies } from 'next/headers'
import { createSessionCookieValue, hasAuthSecret, isAdminEmail, readSessionCookieValue } from '@/lib/auth'

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
    response.cookies.set('auth_session', createSessionCookieValue({ email: signedInUser.email, role: 'ADMIN' }), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 8 * 60 * 60,
    })
    return response
  } catch {
    return NextResponse.json({ error: 'Admin authentication is not configured' }, { status: 503 })
  }
}