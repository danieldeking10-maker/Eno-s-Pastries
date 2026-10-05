'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'

export default function SignUpPage() {
  const router = useRouter()
  const [name, setName] = useState('')
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
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error ?? 'Signup failed')
        return
      }

      router.push(data?.canAccessAdmin ? '/admin-access' : '/')
    } catch (e: any) {
      setError(e?.message ?? 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen min-h-[100dvh] bg-gradient-to-b from-amber-50 to-orange-50 flex items-start sm:items-center justify-center overflow-y-auto px-4 py-6 sm:py-10">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-md p-6 sm:p-8">
        <h1 className="text-3xl font-bold text-amber-900 mb-2">Sign up</h1>
        <p className="text-stone-700 mb-6">Create your Eno&apos;s Pastries account to place and track orders.</p>

        {error && (
          <div role="alert" className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-800 px-4 py-3">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
              <label htmlFor="signup-name" className="block text-base font-semibold text-stone-900 mb-1">Full name</label>
            <input
                id="signup-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              type="text"
                autoComplete="name"
              placeholder="e.g. Daniel Ankrah"
                className="w-full min-h-12 px-4 py-3 text-base text-stone-900 border-2 border-stone-300 rounded-lg focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20 focus:outline-none"
            />
          </div>
          <div>
              <label htmlFor="signup-email" className="block text-base font-semibold text-stone-900 mb-1">Email address</label>
            <input
                id="signup-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
                inputMode="email"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              required
              placeholder="your@email.com"
                className="w-full min-h-12 px-4 py-3 text-base text-stone-900 border-2 border-stone-300 rounded-lg focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20 focus:outline-none"
            />
          </div>
          <div>
              <label htmlFor="signup-password" className="block text-base font-semibold text-stone-900 mb-1">Password</label>
            <div className="relative">
              <input
                  id="signup-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
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
            className="w-full min-h-12 bg-gradient-to-r from-amber-700 to-orange-700 hover:from-amber-800 hover:to-orange-800 text-white py-3 rounded-lg font-semibold shadow-lg disabled:opacity-60 transition-all duration-200"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <span className="text-stone-600 text-sm">Already have an account?</span>{' '}
          <Link href="/sign-in" className="text-amber-700 font-semibold hover:underline text-sm">
            Sign in
          </Link>
        </div>
      </div>
    </main>
  )
}


