import { NextRequest, NextResponse } from 'next/server'
import { isAdminEmail } from '@/lib/admin-access'

function decodeBase64Url(value: string) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - base64.length % 4) % 4)
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0))
}

async function verifyHmac(payload: string, signature: string, secret: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  )
  const sigBytes = new Uint8Array(signature.match(/.{2}/g)!.map((b) => parseInt(b, 16)))
  return crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(payload))
}

async function readSession(payload: string, secret: string) {
  try {
<<<<<<< HEAD
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    )
    if (!await crypto.subtle.verify('HMAC', key, signature, new TextEncoder().encode(payload))) return false

    const session = JSON.parse(new TextDecoder().decode(decodeBase64Url(payload)))
    return session.role === 'ADMIN' && isAdminEmail(session.email) && Number(session.exp) > Math.floor(Date.now() / 1000)
  } catch {
    return false
  }
}

function getSecret() {
  const secret = process.env.AUTH_SECRET || process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  return secret.length >= 32 ? secret : null
}

async function getVerifiedSession(token: string | undefined) {
  const secret = getSecret()
  if (!token || !secret) return null

  const separator = token.lastIndexOf('.')
  if (separator < 1) return null
  const payload = token.slice(0, separator)
  const signature = decodeHex(token.slice(separator + 1))
  if (!signature) return null

  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    )
    if (!await crypto.subtle.verify('HMAC', key, signature, new TextEncoder().encode(payload))) return null

    const session = JSON.parse(new TextDecoder().decode(decodeBase64Url(payload)))
    if (Number(session.exp) <= Math.floor(Date.now() / 1000)) return null
    return session
=======
    const data = JSON.parse(new TextDecoder().decode(decodeBase64Url(payload)))
    if (typeof data?.email !== 'string' || typeof data?.role !== 'string' ||
      !Number.isInteger(data?.exp) || data.exp <= Math.floor(Date.now() / 1000)) {
      return null
    }
    return data as { email: string; role: string; exp: number }
>>>>>>> ddd2b30eb1dd5314a3b94a8ac7755345fd87cb21
  } catch {
    return null
  }
}

<<<<<<< HEAD
async function hasValidAdminSession(adminToken: string | undefined, authToken: string | undefined) {
  const [adminSession, authSession] = await Promise.all([
    getVerifiedSession(adminToken),
    getVerifiedSession(authToken),
  ])

  if (adminSession && adminSession.role === 'ADMIN' && isAdminEmail(adminSession.email)) {
    return true
  }

  if (authSession && authSession.role === 'ADMIN' && isAdminEmail(authSession.email)) {
    return true
  }

  return false
}

=======
>>>>>>> ddd2b30eb1dd5314a3b94a8ac7755345fd87cb21
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

  if (!adminToken || !authToken) {
    const accessUrl = request.nextUrl.clone()
    accessUrl.pathname = '/admin-access'
    accessUrl.search = ''
    return NextResponse.redirect(accessUrl)
  }

  const adminSecret = (process.env.ADMIN_SESSION_SECRET && process.env.ADMIN_SESSION_SECRET.length >= 32)
    ? process.env.ADMIN_SESSION_SECRET
    : 'enos-pastries-admin-session-secret-key-32chars-min-2026'
  const authSecret = (process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 32)
    ? process.env.AUTH_SECRET
    : 'enos-pastries-secure-auth-secret-key-32chars-min-2026'

  try {
    const [adminPayloadStr, adminSig] = adminToken.split('.')
    const [authPayloadStr, authSig] = authToken.split('.')

    if (!adminPayloadStr || !adminSig || !authPayloadStr || !authSig) {
      throw new Error('Invalid token format')
    }

    const adminValid = await verifyHmac(adminPayloadStr, adminSig, adminSecret)
    const authValid = await verifyHmac(authPayloadStr, authSig, authSecret)

    if (!adminValid || !authValid) throw new Error('Invalid signature')

    const adminPayload = await readSession(adminPayloadStr, adminSecret)
    const authPayload = await readSession(authPayloadStr, authSecret)

    if (!adminPayload || !authPayload) throw new Error('Invalid payload')

    if (
      adminPayload.role === 'ADMIN' &&
      authPayload.email.toLowerCase() === adminPayload.email.toLowerCase() &&
      isAdminEmail(adminPayload.email)
    ) {
      return NextResponse.next()
    }
  } catch {
    // Fall through to redirect
  }

  const accessUrl = request.nextUrl.clone()
  accessUrl.pathname = '/admin-access'
  accessUrl.search = ''
  return NextResponse.redirect(accessUrl)
}

export const config = {
  matcher: ['/', '/admin', '/admin/:path*'],
}