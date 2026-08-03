'use client'

import { useEffect, useMemo, useState } from 'react'
import Header from '@/components/Header'
import Link from 'next/link'
import { Printer, X, QrCode } from 'lucide-react'

type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'DELIVERED' | 'CANCELLED'

type OrderType = 'RETAIL' | 'WHOLESALE'

type DeliveryType = 'PICKUP' | 'DELIVERY'

type OrderItem = {
  productId: string
  productName?: string
  quantity: number
  price: number
}

type Order = {
  id: string
  customerName: string
  customerEmail: string
  customerPhone: string
  customerNote: string | null
  orderType: OrderType
  deliveryType: DeliveryType
  deliveryAddress: string | null
  deliveryDate: string | null
  totalAmount: number
  status: OrderStatus
  items: Array<{
    productId: string
    quantity: number
    price: number
    product?: { name: string } | null
  }>
  createdAt: string
}

const statusColors: Record<OrderStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  PREPARING: 'bg-purple-100 text-purple-800',
  READY: 'bg-green-100 text-green-800',
  DELIVERED: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-red-100 text-red-800',
}

function prettyStatus(s?: string) {
  if (!s) return 'Pending'
  return String(s)
    .toLowerCase()
    .split('_')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ')
}

function prettyOrderType(t?: string) {
  return t === 'WHOLESALE' ? 'Wholesale' : 'Retail'
}

function prettyDeliveryType(d?: string) {
  return d === 'DELIVERY' ? 'Delivery' : 'Pickup'
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPrintOrder, setSelectedPrintOrder] = useState<Order | null>(null)

  const handlePrintOrder = (order: Order) => {
    setSelectedPrintOrder(order)
    setTimeout(() => {
      window.print()
    }, 150)
  }

  useEffect(() => {
    let isMounted = true
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch('/api/orders', { cache: 'no-store' })
        if (!res.ok) throw new Error('Failed to fetch orders')
        const data = await res.json().catch(() => ([]))
        if (!isMounted) return
        setOrders(Array.isArray(data) ? data : [])
      } catch (e: any) {
        if (!isMounted) return
        setError(e?.message ?? 'Failed to fetch orders')
      } finally {
        if (isMounted) setLoading(false)
      }
    })()
    return () => {
      isMounted = false
    }
  }, [])

  const statusOptions: OrderStatus[] = useMemo(
    () => ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED'],
    []
  )

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    // optimistic UI
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)))

    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error('Failed to update order status')
      const updated = await res.json().catch(() => (null))
      if (updated?.id) {
        setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)))
      }
    } catch (e: any) {
      // rollback by re-fetching
      const res2 = await fetch('/api/orders', { cache: 'no-store' })
      if (res2.ok) {
        const data2 = await res2.json().catch(() => ([]))
        if (Array.isArray(data2)) setOrders(data2)
      }
      alert(e?.message ?? 'Failed to update order')
    }
  }

  return (
    <div className="min-h-screen bg-amber-50">
      <div className="print:hidden">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-amber-900">Manage Orders</h1>
              <p className="text-stone-600 text-sm mt-1">Review customer orders, print receipts, or scan customer QR codes.</p>
            </div>
            <Link
              href="/admin/scan"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all self-start sm:self-auto cursor-pointer"
            >
              <QrCode className="w-4 h-4" /> Scan QR Code Station
            </Link>
          </div>

          {loading && <div className="text-center py-12">Loading...</div>}
          {error && !loading && (
            <div className="text-center py-12 text-red-700">{error}</div>
          )}

          {!loading && !error && (
            <div className="space-y-6">
              {orders.map((order) => (
                <div key={order.id} className="bg-white rounded-xl shadow-md p-6">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-4 gap-4">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">Order #{order.id}</h3>
                      <p className="text-gray-600">
                        {order.customerName} • {order.customerEmail} • {order.customerPhone}
                      </p>
                      <p className="text-sm text-gray-500">
                        {prettyOrderType(order.orderType)} • {prettyDeliveryType(order.deliveryType)}
                        {order.deliveryAddress ? ` • ${order.deliveryAddress}` : ''}
                      </p>
                      {order.customerNote && (
                        <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-sm text-stone-800">
                          <span className="font-semibold text-amber-900 block mb-0.5">📝 Customer Note:</span>
                          <p className="whitespace-pre-wrap text-stone-700">{order.customerNote}</p>
                        </div>
                      )}
                      <p className="text-sm text-gray-500 mt-1">
                        Placed {new Date(order.createdAt).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      <Link
                        href={`/admin/scan?orderId=${order.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 rounded-lg text-sm font-medium transition-colors cursor-pointer shadow-xs"
                        title="Open Scan Verification Page for this order"
                      >
                        <QrCode className="w-4 h-4 text-amber-800" />
                        <span>Verify QR</span>
                      </Link>

                      <button
                        onClick={() => handlePrintOrder(order)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-sm font-medium transition-colors cursor-pointer shadow-xs"
                        title="Print Order Receipt"
                      >
                        <Printer className="w-4 h-4 text-amber-700" />
                        <span>Print Receipt</span>
                      </button>

                      <div className="flex flex-col items-end gap-2">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[order.status] || 'bg-gray-100 text-gray-800'}`}
                        >
                          {prettyStatus(order.status)}
                        </span>
                        <select
                          value={order.status}
                          onChange={(e) =>
                            handleStatusChange(order.id, e.target.value as OrderStatus)
                          }
                          className="px-3 py-1 border border-gray-300 rounded-lg text-sm bg-white"
                        >
                          {statusOptions.map((s) => (
                            <option key={s} value={s}>
                              {prettyStatus(s)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="text-lg font-medium text-gray-900 mb-2">Items</h4>
                    <div className="space-y-2">
                      {(order.items || []).map((item, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <span className="text-gray-700">
                            {item.quantity}x {item.product?.name ?? item.productId}
                          </span>
                          <span className="text-gray-900 font-medium">
                            ${(Number(item.price || 0) * (item.quantity || 1)).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between items-center mt-4 pt-4 border-t">
                      <button
                        onClick={() => handlePrintOrder(order)}
                        className="inline-flex items-center gap-1.5 text-amber-700 hover:text-amber-900 text-sm font-semibold transition-colors cursor-pointer"
                      >
                        <Printer className="w-4 h-4" /> Print Receipt
                      </button>
                      <span className="text-xl font-bold text-amber-700">
                        Total: ${Number(order.totalAmount).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {orders.length === 0 && (
                <div className="text-center py-12 bg-white rounded-xl shadow-md p-8">
                  <p className="text-xl text-amber-700">No orders yet</p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Printable Receipt Modal Overlay */}
      {selectedPrintOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 print:static print:inset-auto print:bg-white print:p-0 print:block print:z-auto overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-stone-900 border border-amber-100 print:shadow-none print:p-2 print:border-none print:w-full print:max-w-none my-8 print:my-0">
            {/* Modal Actions Header (Hidden during print) */}
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-stone-200 print:hidden">
              <span className="font-semibold text-stone-800 flex items-center gap-2">
                <Printer className="w-5 h-5 text-amber-600" /> Receipt Preview
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

            {/* Printable Receipt Area */}
            <div className="font-mono text-xs leading-relaxed text-stone-900">
              <div className="text-center pb-4 mb-4 border-b border-dashed border-stone-300">
                <div className="text-3xl mb-1">🥐</div>
                <h2 className="text-xl font-bold uppercase tracking-wider text-amber-900 font-sans">Eno&apos;s Pastries</h2>
                <p className="text-[11px] text-stone-500 font-sans mt-0.5">Freshly Baked Artisanal Pastries & Confectionery</p>
                <p className="text-[10px] text-amber-800 font-sans font-bold uppercase tracking-widest mt-2 bg-amber-50 py-1 px-3 rounded inline-block border border-amber-200">
                  Order Receipt
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
                  <span className="font-semibold">{prettyOrderType(selectedPrintOrder.orderType)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Fulfillment:</span>
                  <span className="font-semibold">{prettyDeliveryType(selectedPrintOrder.deliveryType)}</span>
                </div>
                {selectedPrintOrder.deliveryDate && (
                  <div className="flex justify-between">
                    <span className="text-stone-500">Scheduled Date:</span>
                    <span>{selectedPrintOrder.deliveryDate}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-stone-500">Status:</span>
                  <span className="font-semibold">{prettyStatus(selectedPrintOrder.status)}</span>
                </div>
              </div>

              {/* Customer Info */}
              <div className="pt-3 border-t border-dashed border-stone-300 space-y-1 mb-4">
                <p className="font-bold text-stone-700 font-sans text-xs uppercase mb-1">Customer Info</p>
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
                {selectedPrintOrder.customerNote && (
                  <div className="pt-1">
                    <span className="text-stone-500 block mb-0.5 font-bold text-amber-900">Customer Note / Special Instructions:</span>
                    <p className="text-stone-800 font-sans text-[11px] bg-amber-50 p-2 rounded border border-amber-200 whitespace-pre-wrap">
                      {selectedPrintOrder.customerNote}
                    </p>
                  </div>
                )}
              </div>

              {/* Itemized List */}
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
                          ${Number(item.price).toFixed(2)}
                        </td>
                        <td className="py-1.5 align-top text-right font-semibold text-stone-900">
                          ${(Number(item.price) * item.quantity).toFixed(2)}
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
                  <span className="text-amber-800 text-base">${Number(selectedPrintOrder.totalAmount).toFixed(2)}</span>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-6 pt-4 border-t border-dashed border-stone-300 text-center font-sans text-[11px] text-stone-500 space-y-1">
                <p className="font-semibold text-stone-800">Thank you for your order!</p>
                <p>Eno&apos;s Pastries • www.enospastries.com</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

