'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Mail } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

function SignInContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTarget = searchParams.get('redirect') || searchParams.get('next') || '/'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(() => (
    searchParams.get('oauth_error') === 'retry'
      ? 'Google sign-in expired or was already used. Please try again.'
      : null
  ))
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || 'Invalid email or password')
        return
      }

      router.push(data?.canAccessAdmin ? '/admin-access' : redirectTarget)
    } catch (e: any) {
      setError(e?.message ?? 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError(null)
    setLoading(true)

    try {
      const supabase = getSupabaseBrowserClient()
      const origin = window.location.origin

      const { data, error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })

      if (signInError) {
        setError(signInError.message)
        setLoading(false)
      }
      // Redirect happens automatically via Supabase
    } catch (e: any) {
      setError(e?.message ?? 'Google sign-in failed. Please try again.')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-start justify-center bg-gradient-to-b from-amber-50 to-orange-50 px-4 py-10 sm:items-center">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-md sm:p-8">
        <h1 className="mb-2 text-3xl font-bold text-amber-900">Sign in</h1>
        <p className="mb-6 text-stone-700">Sign in to your Eno&apos;s Pastries account.</p>

        {error && (
          <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">
            {error}
          </div>
        )}

        {/* Google Sign In Button */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          type="button"
          className="w-full min-h-12 rounded-lg border-2 border-stone-300 bg-white px-4 py-3 font-medium text-base text-stone-900 flex items-center justify-center gap-3 hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:opacity-60 transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-stone-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-stone-500">Or continue with email</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="signin-email" className="mb-1 block text-base font-semibold text-stone-900">Email address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
              <input
                id="signin-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                required
                className="w-full min-h-12 rounded-lg border-2 border-stone-300 pl-10 pr-4 py-3 text-base text-stone-900 focus:border-amber-600 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label htmlFor="signin-password" className="mb-1 block text-base font-semibold text-stone-900">Password</label>
            <div className="relative">
              <input
                id="signin-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? 'text' : 'password'}
                required
                className="w-full min-h-12 rounded-lg border-2 border-stone-300 px-4 py-3 pr-12 text-base text-stone-900 focus:border-amber-600 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-stone-600 hover:text-amber-800"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-12 rounded-lg bg-gradient-to-r from-amber-700 to-orange-700 px-4 py-3 font-semibold text-white shadow-lg disabled:opacity-60"
          >
            {loading ? 'Signing in...' : 'Sign in with email'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-stone-600">No account?</span>{' '}
          <Link href="/sign-up" className="font-semibold text-amber-700 hover:underline">
            Create an account
          </Link>
        </div>
      </div>
    </main>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-amber-50" />}>
      <SignInContent />
    </Suspense>
  )
}

