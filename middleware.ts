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
    const data = JSON.parse(new TextDecoder().decode(decodeBase64Url(payload)))
    if (typeof data?.email !== 'string' || typeof data?.role !== 'string' ||
      !Number.isInteger(data?.exp) || data.exp <= Math.floor(Date.now() / 1000)) {
      return null
    }
    return data as { email: string; role: string; exp: number }
  } catch {
    return null
  }
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

  if (!adminToken || !authToken) {
    const accessUrl = request.nextUrl.clone()
    accessUrl.pathname = '/admin-access'
    accessUrl.search = ''
    return NextResponse.redirect(accessUrl)
  }

  const adminSecret = process.env.ADMIN_SESSION_SECRET
  const authSecret = process.env.AUTH_SECRET

  if (!adminSecret || adminSecret.length < 32 || !authSecret || authSecret.length < 32) {
    const accessUrl = request.nextUrl.clone()
    accessUrl.pathname = '/admin-access'
    accessUrl.search = ''
    return NextResponse.redirect(accessUrl)
  }

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