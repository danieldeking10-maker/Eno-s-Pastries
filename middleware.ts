import { NextRequest, NextResponse } from 'next/server'
import { isAdminEmail } from '@/lib/admin-access'

function decodeBase64Url(value: string) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - base64.length % 4) % 4)
  const binary = atob(padded)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

async function getVerifiedSession(token: string | undefined) {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
  if (!token || !secret) return null

  const [payload, encodedSignature, extra] = token.split('.')
  if (!payload || !encodedSignature || extra) return null

  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    )
    const validSignature = await crypto.subtle.verify(
      'HMAC',
      key,
      decodeBase64Url(encodedSignature),
      new TextEncoder().encode(payload),
    )
    if (!validSignature) return null

    const session = JSON.parse(new TextDecoder().decode(decodeBase64Url(payload)))
    return Number(session.expiresAt) > Date.now() ? session : null
  } catch {
    return null
  }
}

async function hasValidAdminSession(adminToken: string | undefined, authToken: string | undefined) {
  const [adminSession, authSession] = await Promise.all([
    getVerifiedSession(adminToken),
    getVerifiedSession(authToken),
  ])
  const adminEmail = String(adminSession?.email || '').trim().toLowerCase()
  const authEmail = String(authSession?.email || '').trim().toLowerCase()
  return !!adminEmail && adminEmail === authEmail && isAdminEmail(adminEmail)
}

export async function middleware(request: NextRequest) {
  if (
    request.nextUrl.pathname === '/' &&
    (request.nextUrl.searchParams.has('error') || request.nextUrl.searchParams.has('error_code'))
  ) {
    const signInUrl = request.nextUrl.clone()
    signInUrl.pathname = '/sign-in'
    signInUrl.search = ''
    signInUrl.searchParams.set('oauth_error', 'retry')
    return NextResponse.redirect(signInUrl)
  }

  if (!request.nextUrl.pathname.startsWith('/admin')) return NextResponse.next()

  const adminToken = request.cookies.get('admin_session')?.value
  const authToken = request.cookies.get('auth_session')?.value
  if (await hasValidAdminSession(adminToken, authToken)) return NextResponse.next()

  const accessUrl = request.nextUrl.clone()
  accessUrl.pathname = '/admin-access'
  accessUrl.search = ''
  return NextResponse.redirect(accessUrl)
}

export const config = {
  matcher: ['/', '/admin', '/admin/:path*'],
}