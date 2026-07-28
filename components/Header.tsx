'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useCart } from '@/components/CartProvider'

export default function Header() {
  const { cartCount } = useCart()
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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
            <Link href="/admin" className="text-stone-700 hover:text-amber-700 font-medium transition-colors duration-300">Admin</Link>
          </nav>
          <Link href="/cart" className="md:hidden bg-gradient-to-r from-amber-600 to-orange-600 text-white px-6 py-2 rounded-full font-medium shadow-lg">Order Now</Link>
        </div>
      </div>
    </header>
  )
}