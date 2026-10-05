'use client'

import { useState } from 'react'
import { useAuth } from '@/components/AuthProvider'

interface SocialAuthButtonsProps {
  redirectTo?: string
  mode?: 'signin' | 'signup'
  onLoadingChange?: (loading: boolean) => void
  onError?: (err: string | null) => void
}

export default function SocialAuthButtons({
  redirectTo = '/',
  mode = 'signin',
  onLoadingChange,
  onError,
}: SocialAuthButtonsProps) {
  const { signInWithGoogle } = useAuth()
  const [activeProvider, setActiveProvider] = useState<'google' | null>(null)

  const handleGoogle = async () => {
    try {
      setActiveProvider('google')
      onLoadingChange?.(true)
      onError?.(null)
      const { error } = await signInWithGoogle(redirectTo)
      if (error) {
        onError?.(error.message || 'Google sign in failed')
        setActiveProvider(null)
        onLoadingChange?.(false)
      }
    } catch (err: any) {
      onError?.(err?.message || 'Failed to initiate Google sign in')
      setActiveProvider(null)
      onLoadingChange?.(false)
    }
  }

  const actionText = mode === 'signup' ? 'Sign up' : 'Sign in'

  return (
    <div className="space-y-3 w-full">
      {/* Google Sign In Button */}
      <button
        type="button"
        onClick={handleGoogle}
        disabled={activeProvider !== null}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-stone-50 text-stone-700 font-semibold text-sm rounded-xl border border-stone-200 shadow-xs hover:shadow-md hover:border-stone-300 transition-all duration-200 disabled:opacity-60 cursor-pointer"
        title={`${actionText} with Google`}
      >
        {activeProvider === 'google' ? (
          <div className="w-5 h-5 border-2 border-stone-300 border-t-amber-600 rounded-full animate-spin" />
        ) : (
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.14z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.98 0 12s.45 3.84 1.25 5.42l4.03-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
        )}
        <span>
          {activeProvider === 'google'
            ? 'Connecting to Google...'
            : `Continue with Google`}
        </span>
      </button>

      {/* Divider */}
      <div className="relative py-2">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-stone-200" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-3 text-stone-400 font-medium tracking-wider">
            or continue with email
          </span>
        </div>
      </div>
    </div>
  )
}
