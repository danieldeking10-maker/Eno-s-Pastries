import { NextResponse } from 'next/server'
import { createSessionCookieValue, verifyPassword } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const email = String(body?.email ?? '').trim().toLowerCase()
    const password = String(body?.password ?? '')

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return NextResponse.json({ error: 'Account not found. Please create an account first.' }, { status: 404 })
    }

    if (!verifyPassword(user.password, password)) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const role = user.role || 'ADMIN'

    const sessionCookie = createSessionCookieValue({ email, role })
    const res = NextResponse.json({ ok: true, role })
    res.cookies.set('auth_session', sessionCookie, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
    })
    return res
  } catch (e) {
    console.error('Login error:', e)
    return NextResponse.json({ error: 'Login failed. Please try again.' }, { status: 500 })
  }
}


