'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useCart } from '@/components/CartProvider'

export default function Header() {
  const { cartCount } = useCart()
  const [isScrolled, setIsScrolled] = useState(false)
<<<<<<< HEAD
  const [authState, setAuthState] = useState<{
    signedIn: boolean
    email: string | null
    isAdmin: boolean
  } | null>(null)
=======
  const [authData, setAuthData] = useState<{ signedIn: boolean; canAccessAdmin: boolean; email: string | null } | null>(null)
>>>>>>> fa1e5daf740243493ffb201daae84fd8baadd0fd

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)

    // Check auth status
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/session', { cache: 'no-store' })
        const data = await res.json().catch(() => ({}))
<<<<<<< HEAD
        if (data?.signedIn) {
          setAuthState({
            signedIn: true,
            email: data.email || null,
            isAdmin: Boolean(data.isAdmin || data.canAccessAdmin),
          })
        } else {
          setAuthState({ signedIn: false, email: null, isAdmin: false })
        }
      } catch {
        setAuthState({ signedIn: false, email: null, isAdmin: false })
=======
        setAuthData({
          signedIn: data?.signedIn === true || data?.authenticated === true,
          canAccessAdmin: data?.canAccessAdmin === true,
          email: data?.email || null,
        })
      } catch {
        setAuthData({ signedIn: false, canAccessAdmin: false, email: null })
>>>>>>> fa1e5daf740243493ffb201daae84fd8baadd0fd
      }
    }
    checkAuth()

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined)
<<<<<<< HEAD
    setAuthState({ signedIn: false, email: null, isAdmin: false })
=======
    setAuthData({ signedIn: false, canAccessAdmin: false, email: null })
>>>>>>> fa1e5daf740243493ffb201daae84fd8baadd0fd
    window.location.href = '/'
  }

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'nav-scrolled' : ''
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center">
              <span className="text-2xl">🥐</span>
            </div>
            <span className="text-2xl font-bold text-amber-900">Eno&apos;s Pastries</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/" className="text-stone-700 hover:text-amber-700 font-medium transition-colors duration-300">Home</Link>
            <Link href="/products" className="text-stone-700 hover:text-amber-700 font-medium transition-colors duration-300">Products</Link>
            <Link href="/dashboard" className="text-stone-700 hover:text-amber-700 font-medium transition-colors duration-300 flex items-center gap-1">
              📋 Dashboard
            </Link>
            <Link href="/cart" className="text-stone-700 hover:text-amber-700 font-medium transition-colors duration-300 flex items-center gap-1">
              🛒 Cart {cartCount > 0 && (
                <span className="bg-amber-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">{cartCount}</span>
              )}
            </Link>
<<<<<<< HEAD
            {authState === null ? (
              <span className="text-stone-400 text-sm">Loading...</span>
            ) : authState.signedIn ? (
              <div className="flex items-center gap-4">
                {authState.isAdmin && (
                  <Link href="/admin" className="text-stone-700 hover:text-amber-700 font-semibold transition-colors duration-300 flex items-center gap-1 bg-amber-100 hover:bg-amber-200 border border-amber-300 px-3 py-1.5 rounded-full text-sm">
                    🔐 Admin Panel
                  </Link>
                )}
                <span className="text-stone-700 font-medium text-sm flex items-center gap-1 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200">
                  👤 {authState.email ? authState.email.split('@')[0] : 'Account'}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-stone-700 hover:text-amber-700 font-medium transition-colors duration-300 flex items-center gap-1 cursor-pointer"
=======
            {authData === null ? (
              <span className="text-stone-400 text-sm">Loading...</span>
            ) : authData.signedIn ? (
              <>
                {authData.canAccessAdmin && (
                  <Link href="/admin" className="text-amber-800 hover:text-amber-950 font-bold transition-colors duration-300 flex items-center gap-1 bg-amber-100/70 hover:bg-amber-100 px-2.5 py-1 rounded-lg text-xs">
                    🔐 Admin
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="text-stone-700 hover:text-red-700 font-medium transition-colors duration-300 flex items-center gap-1 cursor-pointer"
>>>>>>> fa1e5daf740243493ffb201daae84fd8baadd0fd
                >
                  🚪 Logout
                </button>
              </div>
            ) : (
              <Link href="/sign-in" className="text-stone-700 hover:text-amber-700 font-medium transition-colors duration-300 flex items-center gap-1">
                👤 Sign In
              </Link>
            )}
          </nav>
          <div className="md:hidden flex items-center gap-3">
            <Link href="/cart" className="bg-gradient-to-r from-amber-600 to-orange-600 text-white px-4 py-2 rounded-full font-medium shadow-lg">
              Order Now
            </Link>
<<<<<<< HEAD
            {authState?.signedIn ? (
              <div className="flex items-center gap-2">
                {authState.isAdmin && (
=======
            {authData?.signedIn ? (
              <>
                {authData.canAccessAdmin && (
>>>>>>> fa1e5daf740243493ffb201daae84fd8baadd0fd
                  <Link href="/admin" className="bg-amber-100 hover:bg-amber-200 text-amber-900 border-2 border-amber-300 px-3 py-1.5 rounded-full font-medium text-sm transition-all duration-300">
                    Admin
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="bg-stone-100 hover:bg-stone-200 text-stone-700 border-2 border-stone-300 px-3 py-1.5 rounded-full font-medium text-sm transition-all duration-300 cursor-pointer"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link href="/sign-in" className="bg-gradient-to-r from-amber-600 to-orange-600 text-white px-4 py-2 rounded-full font-medium shadow-lg">
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}