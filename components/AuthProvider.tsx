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
  signInWithPassword: (email: string, password: string) => Promise<{ data: any; error: AuthError | null }>
  signUpWithPassword: (email: string, password: string, name?: string, redirectTo?: string) => Promise<{ data: any; error: AuthError | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isLoggedIn: false,
  signInWithGoogle: async () => ({ error: null }),
  signInWithPassword: async () => ({ data: null, error: null }),
  signUpWithPassword: async () => ({ data: null, error: null }),
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  // Sync Supabase user to server session cookie and database
  const syncServerSession = async (currentSession: Session | null) => {
    if (!currentSession?.user?.email) return
    try {
      await fetch('/api/auth/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: currentSession.access_token,
        }),
      })
    } catch (err) {
      console.warn('[AuthProvider] Sync warning:', err)
    }
  }

  useEffect(() => {
    let supabase: any = null
    try {
      supabase = getSupabaseBrowserClient()
    } catch (err) {
      console.warn('[AuthProvider] Failed to obtain client:', err)
      setLoading(false)
      return
    }

    if (!supabase?.auth) {
      setLoading(false)
      return
    }

    // 1. Fetch initial session safely
    try {
      supabase.auth.getSession().then(({ data }: any) => {
        const session = data?.session ?? null
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
        if (session?.user) {
          syncServerSession(session)
        }
      }).catch((err: any) => {
        console.warn('[AuthProvider] Initial session fetch warning:', err)
        setLoading(false)
      })
    } catch (err) {
      console.warn('[AuthProvider] Session execution warning:', err)
      setLoading(false)
    }

    // 2. Listen to auth state changes safely
    let subscription: { unsubscribe: () => void } | undefined
    try {
      const authRes = supabase.auth.onAuthStateChange(async (event: string, session: Session | null) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)

        if (event === 'SIGNED_IN' && session?.user) {
          syncServerSession(session)
        } else if (event === 'SIGNED_OUT') {
          try {
            await fetch('/api/auth/logout', { method: 'POST' })
          } catch {}
        }
      })
      subscription = authRes?.data?.subscription
    } catch (err) {
      console.warn('[AuthProvider] Auth listener registration warning:', err)
    }

    return () => {
      try {
        subscription?.unsubscribe()
      } catch {}
    }
  }, [])

  const getCallbackUrl = (targetPath?: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const next = targetPath ? encodeURIComponent(targetPath) : encodeURIComponent('/')
    return `${origin}/auth/callback?next=${next}`
  }

  const signInWithGoogle = async (redirectTo?: string) => {
    try {
      const supabase = getSupabaseBrowserClient()
      const callback = getCallbackUrl(redirectTo)
      const { error } = await supabase.auth.signInWithOAuth({
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
    } catch (err: any) {
      return { error: err }
    }
  }

  const signInWithPassword = async (email: string, password: string) => {
    try {
      const supabase = getSupabaseBrowserClient()
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (!error && data?.user) {
        await syncServerSession(data.session)
      }
      return { data, error }
    } catch (err: any) {
      return { data: null, error: err }
    }
  }

  const signUpWithPassword = async (email: string, password: string, name?: string, redirectTo?: string) => {
    try {
      const supabase = getSupabaseBrowserClient()
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: getCallbackUrl(redirectTo),
          data: {
            full_name: name || '',
            name: name || '',
          },
        },
      })
      if (!error && data?.session) {
        await syncServerSession(data.session)
      }
      return { data, error }
    } catch (err: any) {
      return { data: null, error: err }
    }
  }

  const signOut = async () => {
    try {
      const supabase = getSupabaseBrowserClient()
      await supabase.auth.signOut()
    } catch {}
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
