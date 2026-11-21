'use client'

import { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import Header from '@/components/Header'
import { useCart } from '@/components/CartProvider'

export default function CartPage() {
  const {
    cart,
    removeFromCart,
    setItemQuantity,
    clearCart,
    cartCount,
    rawSubtotal,
    wholesaleDiscount,
    isWholesale,
    cartTotal,
  } = useCart()
  const [showCheckout, setShowCheckout] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [checkoutForm, setCheckoutForm] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    orderType: 'Retail',
    deliveryType: 'Pickup',
    deliveryAddress: '',
    deliveryDate: '',
    customerNote: '',
  })

  // Synchronize orderType with wholesale qualification (orders with >15 items)
  useEffect(() => {
    if (isWholesale) {
      setCheckoutForm((prev) => ({ ...prev, orderType: 'Wholesale' }))
    }
  }, [isWholesale])

  // Group items by product ID/name for intuitive cart management with quantity controls
  const groupedItems = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string
        productId: string | null
        name: string
        imageUrl?: string
        quantity: number
        price: number
      }
    >()
    for (const item of cart) {
      if (!item || (!item.id && !item.name)) continue
      const key = String(item.id || item.name)
      const existing = map.get(key)
      if (existing) {
        existing.quantity += 1
      } else {
        map.set(key, {
          key,
          productId: item.id || null,
          name: item.name,
          imageUrl: item.imageUrl,
          quantity: 1,
          price: Number(item.price) || 0,
        })
      }
    }
    return Array.from(map.values())
  }, [cart])

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
              {groupedItems.map((item) => (
                <div
                  key={item.key}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-stone-100 bg-stone-50/50 p-4 transition hover:bg-stone-50"
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
                        GH₵{item.price.toFixed(2)} each
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    {/* Quantity Selector */}
                    <div className="flex items-center border border-stone-300 rounded-xl bg-white overflow-hidden shadow-xs">
                      <button
                        type="button"
                        onClick={() => setItemQuantity(item.key, item.quantity - 1)}
                        className="px-3 py-1 text-stone-600 hover:bg-stone-100 font-bold transition cursor-pointer"
                        title="Decrease quantity"
                      >
                        -
                      </button>
                      <span className="px-3 py-1 font-semibold text-stone-800 text-sm min-w-8 text-center">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setItemQuantity(item.key, item.quantity + 1)}
                        className="px-3 py-1 text-stone-600 hover:bg-stone-100 font-bold transition cursor-pointer"
                        title="Increase quantity"
                      >
                        +
                      </button>
                    </div>

                    <div className="text-right min-w-24">
                      <div className="font-bold text-stone-900">
                        GH₵{(item.price * item.quantity).toFixed(2)}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setItemQuantity(item.key, 0)}
                      className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100 cursor-pointer"
                      title="Remove item"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Wholesale Qualification Notice */}
            {isWholesale ? (
              <div className="rounded-2xl bg-emerald-50 border-2 border-emerald-500/30 p-4 text-emerald-900 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🎉</span>
                  <div>
                    <div className="font-bold text-sm sm:text-base text-emerald-900">
                      10% Wholesale Discount Applied!
                    </div>
                    <div className="text-xs sm:text-sm text-emerald-700">
                      Your order has {cartCount} items (more than 15 items), unlocking our wholesale price with 10% off.
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-semibold uppercase text-emerald-600">Savings</div>
                  <div className="text-base sm:text-lg font-bold text-emerald-800">
                    -GH₵{wholesaleDiscount.toFixed(2)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-amber-50/80 border border-amber-200/80 p-4 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs sm:text-sm">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">💡</span>
                  <span>
                    <strong>Wholesale Pricing Offer:</strong> Order more than 15 items to get an automatic <strong>10% wholesale discount</strong> on your entire order!
                  </span>
                </div>
                <span className="font-semibold text-amber-800 whitespace-nowrap bg-amber-100/70 px-3 py-1 rounded-full text-center">
                  Add {16 - cartCount} more for 10% off
                </span>
              </div>
            )}

            {/* Total & Checkout Section */}
            <div className="rounded-3xl border border-amber-200 bg-white p-6 shadow-xl sm:p-8">
              <div className="space-y-2 border-b border-stone-200 pb-4 mb-6">
                <div className="flex justify-between text-stone-600 text-sm sm:text-base">
                  <span>Subtotal ({cartCount} {cartCount === 1 ? 'item' : 'items'})</span>
                  <span>GH₵{rawSubtotal.toFixed(2)}</span>
                </div>
                {isWholesale && (
                  <div className="flex justify-between text-emerald-700 font-semibold text-sm sm:text-base">
                    <span className="flex items-center gap-1.5">
                      🏷️ Wholesale Discount (10% off)
                    </span>
                    <span>-GH₵{wholesaleDiscount.toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between mb-8">
                <div>
                  <span className="text-2xl font-semibold text-stone-800">Total Amount</span>
                  {isWholesale && (
                    <span className="block text-xs font-bold text-emerald-600 uppercase tracking-wider">
                      Wholesale Price (10% Off)
                    </span>
                  )}
                </div>
                <span className="text-4xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                  GH₵{cartTotal.toFixed(2)}
                </span>
              </div>

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
                        placeholder="024 *** ****"
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
                        <option value="Retail">
                          {isWholesale ? 'Retail (Wholesale 10% auto-applied for >15 items)' : 'Retail'}
                        </option>
                        <option value="Wholesale">
                          Wholesale {isWholesale ? '(10% Discount Applied)' : '(10% discount on orders >15 items)'}
                        </option>
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
            </div>
          </div>
        )}
      </main>
    </div>
  )
}