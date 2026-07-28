import { NextResponse } from 'next/server'
import { createSessionCookieValue, hashPassword } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const email = String(body?.email ?? '').trim().toLowerCase()
    const password = String(body?.password ?? '')
    const name = String(body?.name ?? '').trim()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    if (password.length < 4) {
      return NextResponse.json({ error: 'Password must be at least 4 characters long' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists. Please sign in.' }, { status: 409 })
    }

    const storedPassword = hashPassword(password)

    const user = await prisma.user.create({
      data: {
        email,
        name: name || email.split('@')[0],
        password: storedPassword,
        role: 'ADMIN',
      },
      select: { id: true, email: true, role: true, name: true },
    })

    const sessionCookie = createSessionCookieValue({ email: user.email, role: user.role })
    const res = NextResponse.json({ ok: true, userId: user.id, role: user.role })
    res.cookies.set('auth_session', sessionCookie, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
    })

    return res
  } catch (e) {
    console.error('Signup error:', e)
    return NextResponse.json({ error: 'Signup failed. Please try again.' }, { status: 500 })
  }
}


