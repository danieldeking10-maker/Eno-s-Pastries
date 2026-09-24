'use client'

import { useEffect, useState, useCallback } from 'react'
import DailyOrdersBarChart, { OrderData } from '@/components/DailyOrdersBarChart'
import { BarChart3, RefreshCw, ShoppingBag, Clock, CheckCircle2, TrendingUp, Sparkles } from 'lucide-react'

export default function AdminAnalyticsPage() {
  const [orders, setOrders] = useState<OrderData[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true)
    try {
      const res = await fetch('/api/orders', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json().catch(() => [])
        setOrders(Array.isArray(data) ? data : [])
      }
    } catch (err) {
      console.error('Failed to load analytics data:', err)
    } finally {
      setLoading(false)
      if (isManualRefresh) setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0)
  const totalOrders = orders.length
  const completedOrders = orders.filter((o) => o.status === 'DELIVERED' || o.status === 'READY').length
  const pendingOrders = orders.filter((o) => o.status === 'PENDING' || o.status === 'PREPARING').length
  const retailOrdersCount = orders.filter((o) => o.orderType === 'RETAIL').length
  const wholesaleOrdersCount = orders.filter((o) => o.orderType === 'WHOLESALE').length

  // Calculate top products
  const productSales: Record<string, { name: string; count: number; revenue: number }> = {}
  orders.forEach((o) => {
    o.items?.forEach((item) => {
      const name = item.product?.name || item.productId || 'Unknown Item'
      if (!productSales[name]) {
        productSales[name] = { name, count: 0, revenue: 0 }
      }
      productSales[name].count += item.quantity || 1
      productSales[name].revenue += (item.price || 0) * (item.quantity || 1)
    })
  })

  const sortedProducts = Object.values(productSales).sort((a, b) => b.revenue - a.revenue)

  return (
    <div className="min-h-screen bg-amber-50/70 pb-16">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-amber-100 text-amber-900 font-extrabold text-[11px] uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-amber-200 flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-amber-700" /> Store Insights
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-amber-950 tracking-tight">
              Analytics & Performance
            </h1>
            <p className="text-stone-600 text-xs sm:text-sm mt-1">
              Analyze daily order trends, fulfillment velocity, and product sales.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={loading || refreshing}
              className="px-4 py-2 bg-white hover:bg-amber-50 text-stone-700 hover:text-amber-900 border border-amber-200/80 rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              title="Refresh order analytics"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-amber-600' : ''}`} />
              <span>{refreshing ? 'Updating...' : 'Refresh Data'}</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-amber-200/80 shadow-xs space-y-3">
            <div className="w-9 h-9 border-3 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-stone-600 text-sm font-medium">Gathering bakery analytics...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xs border border-amber-200/80 p-5 sm:p-6 transition-all hover:shadow-md">
                <div className="flex items-center justify-between text-stone-500 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Total Revenue</span>
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-black text-amber-900 tracking-tight">
                  GH₵{totalRevenue.toFixed(2)}
                </p>
                <p className="text-[11px] text-stone-500 mt-1 font-medium">Across all completed & pending orders</p>
              </div>

              <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xs border border-amber-200/80 p-5 sm:p-6 transition-all hover:shadow-md">
                <div className="flex items-center justify-between text-stone-500 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Total Orders</span>
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
                  {totalOrders}
                </p>
                <div className="flex items-center gap-2 text-[11px] text-stone-500 mt-1">
                  <span>{retailOrdersCount} retail</span>
                  <span>•</span>
                  <span>{wholesaleOrdersCount} wholesale</span>
                </div>
              </div>

              <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xs border border-amber-200/80 p-5 sm:p-6 transition-all hover:shadow-md">
                <div className="flex items-center justify-between text-stone-500 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Active Pipeline</span>
                  <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-800 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-black text-orange-600 tracking-tight">
                  {pendingOrders}
                </p>
                <p className="text-[11px] text-stone-500 mt-1 font-medium">Pending & preparing in kitchen</p>
              </div>

              <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xs border border-amber-200/80 p-5 sm:p-6 transition-all hover:shadow-md">
                <div className="flex items-center justify-between text-stone-500 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Fulfilled Orders</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-black text-emerald-700 tracking-tight">
                  {completedOrders}
                </p>
                <p className="text-[11px] text-stone-500 mt-1 font-medium">Ready for pickup or delivered</p>
              </div>
            </div>

            {/* Recharts Bar Chart: Daily Orders Over Last 30 Days */}
            <DailyOrdersBarChart orders={orders} loading={loading} />

            {/* Top Selling Products */}
            <div className="bg-white rounded-3xl shadow-xs border border-amber-200/80 p-6 sm:p-8">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
                    Top Performing Bakery Items
                  </h2>
                  <p className="text-stone-500 text-xs sm:text-sm mt-0.5">
                    Breakdown of items generating the most customer demand and revenue
                  </p>
                </div>
              </div>

              {sortedProducts.length === 0 ? (
                <div className="text-center py-8 text-stone-500 text-sm">
                  No order items recorded yet.
                </div>
              ) : (
                <div className="divide-y divide-amber-100/80">
                  {sortedProducts.map((p, idx) => {
                    const percentage = totalRevenue > 0 ? ((p.revenue / totalRevenue) * 100).toFixed(1) : '0'
                    return (
                      <div key={idx} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="w-7 h-7 rounded-xl bg-amber-100 text-amber-900 font-black text-xs flex items-center justify-center shrink-0">
                            #{idx + 1}
                          </span>
                          <div>
                            <p className="font-extrabold text-stone-900 text-sm">{p.name}</p>
                            <p className="text-xs text-stone-500 mt-0.5">
                              {p.count} units sold • {percentage}% of total sales
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 sm:text-right">
                          <div className="sm:text-right">
                            <p className="font-black text-amber-900 text-base">GH₵{p.revenue.toFixed(2)}</p>
                            <p className="text-[11px] text-stone-400">Total generated</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

