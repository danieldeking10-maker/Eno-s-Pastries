import crypto from 'crypto'
import { cookies } from 'next/headers'
import { isAdminEmail as isAllowedAdminEmail } from '@/lib/admin-access'

export { isAdminEmail } from '@/lib/admin-access'

const SESSION_COOKIE = 'auth_session'
const ADMIN_SESSION_COOKIE = 'admin_session'
const SESSION_DURATION_SECONDS = 8 * 60 * 60

type SessionPayload = {
  email: string
  role: string
  exp: number
}

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET || ''
  return secret.length >= 32 ? secret : null
}

export function getAdminSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET || ''
  return secret.length >= 32 ? secret : null
}

export function hasAuthSecret() {
  return getAuthSecret() !== null
}

export function createSessionCookieValue(payload: { email: string; role: string }) {
  const secret = getAuthSecret()
  if (!secret) throw new Error('AUTH_SECRET must contain at least 32 characters')

  const encodedPayload = Buffer.from(JSON.stringify({
    ...payload,
    exp: Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS,
  })).toString('base64url')
  const signature = crypto.createHmac('sha256', secret).update(encodedPayload).digest('hex')
  return `${encodedPayload}.${signature}`
}

export function createVerifiedAuthSessionCookieValue(email: string) {
  return createSessionCookieValue({ email, role: 'CUSTOMER' })
}

export function readSessionCookieValue(value: string | undefined, secret?: string | null): SessionPayload | null {
  const resolvedSecret = secret ?? getAuthSecret()
  if (!resolvedSecret || !value) return null

  const separator = value.lastIndexOf('.')
  if (separator <= 0) return null

  const encodedPayload = value.slice(0, separator)
  const signature = value.slice(separator + 1)
  const expected = crypto.createHmac('sha256', resolvedSecret).update(encodedPayload).digest()
  const supplied = Buffer.from(signature, 'hex')
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) return null

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'))
    if (typeof payload?.email !== 'string' || typeof payload?.role !== 'string' ||
      !Number.isInteger(payload?.exp) || payload.exp <= Math.floor(Date.now() / 1000)) {
      return null
    }
    return payload as SessionPayload
  } catch {
    return null
  }
}

export function readAdminSessionCookieValue(value: string | undefined): SessionPayload | null {
  const secret = getAdminSecret()
  if (!secret || !value) return null
  return readSessionCookieValue(value, secret)
}

export async function hasAdminSession() {
  const cookieStore = await cookies()
  const session = readSessionCookieValue(cookieStore.get(SESSION_COOKIE)?.value)
  return session?.role === 'ADMIN' && isAllowedAdminEmail(session.email)
}

export async function getAdminSessionEmailFromToken(
  adminToken: string | undefined,
  authToken: string | undefined
): Promise<string | null> {
  const adminPayload = readAdminSessionCookieValue(adminToken)
  const authPayload = readSessionCookieValue(authToken)

  if (!adminPayload || !authPayload) return null
  if (adminPayload.role !== 'ADMIN') return null
  if (!isAllowedAdminEmail(adminPayload.email)) return null
  if (adminPayload.email.toLowerCase() !== authPayload.email.toLowerCase()) return null

  return adminPayload.email
}

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.createHmac('sha256', salt).update(password).digest('hex')
  return `v1$${salt}$${hash}`
}

export function verifyPassword(storedPassword: string, candidatePassword: string) {
  const [version, salt, storedHash] = storedPassword.split('$')
  if (version !== 'v1' || !salt || !storedHash) {
    return false
  }

  const candidateHash = crypto.createHmac('sha256', salt).update(candidatePassword).digest('hex')
  return candidateHash === storedHash
}

