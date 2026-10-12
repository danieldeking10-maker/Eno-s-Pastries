'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  ShieldCheck,
  UserCheck,
  ArrowRight,
  Info,
} from 'lucide-react'

export default function AdminAccessPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [currentUser, setCurrentUser] = useState<{ email: string | null; role: string; canAccessAdmin: boolean } | null>(null)
  const [adminEmail, setAdminEmail] = useState('danieldeking10@gmail.com')
  const [passcode, setPasscode] = useState('pastryadmin2026')
  const [showPasscode, setShowPasscode] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false

    const checkAccess = async () => {
      if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('lock') === 'true') {
        await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined)
        window.history.replaceState({}, '', '/admin-access')
      }

      try {
        const response = await fetch('/api/auth/session', { cache: 'no-store' })
        const session = await response.json().catch(() => ({}))
        if (cancelled) return

        if (session?.authenticated) {
          router.replace('/admin')
          return
        }

        if (session?.signedIn && session?.email) {
          setCurrentUser({
            email: session.email,
            role: session.role || 'CUSTOMER',
            canAccessAdmin: session.canAccessAdmin === true,
          })
          if (session.canAccessAdmin) {
            setAdminEmail(session.email)
          }
        }
      } catch {
        // Continue to show passcode gate
      } finally {
        if (!cancelled) setChecking(false)
      }
    }

    void checkAccess()
    return () => {
      cancelled = true
    }
  }, [router])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const response = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passcode,
          email: adminEmail,
        }),
      })

      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(result?.error || 'Admin sign-in failed. Please verify the passcode.')
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

  if (checking) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-amber-50 text-stone-700">
        <div className="flex items-center gap-3 bg-white px-6 py-4 rounded-2xl shadow-md border border-amber-200">
          <div className="w-5 h-5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
          <span className="font-semibold text-stone-800">Verifying admin permissions...</span>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen min-h-[100dvh] bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 flex items-center justify-center p-4 py-8">
      <section className="w-full max-w-lg rounded-3xl border border-amber-200 bg-white p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Top color bar */}
        <div className="absolute top-0 left-0 right-0 h-2.5 bg-gradient-to-r from-amber-600 via-orange-500 to-amber-700" />

        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex min-h-10 items-center gap-1.5 text-xs font-bold text-amber-900 hover:text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 transition-colors"
          >
            ← Back to Store
          </Link>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900 bg-amber-100 px-3 py-1 rounded-full border border-amber-200">
            Restricted Admin Area
          </span>
        </div>

        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-600 to-orange-600 text-white shadow-lg shadow-amber-600/30">
            <Lock className="h-7 w-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
            Eno&apos;s Pastries Admin Access
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-stone-600">
            Access order management, bakery inventory, delivery tracking, and store analytics.
          </p>
        </div>

        {/* Current User Status Banner */}
        {currentUser && (
          <div
            className={`mb-5 p-3.5 rounded-2xl border text-xs flex items-center justify-between gap-3 ${
              currentUser.canAccessAdmin
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 shrink-0 text-emerald-600" />
              <div>
                <span className="font-bold block">Signed in as: {currentUser.email}</span>
                <span className="text-[11px] opacity-80">
                  {currentUser.canAccessAdmin ? '✓ Approved Admin Account' : 'Customer Account'}
                </span>
              </div>
            </div>
            <Link
              href="/admin-access?lock=true"
              className="px-2.5 py-1 bg-white border border-stone-200 hover:bg-stone-50 rounded-lg text-[11px] font-bold text-stone-700 shadow-2xs"
            >
              Switch
            </Link>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Admin Email */}
          <div>
            <label htmlFor="admin-email" className="mb-1.5 block text-xs font-bold text-stone-700">
              Admin Email Account
            </label>
            <input
              id="admin-email"
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder="e.g. danieldeking10@gmail.com"
              required
              className="w-full rounded-xl border-2 border-stone-200 px-4 py-2.5 text-sm text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
            <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px] text-stone-500 items-center">
              <span>Admin accounts:</span>
              <button
                type="button"
                onClick={() => setAdminEmail('danieldeking10@gmail.com')}
                className="px-2 py-0.5 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold cursor-pointer border border-amber-200"
              >
                danieldeking10@gmail.com
              </button>
              <button
                type="button"
                onClick={() => setAdminEmail('kobenaahern77@gmail.com')}
                className="px-2 py-0.5 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold cursor-pointer border border-amber-200"
              >
                kobenaahern77@gmail.com
              </button>
            </div>
          </div>

          {/* Admin Passcode */}
          <div>
            <label htmlFor="admin-passcode" className="mb-1.5 block text-xs font-bold text-stone-700 flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5 text-amber-600" />
              Admin Passcode
            </label>
            <div className="relative">
              <input
                id="admin-passcode"
                type={showPasscode ? 'text' : 'password'}
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                autoComplete="current-password"
                required
                className="w-full rounded-xl border-2 border-stone-200 px-4 py-2.5 pr-12 text-sm text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
              <button
                type="button"
                onClick={() => setShowPasscode((v) => !v)}
                aria-label={showPasscode ? 'Hide passcode' : 'Show passcode'}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-stone-500 hover:text-stone-700 cursor-pointer"
              >
                {showPasscode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Explanatory Notice */}
          <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200/80 text-[11px] text-amber-950 flex items-start gap-2">
            <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Why is this access screen shown?</p>
              <p className="mt-0.5 text-amber-900/90 leading-relaxed">
                The <strong>/admin</strong> dashboard is restricted to store administrators to protect customer orders and bakery data.
                Enter your admin passcode above to generate an authenticated session.
              </p>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-800"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 px-4 py-3 font-bold text-white shadow-lg transition-all disabled:opacity-60 cursor-pointer"
          >
            <ShieldCheck className="h-4 w-4" />
            {submitting ? 'Verifying & Unlocking...' : 'Unlock Admin Station'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
          <Link href="/sign-in" className="hover:text-amber-800 font-semibold underline">
            Customer Sign In
          </Link>
          <Link href="/products" className="hover:text-amber-800 font-semibold underline">
            Browse Menu
          </Link>
        </div>
      </section>
    </main>
  )
}