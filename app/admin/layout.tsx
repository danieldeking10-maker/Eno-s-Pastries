'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Lock, KeyRound, ShieldCheck, LogOut, Eye, EyeOff, ArrowLeft, AlertCircle, Sparkles, ShoppingBag, Package, BarChart2, QrCode, LayoutDashboard } from 'lucide-react'

const ADMIN_PASSCODE = 'eno123ama'
const AUTH_STORAGE_KEY = 'enos_admin_authenticated'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [passcode, setPasscode] = useState('')
  const [showPasscode, setShowPasscode] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedAuth = sessionStorage.getItem(AUTH_STORAGE_KEY) || localStorage.getItem(AUTH_STORAGE_KEY)
      if (savedAuth === 'true') {
        setIsAuthenticated(true)
      } else {
        setIsAuthenticated(false)
      }
    }
  }, [])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (passcode.trim() === ADMIN_PASSCODE) {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(AUTH_STORAGE_KEY, 'true')
        localStorage.setItem(AUTH_STORAGE_KEY, 'true')
      }
      setIsAuthenticated(true)
      setPasscode('')
    } else {
      setError('Incorrect admin passcode. Please enter the valid passcode.')
    }
  }

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(AUTH_STORAGE_KEY)
      localStorage.removeItem(AUTH_STORAGE_KEY)
    }
    setIsAuthenticated(false)
    setPasscode('')
    setError(null)
  }

  // Still checking storage on initial render
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center p-4">
        <div className="text-center text-stone-600 font-medium">Verifying authorization...</div>
      </div>
    )
  }

  // If not authenticated, render the Admin Gate Passcode Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-amber-200/80 p-6 sm:p-8 relative overflow-hidden animate-fade-in">
          {/* Top Decorative Banner */}
          <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-700" />

          {/* Back to main site link */}
          <div className="mb-6 flex justify-between items-center">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-xl border border-amber-200 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Shop
            </Link>
            <span className="text-[10px] uppercase tracking-wider font-extrabold text-amber-900 bg-amber-100 px-2.5 py-1 rounded-full border border-amber-200">
              Restricted Area
            </span>
          </div>

          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-600 to-orange-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-amber-600/20">
              <Lock className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black text-amber-950">Eno&apos;s Pastries Admin</h1>
            <p className="text-stone-600 text-xs mt-1.5 leading-relaxed">
              Access to management tools, inventory controls, and order fulfillment is restricted to authorized personnel.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="admin-passcode" className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-amber-600" /> Admin Access Passcode
              </label>
              <div className="relative">
                <input
                  id="admin-passcode"
                  type={showPasscode ? 'text' : 'password'}
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter passcode..."
                  required
                  autoFocus
                  className="w-full pl-4 pr-11 py-3 border-2 border-amber-200 rounded-xl focus:border-amber-600 focus:outline-none text-stone-900 text-sm font-mono transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPasscode(!showPasscode)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1 rounded-md transition-colors cursor-pointer"
                  title={showPasscode ? 'Hide passcode' : 'Show passcode'}
                >
                  {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Authenticate Admin</span>
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-stone-100 text-center">
            <p className="text-[11px] text-stone-400">
              Eno&apos;s Pastries &copy; {new Date().getFullYear()} • Secure Management Station
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Render authenticated layout with top admin bar and children
  return (
    <div className="min-h-screen bg-amber-50">
      {/* Admin Top Security & Navigation Bar */}
      <div className="bg-amber-950 text-amber-100 text-xs py-2 px-4 sm:px-8 flex items-center justify-between shadow-md border-b border-amber-900 gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="flex items-center gap-2 hover:text-amber-300 transition-colors">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono font-semibold tracking-wide text-amber-200">ADMIN CENTER</span>
          </Link>
          <span className="text-amber-700 hidden sm:inline">•</span>
          <span className="text-amber-400/80 hidden sm:inline font-medium">Eno&apos;s Pastries Management</span>
        </div>

        {/* Top Right Admin Navigation Links */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 bg-amber-900/40 hover:bg-amber-900 text-amber-300 hover:text-white px-2.5 py-1 rounded-lg text-xs font-bold transition-colors border border-amber-800/40"
            title="Go to Customer Storefront"
          >
            <span>🥐</span>
            <span>Shop</span>
          </Link>

          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 bg-amber-900/60 hover:bg-amber-900 text-amber-200 hover:text-white px-2.5 py-1 rounded-lg text-xs font-bold transition-colors border border-amber-800/60"
            title="Admin Dashboard Overview"
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Dashboard</span>
          </Link>

          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white px-3 py-1 rounded-lg text-xs font-black shadow-xs transition-all border border-amber-500/50 animate-pulse hover:animate-none"
            title="View & Manage Customer Orders"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Orders</span>
          </Link>

          <Link
            href="/admin/products"
            className="inline-flex items-center gap-1.5 bg-amber-900/60 hover:bg-amber-900 text-amber-200 hover:text-white px-2.5 py-1 rounded-lg text-xs font-bold transition-colors border border-amber-800/60"
            title="Manage Product Inventory"
          >
            <Package className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Products</span>
          </Link>

          <Link
            href="/admin/analytics"
            className="inline-flex items-center gap-1.5 bg-amber-900/60 hover:bg-amber-900 text-amber-200 hover:text-white px-2.5 py-1 rounded-lg text-xs font-bold transition-colors border border-amber-800/60"
            title="View Sales & Analytics"
          >
            <BarChart2 className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Analytics</span>
          </Link>

          <Link
            href="/admin/scan"
            className="inline-flex items-center gap-1.5 bg-amber-900/60 hover:bg-amber-900 text-amber-200 hover:text-white px-2.5 py-1 rounded-lg text-xs font-bold transition-colors border border-amber-800/60"
            title="Scan Order QR Code"
          >
            <QrCode className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Scan QR</span>
          </Link>

          <div className="h-4 w-px bg-amber-800/80 mx-1 hidden sm:block" />

          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 bg-amber-900/80 hover:bg-red-900/80 text-amber-200 hover:text-white px-2.5 py-1 rounded-lg text-xs font-bold transition-colors border border-amber-800 cursor-pointer"
            title="Lock & Exit Admin Mode"
          >
            <LogOut className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Lock</span>
          </button>
        </div>
      </div>

      {children}
    </div>
  )
}
