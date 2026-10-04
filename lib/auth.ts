import crypto from 'crypto'
import { isAdminEmail } from '@/lib/admin-access'

export { isAdminEmail } from '@/lib/admin-access'

const ADMIN_SESSION_MAX_AGE = 8 * 60 * 60

function getAdminPasscode() {
  return process.env.ADMIN_PASSCODE || ''
}

function getAdminSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || ''
}

function signAdminSession(payload: string) {
  const secret = getAdminSessionSecret()
  if (!secret) throw new Error('ADMIN_SESSION_SECRET must be configured')
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url')
}

function getSignedSessionPayload(token: string | undefined) {
  if (!token || !hasAdminSessionSecret()) return null

  const [payload, signature, extra] = token.split('.')
  if (!payload || !signature || extra) return null

  const expected = Buffer.from(signAdminSession(payload))
  const actual = Buffer.from(signature)
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null
  return payload
}

export function hasAdminSessionSecret() {
  return !!getAdminSessionSecret()
}

export function verifyAdminPasscode(candidate: string) {
  const expected = Buffer.from(getAdminPasscode())
  const actual = Buffer.from(candidate)
  return expected.length > 0 && actual.length === expected.length && crypto.timingSafeEqual(actual, expected)
}

export function createAdminSessionCookieValue(email: string) {
  const payload = Buffer.from(JSON.stringify({
    email: email.trim().toLowerCase(),
    expiresAt: Date.now() + ADMIN_SESSION_MAX_AGE * 1000,
  })).toString('base64url')
  return `${payload}.${signAdminSession(payload)}`
}

export function createVerifiedAuthSessionCookieValue(email: string) {
  const payload = Buffer.from(JSON.stringify({
    email: email.trim().toLowerCase(),
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  })).toString('base64url')
  return `${payload}.${signAdminSession(payload)}`
}

function getVerifiedSessionEmail(token: string | undefined) {
  const payload = getSignedSessionPayload(token)
  if (!payload) return null

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString())
    return typeof session.email === 'string' && Number(session.expiresAt) > Date.now()
      ? session.email.trim().toLowerCase()
      : null
  } catch {
    return null
  }
}

export function getVerifiedAuthEmailFromToken(token: string | undefined) {
  return getVerifiedSessionEmail(token)
}

export function getAdminSessionEmailFromToken(token: string | undefined, authToken?: string) {
  const sessionEmail = getVerifiedSessionEmail(token)
  const authEmail = getVerifiedAuthEmailFromToken(authToken)
  return sessionEmail && isAdminEmail(sessionEmail) && sessionEmail === authEmail ? sessionEmail : null
}

export function getAdminSessionEmail(request: Request) {
  const cookies = new Map(request.headers.get('cookie')
    ?.split(';')
    .map((cookie) => cookie.trim())
    .map((cookie) => {
      const separator = cookie.indexOf('=')
      return [cookie.slice(0, separator), cookie.slice(separator + 1)] as const
    }))

  return getAdminSessionEmailFromToken(cookies.get('admin_session'), cookies.get('auth_session'))
}

export function hasAdminSession(request: Request) {
  return getAdminSessionEmail(request) !== null
}

export function createSessionCookieValue(payload: { email: string; role: string }) {
  const value = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return value
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

