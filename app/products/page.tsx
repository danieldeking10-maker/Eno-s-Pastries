'use client'

import { useEffect, useMemo, useState } from 'react'
import Header from '@/components/Header'
import ProductCard, { Product } from '@/components/ProductCard'
import { useCart } from '@/components/CartProvider'

type CategoryFilter = 'All' | 'Pastry' | 'Drink'

export default function ProductsPage() {
  const { addToCart } = useCart()

  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')

  useEffect(() => {
    let cancelled = false

    async function load() {
      setIsLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/products', { cache: 'no-store' })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err?.error || 'Failed to fetch products')
        }
        const data = await res.json().catch(() => ([]))
        if (!cancelled) setProducts(Array.isArray(data) ? data : [])
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to fetch products')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const categoriesList = useMemo(() => {
    const cats = new Set(products.map((p) => p.category).filter(Boolean))
    return ['All', ...Array.from(cats)]
  }, [products])

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()

    return products.filter((product) => {
      const matchesSearch =
        (product.name || '').toLowerCase().includes(q) ||
        (product.description?.toLowerCase().includes(q) ?? false)

      const matchesCategory =
        selectedCategory === 'All' ||
        (product.category || '').toLowerCase() === selectedCategory.toLowerCase()
      return matchesSearch && matchesCategory
    })
  }, [products, searchQuery, selectedCategory])

  const handleAddToCart = (product: Product) => {
    addToCart(product)
    alert(`${product.name} added to cart!`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-24">
        <div className="text-center mb-16">
          <p className="text-amber-700 text-lg font-medium mb-4 tracking-widest uppercase animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            Our Signature Collection
          </p>
          <h1 className="text-4xl md:text-5xl font-bold text-stone-800 mb-6 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            Artisan Pastries & Drinks
          </h1>
          <p className="text-xl text-stone-600 max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
            Each item is handcrafted with love and the finest ingredients
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row justify-center items-center gap-6 mb-12">
          <input
            type="text"
            placeholder="Search for your favorite pastry..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:w-96 px-6 py-4 rounded-full border-2 border-amber-200 focus:border-amber-500 focus:outline-none bg-white shadow-lg transition-all duration-300"
          />
          <div className="flex flex-wrap gap-2.5 justify-center">
            {categoriesList.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-5 py-2.5 rounded-full font-bold text-sm transition-all duration-300 cursor-pointer ${
                  selectedCategory.toLowerCase() === category.toLowerCase()
                    ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md scale-105'
                    : 'bg-white text-stone-700 hover:bg-amber-100 border-2 border-amber-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="col-span-full text-center py-16">
            <div className="text-6xl mb-6">⏳</div>
            <h3 className="text-2xl font-semibold text-stone-800 mb-4">Loading Products</h3>
            <p className="text-lg text-stone-600">Please wait...</p>
          </div>
        ) : error ? (
          <div className="col-span-full text-center py-16 bg-white rounded-2xl shadow-md">
            <div className="text-6xl mb-6">⚠️</div>
            <h3 className="text-2xl font-semibold text-stone-800 mb-4">Couldn’t load products</h3>
            <p className="text-lg text-stone-600 mb-6">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white px-8 py-3 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Retry
            </button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="col-span-full text-center py-16">
            <div className="text-6xl mb-6">🔍</div>
            <h3 className="text-2xl font-semibold text-stone-800 mb-4">No Products Found</h3>
            <p className="text-lg text-stone-600">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {filteredProducts.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
                index={index}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

