'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertCircle, Eye, EyeOff, KeyRound, Lock, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { isAdminEmail } from '@/lib/admin-access'

export default function AdminAccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, session, loading: authLoading } = useAuth()
  const [passcode, setPasscode] = useState('')
  const [showPasscode, setShowPasscode] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const authorizedEmail = isAdminEmail(user?.email)

  useEffect(() => {
    if (authLoading) return
    if (!user?.email || !authorizedEmail) {
      setChecking(false)
      return
    }

    let cancelled = false
    const verifyAccess = async () => {
      if (searchParams.get('lock') === 'true') {
        await fetch('/api/auth/logout', { method: 'POST' })
        window.history.replaceState({}, '', '/admin-access')
        if (!cancelled) setChecking(false)
        return
      }

      try {
        const response = await fetch('/api/auth/admin-login', { cache: 'no-store' })
        const data = await response.json().catch(() => ({}))
        if (!cancelled && response.ok && data.email?.toLowerCase() === user.email?.toLowerCase()) {
          router.replace('/admin')
          router.refresh()
          return
        }
      } catch {}

      if (!cancelled) setChecking(false)
    }

    void verifyAccess()
    return () => { cancelled = true }
  }, [authLoading, authorizedEmail, router, searchParams, user?.email])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const response = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: session?.access_token, passcode: passcode.trim() }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error || 'Admin access could not be verified.')
        return
      }

      router.replace('/admin')
      router.refresh()
    } catch {
      setError('Could not verify admin access. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading || (authorizedEmail && checking)) {
    return <main className="min-h-screen bg-amber-50 flex items-center justify-center text-stone-600">Verifying authorization...</main>
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-amber-50 flex items-center justify-center p-4">
        <section className="max-w-md w-full rounded-2xl border border-amber-200 bg-white p-8 text-center shadow-xl">
          <h1 className="text-xl font-bold text-stone-900">Sign in required</h1>
          <p className="mt-2 text-sm text-stone-600">Sign in with an approved admin account to continue.</p>
          <Link href="/sign-in?redirect=%2Fadmin-access" className="mt-5 inline-flex font-bold text-amber-800 hover:underline">Sign in</Link>
        </section>
      </main>
    )
  }

  if (!authorizedEmail) {
    return (
      <main className="min-h-screen bg-amber-50 flex items-center justify-center p-4">
        <section className="max-w-md w-full rounded-2xl border border-amber-200 bg-white p-8 text-center shadow-xl">
          <h1 className="text-xl font-bold text-stone-900">Admin access denied</h1>
          <p className="mt-2 text-sm text-stone-600">This account is not permitted to access the admin panel.</p>
          <Link href="/" className="mt-5 inline-flex font-bold text-amber-800 hover:underline">Return to the store</Link>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 flex items-center justify-center p-4 sm:p-6">
      <section className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-amber-200/80 p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-700" />
        <div className="mb-6 flex justify-between items-center">
          <Link href="/" className="text-xs font-bold text-amber-800 hover:text-amber-950">Back to Shop</Link>
          <span className="text-[10px] uppercase tracking-wider font-extrabold text-amber-900 bg-amber-100 px-2.5 py-1 rounded-full border border-amber-200">Restricted Area</span>
        </div>
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-600 to-orange-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-amber-600/20">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-amber-950">Eno&apos;s Pastries Admin</h1>
          <p className="text-stone-600 text-xs mt-1.5 leading-relaxed">Enter the admin passcode to continue to store management.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="admin-passcode" className="block text-xs font-bold text-stone-700 mb-1.5">
              <KeyRound className="w-3.5 h-3.5 text-amber-600 inline mr-1" />Admin Passcode
            </label>
            <div className="relative">
              <input id="admin-passcode" type={showPasscode ? 'text' : 'password'} value={passcode} onChange={(event) => setPasscode(event.target.value)} placeholder="Enter admin passcode..." required autoFocus className="w-full pl-4 pr-11 py-3 border-2 border-amber-200 rounded-xl focus:border-amber-600 focus:outline-none text-stone-900 text-sm font-mono" />
              <button type="button" onClick={() => setShowPasscode((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1" title={showPasscode ? 'Hide passcode' : 'Show passcode'} aria-label={showPasscode ? 'Hide passcode' : 'Show passcode'}>
                {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {error && <div role="alert" className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center gap-2 font-medium"><AlertCircle className="w-4 h-4 text-red-600 shrink-0" /><span>{error}</span></div>}
          <button type="submit" disabled={submitting} className="w-full py-3.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold text-sm rounded-xl shadow-md transition-all disabled:opacity-60 flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4" /><span>{submitting ? 'Verifying...' : 'Unlock Admin Access'}</span>
          </button>
        </form>
      </section>
    </main>
  )
}