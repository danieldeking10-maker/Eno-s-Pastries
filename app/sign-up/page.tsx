'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Sparkles, ArrowLeft, ShieldCheck, CheckCircle2 } from 'lucide-react'
import SocialAuthButtons from '@/components/SocialAuthButtons'
import { useAuth } from '@/components/AuthProvider'

function SignUpContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTarget = searchParams.get('redirect') || searchParams.get('next') || '/'

  const { signUpWithPassword } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)
    setLoading(true)

    try {
      const { data: supaData, error: supaErr } = await signUpWithPassword(email, password, name, redirectTarget)

      if (supaErr) {
        setError(supaErr.message)
        setLoading(false)
        return
      }

      if (supaData?.user && !supaData?.session) {
        setSuccessMsg('Account created! Please check your email for the confirmation link to complete sign-in.')
        setLoading(false)
        return
      }

      router.push(redirectTarget)
    } catch (e: any) {
      setError(e?.message ?? 'Account creation failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/80 via-orange-50/50 to-stone-100 px-4 py-12">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-900 transition-colors hover:text-amber-700"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Store
          </Link>
          <span className="flex items-center gap-1 text-xs font-medium text-amber-800/70">
            <ShieldCheck className="h-4 w-4 text-emerald-600" /> Supabase Secure Auth
          </span>
        </div>

        <div className="rounded-3xl border border-amber-100/80 bg-white p-8 shadow-xl sm:p-10">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-md shadow-amber-500/20">
              <span className="text-3xl">🥐</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-stone-900 sm:text-3xl">Create an account</h1>
            <p className="mt-1 text-sm text-stone-500">Join Eno&apos;s Pastries to order fresh bakes and track deliveries</p>
          </div>

          {error && (
            <div className="mb-6 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <span className="shrink-0 font-bold">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-6 flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-sm text-emerald-800">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="mb-4">
            <SocialAuthButtons
              redirectTo={redirectTarget}
              mode="signup"
              onLoadingChange={setLoading}
              onError={setError}
            />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-700">
                Full Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                type="text"
                placeholder="e.g. Daniel Ankrah"
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm transition-all focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-700">
                Email address
              </label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                required
                placeholder="name@example.com"
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm transition-all focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-700">
                Password
              </label>
              <div className="relative">
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="At least 6 characters"
                  minLength={6}
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 pr-11 text-sm transition-all focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer p-1 text-stone-400 hover:text-stone-700 focus:outline-none"
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-orange-600 py-3 text-sm font-bold text-white shadow-md transition-all duration-200 hover:from-amber-700 hover:to-orange-700 hover:shadow-lg disabled:opacity-60"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  <span>Creating account...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-amber-200" />
                  <span>Create Account</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-8 border-t border-stone-100 pt-6 text-center text-sm">
            <span className="text-stone-500">Already have an account?</span>{' '}
            <Link
              href={`/sign-in?redirect=${encodeURIComponent(redirectTarget)}`}
              className="font-bold text-amber-700 hover:text-amber-800 hover:underline"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-amber-50/50">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-amber-600 border-t-transparent" />
        </div>
      }
    >
      <SignUpContent />
    </Suspense>
  )
}
