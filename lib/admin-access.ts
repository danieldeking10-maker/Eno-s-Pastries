const ADMIN_EMAILS = new Set(['danieldeking10@gmail.com', 'kobenaahern77@gmail.com', 'danieldeking10@gmail.com'])

export function isAdminEmail(email: string | null | undefined) {
  return !!email && ADMIN_EMAILS.has(email.trim().toLowerCase())
}