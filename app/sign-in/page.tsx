'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleGoogleSignIn = async () => {
    setError(null)
    setLoading(true)

    try {
      const { error: oauthError } = await getSupabaseBrowserClient().auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { prompt: 'select_account' },
        },
      })

      if (oauthError) {
        setError(oauthError.message)
        setLoading(false)
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not start Google sign-in.')
      setLoading(false)
    }
  }

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
        setError(data?.error ?? 'Login failed')
        return
      }

      router.push(data?.canAccessAdmin ? '/admin-access' : '/')
    } catch (e: any) {
      setError(e?.message ?? 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen min-h-[100dvh] bg-gradient-to-b from-amber-50 to-orange-50 flex items-start sm:items-center justify-center overflow-y-auto px-4 py-6 sm:py-10">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-md p-6 sm:p-8">
        <h1 className="text-3xl font-bold text-amber-900 mb-2">Sign in</h1>
        <p className="text-stone-700 mb-6">Sign in to your Eno&apos;s Pastries account.</p>

        {error && (
          <div role="alert" className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-800 px-4 py-3">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="mb-5 flex min-h-12 w-full items-center justify-center gap-3 rounded-lg border-2 border-stone-300 bg-white px-4 py-3 text-base font-semibold text-stone-900 transition-colors hover:bg-stone-50 disabled:opacity-60"
        >
          {loading ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-stone-300 border-t-amber-700" aria-hidden="true" />
          ) : (
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" transform="translate(0 6)" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.73 7.18l7.64 5.93c4.46-4.12 7.13-10.18 7.13-17.58Z" />
              <path fill="#FBBC05" d="M10.53 28.59a14.4 14.4 0 0 1 0-9.18l-7.98-6.19a23.94 23.94 0 0 0 0 21.56l7.98-6.19Z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.87l-7.64-5.93c-2.12 1.42-4.85 2.27-8.26 2.27-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" />
            </svg>
          )}
          <span>{loading ? 'Connecting to Google...' : 'Continue with Google'}</span>
        </button>

        <div className="mb-5 flex items-center gap-3 text-xs font-medium text-stone-600" aria-hidden="true">
          <span className="h-px flex-1 bg-stone-300" />
          <span>OR SIGN IN WITH EMAIL</span>
          <span className="h-px flex-1 bg-stone-300" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
              <label htmlFor="signin-email" className="block text-base font-semibold text-stone-900 mb-1">Email address</label>
            <input
                id="signin-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
                inputMode="email"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              required
                className="w-full min-h-12 px-4 py-3 text-base text-stone-900 border-2 border-stone-300 rounded-lg focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20 focus:outline-none"
            />
          </div>
          <div>
              <label htmlFor="signin-password" className="block text-base font-semibold text-stone-900 mb-1">Password</label>
            <div className="relative">
              <input
                  id="signin-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                required
                  className="w-full min-h-12 px-4 py-3 pr-12 text-base text-stone-900 border-2 border-stone-300 rounded-lg focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-2 top-1/2 -translate-y-1/2 min-h-11 min-w-11 flex items-center justify-center text-stone-600 hover:text-amber-800 focus:outline-none"
                title={showPassword ? 'Hide password' : 'Show password'}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-12 bg-gradient-to-r from-amber-700 to-orange-700 hover:from-amber-800 hover:to-orange-800 text-white py-3 rounded-lg font-semibold shadow-lg disabled:opacity-60"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <span className="text-stone-600 text-sm">No account?</span>{' '}
          <Link href="/sign-up" className="text-amber-700 font-semibold hover:underline text-sm">
            Create an account
          </Link>
        </div>
      </div>
    </main>
  )
}

