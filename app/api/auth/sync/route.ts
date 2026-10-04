import { NextResponse } from 'next/server'
import { createSessionCookieValue, isAdminEmail } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { supabase } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const accessToken = String(body?.access_token ?? '')

    if (!accessToken) {
      return NextResponse.json({ error: 'Supabase access token is required' }, { status: 401 })
    }

    const { data: { user }, error } = await supabase.auth.getUser(accessToken)
    if (error || !user?.email) {
      return NextResponse.json({ error: 'Invalid or expired Supabase session' }, { status: 401 })
    }

    const email = user.email.trim().toLowerCase()
    const name = String(user.user_metadata?.full_name || user.user_metadata?.name || '').trim()
    const isAdmin = isAdminEmail(email)
    const role = isAdmin ? 'ADMIN' : 'CUSTOMER'

    // Upsert user in Prisma database if database is configured
    try {
      await prisma.user.upsert({
        where: { email },
        update: {
          name: name || undefined,
          role,
        },
        create: {
          email,
          name: name || email.split('@')[0],
          password: 'oauth_managed',
          role,
        },
      })
    } catch (dbErr) {
      console.warn('[Auth Sync] Note: DB upsert skipped or non-fatal:', dbErr)
    }

    const sessionCookie = createSessionCookieValue({ email, role })
    const res = NextResponse.json({ ok: true, role, email })
    res.cookies.set('auth_session', sessionCookie, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
    })

    return res
  } catch (e: any) {
    console.error('[Auth Sync] Error:', e)
    return NextResponse.json({ error: e?.message || 'Sync failed' }, { status: 500 })
  }
}
