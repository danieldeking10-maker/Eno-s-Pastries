'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

function GoogleCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const code = searchParams.get('code')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const finishSignIn = async () => {
      const providerError = searchParams.get('error_description') || searchParams.get('error')
      if (providerError) {
        setError(providerError)
        return
      }
      if (!code) {
        setError('Google did not return an authorization code. Please try again.')
        return
      }

      const { data, error: exchangeError } = await getSupabaseBrowserClient().auth.exchangeCodeForSession(code)
      if (exchangeError || !data.session) {
        setError(exchangeError?.message || 'Could not complete Google sign-in. Please try again.')
        return
      }

      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: data.session.access_token }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(result.error || 'Could not create your sign-in session.')
        return
      }

      if (!cancelled) router.replace(result.canAccessAdmin ? '/admin-access' : '/')
    }

    void finishSignIn().catch((reason: unknown) => {
      if (!cancelled) setError(reason instanceof Error ? reason.message : 'Google sign-in failed. Please try again.')
    })

    return () => { cancelled = true }
  }, [code, router, searchParams])

  return (
    <main className="min-h-screen min-h-[100dvh] flex items-center justify-center bg-amber-50 px-4 py-8">
      <section className="w-full max-w-md rounded-2xl border border-amber-100 bg-white p-6 text-center shadow-lg sm:p-8">
        {error ? (
          <>
            <h1 className="text-xl font-bold text-stone-900">Google sign-in failed</h1>
            <p role="alert" className="mt-3 text-sm text-red-800">{error}</p>
            <Link href="/sign-in" className="mt-5 inline-flex min-h-11 items-center font-semibold text-amber-800 hover:underline">Return to sign in</Link>
          </>
        ) : (
          <>
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-amber-700 border-t-transparent" />
            <h1 className="mt-4 text-lg font-semibold text-stone-900">Finishing Google sign-in...</h1>
          </>
        )}
      </section>
    </main>
  )
}

export default function GoogleCallbackPage() {
  return <Suspense fallback={<main className="min-h-screen bg-amber-50" />}><GoogleCallbackContent /></Suspense>
}