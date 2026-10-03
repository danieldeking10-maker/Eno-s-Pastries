import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSessionCookieValue, isAdminEmail } from '@/lib/auth'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') || '/'

  if (code) {
    const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vfolwsqdizcnmpowptko.supabase.co'
    const url = rawUrl.replace(/['"\r\n\s]/g, '').replace(/\/+$/, '')
    const key = (
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      'sb_publishable_sdoHVJ7PCqg4SM4h5b9-uQ_8W2rUdk9'
    ).replace(/['"\r\n\s]/g, '')

    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false }
    })

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data?.session?.user) {
      const email = data.session.user.email || ''
      const role = isAdminEmail(email) ? 'ADMIN' : 'CUSTOMER'
      const sessionCookie = createSessionCookieValue({ email, role })

      const redirectUrl = new URL(next.startsWith('/') ? next : `/${next}`, origin)
      const response = NextResponse.redirect(redirectUrl)
      
      response.cookies.set('auth_session', sessionCookie, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      })

      return response
    }
  }

  // If no code or error, redirect to sign-in or destination
  return NextResponse.redirect(new URL(next.startsWith('/') ? next : `/${next}`, origin))
}
