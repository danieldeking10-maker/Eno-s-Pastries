'use client'

import Link from 'next/link'
import Header from '@/components/Header'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-100 via-orange-50 to-amber-100">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-24">
        <div className="text-center">
          <p className="text-amber-700 text-lg font-medium mb-4 tracking-widest uppercase animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            Welcome to Eno&apos;s
          </p>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-stone-800 mb-6 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            Where Every <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">Bite</span> is a Celebration
          </h1>
          <p className="text-xl md:text-2xl text-stone-600 mb-12 max-w-3xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
            Handcrafted pastries made with love, premium ingredients, and generations of baking expertise.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
            <Link
              href="/products"
              className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white px-8 py-4 rounded-full font-semibold text-lg shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300"
            >
              Explore Our Menu
            </Link>
            <Link
              href="/dashboard"
              className="bg-amber-100 hover:bg-amber-200 text-amber-900 border-2 border-amber-300 px-8 py-4 rounded-full font-semibold text-lg transition-all duration-300 flex items-center justify-center gap-2"
            >
              📋 Order History
            </Link>
            <Link
              href="/admin"
              className="border-2 border-amber-600 text-amber-700 hover:bg-amber-600 hover:text-white px-8 py-4 rounded-full font-semibold text-lg transition-all duration-300"
            >
              Admin
            </Link>
          </div>
        </div>

        {/* Floating decorations */}
        <div className="fixed top-24 left-10 text-6xl animate-float" style={{ animationDelay: '0s' }}>🥐</div>
        <div className="fixed top-40 right-20 text-5xl animate-float" style={{ animationDelay: '0.5s' }}>🍰</div>
        <div className="fixed bottom-40 left-1/4 text-4xl animate-float" style={{ animationDelay: '1s' }}>🥧</div>
        <div className="fixed bottom-20 right-1/3 text-5xl animate-float" style={{ animationDelay: '1.5s' }}>☕</div>
        <div className="fixed top-1/2 left-10 text-3xl animate-float" style={{ animationDelay: '2s' }}>🍪</div>
      </main>

      {/* Trust counters */}
      <section className="py-16 bg-gradient-to-r from-amber-800 to-orange-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-5xl font-bold mb-2">5000+</div>
              <div className="text-amber-100 text-lg">Happy Customers</div>
            </div>
            <div>
              <div className="text-5xl font-bold mb-2">10000+</div>
              <div className="text-amber-100 text-lg">Orders Delivered</div>
            </div>
            <div>
              <div className="text-5xl font-bold mb-2">5+</div>
              <div className="text-amber-100 text-lg">Years of Excellence</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}