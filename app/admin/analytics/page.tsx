'use client'

import { useEffect, useState } from 'react'
import Header from '@/components/Header'

type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'DELIVERED' | 'CANCELLED'

type Order = {
  id: string
  totalAmount: number
  status: OrderStatus
  orderType: 'RETAIL' | 'WHOLESALE'
  createdAt: string
  items: Array<{
    productId: string
    quantity: number
    price: number
    product?: { name: string } | null
  }>
}

export default function AdminAnalyticsPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/orders', { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json().catch(() => ([]))
          setOrders(Array.isArray(data) ? data : [])
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0)
  const totalOrders = orders.length
  const completedOrders = orders.filter((o) => o.status === 'DELIVERED' || o.status === 'READY').length
  const pendingOrders = orders.filter((o) => o.status === 'PENDING' || o.status === 'PREPARING').length

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
    <div className="min-h-screen bg-amber-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-amber-900 mb-2">Analytics & Reports</h1>
          <p className="text-amber-700">Track performance and customer orders</p>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading analytics...</div>
        ) : (
          <div className="space-y-8">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow-md p-6">
                <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                <p className="text-3xl font-bold text-amber-800 mt-2">GH₵{totalRevenue.toFixed(2)}</p>
              </div>
              <div className="bg-white rounded-xl shadow-md p-6">
                <p className="text-sm font-medium text-gray-500">Total Orders</p>
                <p className="text-3xl font-bold text-amber-800 mt-2">{totalOrders}</p>
              </div>
              <div className="bg-white rounded-xl shadow-md p-6">
                <p className="text-sm font-medium text-gray-500">Pending Orders</p>
                <p className="text-3xl font-bold text-orange-600 mt-2">{pendingOrders}</p>
              </div>
              <div className="bg-white rounded-xl shadow-md p-6">
                <p className="text-sm font-medium text-gray-500">Fulfilled Orders</p>
                <p className="text-3xl font-bold text-green-700 mt-2">{completedOrders}</p>
              </div>
            </div>

            {/* Top Selling Products */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold text-stone-800 mb-4">Top Performing Items</h2>
              {sortedProducts.length === 0 ? (
                <p className="text-stone-500 py-4">No order items recorded yet.</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {sortedProducts.map((p, idx) => (
                    <div key={idx} className="py-3 flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-stone-800">{p.name}</p>
                        <p className="text-sm text-stone-500">{p.count} units sold</p>
                      </div>
                      <p className="font-bold text-amber-700">GH₵{p.revenue.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
