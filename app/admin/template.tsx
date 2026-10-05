import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getAdminSessionEmailFromToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function AdminTemplate({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const email = getAdminSessionEmailFromToken(
    cookieStore.get('admin_session')?.value,
    cookieStore.get('auth_session')?.value,
  )

  if (!email) {
    redirect('/admin-access')
  }

  return children
}