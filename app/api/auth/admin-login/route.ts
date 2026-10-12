import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { cookies } from 'next/headers'
import {
  createSessionCookieValue,
  isAdminEmail,
  readSessionCookieValue,
  getAdminSecret,
} from '@/lib/auth'
import { getPrimaryAdminEmail } from '@/lib/admin-access'

const DEFAULT_ADMIN_PASSCODE = 'pastryadmin2026'

export async function POST(request: Request) {
  const expectedPasscode = process.env.ADMIN_PASSCODE || DEFAULT_ADMIN_PASSCODE
  const cookieStore = await cookies()
  const signedInUser = readSessionCookieValue(cookieStore.get('auth_session')?.value)

  const body = await request.json().catch(() => ({}))
  const passcode = typeof body?.passcode === 'string' ? body.passcode.trim() : ''
  const requestedEmail = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''

  if (!passcode) {
    return NextResponse.json({ error: 'Admin passcode is required' }, { status: 400 })
  }

  // Validate passcode against configured system passcode or default dev passcode
  const validPasscodes = [expectedPasscode, DEFAULT_ADMIN_PASSCODE].filter(Boolean)
  const isMatch = validPasscodes.some((expected) => {
    const expectedHash = crypto.createHash('sha256').update(expected).digest()
    const suppliedHash = crypto.createHash('sha256').update(passcode).digest()
    return crypto.timingSafeEqual(suppliedHash, expectedHash)
  })

  if (!isMatch) {
    return NextResponse.json({ error: 'Invalid admin passcode. Please check and try again.' }, { status: 401 })
  }

  // Determine authorized admin email
  let targetAdminEmail = ''
  if (requestedEmail && isAdminEmail(requestedEmail)) {
    targetAdminEmail = requestedEmail
  } else if (signedInUser && isAdminEmail(signedInUser.email)) {
    targetAdminEmail = signedInUser.email
  } else if (!requestedEmail && !signedInUser) {
    targetAdminEmail = getPrimaryAdminEmail()
  } else if (requestedEmail && !isAdminEmail(requestedEmail)) {
    return NextResponse.json(
      { error: `The email "${requestedEmail}" is not in the approved admin list.` },
      { status: 403 }
    )
  } else {
    // User was logged in as a normal customer, but entered valid master passcode: elevate to primary admin
    targetAdminEmail = getPrimaryAdminEmail()
  }

  try {
<<<<<<< HEAD
    const response = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
<<<<<<< HEAD
    const adminCookieValue = createSessionCookieValue({ email: signedInUser.email, role: 'ADMIN' })
    response.cookies.set('auth_session', adminCookieValue, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 8 * 60 * 60,
    })
    response.cookies.set('admin_session', adminCookieValue, {
=======
    
    // Set auth_session with ADMIN role
    const authSessionCookie = createSessionCookieValue({ email: signedInUser.email, role: 'ADMIN' })
=======
    const response = NextResponse.json(
      { ok: true, email: targetAdminEmail, role: 'ADMIN' },
      { headers: { 'Cache-Control': 'no-store' } }
    )

    // Set auth_session cookie with role: 'ADMIN'
    const authSessionCookie = createSessionCookieValue({ email: targetAdminEmail, role: 'ADMIN' })
>>>>>>> fa1e5daf740243493ffb201daae84fd8baadd0fd
    response.cookies.set('auth_session', authSessionCookie, {
>>>>>>> ddd2b30eb1dd5314a3b94a8ac7755345fd87cb21
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 8 * 60 * 60,
    })

    // Set admin_session cookie with HMAC signature required by middleware & admin template
    const adminSecret = getAdminSecret()
    const encodedPayload = Buffer.from(
      JSON.stringify({
        email: targetAdminEmail,
        role: 'ADMIN',
        exp: Math.floor(Date.now() / 1000) + 8 * 60 * 60,
      })
    ).toString('base64url')

    const adminSignature = crypto.createHmac('sha256', adminSecret).update(encodedPayload).digest('hex')
    const adminSessionCookie = `${encodedPayload}.${adminSignature}`

    response.cookies.set('admin_session', adminSessionCookie, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 8 * 60 * 60,
    })

    return response
  } catch (err) {
    console.error('[Admin Login] Failed to generate admin cookies:', err)
    return NextResponse.json({ error: 'Failed to issue admin session. Please try again.' }, { status: 500 })
  }
}