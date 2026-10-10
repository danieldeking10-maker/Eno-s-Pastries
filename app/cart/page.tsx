'use client'

<<<<<<< HEAD
import { useState, useEffect } from 'react'
import Image from 'next/image'
=======
import { useState } from 'react'
>>>>>>> ddd2b30eb1dd5314a3b94a8ac7755345fd87cb21
import Link from 'next/link'
import Header from '@/components/Header'
import { useCart } from '@/components/CartProvider'

export default function CartPage() {
<<<<<<< HEAD
  const { cart, removeFromCart, clearCart, cartTotal } = useCart()
  const [showCheckout, setShowCheckout] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [checkoutForm, setCheckoutForm] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    orderType: 'Retail',
    deliveryType: 'Pickup',
=======
  const { cart, removeFromCart, cartTotal, clearCart } = useCart()
  const [showCheckout, setShowCheckout] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    deliveryType: 'PICKUP',
>>>>>>> ddd2b30eb1dd5314a3b94a8ac7755345fd87cb21
    deliveryAddress: '',
    deliveryDate: '',
    customerNote: '',
  })

<<<<<<< HEAD
  // Pre-fill customer details from localStorage or user session if available
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const savedEmail = localStorage.getItem('enos_customer_email') || ''
        const savedPhone = localStorage.getItem('enos_customer_phone') || ''
        const savedName = localStorage.getItem('enos_customer_name') || ''
        if (savedEmail || savedPhone || savedName) {
          setCheckoutForm((prev) => ({
            ...prev,
            customerEmail: prev.customerEmail || savedEmail,
            customerPhone: prev.customerPhone || savedPhone,
            customerName: prev.customerName || savedName,
          }))
        }
      }
    } catch {
      // Ignore localStorage read errors
    }

    // Try fetching logged-in user email
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((data) => {
        if (data?.email) {
          setCheckoutForm((prev) => ({
            ...prev,
            customerEmail: prev.customerEmail || data.email,
          }))
        }
      })
      .catch(() => undefined)
  }, [])

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return
    setError(null)

    // Save customer info locally for convenient order tracking in user dashboard
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('enos_customer_email', checkoutForm.customerEmail)
        localStorage.setItem('enos_customer_phone', checkoutForm.customerPhone)
        localStorage.setItem('enos_customer_name', checkoutForm.customerName)
        localStorage.setItem(
          'enosPastriesCustomerInfo',
          JSON.stringify({
            name: checkoutForm.customerName,
            email: checkoutForm.customerEmail,
            phone: checkoutForm.customerPhone,
          })
        )
      }
    } catch (err) {
      console.error('Failed to save customer info locally:', err)
    }

    // Group items by product ID/name to prevent duplicate entries
    const groupedMap = new Map<string, { productId: string | null; name: string; quantity: number; price: number }>()
    for (const item of cart) {
      if (!item || (!item.id && !item.name)) continue
      const key = String(item.id || item.name)
      const existing = groupedMap.get(key)
      if (existing) {
        existing.quantity += 1
      } else {
        groupedMap.set(key, {
          productId: item.id || null,
          name: item.name,
          quantity: 1,
          price: Number(item.price) || 0,
        })
      }
    }

    const payloadItems = Array.from(groupedMap.values())

    if (payloadItems.length === 0) {
      setError('Your cart does not contain any valid products.')
      return
    }

    const payload = {
      customerName: checkoutForm.customerName,
      customerEmail: checkoutForm.customerEmail,
      customerPhone: checkoutForm.customerPhone,
      orderType: checkoutForm.orderType === 'Wholesale' ? 'WHOLESALE' : 'RETAIL',
      deliveryType: checkoutForm.deliveryType === 'Delivery' ? 'DELIVERY' : 'PICKUP',
      deliveryAddress: checkoutForm.deliveryType === 'Delivery' ? checkoutForm.deliveryAddress : null,
      deliveryDate: checkoutForm.deliveryDate ? checkoutForm.deliveryDate : null,
      customerNote: checkoutForm.customerNote ? checkoutForm.customerNote : null,
      status: 'PENDING',
      totalAmount: cartTotal,
      items: payloadItems,
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/paystack/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to initialize payment')
      }

      if (data?.authorizationUrl) {
        clearCart()
        window.location.href = data.authorizationUrl
      } else {
        throw new Error('Payment link was not returned by Paystack')
      }
    } catch (err: any) {
      console.error(err)
      setError(err?.message || 'Could not start payment. Please try again.')
      setIsSubmitting(false)
=======
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Group items by productId to handle quantities properly
      const itemMap = new Map<string, { productId: string; name: string; price: number; quantity: number }>()
      
      cart.forEach(item => {
        const key = item.id
        if (itemMap.has(key)) {
          itemMap.get(key)!.quantity += 1
        } else {
          itemMap.set(key, {
            productId: item.id,
            name: item.name,
            price: Number(item.price || 0),
            quantity: 1,
          })
        }
      })

      const items = Array.from(itemMap.values())

      const res = await fetch('/api/paystack/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          deliveryAddress: formData.deliveryType === 'DELIVERY' ? formData.deliveryAddress : '',
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
        // Clear cart after successful payment initiation
        clearCart()
        window.location.href = data.authorizationUrl
      }
    } catch (e: any) {
      setError(e?.message ?? 'Checkout failed. Please try again.')
    } finally {
      setLoading(false)
>>>>>>> ddd2b30eb1dd5314a3b94a8ac7755345fd87cb21
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <Header />
      <main className="mx-auto max-w-4xl px-4 pb-24 pt-28 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-amber-700">Cart</p>
          <h1 className="text-3xl font-black text-stone-900 sm:text-4xl">Your Order Summary</h1>
        </div>

        {cart.length === 0 ? (
          <div className="rounded-3xl border border-stone-200 bg-white p-10 text-center shadow-sm">
            <div className="mb-4 text-5xl">🥐</div>
            <h2 className="text-2xl font-bold text-stone-900">Your cart is empty</h2>
            <p className="mt-2 text-stone-600">Add fresh handcrafted pastries before checking out.</p>
            <Link
              href="/products"
              className="mt-6 inline-flex rounded-full bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-3 font-semibold text-white shadow-lg transition hover:from-amber-700 hover:to-orange-700"
            >
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Cart Items List */}
            <div className="space-y-4 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
              {cart.map((item, index) => (
                <div
                  key={`${item.id ?? item.name}-${index}`}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-stone-100 bg-stone-50/50 p-4 transition hover:bg-stone-50"
                >
                  <div className="flex items-center gap-4">
                    {item.imageUrl && (
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-stone-200">
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          fill
                          className="object-cover"
                          unoptimized={item.imageUrl.startsWith('data:')}
                        />
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-stone-900">{item.name}</h3>
                      <p className="text-sm font-semibold text-amber-800">
                        GH₵{Number(item.price || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFromCart(index)}
                    className="rounded-full bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-600 transition hover:bg-red-100"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            {/* Total & Checkout Section */}
            <div className="rounded-3xl border border-amber-200 bg-white p-6 shadow-xl sm:p-8">
              <div className="flex items-center justify-between mb-8">
                <span className="text-2xl font-semibold text-stone-800">Total Amount</span>
                <span className="text-4xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                  GH₵{cartTotal.toFixed(2)}
                </span>
              </div>
<<<<<<< HEAD

              {!showCheckout ? (
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    href="/products"
                    className="inline-flex items-center justify-center rounded-full border-2 border-stone-300 bg-white px-6 py-4 font-semibold text-stone-800 transition hover:border-stone-400 text-center"
                  >
                    Keep Shopping
                  </Link>
                  <button
                    onClick={() => setShowCheckout(true)}
                    className="flex-1 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white py-4 rounded-full font-semibold text-lg shadow-xl hover:shadow-2xl transform hover:-translate-y-0.5 transition-all text-center cursor-pointer"
                  >
                    Proceed to Checkout
                  </button>
                </div>
              ) : (
                <form onSubmit={handleCheckoutSubmit} className="space-y-6 pt-4 border-t border-stone-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-bold text-stone-900">Complete Your Order</h3>
                    <button
                      type="button"
                      onClick={() => setShowCheckout(false)}
                      className="text-stone-400 hover:text-stone-600 text-sm font-semibold"
                    >
                      ✕ Close
                    </button>
                  </div>

                  {error && (
                    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
                      {error}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="customerName" className="block text-sm font-semibold text-stone-800 mb-2">
                        Full Name *
                      </label>
                      <input
                        id="customerName"
                        type="text"
                        required
                        value={checkoutForm.customerName}
                        onChange={(e) => setCheckoutForm({ ...checkoutForm, customerName: e.target.value })}
                        className="w-full px-5 py-3.5 border-2 border-amber-200 rounded-xl focus:border-amber-600 focus:outline-none text-stone-900 transition"
                        placeholder="Enter your name"
                      />
                    </div>

                    <div>
                      <label htmlFor="customerEmail" className="block text-sm font-semibold text-stone-800 mb-2">
                        Email Address *
                      </label>
                      <input
                        id="customerEmail"
                        type="email"
                        required
                        value={checkoutForm.customerEmail}
                        onChange={(e) => setCheckoutForm({ ...checkoutForm, customerEmail: e.target.value })}
                        className="w-full px-5 py-3.5 border-2 border-amber-200 rounded-xl focus:border-amber-600 focus:outline-none text-stone-900 transition"
                        placeholder="your@email.com"
                      />
                    </div>

                    <div>
                      <label htmlFor="customerPhone" className="block text-sm font-semibold text-stone-800 mb-2">
                        Phone Number *
                      </label>
                      <input
                        id="customerPhone"
                        type="tel"
                        required
                        value={checkoutForm.customerPhone}
                        onChange={(e) => setCheckoutForm({ ...checkoutForm, customerPhone: e.target.value })}
                        className="w-full px-5 py-3.5 border-2 border-amber-200 rounded-xl focus:border-amber-600 focus:outline-none text-stone-900 transition"
                        placeholder="0534716125"
                      />
                    </div>

                    <div>
                      <label htmlFor="orderType" className="block text-sm font-semibold text-stone-800 mb-2">
                        Order Type *
                      </label>
                      <select
                        id="orderType"
                        value={checkoutForm.orderType}
                        onChange={(e) => setCheckoutForm({ ...checkoutForm, orderType: e.target.value })}
                        className="w-full px-5 py-3.5 border-2 border-amber-200 rounded-xl focus:border-amber-600 focus:outline-none text-stone-900 bg-white transition"
                      >
                        <option value="Retail">Retail</option>
                        <option value="Wholesale">Wholesale</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="deliveryType" className="block text-sm font-semibold text-stone-800 mb-2">
                        Fulfillment Type *
                      </label>
                      <select
                        id="deliveryType"
                        value={checkoutForm.deliveryType}
                        onChange={(e) => setCheckoutForm({ ...checkoutForm, deliveryType: e.target.value })}
                        className="w-full px-5 py-3.5 border-2 border-amber-200 rounded-xl focus:border-amber-600 focus:outline-none text-stone-900 bg-white transition"
                      >
                        <option value="Pickup">Pickup at Counter</option>
                        <option value="Delivery">Delivery</option>
                      </select>
                    </div>

                    {checkoutForm.deliveryType === 'Delivery' && (
                      <div>
                        <label htmlFor="deliveryAddress" className="block text-sm font-semibold text-stone-800 mb-2">
                          Delivery Address *
                        </label>
                        <input
                          id="deliveryAddress"
                          type="text"
                          required
                          value={checkoutForm.deliveryAddress}
                          onChange={(e) => setCheckoutForm({ ...checkoutForm, deliveryAddress: e.target.value })}
                          className="w-full px-5 py-3.5 border-2 border-amber-200 rounded-xl focus:border-amber-600 focus:outline-none text-stone-900 transition"
                          placeholder="Street address, city, landmark"
                        />
                      </div>
                    )}

                    <div className={checkoutForm.deliveryType === 'Delivery' ? 'md:col-span-2' : ''}>
                      <label htmlFor="deliveryDate" className="block text-sm font-semibold text-stone-800 mb-2">
                        Preferred Date & Time
                      </label>
                      <input
                        id="deliveryDate"
                        type="datetime-local"
                        value={checkoutForm.deliveryDate}
                        onChange={(e) => setCheckoutForm({ ...checkoutForm, deliveryDate: e.target.value })}
                        className="w-full px-5 py-3.5 border-2 border-amber-200 rounded-xl focus:border-amber-600 focus:outline-none text-stone-900 bg-white transition"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label htmlFor="customerNote" className="block text-sm font-semibold text-stone-800 mb-2">
                        Special Instructions / Allergies (Optional)
                      </label>
                      <textarea
                        id="customerNote"
                        rows={3}
                        value={checkoutForm.customerNote}
                        onChange={(e) => setCheckoutForm({ ...checkoutForm, customerNote: e.target.value })}
                        className="w-full px-5 py-3.5 border-2 border-amber-200 rounded-xl focus:border-amber-600 focus:outline-none text-stone-900 transition resize-y"
                        placeholder="Add special instructions, dietary needs, allergies, custom greetings..."
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 pt-4">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => setShowCheckout(false)}
                      className="border-2 border-amber-600 text-amber-700 hover:bg-amber-50 disabled:opacity-50 py-4 px-8 rounded-full font-semibold transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 disabled:opacity-60 text-white py-4 rounded-full font-semibold text-lg shadow-xl hover:shadow-2xl transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <span className="animate-spin inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                          <span>Processing Payment...</span>
                        </>
                      ) : (
                        <span>Pay GH₵{cartTotal.toFixed(2)} with Paystack 🎉</span>
                      )}
                    </button>
                  </div>
                </form>
              )}
=======
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
>>>>>>> ddd2b30eb1dd5314a3b94a8ac7755345fd87cb21
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