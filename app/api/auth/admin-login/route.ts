import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createSessionCookieValue, hasAuthSecret } from '@/lib/auth'

export async function POST(request: Request) {
  const expectedPasscode = process.env.ADMIN_PASSCODE || ''
  if (!hasAuthSecret() || expectedPasscode.length < 16) {
    return NextResponse.json({ error: 'Admin authentication is not configured' }, { status: 503 })
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
    response.cookies.set('auth_session', createSessionCookieValue({ email: 'admin', role: 'ADMIN' }), {
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