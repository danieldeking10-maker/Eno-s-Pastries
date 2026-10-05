import { NextRequest, NextResponse } from 'next/server'
import { isAdminEmail } from '@/lib/admin-access'

function decodeBase64Url(value: string) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - base64.length % 4) % 4)
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0))
}

function decodeHex(value: string) {
  if (!/^(?:[a-f\d]{2})+$/i.test(value)) return null
  return Uint8Array.from(value.match(/.{2}/g) || [], (byte) => Number.parseInt(byte, 16))
}

async function hasAdminSession(token: string | undefined) {
  const secret = process.env.AUTH_SECRET
  if (!token || !secret || secret.length < 32) return false

  const separator = token.lastIndexOf('.')
  if (separator < 1) return false
  const payload = token.slice(0, separator)
  const signature = decodeHex(token.slice(separator + 1))
  if (!signature) return false

  try {
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

export async function middleware(request: NextRequest) {
  if (await hasAdminSession(request.cookies.get('auth_session')?.value)) return NextResponse.next()

  const accessUrl = request.nextUrl.clone()
  accessUrl.pathname = '/admin-access'
  accessUrl.search = ''
  return NextResponse.redirect(accessUrl)
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
}