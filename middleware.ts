import { NextRequest, NextResponse } from 'next/server'
import { isAdminEmail } from '@/lib/admin-access'
import { readAdminSessionCookieValue, readSessionCookieValue } from '@/lib/auth'

function decodeBase64Url(value: string) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - base64.length % 4) % 4)
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0))
}

function decodeHex(value: string) {
  if (!/^(?:[a-f\d]{2})+$/i.test(value)) return null
  return Uint8Array.from(value.match(/.{2}/g) || [], (byte) => Number.parseInt(byte, 16))
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

  const adminPayload = readAdminSessionCookieValue(adminToken)
  const authPayload = readSessionCookieValue(authToken)

  if (
    adminPayload &&
    authPayload &&
    adminPayload.role === 'ADMIN' &&
    authPayload.email.toLowerCase() === adminPayload.email.toLowerCase() &&
    isAdminEmail(adminPayload.email)
  ) {
    return NextResponse.next()
  }

  const accessUrl = request.nextUrl.clone()
  accessUrl.pathname = '/admin-access'
  accessUrl.search = ''
  return NextResponse.redirect(accessUrl)
}

export const config = {
  matcher: ['/', '/admin', '/admin/:path*'],
}