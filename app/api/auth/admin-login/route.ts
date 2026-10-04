import { NextResponse } from 'next/server'
import { createAdminSessionCookieValue, getAdminSessionEmail, verifyAdminPasscode } from '@/lib/auth'
import { isAdminEmail } from '@/lib/admin-access'
import { supabase } from '@/lib/supabase'

const ADMIN_SESSION_MAX_AGE = 8 * 60 * 60

export async function GET(request: Request) {
  const email = getAdminSessionEmail(request)
  if (!email) {
    return NextResponse.json({ authorized: false }, { status: 401 })
  }

  return NextResponse.json({ authorized: true, email })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const accessToken = String(body?.access_token ?? '')
  const passcode = String(body?.passcode ?? '')

  if (!verifyAdminPasscode(passcode)) {
    return NextResponse.json({ error: 'Incorrect admin passcode.' }, { status: 401 })
  }

  if (!accessToken) {
    return NextResponse.json({ error: 'Sign in with an approved admin account first.' }, { status: 401 })
  }

  const { data: { user }, error } = await supabase.auth.getUser(accessToken)
  if (error || !user?.email) {
    return NextResponse.json({ error: 'Your Supabase session is invalid or expired.' }, { status: 401 })
  }

  if (!isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'This account is not authorized for the admin panel.' }, { status: 403 })
  }

  const response = NextResponse.json({ authorized: true, email: user.email })
  response.cookies.set('admin_session', createAdminSessionCookieValue(user.email), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: ADMIN_SESSION_MAX_AGE,
  })

  return response
}