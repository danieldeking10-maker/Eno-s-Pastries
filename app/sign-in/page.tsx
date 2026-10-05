'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'

function SignInContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTarget = searchParams.get('redirect') || searchParams.get('next') || '/'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="signin-email" className="mb-1 block text-base font-semibold text-stone-900">Email address</label>
            <input
              id="signin-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              className="w-full min-h-12 rounded-lg border-2 border-stone-300 px-4 py-3 text-base text-stone-900 focus:border-amber-600 focus:outline-none"
            />
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
            {loading ? 'Signing in...' : 'Sign in'}
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

