'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  QrCode,
  CheckCircle2,
  PackageCheck,
  Truck,
  RotateCcw,
  ArrowLeft,
  Camera,
  Search,
  Check,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react'

type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'DELIVERED' | 'CANCELLED'

interface OrderItem {
  id: string
  quantity: number
  price: number | string
  product?: {
    name: string
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
  customerName: string
  customerEmail: string
  customerPhone: string
  createdAt: string
  items: OrderItem[]
}

const statusColors: Record<OrderStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
  CONFIRMED: 'bg-blue-100 text-blue-800 border border-blue-300',
  PREPARING: 'bg-purple-100 text-purple-800 border border-purple-300',
  READY: 'bg-amber-100 text-amber-900 border border-amber-300 font-bold',
  DELIVERED: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
  CANCELLED: 'bg-red-100 text-red-800 border border-red-300',
}

function AdminScanContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const urlOrderId = searchParams.get('orderId') || searchParams.get('scan') || searchParams.get('id')

  const [orderIdInput, setOrderIdInput] = useState(urlOrderId || '')
  const [activeOrderId, setActiveOrderId] = useState<string | null>(urlOrderId || null)
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const [cameraActive, setCameraActive] = useState(false)
  const scannerRef = useRef<any>(null)

  // Fetch Order details when activeOrderId changes
  useEffect(() => {
    if (!activeOrderId) return

    let isMounted = true
    setLoading(true)
    setError(null)
    setSuccessMsg(null)

    fetch(`/api/orders/${activeOrderId}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error('Order not found or invalid QR code.')
        }
        return res.json()
      })
      .then((data) => {
        if (isMounted) {
          setOrder(data)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error(err)
          setError(err.message || 'Failed to load order details.')
          setOrder(null)
          setLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [activeOrderId])

  // Camera QR Scanner logic using html5-qrcode
  useEffect(() => {
    let html5QrcodeScanner: any = null

    if (cameraActive) {
      import('html5-qrcode').then(({ Html5QrcodeScanner }) => {
        html5QrcodeScanner = new Html5QrcodeScanner(
          'qr-reader',
          { fps: 10, qrbox: { width: 250, height: 250 } },
          /* verbose= */ false
        )

        scannerRef.current = html5QrcodeScanner

        html5QrcodeScanner.render(
          (decodedText: string) => {
            console.log('QR Code scanned:', decodedText)
            // Parse decoded text (could be full URL or direct Order ID)
            let scannedId = decodedText.trim()
            if (scannedId.includes('orderId=')) {
              try {
                const url = new URL(scannedId)
                scannedId = url.searchParams.get('orderId') || scannedId
              } catch (e) {
                const match = scannedId.match(/orderId=([^&]+)/)
                if (match) scannedId = match[1]
              }
            } else if (scannedId.includes('/')) {
              const parts = scannedId.split('/')
              scannedId = parts[parts.length - 1] || scannedId
            }

            setOrderIdInput(scannedId)
            setActiveOrderId(scannedId)
            setCameraActive(false)

            if (scannerRef.current) {
              scannerRef.current.clear().catch(console.error)
            }
          },
          (errorMessage: string) => {
            // parse error, quiet ignore
          }
        )
      })
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error)
      }
    }
  }, [cameraActive])

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!orderIdInput.trim()) return
    setActiveOrderId(orderIdInput.trim())
  }

  const handleUpdateStatus = async (newStatus: OrderStatus) => {
    if (!order) return
    setUpdating(true)
    setError(null)
    setSuccessMsg(null)

    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!res.ok) {
        throw new Error('Failed to update order status')
      }

      const updatedOrder = await res.json()
      setOrder(updatedOrder)
      setSuccessMsg(`Order #${order.id} status successfully updated to "${newStatus}"!`)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Error updating order status')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      {/* Top Admin Nav */}
      <div className="flex items-center justify-between mb-8">
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-2 text-amber-800 hover:text-amber-950 font-semibold text-sm bg-white px-4 py-2 rounded-xl border border-amber-200 shadow-xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Orders
        </Link>
        <span className="text-xs font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-3 py-1 rounded-full border border-amber-200">
          Admin Verification Station
        </span>
      </div>

      <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8 border border-amber-100 mb-8">
        <div className="text-center max-w-xl mx-auto mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-md">
            <QrCode className="w-9 h-9" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-amber-950">QR Code Order Scanner</h1>
          <p className="text-stone-600 text-sm mt-2">
            Scan a customer&apos;s receipt QR code or enter their Order ID to instantly verify and update order status to <strong className="text-amber-900">READY</strong> or <strong className="text-emerald-800">DELIVERED</strong>.
          </p>
        </div>

        {/* Input & Camera Trigger */}
        <div className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto mb-8">
          <form onSubmit={handleManualSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={orderIdInput}
                onChange={(e) => setOrderIdInput(e.target.value)}
                placeholder="Enter or paste Order ID..."
                className="w-full pl-10 pr-4 py-3 border-2 border-amber-200 rounded-xl focus:border-amber-600 focus:outline-none text-stone-800 text-sm font-mono"
              />
              <Search className="w-4 h-4 text-amber-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
            <button
              type="submit"
              className="px-5 py-3 bg-amber-800 hover:bg-amber-900 text-white rounded-xl font-bold text-sm transition-colors cursor-pointer"
            >
              Fetch
            </button>
          </form>

          <button
            type="button"
            onClick={() => setCameraActive(!cameraActive)}
            className={`px-5 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
              cameraActive
                ? 'bg-red-100 text-red-800 border border-red-300'
                : 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md'
            }`}
          >
            <Camera className="w-4 h-4" />
            {cameraActive ? 'Close Camera' : 'Scan Camera QR'}
          </button>
        </div>

        {/* Camera Container */}
        {cameraActive && (
          <div className="max-w-md mx-auto mb-8 p-4 bg-stone-900 rounded-2xl shadow-inner border border-stone-800">
            <p className="text-white text-xs text-center mb-3 font-medium">Point device camera at the customer QR code:</p>
            <div id="qr-reader" className="overflow-hidden rounded-xl bg-black" />
          </div>
        )}

        {/* Loading / Error Messages */}
        {loading && (
          <div className="text-center py-12 text-stone-600 flex flex-col items-center gap-3">
            <RotateCcw className="w-8 h-8 text-amber-600 animate-spin" />
            <p className="font-semibold text-sm">Fetching order details...</p>
          </div>
        )}

        {error && !loading && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 flex items-center gap-3 text-sm max-w-xl mx-auto my-4">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 flex items-center justify-between text-sm max-w-xl mx-auto my-4 shadow-sm animate-fade-in">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-900">
              ✕
            </button>
          </div>
        )}

        {/* Scanned Order Card View */}
        {order && !loading && (
          <div className="bg-amber-50/50 rounded-2xl p-6 sm:p-8 border-2 border-amber-200/80 shadow-xs max-w-2xl mx-auto">
            {/* Header / ID */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-amber-200">
              <div>
                <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block mb-1">Scanned Order</span>
                <h3 className="text-2xl font-black text-stone-900">#{order.id}</h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Placed {new Date(order.createdAt).toLocaleString()}
                </p>
              </div>

              <span
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold self-start sm:self-auto ${
                  statusColors[order.status] || 'bg-amber-100 text-amber-900'
                }`}
              >
                Current Status: {order.status}
              </span>
            </div>

            {/* Direct Quick Update Buttons */}
            <div className="my-6 p-5 bg-white rounded-2xl border border-amber-200 shadow-xs">
              <h4 className="text-xs font-bold uppercase text-stone-500 tracking-wider mb-3 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-600" /> Admin Action — Update Order Status
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={updating || order.status === 'READY'}
                  onClick={() => handleUpdateStatus('READY')}
                  className="py-3.5 px-4 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
                >
                  <PackageCheck className="w-5 h-5" />
                  <span>Mark as READY</span>
                </button>

                <button
                  type="button"
                  disabled={updating || order.status === 'DELIVERED'}
                  onClick={() => handleUpdateStatus('DELIVERED')}
                  className="py-3.5 px-4 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
                >
                  <Truck className="w-5 h-5" />
                  <span>Mark as DELIVERED</span>
                </button>
              </div>

              {/* Other status choices */}
              <div className="flex items-center justify-center gap-2 mt-4 pt-3 border-t border-stone-100 text-xs">
                <span className="text-stone-400">Other statuses:</span>
                {(['PENDING', 'CONFIRMED', 'PREPARING', 'CANCELLED'] as OrderStatus[]).map((st) => (
                  <button
                    key={st}
                    onClick={() => handleUpdateStatus(st)}
                    disabled={updating || order.status === st}
                    className="px-2.5 py-1 bg-stone-100 hover:bg-amber-100 text-stone-700 hover:text-amber-900 rounded-md font-medium transition-colors disabled:opacity-40"
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Customer Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-white p-4 rounded-xl border border-amber-100 mb-6">
              <div>
                <span className="text-stone-400 block font-medium">Customer Name:</span>
                <span className="font-bold text-stone-800 text-sm">{order.customerName}</span>
              </div>
              <div>
                <span className="text-stone-400 block font-medium">Contact:</span>
                <span className="font-medium text-stone-800">{order.customerEmail}</span>
                <span className="block text-stone-600 font-mono">{order.customerPhone}</span>
              </div>
              <div>
                <span className="text-stone-400 block font-medium">Type & Fulfillment:</span>
                <span className="font-bold text-amber-900 uppercase">
                  {order.orderType} • {order.deliveryType}
                </span>
              </div>
              {order.deliveryAddress && (
                <div>
                  <span className="text-stone-400 block font-medium">Delivery Address:</span>
                  <span className="font-medium text-stone-800">{order.deliveryAddress}</span>
                </div>
              )}
            </div>

            {/* Itemized Order Summary */}
            <div className="bg-white p-4 rounded-xl border border-amber-100">
              <h5 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Order Items</h5>
              <div className="divide-y divide-stone-100">
                {(order.items || []).map((item, idx) => (
                  <div key={idx} className="py-2 flex justify-between text-xs">
                    <span className="font-semibold text-stone-800">
                      {item.quantity}x {item.product?.name ?? item.productId}
                    </span>
                    <span className="font-mono text-stone-900">
                      GH₵{(Number(item.price || 0) * (item.quantity || 1)).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center mt-3 pt-3 border-t border-stone-200 font-bold text-sm">
                <span>Total Amount</span>
                <span className="text-amber-900 text-base font-black">
                  GH₵{Number(order.totalAmount).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AdminScanPage() {
  return (
    <div className="min-h-screen bg-amber-50 py-6 sm:py-8">
      <Suspense fallback={<div className="text-center py-20 text-stone-600">Loading scanner...</div>}>
        <AdminScanContent />
      </Suspense>
    </div>
  )
}
