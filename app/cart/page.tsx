'use client'

import { useState } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import { useCart } from '@/components/CartProvider'

export default function CartPage() {
  const { cart, removeFromCart, cartTotal, clearCart } = useCart()
  const [showCheckout, setShowCheckout] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    deliveryType: 'PICKUP',
    deliveryAddress: '',
    deliveryDate: '',
    customerNote: '',
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const items = cart.map(item => ({
        productId: item.id,
        name: item.name,
        quantity: 1,
        price: Number(item.price),
      }))

      const res = await fetch('/api/paystack/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          items,
          totalAmount: cartTotal,
          orderType: 'RETAIL',
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || 'Failed to initialize payment')
        return
      }

      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl
      }
    } catch (e: any) {
      setError(e?.message ?? 'Checkout failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <Header />
      <main className="mx-auto max-w-4xl px-4 pb-24 pt-28 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-amber-700">Cart</p>
          <h1 className="text-3xl font-black text-stone-900 sm:text-4xl">Your order summary</h1>
        </div>

        {cart.length === 0 ? (
          <div className="rounded-3xl border border-stone-200 bg-white p-10 text-center shadow-sm">
            <div className="mb-4 text-5xl">🛒</div>
            <h2 className="text-2xl font-bold text-stone-900">Your cart is empty</h2>
            <p className="mt-2 text-stone-600">Add a few pastries before checkout.</p>
            <Link href="/products" className="mt-6 inline-flex rounded-full bg-amber-600 px-6 py-3 font-semibold text-white transition hover:bg-amber-700">
              Browse products
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-4 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
              {cart.map((item, index) => (
                <div key={`${item.id ?? item.name}-${index}`} className="flex items-center justify-between gap-4 rounded-2xl border border-stone-200 p-4">
                  <div>
                    <h3 className="font-semibold text-stone-900">{item.name}</h3>
                    <p className="text-sm text-stone-600">GH₵{Number(item.price || 0).toFixed(2)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFromCart(index)}
                    className="rounded-full bg-red-100 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-200"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
              <div className="flex items-center justify-between text-2xl font-black text-stone-900">
                <span>Total</span>
                <span>GH₵{cartTotal.toFixed(2)}</span>
              </div>
              <div className="mt-6 flex flex-col sm:flex-row gap-4">
                <Link href="/products" className="inline-flex rounded-full border border-stone-300 bg-white px-5 py-3 font-semibold text-stone-800 hover:border-stone-400">
                  Keep shopping
                </Link>
                <button
                  onClick={() => setShowCheckout(true)}
                  className="flex-1 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-amber-600 to-orange-600 px-5 py-3 font-semibold text-white transition hover:from-amber-700 hover:to-orange-700"
                >
                  Proceed to Checkout
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-12">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl sm:p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-stone-900">Checkout</h2>
              <button
                onClick={() => setShowCheckout(false)}
                className="text-stone-400 hover:text-stone-600"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">
                {error}
              </div>
            )}

            <form onSubmit={handleCheckout} className="space-y-4">
              <div>
                <label htmlFor="customerName" className="mb-1 block text-sm font-semibold text-stone-900">Full Name *</label>
                <input
                  id="customerName"
                  name="customerName"
                  value={formData.customerName}
                  onChange={handleInputChange}
                  required
                  className="w-full rounded-lg border-2 border-stone-300 px-4 py-3 text-stone-900 focus:border-amber-600 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="customerEmail" className="mb-1 block text-sm font-semibold text-stone-900">Email *</label>
                <input
                  id="customerEmail"
                  name="customerEmail"
                  type="email"
                  value={formData.customerEmail}
                  onChange={handleInputChange}
                  required
                  className="w-full rounded-lg border-2 border-stone-300 px-4 py-3 text-stone-900 focus:border-amber-600 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="customerPhone" className="mb-1 block text-sm font-semibold text-stone-900">Phone *</label>
                <input
                  id="customerPhone"
                  name="customerPhone"
                  type="tel"
                  value={formData.customerPhone}
                  onChange={handleInputChange}
                  required
                  className="w-full rounded-lg border-2 border-stone-300 px-4 py-3 text-stone-900 focus:border-amber-600 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="deliveryType" className="mb-1 block text-sm font-semibold text-stone-900">Delivery Type *</label>
                <select
                  id="deliveryType"
                  name="deliveryType"
                  value={formData.deliveryType}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border-2 border-stone-300 px-4 py-3 text-stone-900 focus:border-amber-600 focus:outline-none"
                >
                  <option value="PICKUP">Pickup</option>
                  <option value="DELIVERY">Delivery</option>
                </select>
              </div>

              {formData.deliveryType === 'DELIVERY' && (
                <div>
                  <label htmlFor="deliveryAddress" className="mb-1 block text-sm font-semibold text-stone-900">Delivery Address *</label>
                  <textarea
                    id="deliveryAddress"
                    name="deliveryAddress"
                    value={formData.deliveryAddress}
                    onChange={handleInputChange}
                    required
                    rows={3}
                    className="w-full rounded-lg border-2 border-stone-300 px-4 py-3 text-stone-900 focus:border-amber-600 focus:outline-none"
                    placeholder="Enter full delivery address"
                  />
                </div>
              )}

              <div>
                <label htmlFor="deliveryDate" className="mb-1 block text-sm font-semibold text-stone-900">Preferred Date (optional)</label>
                <input
                  id="deliveryDate"
                  name="deliveryDate"
                  type="date"
                  value={formData.deliveryDate}
                  onChange={handleInputChange}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full rounded-lg border-2 border-stone-300 px-4 py-3 text-stone-900 focus:border-amber-600 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="customerNote" className="mb-1 block text-sm font-semibold text-stone-900">Notes (optional)</label>
                <textarea
                  id="customerNote"
                  name="customerNote"
                  value={formData.customerNote}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full rounded-lg border-2 border-stone-300 px-4 py-3 text-stone-900 focus:border-amber-600 focus:outline-none"
                  placeholder="Special instructions, allergies, etc."
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCheckout(false)}
                  className="flex-1 inline-flex items-center justify-center rounded-lg border border-stone-300 bg-white px-5 py-3 font-semibold text-stone-800 hover:border-stone-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-amber-600 to-orange-600 px-5 py-3 font-semibold text-white transition hover:from-amber-700 hover:to-orange-700 disabled:opacity-60"
                >
                  {loading ? 'Processing...' : `Pay GH₵${cartTotal.toFixed(2)}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}