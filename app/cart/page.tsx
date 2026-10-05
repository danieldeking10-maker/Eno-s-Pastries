'use client'

import Link from 'next/link'
import Header from '@/components/Header'
import { useCart } from '@/components/CartProvider'

export default function CartPage() {
  const { cart, removeFromCart, cartTotal } = useCart()

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
              <Link href="/products" className="mt-6 inline-flex rounded-full border border-stone-300 bg-white px-5 py-3 font-semibold text-stone-800 hover:border-stone-400">
                Keep shopping
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}