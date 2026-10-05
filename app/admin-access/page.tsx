'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertCircle, Eye, EyeOff, KeyRound, Lock, ShieldCheck } from 'lucide-react'

type AccessState = 'checking' | 'signed-out' | 'denied' | 'passcode'

export default function AdminAccessPage() {
  const router = useRouter()
  const [accessState, setAccessState] = useState<AccessState>('checking')
  const [passcode, setPasscode] = useState('')
  const [showPasscode, setShowPasscode] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false

    const checkAccess = async () => {
      if (new URLSearchParams(window.location.search).get('lock') === 'true') {
        await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined)
        window.history.replaceState({}, '', '/admin-access')
      }

      try {
        const response = await fetch('/api/auth/session', { cache: 'no-store' })
        const session = await response.json().catch(() => ({}))
        if (cancelled) return

        if (!session?.signedIn) {
          setAccessState('signed-out')
        } else if (!session?.canAccessAdmin) {
          setAccessState('denied')
        } else if (session?.authenticated) {
          router.replace('/admin')
        } else {
          setAccessState('passcode')
        }
      } catch {
        if (!cancelled) setAccessState('signed-out')
      }
    }

    void checkAccess()
    return () => { cancelled = true }
  }, [router])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const response = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(result?.error || 'Admin sign-in failed. Please try again.')
        return
      }
      router.replace('/admin')
      router.refresh()
    } catch {
      setError('Admin sign-in failed. Check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (accessState === 'checking') {
    return <main className="min-h-screen flex items-center justify-center bg-amber-50 text-stone-700">Checking account access...</main>
  }

  if (accessState === 'signed-out') {
    return (
      <main className="min-h-screen flex items-center justify-center bg-amber-50 p-4">
        <section className="w-full max-w-md rounded-2xl border border-amber-200 bg-white p-8 text-center shadow-lg">
          <h1 className="text-xl font-bold text-stone-900">Sign in required</h1>
          <p className="mt-2 text-stone-700">Sign in with an approved admin email before entering the admin passcode.</p>
          <Link href="/sign-in" className="mt-5 inline-flex min-h-11 items-center font-semibold text-amber-800 hover:underline">Go to sign in</Link>
        </section>
      </main>
    )
  }

  if (accessState === 'denied') {
    return (
      <main className="min-h-screen flex items-center justify-center bg-amber-50 p-4">
        <section className="w-full max-w-md rounded-2xl border border-amber-200 bg-white p-8 text-center shadow-lg">
          <h1 className="text-xl font-bold text-stone-900">Admin access denied</h1>
          <p className="mt-2 text-stone-700">This account can use the store but is not permitted to access admin tools.</p>
          <Link href="/" className="mt-5 inline-flex min-h-11 items-center font-semibold text-amber-800 hover:underline">Return to the store</Link>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen min-h-[100dvh] bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 flex items-start sm:items-center justify-center overflow-y-auto p-4 py-6 sm:py-10">
      <section className="w-full max-w-md rounded-2xl border border-amber-200 bg-white p-6 shadow-xl sm:p-8">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="inline-flex min-h-11 items-center font-semibold text-amber-900 hover:text-amber-700">Back to store</Link>
          <span className="text-xs font-bold uppercase text-amber-900">Restricted area</span>
        </div>
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-700 text-white"><Lock className="h-7 w-7" /></div>
          <h1 className="text-2xl font-bold text-stone-900">Eno&apos;s Pastries Admin</h1>
          <p className="mt-2 text-sm text-stone-700">Enter the admin passcode to continue.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="admin-passcode" className="mb-2 block text-base font-semibold text-stone-900"><KeyRound className="mr-1 inline h-4 w-4" />Admin passcode</label>
            <div className="relative">
              <input id="admin-passcode" type={showPasscode ? 'text' : 'password'} value={passcode} onChange={(event) => setPasscode(event.target.value)} autoComplete="current-password" required className="min-h-12 w-full rounded-lg border-2 border-stone-300 px-4 py-3 pr-12 text-base text-stone-900 focus:border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-700/20" />
              <button type="button" onClick={() => setShowPasscode((value) => !value)} aria-label={showPasscode ? 'Hide passcode' : 'Show passcode'} className="absolute right-1 top-1/2 flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center text-stone-600">
                {showPasscode ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
          {error && <div role="alert" className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}
          <button type="submit" disabled={submitting} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-amber-700 px-4 py-3 font-semibold text-white hover:bg-amber-800 disabled:opacity-60">
            <ShieldCheck className="h-4 w-4" />{submitting ? 'Verifying...' : 'Unlock admin access'}
          </button>
        </form>
      </section>
    </main>
  )
}