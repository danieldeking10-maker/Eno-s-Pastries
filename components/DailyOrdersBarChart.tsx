'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from 'recharts'
import { Calendar, TrendingUp, ShoppingBag, DollarSign, Award, Layers } from 'lucide-react'

type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'DELIVERED' | 'CANCELLED'

export interface OrderItemData {
  productId: string
  quantity: number
  price: number
  product?: { name: string } | null
}

export interface OrderData {
  id: string
  totalAmount: number
  status: OrderStatus
  orderType: 'RETAIL' | 'WHOLESALE'
  createdAt: string
  items?: OrderItemData[]
}

interface DailyOrdersBarChartProps {
  orders: OrderData[]
  loading?: boolean
}

type ViewMode = 'all' | 'split' | 'revenue'

export default function DailyOrdersBarChart({ orders, loading }: DailyOrdersBarChartProps) {
  const [mounted, setMounted] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('all')
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Generate 30 consecutive calendar days ending today
  const chartData = useMemo(() => {
    // Map existing orders by local date string YYYY-MM-DD
    const orderMap: Record<
      string,
      {
        total: number
        retail: number
        wholesale: number
        revenue: number
      }
    > = {}

    orders.forEach((o) => {
      if (!o.createdAt) return
      const orderDate = new Date(o.createdAt)
      if (isNaN(orderDate.getTime())) return

      const year = orderDate.getFullYear()
      const month = String(orderDate.getMonth() + 1).padStart(2, '0')
      const day = String(orderDate.getDate()).padStart(2, '0')
      const key = `${year}-${month}-${day}`

      if (!orderMap[key]) {
        orderMap[key] = { total: 0, retail: 0, wholesale: 0, revenue: 0 }
      }
      orderMap[key].total += 1
      if (o.orderType === 'WHOLESALE') {
        orderMap[key].wholesale += 1
      } else {
        orderMap[key].retail += 1
      }
      orderMap[key].revenue += Number(o.totalAmount || 0)
    })

    const days = []
    const now = new Date()

    for (let i = 29; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)

      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      const key = `${year}-${month}-${day}`

      const entry = orderMap[key] || { total: 0, retail: 0, wholesale: 0, revenue: 0 }
      const isToday = i === 0

      // Only show tick labels every 3-4 days on small screens, formatted as "Sep 20"
      const shortMonthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      const dayLabel = String(d.getDate())

      days.push({
        dateKey: key,
        displayLabel: shortMonthDay,
        dayNumber: dayLabel,
        fullDate: d.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        orders: entry.total,
        retailOrders: entry.retail,
        wholesaleOrders: entry.wholesale,
        revenue: Math.round(entry.revenue * 100) / 100,
        isToday,
      })
    }

    return days
  }, [orders])

  // Summary statistics for last 30 days
  const stats = useMemo(() => {
    const totalOrders = chartData.reduce((sum, d) => sum + d.orders, 0)
    const totalRevenue = chartData.reduce((sum, d) => sum + d.revenue, 0)
    const activeDays = chartData.filter((d) => d.orders > 0).length
    const avgPerDay = (totalOrders / 30).toFixed(1)

    let peakDay = chartData[0]
    chartData.forEach((d) => {
      if (d.orders > (peakDay?.orders || 0)) {
        peakDay = d
      }
    })

    return {
      totalOrders,
      totalRevenue,
      activeDays,
      avgPerDay,
      peakDay,
    }
  }, [chartData])

  // Custom Tooltip component
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-stone-900/95 backdrop-blur-md text-white p-3.5 rounded-2xl shadow-2xl border border-amber-500/30 text-xs min-w-[210px] animate-fade-in pointer-events-none">
          <div className="flex items-center justify-between border-b border-stone-700/80 pb-2 mb-2 gap-2">
            <span className="font-bold text-amber-200">{data.fullDate}</span>
            {data.isToday && (
              <span className="bg-amber-500 text-stone-950 font-black text-[10px] uppercase px-2 py-0.5 rounded-full shrink-0">
                Today
              </span>
            )}
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-stone-200">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block shadow-xs" />
                Orders Placed:
              </span>
              <span className="font-mono font-black text-amber-300 text-sm">{data.orders}</span>
            </div>

            {data.orders > 0 && (
              <>
                <div className="flex items-center justify-between text-stone-400 pl-4 text-[11px]">
                  <span>Retail orders:</span>
                  <span className="font-mono text-stone-200 font-semibold">{data.retailOrders}</span>
                </div>
                <div className="flex items-center justify-between text-stone-400 pl-4 text-[11px]">
                  <span>Wholesale orders:</span>
                  <span className="font-mono text-stone-200 font-semibold">{data.wholesaleOrders}</span>
                </div>
                <div className="flex items-center justify-between text-stone-200 pt-2 border-t border-stone-800">
                  <span className="font-medium text-stone-300">Total Revenue:</span>
                  <span className="font-mono font-bold text-emerald-400">GH₵{data.revenue.toFixed(2)}</span>
                </div>
              </>
            )}

            {data.orders === 0 && (
              <p className="text-stone-400 italic text-[11px] pt-1">No orders recorded on this day.</p>
            )}
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-7 border border-amber-200/80 shadow-md">
      {/* Chart Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight flex items-center gap-2">
              <span>Orders Per Day</span>
              <span className="text-xs sm:text-sm font-semibold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-200">
                Last 30 Days
              </span>
            </h2>
          </div>
          <p className="text-stone-500 text-xs sm:text-sm">
            Daily order volume and fulfillment velocity over the past 30 days
          </p>
        </div>

        {/* View Mode Segmented Controls */}
        <div className="flex items-center gap-1.5 bg-amber-50 p-1.5 rounded-2xl border border-amber-200 self-start lg:self-auto text-xs font-bold">
          <button
            type="button"
            onClick={() => setViewMode('all')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'all'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-amber-900 hover:bg-amber-100/80'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Total Orders</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('split')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'split'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-amber-900 hover:bg-amber-100/80'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Retail vs Wholesale</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('revenue')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'revenue'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-amber-900 hover:bg-amber-100/80'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Daily Revenue</span>
          </button>
        </div>
      </div>

      {/* 30-Day Quick Metric Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className="bg-amber-50/70 border border-amber-100 rounded-2xl p-3.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block">
            30-Day Total Orders
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-amber-950">{stats.totalOrders}</span>
            <span className="text-xs text-amber-700 font-semibold">orders</span>
          </div>
        </div>

        <div className="bg-amber-50/70 border border-amber-100 rounded-2xl p-3.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block">
            Daily Average
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-stone-900">{stats.avgPerDay}</span>
            <span className="text-xs text-stone-500 font-medium">orders/day</span>
          </div>
        </div>

        <div className="bg-amber-50/70 border border-amber-100 rounded-2xl p-3.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block">
            Peak Order Day
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-amber-900">{stats.peakDay?.orders || 0}</span>
            <span className="text-xs text-stone-600 font-medium truncate">
              ({stats.peakDay?.displayLabel || 'N/A'})
            </span>
          </div>
        </div>

        <div className="bg-amber-50/70 border border-amber-100 rounded-2xl p-3.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block">
            30-Day Revenue
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-emerald-800">
              GH₵{stats.totalRevenue.toFixed(0)}
            </span>
          </div>
        </div>
      </div>

      {/* Recharts Bar Chart Container */}
      <div className="w-full h-80 sm:h-96 relative">
        {!mounted || loading ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-stone-50/50 rounded-2xl border border-dashed border-stone-200">
            <div className="w-8 h-8 border-3 border-amber-600 border-t-transparent rounded-full animate-spin mb-3" />
            <span className="text-xs text-stone-500 font-medium">Rendering 30-day orders visualization...</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 15, right: 10, left: -15, bottom: 25 }}
              onMouseMove={(state: any) => {
                if (state && state.activeTooltipIndex !== undefined) {
                  setHoveredBarIndex(state.activeTooltipIndex)
                } else {
                  setHoveredBarIndex(null)
                }
              }}
              onMouseLeave={() => setHoveredBarIndex(null)}
            >
              <defs>
                <linearGradient id="orderBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#d97706" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#b45309" stopOpacity={0.8} />
                </linearGradient>
                <linearGradient id="orderBarHoverGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={1} />
                  <stop offset="100%" stopColor="#d97706" stopOpacity={0.9} />
                </linearGradient>
                <linearGradient id="retailGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#d97706" stopOpacity={0.85} />
                </linearGradient>
                <linearGradient id="wholesaleGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#854d0e" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#451a03" stopOpacity={0.85} />
                </linearGradient>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#059669" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#047857" stopOpacity={0.8} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />

              <XAxis
                dataKey="displayLabel"
                tickLine={false}
                axisLine={{ stroke: '#e5e7eb' }}
                tick={{ fill: '#78716c', fontSize: 11 }}
                interval="preserveStartEnd"
                minTickGap={24}
                dy={8}
              />

              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={{ stroke: '#e5e7eb' }}
                tick={{ fill: '#78716c', fontSize: 11 }}
                tickFormatter={(val) => (viewMode === 'revenue' ? `₵${val}` : `${val}`)}
              />

              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(251, 191, 36, 0.08)' }} />

              {viewMode === 'all' && (
                <Bar
                  dataKey="orders"
                  name="Orders"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={38}
                  animationDuration={800}
                >
                  {chartData.map((entry, index) => {
                    const isHovered = hoveredBarIndex === index
                    const fill = isHovered
                      ? 'url(#orderBarHoverGrad)'
                      : entry.isToday
                      ? '#ea580c'
                      : entry.orders === 0
                      ? '#e7e5e4'
                      : 'url(#orderBarGrad)'
                    return <Cell key={`cell-${index}`} fill={fill} />
                  })}
                </Bar>
              )}

              {viewMode === 'split' && (
                <>
                  <Bar
                    dataKey="retailOrders"
                    name="Retail Orders"
                    stackId="orders"
                    fill="url(#retailGrad)"
                    maxBarSize={38}
                    animationDuration={800}
                  />
                  <Bar
                    dataKey="wholesaleOrders"
                    name="Wholesale Orders"
                    stackId="orders"
                    radius={[6, 6, 0, 0]}
                    fill="url(#wholesaleGrad)"
                    maxBarSize={38}
                    animationDuration={800}
                  />
                </>
              )}

              {viewMode === 'revenue' && (
                <Bar
                  dataKey="revenue"
                  name="Revenue (GH₵)"
                  radius={[6, 6, 0, 0]}
                  fill="url(#revenueGrad)"
                  maxBarSize={38}
                  animationDuration={800}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Chart Footer Legend & Notes */}
      <div className="mt-4 pt-4 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-stone-500">
        <div className="flex items-center gap-4 flex-wrap">
          {viewMode === 'all' && (
            <>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-amber-600" />
                <span>Standard Days</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-orange-600" />
                <span>Today</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-stone-300" />
                <span>0 Orders</span>
              </div>
            </>
          )}

          {viewMode === 'split' && (
            <>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-amber-500" />
                <span>Retail Orders</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-amber-900" />
                <span>Wholesale Orders</span>
              </div>
            </>
          )}

          {viewMode === 'revenue' && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-emerald-600" />
              <span>Daily Revenue (Ghana Cedis GH₵)</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-stone-400">
          <Calendar className="w-3.5 h-3.5" />
          <span>Synced live with store orders</span>
        </div>
      </div>
    </div>
  )
}
