import { NextResponse } from 'next/server'
import crypto from 'crypto'
import {
  createSessionCookieValue,
  verifyPassword,
  getAdminSecret,
} from '@/lib/auth'
import { isAdminEmail } from '@/lib/admin-access'
import prisma from '@/lib/prisma'
import { supabase } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const email = String(body?.email ?? '').trim().toLowerCase()
    const password = String(body?.password ?? '')

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    let user: any = null
    try {
      user = await prisma.user.findUnique({ where: { email } })
    } catch (dbErr) {
      console.warn('[Login] Prisma user lookup unavailable:', dbErr)
    }

    let authenticated = false
    const isUserAdmin = isAdminEmail(email)
    let role = isUserAdmin ? 'ADMIN' : 'CUSTOMER'

    if (user && user.password && verifyPassword(user.password, password)) {
      authenticated = true
      role = user.role || role
    } else {
      // Check Supabase Auth
      try {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (authData?.user && !authError) {
          authenticated = true
        }
      } catch (authEx) {
        console.warn('[Login] Supabase signInWithPassword notice:', authEx)
      }
    }

<<<<<<< HEAD
    const isAdmin = isAdminEmail(user.email)
    const role = isAdmin ? 'ADMIN' : (user.role || 'CUSTOMER')

    const sessionCookie = createSessionCookieValue({ email, role })
    const res = NextResponse.json({ ok: true, role, isAdmin, canAccessAdmin: isAdmin })
=======
    if (!authenticated) {
      return NextResponse.json(
        { error: 'Invalid email or password. Please check credentials or sign up.' },
        { status: 401 }
      )
    }

    const sessionCookie = createSessionCookieValue({ email, role })
    const res = NextResponse.json({ ok: true, role, canAccessAdmin: isUserAdmin })

>>>>>>> fa1e5daf740243493ffb201daae84fd8baadd0fd
    res.cookies.set('auth_session', sessionCookie, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 8 * 60 * 60,
    })
<<<<<<< HEAD
    if (isAdmin) {
      res.cookies.set('admin_session', sessionCookie, {
=======

    // If admin user, also provision admin_session cookie
    if (isUserAdmin) {
      const adminSecret = getAdminSecret()
      const encodedPayload = Buffer.from(
        JSON.stringify({
          email,
          role: 'ADMIN',
          exp: Math.floor(Date.now() / 1000) + 8 * 60 * 60,
        })
      ).toString('base64url')
      const adminSignature = crypto.createHmac('sha256', adminSecret).update(encodedPayload).digest('hex')
      res.cookies.set('admin_session', `${encodedPayload}.${adminSignature}`, {
>>>>>>> fa1e5daf740243493ffb201daae84fd8baadd0fd
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 8 * 60 * 60,
      })
    }
<<<<<<< HEAD
=======

>>>>>>> fa1e5daf740243493ffb201daae84fd8baadd0fd
    return res
  } catch (e) {
    console.error('Login error:', e)
    return NextResponse.json({ error: 'Login failed. Please try again.' }, { status: 500 })
  }
}
