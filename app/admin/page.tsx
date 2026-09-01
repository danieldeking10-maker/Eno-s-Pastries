import Link from 'next/link'
import DeliveryClusterMap from '@/components/DeliveryClusterMap'
import SupabaseSyncBanner from '@/components/SupabaseSyncBanner'
import { Package, ShoppingBag, BarChart2, QrCode, Truck, Sparkles } from 'lucide-react'

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-amber-50/70 pb-16">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-amber-950 via-amber-900 to-orange-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-amber-800/80">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-amber-500/20 text-amber-300 font-extrabold text-[11px] uppercase tracking-widest px-3 py-1 rounded-full border border-amber-400/30 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Admin Command Station
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-amber-50 tracking-tight">
              Admin Overview & Operations
            </h1>
            <p className="text-amber-200/80 text-sm mt-1 max-w-2xl">
              Monitor customer orders, track real-time delivery clusters across Greater Accra, manage bakery inventory, and analyze store revenue.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Link
              href="/admin/orders"
              className="px-5 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-amber-950 rounded-2xl font-black text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Manage All Orders</span>
            </Link>
          </div>
        </div>

        {/* Supabase Database Connection & Sync Status */}
        <SupabaseSyncBanner />

        {/* Quick Admin Navigation Hub */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/admin/orders"
            className="group bg-white rounded-2xl p-5 border border-amber-200/80 shadow-xs hover:shadow-md hover:border-amber-400 transition-all flex items-center gap-4"
          >
            <div className="w-12 h-12 bg-amber-100 group-hover:bg-amber-500 text-amber-900 group-hover:text-white rounded-2xl flex items-center justify-center transition-colors shrink-0">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-stone-900 group-hover:text-amber-800 transition-colors">Orders</h2>
              <p className="text-stone-500 text-xs mt-0.5">Fulfill & update statuses</p>
            </div>
          </Link>

          <Link
            href="/admin/products"
            className="group bg-white rounded-2xl p-5 border border-amber-200/80 shadow-xs hover:shadow-md hover:border-amber-400 transition-all flex items-center gap-4"
          >
            <div className="w-12 h-12 bg-amber-100 group-hover:bg-amber-500 text-amber-900 group-hover:text-white rounded-2xl flex items-center justify-center transition-colors shrink-0">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-stone-900 group-hover:text-amber-800 transition-colors">Products</h2>
              <p className="text-stone-500 text-xs mt-0.5">Manage bakery catalog</p>
            </div>
          </Link>

          <Link
            href="/admin/analytics"
            className="group bg-white rounded-2xl p-5 border border-amber-200/80 shadow-xs hover:shadow-md hover:border-amber-400 transition-all flex items-center gap-4"
          >
            <div className="w-12 h-12 bg-amber-100 group-hover:bg-amber-500 text-amber-900 group-hover:text-white rounded-2xl flex items-center justify-center transition-colors shrink-0">
              <BarChart2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-stone-900 group-hover:text-amber-800 transition-colors">Analytics</h2>
              <p className="text-stone-500 text-xs mt-0.5">Sales & product insights</p>
            </div>
          </Link>

          <Link
            href="/admin/scan"
            className="group bg-white rounded-2xl p-5 border border-amber-200/80 shadow-xs hover:shadow-md hover:border-amber-400 transition-all flex items-center gap-4"
          >
            <div className="w-12 h-12 bg-amber-100 group-hover:bg-amber-500 text-amber-900 group-hover:text-white rounded-2xl flex items-center justify-center transition-colors shrink-0">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-stone-900 group-hover:text-amber-800 transition-colors">Scan QR</h2>
              <p className="text-stone-500 text-xs mt-0.5">Verify order receipts</p>
            </div>
          </Link>
        </div>

        {/* Featured Daily Delivery Route & Cluster Map Summary View */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-600 to-orange-600 text-white flex items-center justify-center shadow-xs">
                <Truck className="w-4 h-4" />
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight">
                Daily Delivery Cluster Map
              </h2>
            </div>
            <span className="text-xs font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-full border border-amber-200">
              Accra Dispatch
            </span>
          </div>

          <DeliveryClusterMap />
        </section>
      </main>
    </div>
  )
}
