import Link from 'next/link'
import { LayoutDashboard, ShoppingBag, Package, BarChart2, QrCode } from 'lucide-react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-amber-50">
      {/* Admin Top Navigation Bar */}
      <div className="bg-amber-950 text-amber-100 text-xs py-2.5 px-4 sm:px-8 flex items-center justify-between shadow-md border-b border-amber-900 gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="flex items-center gap-2 hover:text-amber-300 transition-colors">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono font-bold tracking-wide text-amber-200">ADMIN CENTER</span>
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
            className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white px-3 py-1 rounded-lg text-xs font-black shadow-xs transition-all border border-amber-500/50"
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
        </div>
      </div>

      {children}
    </div>
  )
}
