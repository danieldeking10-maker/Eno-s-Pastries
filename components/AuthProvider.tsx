'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  isLoggedIn: boolean
  signInWithGoogle: (redirectTo?: string) => Promise<{ error: AuthError | null }>
  signInWithApple: (redirectTo?: string) => Promise<{ error: AuthError | null }>
  signInWithPassword: (email: string, password: string) => Promise<{ data: any; error: AuthError | null }>
  signUpWithPassword: (email: string, password: string, name?: string) => Promise<{ data: any; error: AuthError | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isLoggedIn: false,
  signInWithGoogle: async () => ({ error: null }),
  signInWithApple: async () => ({ error: null }),
  signInWithPassword: async () => ({ data: null, error: null }),
  signUpWithPassword: async () => ({ data: null, error: null }),
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  // Sync Supabase user to server session cookie and database
  const syncServerSession = async (currentUser: User | null) => {
    if (!currentUser?.email) return
    try {
      await fetch('/api/auth/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: currentUser.email,
          name: currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || '',
        }),
      })
    } catch (err) {
      console.warn('[AuthProvider] Sync warning:', err)
    }
  }

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()

    // 1. Fetch initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
      if (session?.user) {
        syncServerSession(session.user)
      }
    })

    // 2. Listen to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)

      if (event === 'SIGNED_IN' && session?.user) {
        syncServerSession(session.user)
      } else if (event === 'SIGNED_OUT') {
        try {
          await fetch('/api/auth/logout', { method: 'POST' })
        } catch {}
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const getCallbackUrl = (targetPath?: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const next = targetPath ? encodeURIComponent(targetPath) : encodeURIComponent('/')
    return `${origin}/auth/callback?next=${next}`
  }

  const signInWithGoogle = async (redirectTo?: string) => {
    const supabase = getSupabaseBrowserClient()
    const callback = getCallbackUrl(redirectTo)
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: callback,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })
    return { error }
  }

  const signInWithApple = async (redirectTo?: string) => {
    const supabase = getSupabaseBrowserClient()
    const callback = getCallbackUrl(redirectTo)
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: callback,
      },
    })
    return { error }
  }

  const signInWithPassword = async (email: string, password: string) => {
    const supabase = getSupabaseBrowserClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (!error && data.user) {
      await syncServerSession(data.user)
    }
    return { data, error }
  }

  const signUpWithPassword = async (email: string, password: string, name?: string) => {
    const supabase = getSupabaseBrowserClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name || '',
          name: name || '',
        },
      },
    })
    if (!error && data.user) {
      await syncServerSession(data.user)
    }
    return { data, error }
  }

  const signOut = async () => {
    const supabase = getSupabaseBrowserClient()
    await supabase.auth.signOut()
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {}
    setUser(null)
    setSession(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isLoggedIn: !!user,
        signInWithGoogle,
        signInWithApple,
        signInWithPassword,
        signUpWithPassword,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
