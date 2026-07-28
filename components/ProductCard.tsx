export interface Product {
  id: string
  name: string
  description?: string
  price: number
  imageUrl?: string
  category: string
  ingredients: string[]
  available: boolean
  bestseller?: boolean
}

interface ProductCardProps {
  product: Product
  onAddToCart: (product: Product) => void
  index?: number
}

export default function ProductCard({ product, onAddToCart, index = 0 }: ProductCardProps) {
  return (
    <div
      className={`product-card glassmorphism rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 ${
        product.bestseller ? 'animate-glow' : ''
      } animate-fade-in-up`}
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className="relative overflow-hidden">
        {product.imageUrl && (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-56 object-cover transition-transform duration-500 hover:scale-105"
          />
        )}
        {product.bestseller && (
          <div className="absolute top-4 left-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white px-4 py-1 rounded-full text-sm font-semibold shadow-lg">
            Best Seller
          </div>
        )}
      </div>
      <div className="p-6">
        <div className="text-sm text-amber-700 font-medium mb-2">{product.category}</div>
        <h3 className="text-xl font-semibold text-stone-800 mb-2">{product.name}</h3>
        {product.description && (
          <p className="text-stone-600 mb-4 text-sm line-clamp-2">{product.description}</p>
        )}
        <div className="flex items-center justify-between">
          <span className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
            GH₵{product.price.toFixed(2)}
          </span>
          <button
            onClick={() => onAddToCart(product)}
            disabled={!product.available}
            className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white px-5 py-2.5 rounded-full font-medium shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {product.available ? 'Add to Cart' : 'Out of Stock'}
          </button>
        </div>
      </div>
    </div>
  )
}