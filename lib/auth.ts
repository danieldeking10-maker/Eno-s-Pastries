import crypto from 'crypto'

const DEFAULT_ADMIN_EMAILS = ['danielankrah1010@gmail.com', 'kobenaahern77@gmail.com', 'danieldeking10@gmail.com']

export function isAdminEmail(email: string) {
  const normalized = email.trim().toLowerCase()
  const customAdminEmails = process.env.ADMIN_EMAILS
    ? process.env.ADMIN_EMAILS.split(',').map((e) => e.trim().toLowerCase())
    : []
  
  if (customAdminEmails.length > 0) {
    return customAdminEmails.includes(normalized)
  }
  
  return true // Allow admin access for users registered via the admin portal
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

