'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import Header from '@/components/Header'
import { Product } from '@/components/ProductCard'
import { useCart } from '@/components/CartProvider'

export default function CartPage() {
  const { cart, removeFromCart, clearCart, cartTotal } = useCart()
  const [showCheckout, setShowCheckout] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [checkoutForm, setCheckoutForm] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    orderType: 'Retail',
    deliveryType: 'Pickup',
    deliveryAddress: '',
    deliveryDate: '',
    customerNote: ''
  })

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return

    // Save customer info locally for convenient order tracking in user dashboard
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('enos_customer_email', checkoutForm.customerEmail)
        localStorage.setItem('enos_customer_phone', checkoutForm.customerPhone)
        localStorage.setItem('enos_customer_name', checkoutForm.customerName)
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
      alert('Your cart does not contain any valid products.')
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

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || 'Failed to initialize payment')
      }

      const data = await res.json().catch(() => ({}))
      if (data?.authorizationUrl) {
        clearCart()
        window.location.href = data.authorizationUrl
      } else {
        throw new Error('Payment link was not returned')
      }
    } catch (err: any) {
      console.error(err)
      alert(err?.message || 'Could not start payment. Please try again.')
      setIsSubmitting(false)
    }
  }


  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-24">
        <div className="text-center mb-16">
          <p className="text-amber-700 text-lg font-medium mb-4 tracking-widest uppercase animate-fade-in-up" style={{ animationDelay: '0.2s' }}>Order Now</p>
          <h1 className="text-4xl md:text-5xl font-bold text-stone-800 mb-6 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>Your Cart</h1>
        </div>

        {cart.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-lg">
            <div className="text-6xl mb-6">🛒</div>
            <h3 className="text-2xl font-semibold text-stone-800 mb-4">Your Cart is Empty</h3>
            <p className="text-lg text-stone-600 mb-8">Add some delicious pastries to get started!</p>
            <Link href="/products" className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white px-8 py-3 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-300">
              Browse Products
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-6 mb-12">
              {cart.map((item, index) => (
                <div key={index} className="glassmorphism rounded-2xl p-6 shadow-lg flex items-center gap-6 animate-fade-in-up" style={{ animationDelay: `${index * 0.1}s` }}>
                  {item.imageUrl && (
                    <div className="relative w-24 h-24 shrink-0 overflow-hidden rounded-xl bg-stone-100">
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        sizes="96px"
                        className="object-cover"
                        referrerPolicy="no-referrer"
                        unoptimized={item.imageUrl.startsWith('data:')}
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <h4 className="text-xl font-semibold text-stone-800 mb-1">{item.name}</h4>
                    <p className="text-amber-700 font-bold text-lg">GH₵{item.price.toFixed(2)}</p>
                  </div>
                  <button
                    onClick={() => removeFromCart(index)}
                    className="w-12 h-12 bg-red-100 hover:bg-red-200 text-red-600 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <div className="glassmorphism rounded-2xl p-8 shadow-xl">
              <div className="flex items-center justify-between mb-8">
                <span className="text-2xl font-semibold text-stone-800">Total Amount</span>
                <span className="text-4xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                  GH₵{cartTotal.toFixed(2)}
                </span>
              </div>

              {!showCheckout ? (
                <button
                  onClick={() => setShowCheckout(true)}
                  className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white py-4 rounded-full font-semibold text-lg shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300"
                >
                  Proceed to Checkout
                </button>
              ) : (
                <form onSubmit={handleCheckoutSubmit} className="space-y-6">
                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-bold text-stone-900">Complete your order</h3>
                    <p className="mt-2 text-base text-stone-700">Add your contact and order details so we can confirm your payment and keep you updated.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2 border-b-2 border-amber-200 pb-3">
                      <h4 className="text-lg font-bold text-stone-900">Your contact details</h4>
                      <p className="mt-1 text-sm text-stone-700">We’ll use these details to confirm your order and contact you if we need anything.</p>
                    </div>
                    <div>
                      <label htmlFor="customer-name" className="block text-base font-semibold text-stone-900 mb-2">Full name</label>
                      <input
                        id="customer-name"
                        type="text"
                        required
                        value={checkoutForm.customerName}
                        onChange={(e) => setCheckoutForm({ ...checkoutForm, customerName: e.target.value })}
                        autoComplete="name"
                        className="w-full px-5 py-4 text-base text-stone-900 placeholder:text-stone-500 border-2 border-stone-300 rounded-xl focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20 focus:outline-none transition-all"
                        placeholder="Enter the name for this order"
                      />
                    </div>
                    <div>
                      <label htmlFor="customer-email" className="block text-base font-semibold text-stone-900 mb-2">Email address</label>
                      <input
                        id="customer-email"
                        type="email"
                        required
                        value={checkoutForm.customerEmail}
                        onChange={(e) => setCheckoutForm({ ...checkoutForm, customerEmail: e.target.value })}
                        autoComplete="email"
                        aria-describedby="customer-email-help"
                        className="w-full px-5 py-4 text-base text-stone-900 placeholder:text-stone-500 border-2 border-stone-300 rounded-xl focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20 focus:outline-none transition-all"
                        placeholder="you@example.com"
                      />
                      <p id="customer-email-help" className="mt-1.5 text-sm text-stone-700">Your receipt and order updates will be sent here.</p>
                    </div>
                    <div>
                      <label htmlFor="customer-phone" className="block text-base font-semibold text-stone-900 mb-2">Phone number</label>
                      <input
                        id="customer-phone"
                        type="tel"
                        required
                        value={checkoutForm.customerPhone}
                        onChange={(e) => setCheckoutForm({ ...checkoutForm, customerPhone: e.target.value })}
                        autoComplete="tel"
                        aria-describedby="customer-phone-help"
                        className="w-full px-5 py-4 text-base text-stone-900 placeholder:text-stone-500 border-2 border-stone-300 rounded-xl focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20 focus:outline-none transition-all"
                        placeholder="e.g. 024 123 4567"
                      />
                      <p id="customer-phone-help" className="mt-1.5 text-sm text-stone-700">Use a number we can reach about pickup or delivery.</p>
                    </div>
                    <div className="md:col-span-2 border-b-2 border-amber-200 pb-3 pt-2">
                      <h4 className="text-lg font-bold text-stone-900">Order preferences</h4>
                      <p className="mt-1 text-sm text-stone-700">Choose how you’d like to receive your order and when you prefer it.</p>
                    </div>
                    <div>
                      <label htmlFor="order-type" className="block text-base font-semibold text-stone-900 mb-2">Order type</label>
                      <select
                        id="order-type"
                        value={checkoutForm.orderType}
                        onChange={(e) => setCheckoutForm({ ...checkoutForm, orderType: e.target.value })}
                        className="w-full px-5 py-4 text-base text-stone-900 border-2 border-stone-300 rounded-xl focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20 focus:outline-none transition-all"
                      >
                        <option value="Retail">Retail</option>
                        <option value="Wholesale">Wholesale</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="delivery-type" className="block text-base font-semibold text-stone-900 mb-2">Pickup or delivery</label>
                      <select
                        id="delivery-type"
                        value={checkoutForm.deliveryType}
                        onChange={(e) => setCheckoutForm({ ...checkoutForm, deliveryType: e.target.value })}
                        className="w-full px-5 py-4 text-base text-stone-900 border-2 border-stone-300 rounded-xl focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20 focus:outline-none transition-all"
                      >
                        <option value="Pickup">Pickup</option>
                        <option value="Delivery">Delivery</option>
                      </select>
                    </div>
                    {checkoutForm.deliveryType === 'Delivery' && (
                      <div>
                        <label htmlFor="delivery-address" className="block text-base font-semibold text-stone-900 mb-2">Delivery address</label>
                        <input
                          id="delivery-address"
                          type="text"
                          required
                          value={checkoutForm.deliveryAddress}
                          onChange={(e) => setCheckoutForm({ ...checkoutForm, deliveryAddress: e.target.value })}
                          autoComplete="street-address"
                          aria-describedby="delivery-address-help"
                          className="w-full px-5 py-4 text-base text-stone-900 placeholder:text-stone-500 border-2 border-stone-300 rounded-xl focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20 focus:outline-none transition-all"
                          placeholder="Street, area and nearby landmark"
                        />
                        <p id="delivery-address-help" className="mt-1.5 text-sm text-stone-700">Include your area and a nearby landmark to help our driver find you.</p>
                      </div>
                    )}
                    <div className="md:col-span-2">
                      <label htmlFor="delivery-date" className="block text-base font-semibold text-stone-900 mb-2">Preferred date and time</label>
                      <input
                        id="delivery-date"
                        type="datetime-local"
                        value={checkoutForm.deliveryDate}
                        onChange={(e) => setCheckoutForm({ ...checkoutForm, deliveryDate: e.target.value })}
                        aria-describedby="delivery-date-help"
                        className="w-full px-5 py-4 text-base text-stone-900 border-2 border-stone-300 rounded-xl focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20 focus:outline-none transition-all"
                      />
                      <p id="delivery-date-help" className="mt-1.5 text-sm text-stone-700">We’ll confirm availability before preparing your order.</p>
                    </div>
                    <div className="md:col-span-2">
                      <label htmlFor="customer-note" className="block text-base font-semibold text-stone-900 mb-2">
                        Allergies or special instructions
                      </label>
                      <textarea
                        id="customer-note"
                        rows={3}
                        value={checkoutForm.customerNote}
                        onChange={(e) => setCheckoutForm({ ...checkoutForm, customerNote: e.target.value })}
                        className="w-full px-5 py-4 text-base text-stone-900 placeholder:text-stone-500 border-2 border-stone-300 rounded-xl focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20 focus:outline-none transition-all resize-y"
                        placeholder="Tell us about allergies, handling needs or delivery instructions"
                      />
                    </div>
                  </div>
                  <div className="flex gap-6 pt-6">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => setShowCheckout(false)}
                      className="flex-1 border-2 border-amber-600 text-amber-700 hover:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed py-4 rounded-full font-semibold transition-all duration-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-full font-semibold shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <span className="animate-spin inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                          <span>Processing Payment...</span>
                        </>
                      ) : (
                        <span>Place Order 🎉</span>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}