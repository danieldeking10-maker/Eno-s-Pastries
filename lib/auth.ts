import crypto from 'crypto'
import { isAdminEmail } from '@/lib/admin-access'

export { isAdminEmail } from '@/lib/admin-access'

const ADMIN_SESSION_MAX_AGE = 8 * 60 * 60

function getAdminPasscode() {
  return process.env.ADMIN_PASSCODE || ''
}

function signAdminSession(payload: string) {
  return crypto.createHmac('sha256', getAdminPasscode()).update(payload).digest('base64url')
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

export function getAdminSessionEmail(request: Request) {
  const token = request.headers.get('cookie')
    ?.split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith('admin_session='))
    ?.slice('admin_session='.length)

  if (!token) return null

  const [payload, signature] = token.split('.')
  if (!payload || !signature) return null

  const expected = Buffer.from(signAdminSession(payload))
  const actual = Buffer.from(signature)
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString())
    return isAdminEmail(session.email) && Number(session.expiresAt) > Date.now()
      ? String(session.email)
      : null
  } catch {
    return null
  }
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

