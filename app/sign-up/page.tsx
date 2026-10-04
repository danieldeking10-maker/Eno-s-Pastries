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
      // 1. First register in Supabase Auth
      const { data: supaData, error: supaErr } = await signUpWithPassword(email, password, name, redirectTarget)

      if (supaErr) {
        setError(supaErr.message)
        setLoading(false)
        return
      }

      // Check if Supabase requires email confirmation
      if (supaData?.user && !supaData?.session) {
        setSuccessMsg(
          'Account created! Please check your email for the confirmation link to complete sign-in.'
        )
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
    <div className="min-h-screen bg-gradient-to-b from-amber-50/80 via-orange-50/50 to-stone-100 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Back Link */}
        <div className="mb-6 flex justify-between items-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-900 hover:text-amber-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Store
          </Link>
          <span className="text-xs font-medium text-amber-800/70 flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-emerald-600" /> Supabase Secure Auth
          </span>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-amber-100/80 p-8 sm:p-10">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl mx-auto flex items-center justify-center shadow-md shadow-amber-500/20 mb-4">
              <span className="text-3xl">🥐</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
              Create an account
            </h1>
            <p className="text-stone-500 text-sm mt-1">
              Join Eno&apos;s Pastries to order fresh bakes and track deliveries
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-2xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm flex items-start gap-2">
              <span className="shrink-0 font-bold">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3.5 text-sm flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Social Sign Up (Google & Apple for easy access) */}
          <div className="mb-4">
            <SocialAuthButtons
              redirectTo={redirectTarget}
              mode="signup"
              onLoadingChange={setLoading}
              onError={setError}
            />
          </div>

          {/* Email / Password Sign Up Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                Full Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                type="text"
                placeholder="e.g. Daniel Ankrah"
                className="w-full px-4 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                Email address
              </label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                required
                placeholder="name@example.com"
                className="w-full px-4 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
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
                  className="w-full px-4 py-2.5 pr-11 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 focus:outline-none p-1 cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-amber-600 via-amber-500 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white py-3 rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Creating account...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-200" />
                  <span>Create Account</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-stone-100 text-center text-sm">
            <span className="text-stone-500">Already have an account?</span>{' '}
            <Link
              href={`/sign-in?redirect=${encodeURIComponent(redirectTarget)}`}
              className="text-amber-700 font-bold hover:text-amber-800 hover:underline"
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
        <div className="min-h-screen flex items-center justify-center bg-amber-50/50">
          <div className="w-8 h-8 border-3 border-amber-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <SignUpContent />
    </Suspense>
  )
}
