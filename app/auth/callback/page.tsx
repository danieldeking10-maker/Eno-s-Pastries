'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const code = searchParams.get('code')
  const requestedNext = searchParams.get('next') || '/'
  const next = requestedNext.startsWith('/') && !requestedNext.startsWith('//') ? requestedNext : '/'
  const providerError = searchParams.get('error_description') || searchParams.get('error')
  const [error, setError] = useState<string | null>(null)
  const completionRef = useRef<{ key: string; promise: Promise<void> } | null>(null)

  useEffect(() => {
    let cancelled = false
    const callbackKey = `${code || ''}:${providerError || ''}`

    const completeSignIn = async () => {
      if (providerError && !code) {
        throw new Error('Google sign-in was interrupted or this link was already used. Return to sign-in and try again.')
      }

      const supabase = getSupabaseBrowserClient()
      let session = null

      if (code) {
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        session = data.session

        if (!session && exchangeError) {
          const { data: existingSession } = await supabase.auth.getSession()
          session = existingSession.session
          if (!session) throw exchangeError
        }
      } else {
        const { data } = await supabase.auth.getSession()
        session = data.session
        if (!session) {
          throw new Error(providerError || 'This sign-in link has already been used. Start a new Google sign-in.')
        }
      }

      if (!session) {
        throw new Error('Google did not return an active session. Please try signing in again.')
      }

      const response = await fetch('/api/auth/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: session.access_token }),
      })

      if (!response.ok) {
        const result = await response.json().catch(() => ({}))
        throw new Error(result.error || 'Your account was verified, but sign in could not be completed.')
      }
    }

    if (!completionRef.current || completionRef.current.key !== callbackKey) {
      completionRef.current = { key: callbackKey, promise: completeSignIn() }
    }

    completionRef.current.promise
      .then(() => {
        if (!cancelled) router.replace(next)
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : 'Could not complete sign in. Please try again.')
      })

    return () => {
      cancelled = true
    }
  }, [code, next, providerError, router])

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