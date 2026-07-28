'use client'

import { useState } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import { Product } from '@/components/ProductCard'
import { useCart } from '@/components/CartProvider'

export default function CartPage() {
  const { cart, removeFromCart, clearCart, cartTotal } = useCart()
  const [showCheckout, setShowCheckout] = useState(false)
  const [checkoutForm, setCheckoutForm] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    orderType: 'Retail',
    deliveryType: 'Pickup',
    deliveryAddress: '',
    deliveryDate: ''
  })

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

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

    const payload = {
      customerName: checkoutForm.customerName,
      customerEmail: checkoutForm.customerEmail,
      customerPhone: checkoutForm.customerPhone,
      orderType: checkoutForm.orderType === 'Wholesale' ? 'WHOLESALE' : 'RETAIL',
      deliveryType: checkoutForm.deliveryType === 'Delivery' ? 'DELIVERY' : 'PICKUP',
      deliveryAddress: checkoutForm.deliveryType === 'Delivery' ? checkoutForm.deliveryAddress : null,
      deliveryDate: checkoutForm.deliveryDate ? checkoutForm.deliveryDate : null,
      status: 'PENDING',
      totalAmount: cartTotal,
      items: cart.map((item) => ({
        productId: item.id,
        quantity: 1,
        price: item.price,
      })),
    }

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
                    <img src={item.imageUrl} alt={item.name} className="w-24 h-24 object-cover rounded-xl" />
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
                  <h3 className="text-2xl font-bold text-stone-800 mb-8 text-center">Complete Your Order</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">Full Name</label>
                      <input
                        type="text"
                        required
                        value={checkoutForm.customerName}
                        onChange={(e) => setCheckoutForm({ ...checkoutForm, customerName: e.target.value })}
                        className="w-full px-6 py-4 border-2 border-amber-200 rounded-2xl focus:border-amber-500 focus:outline-none transition-all duration-300"
                        placeholder="Enter your name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">Email</label>
                      <input
                        type="email"
                        required
                        value={checkoutForm.customerEmail}
                        onChange={(e) => setCheckoutForm({ ...checkoutForm, customerEmail: e.target.value })}
                        className="w-full px-6 py-4 border-2 border-amber-200 rounded-2xl focus:border-amber-500 focus:outline-none transition-all duration-300"
                        placeholder="your@email.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">Phone</label>
                      <input
                        type="tel"
                        required
                        value={checkoutForm.customerPhone}
                        onChange={(e) => setCheckoutForm({ ...checkoutForm, customerPhone: e.target.value })}
                        className="w-full px-6 py-4 border-2 border-amber-200 rounded-2xl focus:border-amber-500 focus:outline-none transition-all duration-300"
                        placeholder="0534716125"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">Order Type</label>
                      <select
                        value={checkoutForm.orderType}
                        onChange={(e) => setCheckoutForm({ ...checkoutForm, orderType: e.target.value })}
                        className="w-full px-6 py-4 border-2 border-amber-200 rounded-2xl focus:border-amber-500 focus:outline-none transition-all duration-300"
                      >
                        <option value="Retail">Retail</option>
                        <option value="Wholesale">Wholesale</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">Delivery Type</label>
                      <select
                        value={checkoutForm.deliveryType}
                        onChange={(e) => setCheckoutForm({ ...checkoutForm, deliveryType: e.target.value })}
                        className="w-full px-6 py-4 border-2 border-amber-200 rounded-2xl focus:border-amber-500 focus:outline-none transition-all duration-300"
                      >
                        <option value="Pickup">Pickup</option>
                        <option value="Delivery">Delivery</option>
                      </select>
                    </div>
                    {checkoutForm.deliveryType === 'Delivery' && (
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-2">Delivery Address</label>
                        <input
                          type="text"
                          required
                          value={checkoutForm.deliveryAddress}
                          onChange={(e) => setCheckoutForm({ ...checkoutForm, deliveryAddress: e.target.value })}
                          className="w-full px-6 py-4 border-2 border-amber-200 rounded-2xl focus:border-amber-500 focus:outline-none transition-all duration-300"
                          placeholder="Enter your address"
                        />
                      </div>
                    )}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-stone-700 mb-2">Preferred Date & Time</label>
                      <input
                        type="datetime-local"
                        value={checkoutForm.deliveryDate}
                        onChange={(e) => setCheckoutForm({ ...checkoutForm, deliveryDate: e.target.value })}
                        className="w-full px-6 py-4 border-2 border-amber-200 rounded-2xl focus:border-amber-500 focus:outline-none transition-all duration-300"
                      />
                    </div>
                  </div>
                  <div className="flex gap-6 pt-6">
                    <button
                      type="button"
                      onClick={() => setShowCheckout(false)}
                      className="flex-1 border-2 border-amber-600 text-amber-700 hover:bg-amber-100 py-4 rounded-full font-semibold transition-all duration-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white py-4 rounded-full font-semibold shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300"
                    >
                      Place Order 🎉
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