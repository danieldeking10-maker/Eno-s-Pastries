'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const code = searchParams.get('code')
  const requestedNext = searchParams.get('next') || '/'
  const next = requestedNext.startsWith('/') && !requestedNext.startsWith('//') ? requestedNext : '/'
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const completeSignIn = async () => {
      const providerError = searchParams.get('error_description') || searchParams.get('error')
      if (providerError) {
        setError(providerError)
        return
      }

      if (!code) {
        setError('This sign-in link is missing its authorization code. Please try again.')
        return
      }

      const { data, error: exchangeError } = await getSupabaseBrowserClient().auth.exchangeCodeForSession(code)
      if (exchangeError || !data.session) {
        setError(exchangeError?.message || 'Could not complete sign in. Please request a new link.')
        return
      }

      const response = await fetch('/api/auth/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: data.session.access_token }),
      })

      if (!response.ok) {
        const result = await response.json().catch(() => ({}))
        setError(result.error || 'Your account was verified, but sign in could not be completed.')
        return
      }

      if (!cancelled) router.replace(next)
    }

    void completeSignIn().catch((reason: unknown) => {
      if (!cancelled) {
        setError(reason instanceof Error ? reason.message : 'Could not complete sign in. Please try again.')
      }
    })

    return () => {
      cancelled = true
    }
  }, [code, next, router, searchParams])

  return (
    <main className="min-h-screen flex items-center justify-center bg-amber-50 px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-amber-100 bg-white p-8 text-center shadow-lg">
        {error ? (
          <>
            <h1 className="text-xl font-bold text-stone-900">Sign-in could not be completed</h1>
            <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>
            <Link href="/sign-in" className="mt-6 inline-flex font-semibold text-amber-800 hover:underline">
              Return to sign in
            </Link>
          </>
        ) : (
          <>
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-3 border-amber-600 border-t-transparent" />
            <h1 className="mt-4 text-lg font-semibold text-stone-900">Completing sign in...</h1>
          </>
        )}
      </div>
    </main>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-amber-50" />}>
      <AuthCallbackContent />
    </Suspense>
  )
}