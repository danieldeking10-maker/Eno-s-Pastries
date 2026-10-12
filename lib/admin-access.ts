const DEFAULT_ADMIN_EMAILS = [
  'danieldeking10@gmail.com',
  'kobenaahern77@gmail.com',
  'admin@enospastries.com',
]

/**
 * Returns the set of all approved administrator emails,
 * combining defaults and any custom configured emails in environment variables.
 */
export function getApprovedAdminEmails(): Set<string> {
  const emails = new Set<string>()
  DEFAULT_ADMIN_EMAILS.forEach((e) => emails.add(e.toLowerCase().trim()))

  const envList = (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || '')
    .split(',')
    .map((e) => e.toLowerCase().trim())
    .filter(Boolean)

  envList.forEach((e) => emails.add(e))
  return emails
}

export function getPrimaryAdminEmail(): string {
  return process.env.ADMIN_EMAIL?.trim().toLowerCase() || DEFAULT_ADMIN_EMAILS[0]
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email || typeof email !== 'string') return false
  const normalized = email.trim().toLowerCase()
  if (getApprovedAdminEmails().has(normalized)) return true
  // Allow system admin prefix/domain for convenience
  if (normalized.startsWith('admin@') || normalized.endsWith('@admin.enospastries.com')) return true
  return false
}