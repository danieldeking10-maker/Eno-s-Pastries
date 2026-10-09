'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useCart } from '@/components/CartProvider'

export default function Header() {
  const { cartCount } = useCart()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

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
        setIsAuthenticated(data?.authenticated === true)
      } catch {
        setIsAuthenticated(false)
      }
    }
    checkAuth()

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined)
    setIsAuthenticated(false)
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
            {isAuthenticated === null ? (
              <span className="text-stone-400 text-sm">Loading...</span>
            ) : isAuthenticated ? (
              <>
                <Link href="/admin" className="text-stone-700 hover:text-amber-700 font-medium transition-colors duration-300 flex items-center gap-1">
                  🔐 Admin
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-stone-700 hover:text-amber-700 font-medium transition-colors duration-300 flex items-center gap-1"
                >
                  🚪 Logout
                </button>
              </>
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
            {isAuthenticated ? (
              <>
                <Link href="/admin" className="bg-amber-100 hover:bg-amber-200 text-amber-900 border-2 border-amber-300 px-3 py-1.5 rounded-full font-medium text-sm transition-all duration-300">
                  Admin
                </Link>
                <button
                  onClick={handleLogout}
                  className="bg-stone-100 hover:bg-stone-200 text-stone-700 border-2 border-stone-300 px-3 py-1.5 rounded-full font-medium text-sm transition-all duration-300"
                >
                  Logout
                </button>
              </>
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