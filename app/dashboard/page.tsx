'use client'

import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import Header from '@/components/Header'
import Link from 'next/link'
import { useCart } from '@/components/CartProvider'
import { QRCodeSVG } from 'qrcode.react'
import {
  Search,
  Printer,
  X,
  Copy,
  Check,
  ShoppingBag,
  RotateCcw,
  Clock,
  CheckCircle2,
  Package,
  Truck,
  Sparkles,
  Phone,
  Mail,
  Filter,
  User,
  QrCode,
  ExternalLink,
  XCircle,
  Bell,
} from 'lucide-react'

type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'DELIVERED' | 'CANCELLED'

interface OrderItem {
  id: string
  quantity: number
  price: number | string
  product?: {
    id: string
    name: string
    description?: string | null
    price: number | string
    category: string
    imageUrl?: string | null
  } | null
  productId: string
}

interface Order {
  id: string
  totalAmount: number | string
  status: OrderStatus
  orderType: string
  deliveryType: string
  deliveryAddress?: string | null
  deliveryDate?: string | null
  customerName: string
  customerEmail: string
  customerPhone: string
  createdAt: string
  items: OrderItem[]
}

const statusColors: Record<OrderStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
  CONFIRMED: 'bg-blue-100 text-blue-800 border border-blue-200',
  PREPARING: 'bg-purple-100 text-purple-800 border border-purple-200',
  READY: 'bg-amber-100 text-amber-900 border border-amber-300 font-bold',
  DELIVERED: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  CANCELLED: 'bg-red-100 text-red-800 border border-red-200',
}

const statusIcons: Record<OrderStatus, React.ReactNode> = {
  PENDING: <Clock className="w-4 h-4 text-yellow-600" />,
  CONFIRMED: <CheckCircle2 className="w-4 h-4 text-blue-600" />,
  PREPARING: <Package className="w-4 h-4 text-purple-600" />,
  READY: <Sparkles className="w-4 h-4 text-amber-600" />,
  DELIVERED: <Truck className="w-4 h-4 text-emerald-600" />,
  CANCELLED: <X className="w-4 h-4 text-red-600" />,
}

const TIMELINE_STEPS = [
  { key: 'ORDERED', label: 'Ordered', sublabel: 'Order received', icon: ShoppingBag },
  { key: 'PREPARING', label: 'Preparing', sublabel: 'Freshly baking', icon: Package },
  { key: 'READY', label: 'Ready', sublabel: 'Ready for fulfillment', icon: Sparkles },
  { key: 'DELIVERED', label: 'Delivered', sublabel: 'Order complete', icon: Truck },
]

function getStepIndex(status: OrderStatus): number {
  switch (status) {
    case 'PENDING':
    case 'CONFIRMED':
      return 0
    case 'PREPARING':
      return 1
    case 'READY':
      return 2
    case 'DELIVERED':
      return 3
    case 'CANCELLED':
      return -1
    default:
      return 0
  }
}

function getStatusMessage(status: OrderStatus, deliveryType?: string): string {
  const isDelivery = deliveryType?.toUpperCase() === 'DELIVERY'
  switch (status) {
    case 'PENDING':
      return 'Order received! Awaiting store confirmation.'
    case 'CONFIRMED':
      return 'Order confirmed! Sent to the kitchen.'
    case 'PREPARING':
      return 'Baking & preparing fresh items now.'
    case 'READY':
      return isDelivery
        ? 'Ready & packaged for delivery dispatch!'
        : 'Ready for pickup! Show QR code at counter.'
    case 'DELIVERED':
      return isDelivery
        ? 'Delivered! Enjoy your pastries.'
        : 'Picked up! Thank you for visiting.'
    case 'CANCELLED':
      return 'This order was cancelled.'
    default:
      return 'Status update in progress.'
  }
}

function OrderTimeline({ order }: { order: Order }) {
  if (order.status === 'CANCELLED') {
    return (
      <div className="my-5 p-4 bg-red-50 rounded-2xl border border-red-200 flex items-center gap-3 text-red-900 text-xs font-medium">
        <XCircle className="w-5 h-5 text-red-600 shrink-0" />
        <div>
          <span className="font-bold text-sm block text-red-950">Order Cancelled</span>
          <p className="text-red-700 mt-0.5">
            This order was cancelled. Please contact customer support or place a new order.
          </p>
        </div>
      </div>
    )
  }

  const currentIndex = getStepIndex(order.status)
  const progressPercent = (currentIndex / 3) * 100

  return (
    <div className="my-5 p-4 sm:p-5 bg-gradient-to-br from-amber-50/70 via-orange-50/30 to-amber-50/70 rounded-2xl border border-amber-200/80 shadow-xs">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 pb-3 border-b border-amber-200/50">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-600" /> Visual Order Progress
          </span>
          <span className="text-[11px] font-bold text-amber-900 bg-white px-2.5 py-0.5 rounded-full border border-amber-200 shadow-2xs">
            Step {currentIndex + 1} of 4
          </span>
        </div>
        <span className="text-xs font-semibold text-amber-900 bg-amber-100/80 px-3 py-1 rounded-full border border-amber-200/80 self-start sm:self-auto">
          {getStatusMessage(order.status, order.deliveryType)}
        </span>
      </div>

      {/* Progress Track & Step Nodes */}
      <div className="relative px-2 sm:px-6 my-2">
        {/* Background gray track */}
        <div className="absolute top-[20px] sm:top-[24px] left-[12.5%] right-[12.5%] h-1.5 bg-stone-200 rounded-full z-0" />

        {/* Active colored progress fill */}
        <div
          className="absolute top-[20px] sm:top-[24px] left-[12.5%] h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-500 rounded-full z-0 transition-all duration-500"
          style={{ width: `calc(75% * ${progressPercent} / 100)` }}
        />

        {/* Step Nodes Grid */}
        <div className="relative z-10 grid grid-cols-4 gap-2 text-center">
          {TIMELINE_STEPS.map((step, idx) => {
            const isCompleted = idx < currentIndex
            const isCurrent = idx === currentIndex
            const IconComponent = step.icon

            return (
              <div key={step.key} className="flex flex-col items-center">
                {/* Circle Icon Badge */}
                <div
                  className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                    isCompleted
                      ? 'bg-emerald-600 text-white ring-4 ring-emerald-100 shadow-xs'
                      : isCurrent
                      ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white ring-4 ring-amber-200 scale-110 shadow-md animate-pulse'
                      : 'bg-white text-stone-300 border-2 border-stone-200'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5 stroke-[3]" />
                  ) : (
                    <IconComponent className="w-5 h-5" />
                  )}
                </div>

                {/* Step Label */}
                <span
                  className={`text-xs font-bold mt-2.5 transition-colors ${
                    isCompleted
                      ? 'text-emerald-900'
                      : isCurrent
                      ? 'text-amber-950 font-black'
                      : 'text-stone-400'
                  }`}
                >
                  {step.label}
                </span>

                {/* Sublabel */}
                <span className="text-[10px] text-stone-500 hidden sm:block mt-0.5 font-medium max-w-[110px] leading-tight">
                  {step.sublabel}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function playReadyChime() {
  try {
    if (typeof window === 'undefined') return
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContext) return
    const ctx = new AudioContext()
    const now = ctx.currentTime

    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(659.25, now)
    gain1.gain.setValueAtTime(0.15, now)
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.start(now)
    osc1.stop(now + 0.3)

    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(880, now + 0.15)
    gain2.gain.setValueAtTime(0.2, now + 0.15)
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6)
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.start(now + 0.15)
    osc2.stop(now + 0.6)
  } catch (e) {
    // Ignore audio policy errors
  }
}

export default function UserDashboardPage() {
  const { addToCart } = useCart()
  const [searchMode, setSearchMode] = useState<'all' | 'email' | 'phone'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  const [selectedPrintOrder, setSelectedPrintOrder] = useState<Order | null>(null)
  const [selectedQrOrder, setSelectedQrOrder] = useState<Order | null>(null)
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null)
  const [copiedScanUrl, setCopiedScanUrl] = useState(false)
  const [reorderToast, setReorderToast] = useState<string | null>(null)
  const [paymentNotice, setPaymentNotice] = useState<{ type: 'success' | 'failed' | 'error'; message: string } | null>(null)

  // READY order toast notification state & tracking refs
  const [readyToasts, setReadyToasts] = useState<Order[]>([])
  const prevStatusMapRef = useRef<Map<string, OrderStatus>>(new Map())
  const notifiedOrderIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const payment = urlParams.get('payment')
      const ref = urlParams.get('ref')
      if (payment === 'success') {
        setPaymentNotice({
          type: 'success',
          message: `🎉 Payment successful! ${ref ? `Reference: ${ref}` : ''} Your order has been confirmed and sent to our bakers.`,
        })
      } else if (payment === 'failed') {
        setPaymentNotice({
          type: 'failed',
          message: '⚠️ Payment was cancelled or not completed. Please try placing your order again.',
        })
      } else if (payment === 'error') {
        setPaymentNotice({
          type: 'error',
          message: '❌ An error occurred while checking payment status.',
        })
      }
    }
  }, [])

  const fetchOrders = useCallback(
    async (queryToUse?: string, modeToUse?: 'all' | 'email' | 'phone', isSilent = false) => {
      const q = (queryToUse !== undefined ? queryToUse : searchQuery).trim()
      const activeMode = modeToUse || searchMode
      if (!q) {
        if (!isSilent) {
          setError('Please enter your email address or phone number to look up order history.')
        }
        return
      }

      if (!isSilent) {
        setLoading(true)
        setError(null)
      }
      setHasSearched(true)

      try {
        let url = '/api/orders?'
        if (activeMode === 'email') {
          url += `email=${encodeURIComponent(q)}`
        } else if (activeMode === 'phone') {
          url += `phone=${encodeURIComponent(q)}`
        } else {
          url += `query=${encodeURIComponent(q)}`
        }

        const res = await fetch(url)
        if (!res.ok) {
          throw new Error('Failed to fetch orders')
        }
        const data = await res.json()
        const fetchedOrders: Order[] = Array.isArray(data) ? data : []

        // Detect orders transitioning to READY or freshly seen as READY
        const newlyReadyOrders: Order[] = []
        fetchedOrders.forEach((ord) => {
          const prevStatus = prevStatusMapRef.current.get(ord.id)

          if (ord.status === 'READY') {
            const isTransition = prevStatus !== undefined && prevStatus !== 'READY'
            const isFirstSeenReady = prevStatus === undefined && !notifiedOrderIdsRef.current.has(ord.id)

            if ((isTransition || isFirstSeenReady) && !notifiedOrderIdsRef.current.has(ord.id)) {
              newlyReadyOrders.push(ord)
              notifiedOrderIdsRef.current.add(ord.id)
            }
          }

          prevStatusMapRef.current.set(ord.id, ord.status)
        })

        if (newlyReadyOrders.length > 0) {
          setReadyToasts((prev) => {
            const existingIds = new Set(prev.map((o) => o.id))
            const added = newlyReadyOrders.filter((o) => !existingIds.has(o.id))
            return [...added, ...prev]
          })
          playReadyChime()
        }

        setOrders(fetchedOrders)

        // Remember search query in localStorage for convenience
        if (typeof window !== 'undefined' && q) {
          if (q.includes('@')) {
            localStorage.setItem('enos_customer_email', q)
          } else {
            localStorage.setItem('enos_customer_phone', q)
          }
        }
      } catch (err: any) {
        console.error(err)
        if (!isSilent) {
          setError(err?.message || 'Unable to retrieve order history.')
        }
      } finally {
        if (!isSilent) {
          setLoading(false)
        }
      }
    },
    [searchQuery, searchMode]
  )

  // Load saved customer info from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedEmail = localStorage.getItem('enos_customer_email') || ''
      const savedPhone = localStorage.getItem('enos_customer_phone') || ''

      const initialValue = savedEmail || savedPhone
      if (initialValue) {
        setSearchQuery(initialValue)
        const initialMode = savedEmail ? 'email' : savedPhone ? 'phone' : 'all'
        setSearchMode(initialMode)
        fetchOrders(initialValue, initialMode)
      }
    }
  }, [fetchOrders])

  // Auto-poll orders every 7 seconds to catch READY status changes in real-time
  useEffect(() => {
    if (!hasSearched || !searchQuery) return

    const interval = setInterval(() => {
      fetchOrders(searchQuery, searchMode, true)
    }, 7000)

    return () => clearInterval(interval)
  }, [hasSearched, searchQuery, searchMode, fetchOrders])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchOrders()
  }

  const handleCopyOrderId = (id: string) => {
    navigator.clipboard.writeText(id)
    setCopiedOrderId(id)
    setTimeout(() => setCopiedOrderId(null), 2000)
  }

  const handlePrintOrder = (order: Order) => {
    setSelectedPrintOrder(order)
    setTimeout(() => {
      window.print()
    }, 150)
  }

  const handleReorder = (order: Order) => {
    let itemsAdded = 0
    order.items.forEach((item) => {
      if (item.product) {
        for (let i = 0; i < item.quantity; i++) {
          addToCart({
            id: item.product.id,
            name: item.product.name,
            description: item.product.description || '',
            price: Number(item.price),
            category: item.product.category,
            imageUrl: item.product.imageUrl || undefined,
            ingredients: [] as string[],
            available: true,
          })
          itemsAdded++
        }
      }
    })

    if (itemsAdded > 0) {
      setReorderToast(`Added ${itemsAdded} item(s) from Order #${order.id} to your cart!`)
      setTimeout(() => setReorderToast(null), 4000)
    }
  }

  const prettyStatus = (s: OrderStatus) => {
    switch (s) {
      case 'PENDING':
        return 'Pending'
      case 'CONFIRMED':
        return 'Confirmed'
      case 'PREPARING':
        return 'Preparing'
      case 'READY':
        return 'Ready for Pick up/Delivery'
      case 'DELIVERED':
        return 'Delivered'
      case 'CANCELLED':
        return 'Cancelled'
      default:
        return s
    }
  }

  const filteredOrders = useMemo(() => {
    if (statusFilter === 'ALL') return orders
    return orders.filter((o) => o.status === statusFilter)
  }, [orders, statusFilter])

  const stats = useMemo(() => {
    const totalOrders = orders.length
    const totalSpent = orders.reduce((acc, o) => acc + Number(o.totalAmount || 0), 0)
    const activeOrders = orders.filter((o) => ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'].includes(o.status)).length
    return { totalOrders, totalSpent, activeOrders }
  }, [orders])

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50/30 to-amber-100/40">
      {/* Floating Ready Order Toast Notifications */}
      {readyToasts.length > 0 && (
        <div className="fixed top-24 right-4 sm:right-6 z-50 flex flex-col gap-3 max-w-md w-full px-2 pointer-events-none">
          {readyToasts.map((toastOrder) => {
            const isDelivery = toastOrder.deliveryType?.toUpperCase() === 'DELIVERY'
            return (
              <div
                key={toastOrder.id}
                className="pointer-events-auto bg-gradient-to-r from-amber-900 via-orange-950 to-amber-950 text-white rounded-2xl shadow-2xl border-2 border-amber-400 p-5 backdrop-blur-md transition-all relative overflow-hidden"
              >
                {/* Decorative ambient glowing blob */}
                <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />

                <div className="flex items-start justify-between gap-3 relative z-10">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 rounded-xl bg-amber-500 text-amber-950 shadow-md font-bold text-lg animate-pulse">
                      <Sparkles className="w-5 h-5 text-amber-950" />
                    </span>
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-amber-300 block">
                        🎉 ORDER READY NOTIFICATION
                      </span>
                      <h4 className="font-extrabold text-base text-white leading-tight">
                        Order #{toastOrder.id} is READY!
                      </h4>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setReadyToasts((prev) => prev.filter((t) => t.id !== toastOrder.id))
                    }}
                    className="text-amber-200/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                    title="Dismiss notification"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-xs text-amber-100/90 mt-2.5 leading-relaxed relative z-10 font-medium">
                  {isDelivery
                    ? '✨ Great news! Your pastries are freshly baked, packaged, and ready for delivery dispatch.'
                    : '✨ Your pastries are freshly baked & ready at the counter! Show your QR code at pickup.'}
                </p>

                <div className="mt-3.5 pt-3 border-t border-amber-700/60 flex items-center justify-between gap-2 relative z-10">
                  <span className="text-[11px] font-semibold text-amber-200/80">
                    {toastOrder.items?.length || 0} item(s) • GH₵{Number(toastOrder.totalAmount).toFixed(2)}
                  </span>

                  <button
                    onClick={() => {
                      setSelectedQrOrder(toastOrder)
                      const el = document.getElementById(`order-${toastOrder.id}`)
                      if (el) el.scrollIntoView({ behavior: 'smooth' })
                    }}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 text-amber-950 font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5" /> Show QR Code
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="print:hidden">
        <Header />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20">
          {/* Welcome Dashboard Banner */}
          <div className="bg-gradient-to-r from-amber-800 via-amber-900 to-orange-900 rounded-3xl p-8 sm:p-10 text-white shadow-xl mb-10 relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 opacity-10 text-9xl pointer-events-none">🥐</div>
            <div className="relative z-10 max-w-2xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-200 text-xs font-semibold uppercase tracking-wider mb-4">
                <User className="w-3.5 h-3.5" /> Customer Portal
              </span>
              <h1 className="text-3xl sm:text-4xl font-bold mb-3 tracking-tight">Customer Dashboard</h1>
              <p className="text-amber-100 text-base sm:text-lg leading-relaxed">
                Look up your past orders, track live status, reprint receipts, and easily re-order your favorite handcrafted pastries.
              </p>
            </div>
          </div>

          {/* Payment Status Notice */}
          {paymentNotice && (
            <div
              className={`mb-6 p-4 rounded-2xl shadow-md flex items-center justify-between gap-3 text-sm font-semibold border ${
                paymentNotice.type === 'success'
                  ? 'bg-emerald-50 text-emerald-950 border-emerald-300'
                  : 'bg-red-50 text-red-950 border-red-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <span>{paymentNotice.message}</span>
              </div>
              <button
                onClick={() => setPaymentNotice(null)}
                className="text-xs px-2.5 py-1 rounded-lg bg-white/80 hover:bg-white border border-stone-300 text-stone-700 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Toast Notification for Re-order */}
          {reorderToast && (
            <div className="mb-6 bg-emerald-700 text-white p-4 rounded-2xl shadow-lg flex items-center justify-between animate-fade-in">
              <div className="flex items-center gap-3 font-medium">
                <ShoppingBag className="w-5 h-5 text-emerald-200" />
                <span>{reorderToast}</span>
              </div>
              <Link
                href="/cart"
                className="bg-white text-emerald-900 px-4 py-1.5 rounded-xl font-bold text-sm hover:bg-emerald-50 transition-colors shadow-xs"
              >
                Go to Cart →
              </Link>
            </div>
          )}

          {/* Search Box / Lookup Section */}
          <div className="bg-white rounded-2xl shadow-md p-6 sm:p-8 mb-10 border border-amber-100">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold text-amber-950 flex items-center gap-2">
                  <Search className="w-6 h-6 text-amber-600" /> Order History Lookup
                </h2>
                <p className="text-stone-600 text-sm mt-1">
                  Enter the email address or phone number used when placing your order.
                </p>
              </div>

              {/* Mode Selector */}
              <div className="inline-flex p-1 bg-stone-100 rounded-xl text-xs font-semibold text-stone-600 self-start md:self-auto">
                <button
                  type="button"
                  onClick={() => setSearchMode('all')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    searchMode === 'all' ? 'bg-amber-600 text-white shadow-xs' : 'hover:text-amber-800'
                  }`}
                >
                  Search All
                </button>
                <button
                  type="button"
                  onClick={() => setSearchMode('email')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                    searchMode === 'email' ? 'bg-amber-600 text-white shadow-xs' : 'hover:text-amber-800'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" /> Email
                </button>
                <button
                  type="button"
                  onClick={() => setSearchMode('phone')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                    searchMode === 'phone' ? 'bg-amber-600 text-white shadow-xs' : 'hover:text-amber-800'
                  }`}
                >
                  <Phone className="w-3.5 h-3.5" /> Phone
                </button>
              </div>
            </div>

            <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <input
                  type={searchMode === 'email' ? 'email' : 'text'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    searchMode === 'email'
                      ? 'Enter your email address (e.g. customer@example.com)'
                      : searchMode === 'phone'
                      ? 'Enter your phone number (e.g. 0534716125)'
                      : 'Enter email address, phone number, or Order ID'
                  }
                  required
                  className="w-full px-5 py-3.5 pl-11 pr-10 border-2 border-amber-200 rounded-xl focus:border-amber-600 focus:outline-none transition-all text-stone-800 text-sm sm:text-base bg-stone-50/50"
                />
                <Search className="w-5 h-5 text-amber-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('')
                      setOrders([])
                      setHasSearched(false)
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-60 flex items-center justify-center gap-2 text-sm sm:text-base cursor-pointer"
              >
                {loading ? (
                  <>
                    <RotateCcw className="w-4 h-4 animate-spin" /> Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" /> View Order History
                  </>
                )}
              </button>
            </form>

            {error && (
              <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Stats Bar if orders exist */}
          {hasSearched && orders.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="bg-white p-5 rounded-2xl shadow-xs border border-amber-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">Total Orders</p>
                  <p className="text-2xl font-bold text-amber-900 mt-1">{stats.totalOrders}</p>
                </div>
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-amber-700">
                  <ShoppingBag className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-xs border border-amber-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">Total Spent</p>
                  <p className="text-2xl font-bold text-amber-900 mt-1">GH₵{stats.totalSpent.toFixed(2)}</p>
                </div>
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-700">
                  <span className="text-xl font-bold">₵</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-xs border border-amber-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">Active In-Progress</p>
                  <p className="text-2xl font-bold text-amber-900 mt-1">{stats.activeOrders}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-orange-700">
                  <Clock className="w-6 h-6" />
                </div>
              </div>
            </div>
          )}

          {/* Status Filters */}
          {hasSearched && orders.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 no-scrollbar">
              <span className="text-xs font-semibold text-stone-500 uppercase flex items-center gap-1 pr-2">
                <Filter className="w-3.5 h-3.5" /> Filter:
              </span>
              {['ALL', 'PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    statusFilter === st
                      ? 'bg-amber-900 text-white shadow-xs'
                      : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
                  }`}
                >
                  {st === 'ALL' ? `All (${orders.length})` : prettyStatus(st as OrderStatus)}
                </button>
              ))}
            </div>
          )}

          {/* Orders List */}
          {hasSearched && !loading && (
            <div>
              {filteredOrders.length > 0 ? (
                <div className="space-y-6">
                  {filteredOrders.map((order) => (
                    <div
                      key={order.id}
                      id={`order-${order.id}`}
                      className={`bg-white rounded-2xl shadow-sm hover:shadow-md transition-all border p-6 sm:p-8 ${
                        order.status === 'READY'
                          ? 'border-amber-400 ring-2 ring-amber-200/80 shadow-md'
                          : 'border-amber-100/80'
                      }`}
                    >
                      {/* Ready order highlight banner */}
                      {order.status === 'READY' && (
                        <div className="mb-5 p-3.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-amber-950 font-extrabold text-xs rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
                          <span className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-amber-950 shrink-0" />
                            🎉 THIS ORDER IS READY FOR {order.deliveryType?.toUpperCase() === 'DELIVERY' ? 'DISPATCH / DELIVERY' : 'PICKUP AT COUNTER'}!
                          </span>
                          <button
                            onClick={() => setSelectedQrOrder(order)}
                            className="bg-amber-950 text-amber-100 hover:bg-black px-3 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all self-start sm:self-auto cursor-pointer"
                          >
                            Show QR Code
                          </button>
                        </div>
                      )}

                      {/* Top Header Row */}
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-stone-100">
                        <div>
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-lg font-bold text-stone-900">Order #{order.id}</span>
                            <button
                              onClick={() => handleCopyOrderId(order.id)}
                              className="text-stone-400 hover:text-amber-700 transition-colors p-1"
                              title="Copy Order ID"
                            >
                              {copiedOrderId === order.id ? (
                                <Check className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>

                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                                statusColors[order.status]
                              }`}
                            >
                              {statusIcons[order.status]}
                              {prettyStatus(order.status)}
                            </span>
                          </div>

                          <p className="text-xs text-stone-500 mt-1">
                            Placed on {new Date(order.createdAt).toLocaleString()}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3 flex-wrap">
                          <button
                            onClick={() => setSelectedQrOrder(order)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                            title="Show scannable QR Code for staff verification"
                          >
                            <QrCode className="w-3.5 h-3.5" /> Show QR Code
                          </button>

                          <button
                            onClick={() => handleReorder(order)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Re-order
                          </button>

                          <button
                            onClick={() => handlePrintOrder(order)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5 text-amber-700" /> Receipt
                          </button>
                        </div>
                      </div>

                      {/* Visual Progress Timeline */}
                      <OrderTimeline order={order} />

                      {/* Info Metadata Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 py-4 text-xs bg-amber-50/40 rounded-xl p-4 my-4">
                        <div>
                          <span className="text-stone-500 block mb-0.5 font-medium">Customer:</span>
                          <span className="font-semibold text-stone-800">{order.customerName}</span>
                          <span className="block text-stone-500 text-[11px]">{order.customerEmail}</span>
                          <span className="block text-stone-500 text-[11px]">{order.customerPhone}</span>
                        </div>

                        <div>
                          <span className="text-stone-500 block mb-0.5 font-medium">Type & Fulfillment:</span>
                          <span className="font-semibold text-stone-800 uppercase">
                            {order.orderType} • {order.deliveryType}
                          </span>
                          {order.deliveryDate && (
                            <span className="block text-amber-800 text-[11px] font-medium mt-0.5">
                              Scheduled: {new Date(order.deliveryDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>

                        {order.deliveryAddress && (
                          <div className="sm:col-span-2 md:col-span-1">
                            <span className="text-stone-500 block mb-0.5 font-medium">Delivery Address:</span>
                            <span className="text-stone-800 font-medium">{order.deliveryAddress}</span>
                          </div>
                        )}
                      </div>

                      {/* Items Table */}
                      <div className="mt-4">
                        <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-3">Order Items</h4>
                        <div className="divide-y divide-stone-100 border-t border-b border-stone-100">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="py-3 flex items-center justify-between text-sm">
                              <div className="flex items-center gap-3">
                                {item.product?.imageUrl && (
                                  <img
                                    src={item.product.imageUrl}
                                    alt={item.product.name}
                                    className="w-10 h-10 object-cover rounded-lg"
                                  />
                                )}
                                <div>
                                  <p className="font-semibold text-stone-800">
                                    {item.quantity}x {item.product?.name ?? item.productId}
                                  </p>
                                  {item.product?.category && (
                                    <span className="text-[11px] text-stone-400">{item.product.category}</span>
                                  )}
                                </div>
                              </div>

                              <div className="text-right">
                                <span className="font-bold text-stone-900">
                                  GH₵{(Number(item.price) * item.quantity).toFixed(2)}
                                </span>
                                {item.quantity > 1 && (
                                  <span className="block text-[11px] text-stone-400">
                                    GH₵{Number(item.price).toFixed(2)} each
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="flex justify-between items-center mt-4 pt-2">
                          <span className="text-sm font-semibold text-stone-600">Total Order Amount</span>
                          <span className="text-2xl font-black text-amber-900">
                            GH₵{Number(order.totalAmount).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 bg-white rounded-2xl shadow-xs border border-amber-100 p-8">
                  <div className="text-5xl mb-4">🥐</div>
                  <h3 className="text-xl font-bold text-stone-800 mb-2">No Orders Found</h3>
                  <p className="text-stone-600 text-sm max-w-md mx-auto mb-6">
                    {statusFilter !== 'ALL'
                      ? `No orders matching status "${prettyStatus(statusFilter as OrderStatus)}".`
                      : 'We could not find any order records matching the details provided.'}
                  </p>
                  <Link
                    href="/products"
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white px-6 py-3 rounded-full font-semibold shadow transition-all text-sm"
                  >
                    Browse Our Menu
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Initial State before search */}
          {!hasSearched && !loading && (
            <div className="text-center py-16 bg-white/70 backdrop-blur-xs rounded-2xl border border-amber-100/80 p-8 shadow-xs">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center text-amber-700 mx-auto mb-4 text-2xl">
                📋
              </div>
              <h3 className="text-xl font-bold text-stone-800 mb-2">Find Your Past Orders</h3>
              <p className="text-stone-600 text-sm max-w-md mx-auto mb-6">
                Enter your email address or phone number in the search bar above to look up your complete order history.
              </p>
            </div>
          )}
        </main>
      </div>

      {/* Printable Receipt Modal Overlay */}
      {selectedPrintOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 print:static print:inset-auto print:bg-white print:p-0 print:block print:z-auto overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-stone-900 border border-amber-100 print:shadow-none print:p-2 print:border-none print:w-full print:max-w-none my-8 print:my-0">
            {/* Modal Actions Header */}
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-stone-200 print:hidden">
              <span className="font-semibold text-stone-800 flex items-center gap-2">
                <Printer className="w-5 h-5 text-amber-600" /> Order Receipt
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 shadow transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Print Now
                </button>
                <button
                  onClick={() => setSelectedPrintOrder(null)}
                  className="p-1.5 hover:bg-stone-100 text-stone-500 hover:text-stone-800 rounded-lg transition-colors cursor-pointer"
                  title="Close Preview"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Receipt Area */}
            <div className="font-mono text-xs leading-relaxed text-stone-900">
              <div className="text-center pb-4 mb-4 border-b border-dashed border-stone-300">
                <div className="text-3xl mb-1">🥐</div>
                <h2 className="text-xl font-bold uppercase tracking-wider text-amber-900 font-sans">
                  Eno&apos;s Pastries
                </h2>
                <p className="text-[11px] text-stone-500 font-sans mt-0.5">
                  Freshly Baked Artisanal Pastries & Confectionery
                </p>
                <p className="text-[10px] text-amber-800 font-sans font-bold uppercase tracking-widest mt-2 bg-amber-50 py-1 px-3 rounded inline-block border border-amber-200">
                  Customer Receipt
                </p>
              </div>

              {/* Order Meta */}
              <div className="space-y-1 mb-4">
                <div className="flex justify-between">
                  <span className="text-stone-500">Order ID:</span>
                  <span className="font-bold">#{selectedPrintOrder.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Date:</span>
                  <span>{new Date(selectedPrintOrder.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Order Type:</span>
                  <span className="font-semibold">{selectedPrintOrder.orderType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Fulfillment:</span>
                  <span className="font-semibold">{selectedPrintOrder.deliveryType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Status:</span>
                  <span className="font-semibold">{prettyStatus(selectedPrintOrder.status)}</span>
                </div>
              </div>

              {/* Customer Info */}
              <div className="pt-3 border-t border-dashed border-stone-300 space-y-1 mb-4">
                <p className="font-bold text-stone-700 font-sans text-xs uppercase mb-1">Customer Details</p>
                <div className="flex justify-between">
                  <span className="text-stone-500">Name:</span>
                  <span className="font-medium">{selectedPrintOrder.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Email:</span>
                  <span>{selectedPrintOrder.customerEmail}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Phone:</span>
                  <span>{selectedPrintOrder.customerPhone}</span>
                </div>
                {selectedPrintOrder.deliveryAddress && (
                  <div className="pt-1">
                    <span className="text-stone-500 block mb-0.5">Delivery Address:</span>
                    <p className="text-stone-800 font-sans text-[11px] bg-stone-50 p-2 rounded border border-stone-200">
                      {selectedPrintOrder.deliveryAddress}
                    </p>
                  </div>
                )}
              </div>

              {/* Items */}
              <div className="pt-3 border-t border-dashed border-stone-300 mb-4">
                <p className="font-bold text-stone-700 font-sans text-xs uppercase mb-2">Order Items</p>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-stone-300 text-stone-500 text-[10px]">
                      <th className="pb-1 font-semibold uppercase">Qty</th>
                      <th className="pb-1 font-semibold uppercase">Item</th>
                      <th className="pb-1 font-semibold uppercase text-right">Price</th>
                      <th className="pb-1 font-semibold uppercase text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {selectedPrintOrder.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-1.5 align-top font-bold">{item.quantity}x</td>
                        <td className="py-1.5 align-top font-sans text-stone-800">
                          {item.product?.name ?? item.productId}
                        </td>
                        <td className="py-1.5 align-top text-right text-stone-600">
                          GH₵{Number(item.price).toFixed(2)}
                        </td>
                        <td className="py-1.5 align-top text-right font-semibold text-stone-900">
                          GH₵{(Number(item.price) * item.quantity).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total Summary */}
              <div className="pt-3 border-t-2 border-stone-800 text-right space-y-1">
                <div className="flex justify-between text-sm font-bold text-stone-900 font-sans">
                  <span>TOTAL AMOUNT</span>
                  <span className="text-amber-800 text-base">
                    GH₵{Number(selectedPrintOrder.totalAmount).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-6 pt-4 border-t border-dashed border-stone-300 text-center font-sans text-[11px] text-stone-500 space-y-1">
                <p className="font-semibold text-stone-800">Thank you for choosing Eno&apos;s Pastries!</p>
                <p>www.enospastries.com</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scannable Order QR Code Modal Overlay */}
      {selectedQrOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 text-stone-900 border border-amber-200 animate-fade-in relative my-8">
            {/* Close Button */}
            <button
              onClick={() => {
                setSelectedQrOrder(null)
                setCopiedScanUrl(false)
              }}
              className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-800 hover:bg-stone-100 rounded-full transition-colors cursor-pointer"
              title="Close QR Code"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-800 mx-auto mb-3">
                <QrCode className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-amber-950">Scannable Order Pass</h3>
              <p className="text-xs text-stone-500 mt-1">
                Order <strong className="text-stone-900">#{selectedQrOrder.id}</strong> • {selectedQrOrder.customerName}
              </p>
            </div>

            {/* QR Code Canvas Box */}
            <div className="bg-gradient-to-b from-amber-50 to-orange-50 p-6 rounded-2xl border-2 border-amber-200 text-center shadow-inner mb-6 flex flex-col items-center">
              <div className="bg-white p-4 rounded-2xl shadow-md border border-stone-200 mb-4 inline-block">
                <QRCodeSVG
                  value={
                    typeof window !== 'undefined'
                      ? `${window.location.origin}/admin/scan?orderId=${selectedQrOrder.id}`
                      : `/admin/scan?orderId=${selectedQrOrder.id}`
                  }
                  size={200}
                  level="H"
                  includeMargin={true}
                />
              </div>

              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-2 ${
                  statusColors[selectedQrOrder.status]
                }`}
              >
                {statusIcons[selectedQrOrder.status]} Status: {prettyStatus(selectedQrOrder.status)}
              </span>

              <p className="text-xs text-stone-600 font-medium max-w-xs mt-1 leading-relaxed">
                Show this QR Code to Eno&apos;s Pastries staff at pickup or delivery to instantly verify & update your order status to <strong>READY</strong> or <strong>DELIVERED</strong>.
              </p>
            </div>

            {/* Order Items Briefing */}
            <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 text-xs mb-6 space-y-1">
              <div className="flex justify-between font-medium text-stone-600">
                <span>Fulfillment:</span>
                <span className="font-bold text-amber-900 uppercase">{selectedQrOrder.deliveryType}</span>
              </div>
              <div className="flex justify-between font-medium text-stone-600">
                <span>Items ({selectedQrOrder.items.reduce((acc, i) => acc + i.quantity, 0)}):</span>
                <span className="font-semibold text-stone-800">
                  {selectedQrOrder.items.map((i) => `${i.quantity}x ${i.product?.name ?? i.productId}`).join(', ')}
                </span>
              </div>
              <div className="flex justify-between font-bold text-stone-900 pt-1 border-t border-stone-200">
                <span>Total Amount:</span>
                <span className="text-amber-900">GH₵{Number(selectedQrOrder.totalAmount).toFixed(2)}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <button
                onClick={() => {
                  const url = `${window.location.origin}/admin/scan?orderId=${selectedQrOrder.id}`
                  navigator.clipboard.writeText(url)
                  setCopiedScanUrl(true)
                  setTimeout(() => setCopiedScanUrl(false), 2500)
                }}
                className="w-full py-2.5 bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer border border-amber-300"
              >
                {copiedScanUrl ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-700" /> Copied Direct Scan Link!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-amber-700" /> Copy Direct Scan Link
                  </>
                )}
              </button>

              <Link
                href={`/admin/scan?orderId=${selectedQrOrder.id}`}
                target="_blank"
                className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <ExternalLink className="w-4 h-4" /> Open Admin Scanner Direct View
              </Link>

              <button
                onClick={() => {
                  setSelectedQrOrder(null)
                  setCopiedScanUrl(false)
                }}
                className="w-full py-2 text-stone-500 hover:text-stone-800 font-medium text-xs text-center cursor-pointer"
              >
                Close Pass
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
