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
  const { signInWithGoogle, signInWithApple } = useAuth()
  const [activeProvider, setActiveProvider] = useState<'google' | 'apple' | null>(null)

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

  const handleApple = async () => {
    try {
      setActiveProvider('apple')
      onLoadingChange?.(true)
      onError?.(null)
      const { error } = await signInWithApple(redirectTo)
      if (error) {
        onError?.(error.message || 'Apple sign in failed')
        setActiveProvider(null)
        onLoadingChange?.(false)
      }
    } catch (err: any) {
      onError?.(err?.message || 'Failed to initiate Apple sign in')
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

      {/* Apple Sign In Button */}
      <button
        type="button"
        onClick={handleApple}
        disabled={activeProvider !== null}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-stone-900 hover:bg-black text-white font-semibold text-sm rounded-xl shadow-xs hover:shadow-md transition-all duration-200 disabled:opacity-60 cursor-pointer"
        title={`${actionText} with Apple`}
      >
        {activeProvider === 'apple' ? (
          <div className="w-5 h-5 border-2 border-stone-600 border-t-white rounded-full animate-spin" />
        ) : (
          <svg className="w-5 h-5 shrink-0 fill-current text-white" viewBox="0 0 170 170">
            <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.7-7.76-12-14.16-5.46-8.15-9.74-17.5-12.85-28.06-3.1-10.55-4.66-20.73-4.66-30.54 0-14.45 3.54-26.65 10.63-36.6 7.09-9.95 16.32-15.02 27.69-15.22 4.8 0 10.37 1.34 16.71 4.02 6.34 2.68 10.32 4.07 11.95 4.17 1.63-.1 5.86-1.57 12.69-4.42 6.83-2.85 12.23-4.14 16.21-3.87 12.24.87 21.84 5.38 28.79 13.54-10.88 6.53-16.19 15.77-15.93 27.72.26 9.47 3.86 17.5 10.8 24.1 6.94 6.6 15.22 10.22 24.84 10.85-2.28 6.86-5.27 14.07-8.97 21.63zM119.22 33.39c0-6.73 2.45-13.14 7.35-19.24 4.9-6.09 11.02-10.34 18.36-12.74.33 2.17.49 4.13.49 5.87 0 6.63-2.6 13.15-7.8 19.57-5.2 6.41-11.3 10.43-18.3 12.06-.06-1.85-.1-3.69-.1-5.52z" />
          </svg>
        )}
        <span>
          {activeProvider === 'apple'
            ? 'Connecting to Apple...'
            : `Continue with Apple`}
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
