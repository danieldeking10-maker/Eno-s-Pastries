import { NextResponse } from 'next/server'
import crypto from 'crypto'
import prisma from '@/lib/prisma'
import { createSessionCookieValue, hashPassword, hasAuthSecret, isAdminEmail } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function POST(request: Request) {
  if (!hasAuthSecret()) {
    return NextResponse.json({ error: 'Authentication is not configured' }, { status: 503 })
  }

  const body = await request.json().catch(() => ({}))
  const accessToken = typeof body?.access_token === 'string' ? body.access_token : ''
  if (!accessToken) {
    return NextResponse.json({ error: 'Google sign-in session is missing' }, { status: 401 })
  }

  const { data: { user }, error } = await supabase.auth.getUser(accessToken)
  if (error || !user?.email) {
    return NextResponse.json({ error: 'Google sign-in could not be verified' }, { status: 401 })
  }

  const email = user.email.trim().toLowerCase()
  const name = String(user.user_metadata?.full_name || user.user_metadata?.name || '').trim()

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      if (existingUser.role === 'ADMIN' && !isAdminEmail(email)) {
        await prisma.user.update({ where: { email }, data: { role: 'CUSTOMER' } })
      }
    } else {
      await prisma.user.create({
        data: {
          email,
          name: name || email.split('@')[0],
          password: hashPassword(crypto.randomBytes(32).toString('hex')),
          role: 'CUSTOMER',
        },
      })
    }

    const response = NextResponse.json({ ok: true, canAccessAdmin: isAdminEmail(email) })
    response.cookies.set('auth_session', createSessionCookieValue({ email, role: 'CUSTOMER' }), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 8 * 60 * 60,
    })
    return response
  } catch (reason) {
    console.error('Google account sync failed:', reason)
    return NextResponse.json({ error: 'Could not finish setting up your account' }, { status: 500 })
  }
}