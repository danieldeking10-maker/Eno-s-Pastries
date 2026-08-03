'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Header from '@/components/Header'
import Link from 'next/link'
import {
  Plus,
  Upload,
  Image as ImageIcon,
  Trash2,
  Edit3,
  Check,
  X,
  Sparkles,
  Tag,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  DollarSign,
  PackageCheck,
  PackageX,
  RefreshCw,
  Eye,
} from 'lucide-react'

interface Product {
  id: string
  name: string
  description?: string
  price: number
  imageUrl?: string
  category: string
  ingredients: string[]
  available: boolean
}

// Preset high quality sample bakery & drink photos for quick selection
const SAMPLE_PHOTOS = [
  { label: 'Meat Pie / Patty', url: 'https://images.unsplash.com/photo-1621236378699-8597faf6a176?w=600&auto=format&fit=crop&q=80' },
  { label: 'Golden Croissant', url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&auto=format&fit=crop&q=80' },
  { label: 'Layered Cake Slice', url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=80' },
  { label: 'Cinnamon Roll', url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80' },
  { label: 'Fresh Bread Loaf', url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80' },
  { label: 'Fruit Juice / Drink', url: 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=600&auto=format&fit=crop&q=80' },
  { label: 'Iced Coffee Latte', url: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=600&auto=format&fit=crop&q=80' },
  { label: 'Eclair / Cream Puff', url: 'https://images.unsplash.com/photo-1603532648955-039310d9ed75?w=600&auto=format&fit=crop&q=80' },
]

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL')

  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Image input state
  const [imageTab, setImageTab] = useState<'upload' | 'url' | 'presets'>('upload')
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    imageUrl: '',
    category: 'Pastry',
    ingredients: '',
    available: true,
  })

  const loadProducts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/products', { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to load products')
      const data = await res.json().catch(() => [])
      setProducts(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error(error)
      showToast('error', 'Failed to fetch existing products.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadProducts()
  }, [loadProducts])

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text })
    setTimeout(() => {
      setToastMessage(null)
    }, 3500)
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === 'number'
          ? parseFloat(value) || 0
          : type === 'checkbox'
          ? (e.target as HTMLInputElement).checked
          : value,
    }))
  }

  // Handle direct file upload conversion to compressed Base64 Data URL
  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('error', 'Please upload a valid image file (PNG, JPG, WEBP).')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast('error', 'Image size is too large (max 10MB).')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const src = event.target?.result as string
      if (!src) return

      const img = new Image()
      img.onload = () => {
        const MAX_DIM = 1000
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > MAX_DIM) {
            height *= MAX_DIM / width
            width = MAX_DIM
          }
        } else {
          if (height > MAX_DIM) {
            width *= MAX_DIM / height
            height = MAX_DIM
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = Math.round(width)
        canvas.height = Math.round(height)
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          setFormData((prev) => ({ ...prev, imageUrl: src }))
          showToast('success', 'Image uploaded successfully!')
          return
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85)
        setFormData((prev) => ({ ...prev, imageUrl: compressedBase64 }))
        showToast('success', 'Image optimized and uploaded successfully!')
      }
      img.onerror = () => {
        setFormData((prev) => ({ ...prev, imageUrl: src }))
        showToast('success', 'Image attached successfully!')
      }
      img.src = src
    }
    reader.onerror = () => {
      showToast('error', 'Error reading image file.')
    }
    reader.readAsDataURL(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      showToast('error', 'Product name is required.')
      return
    }

    setIsSubmitting(true)

    const payload = {
      ...formData,
      price: Number(formData.price) || 0,
      ingredients: formData.ingredients
        .split(',')
        .map((i) => i.trim())
        .filter(Boolean),
    }

    try {
      const res = editingProduct
        ? await fetch(`/api/products/${editingProduct.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to save product')
      }

      showToast(
        'success',
        editingProduct
          ? `Product "${formData.name}" updated successfully!`
          : `New product "${formData.name}" uploaded to market successfully!`
      )

      await loadProducts()
      resetForm()
    } catch (error) {
      console.error(error)
      showToast('error', error instanceof Error ? error.message : 'Could not save product. Please check input values.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price,
      imageUrl: product.imageUrl || '',
      category: product.category || 'Pastry',
      ingredients: Array.isArray(product.ingredients) ? product.ingredients.join(', ') : '',
      available: product.available,
    })
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleToggleAvailability = async (product: Product) => {
    try {
      const newStatus = !product.available
      const res = await fetch(`/api/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ available: newStatus }),
      })

      if (!res.ok) throw new Error('Failed to update availability')

      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, available: newStatus } : p))
      )

      showToast(
        'success',
        `"${product.name}" is now ${newStatus ? 'AVAILABLE' : 'OUT OF STOCK'}`
      )
    } catch (error) {
      console.error(error)
      showToast('error', 'Failed to update product availability.')
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return

    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete product')

      showToast('success', `Product "${name}" deleted.`)
      await loadProducts()
    } catch (error) {
      console.error(error)
      showToast('error', 'Could not delete product.')
    }
  }

  const resetForm = () => {
    setShowForm(false)
    setEditingProduct(null)
    setFormData({
      name: '',
      description: '',
      price: 0,
      imageUrl: '',
      category: 'Pastry',
      ingredients: '',
      available: true,
    })
  }

  // Filtered products
  const filteredProducts = products.filter((p) => {
    const matchesCategory =
      selectedCategoryFilter === 'ALL' ||
      p.category.toLowerCase() === selectedCategoryFilter.toLowerCase()
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesCategory && matchesSearch
  })

  // Unique categories
  const categoriesList = Array.from(new Set(products.map((p) => p.category))).filter(Boolean)

  return (
    <div className="min-h-screen bg-amber-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                href="/admin"
                className="text-xs font-bold text-amber-800 hover:text-amber-950 flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Admin Center
              </Link>
            </div>
            <h1 className="text-3xl font-black text-amber-950">Product Inventory & Upload</h1>
            <p className="text-stone-600 text-sm mt-1">
              Upload new pastries & drinks, adjust prices, edit ingredients, or toggle availability.
            </p>
          </div>

          {!showForm && (
            <button
              onClick={() => {
                resetForm()
                setShowForm(true)
              }}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white px-6 py-3 rounded-2xl font-bold shadow-md transition-all self-start sm:self-auto cursor-pointer"
            >
              <Plus className="w-5 h-5" />
              <span>Upload New Product</span>
            </button>
          )}
        </div>

        {/* Global Toast Notification */}
        {toastMessage && (
          <div
            className={`p-4 rounded-2xl border mb-6 text-sm font-semibold flex items-center justify-between shadow-sm animate-fade-in ${
              toastMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-red-50 border-red-300 text-red-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {toastMessage.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              )}
              <span>{toastMessage.text}</span>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-stone-400 hover:text-stone-700 text-xs p-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* Upload / Edit Product Form Modal/Card */}
        {showForm && (
          <div className="bg-white rounded-3xl shadow-xl border border-amber-200/80 p-6 sm:p-8 mb-10 transition-all">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 text-amber-900 rounded-xl flex items-center justify-center font-bold">
                  {editingProduct ? <Edit3 className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-amber-950">
                    {editingProduct ? `Edit Product: ${editingProduct.name}` : 'Upload New Product'}
                  </h2>
                  <p className="text-xs text-stone-500">
                    Fill out product details and attach an image file or URL below.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={resetForm}
                className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Product Name */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">
                    Product Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g. Flaky Meat Pie, Golden Croissant"
                    required
                    className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl focus:border-amber-600 focus:outline-none text-stone-900 text-sm"
                  />
                </div>

                {/* Category & Custom Option */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl focus:border-amber-600 focus:outline-none text-stone-900 text-sm font-medium"
                  >
                    <option value="Pastry">Pastry</option>
                    <option value="Drink">Drink</option>
                    <option value="Cake">Cake</option>
                    <option value="Bread">Bread</option>
                    <option value="Special">Special / Combo</option>
                  </select>
                </div>

                {/* Price GH₵ */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">
                    Price (GH₵) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-stone-500 text-xs">
                      GH₵
                    </span>
                    <input
                      type="number"
                      name="price"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={handleInputChange}
                      required
                      placeholder="0.00"
                      className="w-full pl-12 pr-4 py-3 border-2 border-stone-200 rounded-xl focus:border-amber-600 focus:outline-none text-stone-900 text-sm font-mono font-bold"
                    />
                  </div>
                </div>

                {/* Ingredients */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">
                    Ingredients (Comma Separated)
                  </label>
                  <input
                    type="text"
                    name="ingredients"
                    value={formData.ingredients}
                    onChange={handleInputChange}
                    placeholder="Flour, Butter, Minced Meat, Onions, Spices"
                    className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl focus:border-amber-600 focus:outline-none text-stone-900 text-sm"
                  />
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">
                    Product Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    placeholder="Describe the taste, crispiness, texture, or filling..."
                    className="w-full px-4 py-3 border-2 border-stone-200 rounded-xl focus:border-amber-600 focus:outline-none text-stone-900 text-sm"
                  />
                </div>

                {/* Image Upload / Attachment Section */}
                <div className="md:col-span-2 bg-stone-50 p-5 rounded-2xl border border-stone-200">
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-amber-600" /> Product Image File / Photo
                    </label>

                    <div className="flex items-center gap-1 bg-stone-200/80 p-1 rounded-xl text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => setImageTab('upload')}
                        className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                          imageTab === 'upload'
                            ? 'bg-white text-stone-900 shadow-xs'
                            : 'text-stone-600 hover:text-stone-900'
                        }`}
                      >
                        File Upload
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageTab('presets')}
                        className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                          imageTab === 'presets'
                            ? 'bg-white text-stone-900 shadow-xs'
                            : 'text-stone-600 hover:text-stone-900'
                        }`}
                      >
                        Sample Photos
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageTab('url')}
                        className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                          imageTab === 'url'
                            ? 'bg-white text-stone-900 shadow-xs'
                            : 'text-stone-600 hover:text-stone-900'
                        }`}
                      >
                        Image URL
                      </button>
                    </div>
                  </div>

                  {/* File Upload Drag & Drop Zone */}
                  {imageTab === 'upload' && (
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                        isDragging
                          ? 'border-amber-600 bg-amber-100/50 scale-[0.99]'
                          : 'border-amber-300 hover:border-amber-500 bg-white'
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <Upload className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                      <p className="text-sm font-bold text-stone-800">
                        Click to browse image file or drag & drop here
                      </p>
                      <p className="text-xs text-stone-500 mt-1">Supports PNG, JPG, JPEG, WEBP (Max 5MB)</p>
                    </div>
                  )}

                  {/* Sample Presets Selector */}
                  {imageTab === 'presets' && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3 rounded-2xl border border-stone-200">
                      {SAMPLE_PHOTOS.map((photo, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({ ...prev, imageUrl: photo.url }))
                            showToast('success', `Selected "${photo.label}" photo.`)
                          }}
                          className={`group relative overflow-hidden rounded-xl border-2 text-left transition-all cursor-pointer ${
                            formData.imageUrl === photo.url
                              ? 'border-amber-600 ring-2 ring-amber-600/30'
                              : 'border-stone-200 hover:border-amber-400'
                          }`}
                        >
                          <img
                            src={photo.url}
                            alt={photo.label}
                            className="w-full h-20 object-cover group-hover:scale-105 transition-transform"
                          />
                          <span className="block p-1.5 text-[11px] font-bold text-stone-800 bg-white/95 truncate">
                            {photo.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Direct URL Input */}
                  {imageTab === 'url' && (
                    <div className="bg-white p-3 rounded-2xl border border-stone-200">
                      <input
                        type="url"
                        name="imageUrl"
                        value={formData.imageUrl}
                        onChange={handleInputChange}
                        placeholder="https://example.com/pastry-image.jpg"
                        className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-xs font-mono text-stone-800 focus:outline-none focus:border-amber-600"
                      />
                    </div>
                  )}

                  {/* Image Live Preview */}
                  {formData.imageUrl && (
                    <div className="mt-4 flex items-center gap-4 bg-white p-3 rounded-2xl border border-stone-200">
                      <img
                        src={formData.imageUrl}
                        alt="Preview"
                        className="w-20 h-20 object-cover rounded-xl border border-stone-200 shrink-0 bg-stone-100"
                      />
                      <div className="flex-1 overflow-hidden">
                        <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                          Image Attached & Ready
                        </span>
                        <p className="text-xs text-stone-500 font-mono truncate mt-1">
                          {formData.imageUrl.startsWith('data:')
                            ? `Base64 Image (${Math.round(formData.imageUrl.length / 1024)} KB)`
                            : formData.imageUrl}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, imageUrl: '' }))}
                        className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg font-bold transition-colors cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>

                {/* Stock Availability Toggle */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    name="available"
                    id="available"
                    checked={formData.available}
                    onChange={handleInputChange}
                    className="w-5 h-5 text-amber-600 rounded-md focus:ring-amber-500 cursor-pointer"
                  />
                  <label htmlFor="available" className="text-xs font-bold text-stone-800 cursor-pointer">
                    Product Available in Stock for Orders
                  </label>
                </div>
              </div>

              {/* Submit / Cancel Footer Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-3 border border-stone-300 text-stone-700 hover:bg-stone-100 rounded-xl font-bold text-sm transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm shadow-md transition-all cursor-pointer flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Saving Product...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" /> {editingProduct ? 'Update Product' : 'Upload Product'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-amber-200/80 shadow-xs mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products by name..."
              className="w-full pl-10 pr-4 py-2.5 border border-stone-200 rounded-xl text-xs font-medium text-stone-800 focus:border-amber-600 focus:outline-none"
            />
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider whitespace-nowrap flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Filter:
            </span>
            <button
              onClick={() => setSelectedCategoryFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                selectedCategoryFilter === 'ALL'
                  ? 'bg-amber-900 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-700 hover:bg-amber-100'
              }`}
            >
              All ({products.length})
            </button>

            {categoriesList.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedCategoryFilter.toLowerCase() === cat.toLowerCase()
                    ? 'bg-amber-900 text-white shadow-xs'
                    : 'bg-stone-100 text-stone-700 hover:bg-amber-100'
                }`}
              >
                {cat} ({products.filter((p) => p.category.toLowerCase() === cat.toLowerCase()).length})
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="text-center py-20 text-stone-600 flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 text-amber-600 animate-spin" />
            <p className="font-semibold text-sm">Loading product catalog...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-amber-200/80 max-w-md mx-auto my-8">
            <ImageIcon className="w-12 h-12 text-amber-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-stone-800">No products found</h3>
            <p className="text-xs text-stone-500 mt-1 mb-6">
              {searchQuery || selectedCategoryFilter !== 'ALL'
                ? 'Try adjusting your search or category filter.'
                : 'Upload your first pastry or drink to display on the menu.'}
            </p>
            <button
              onClick={() => {
                resetForm()
                setShowForm(true)
              }}
              className="px-5 py-2.5 bg-amber-800 hover:bg-amber-900 text-white rounded-xl font-bold text-xs"
            >
              Upload Product Now
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-2xl shadow-xs border border-amber-200/80 overflow-hidden flex flex-col hover:shadow-md transition-shadow group relative"
              >
                {/* Product Image */}
                <div className="relative h-48 bg-stone-100 overflow-hidden">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-stone-400">
                      <ImageIcon className="w-10 h-10 mb-1" />
                      <span className="text-[11px] font-medium">No Image Uploaded</span>
                    </div>
                  )}

                  {/* Category Badge */}
                  <span className="absolute top-3 left-3 bg-amber-950/80 backdrop-blur-xs text-amber-100 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border border-amber-800">
                    {product.category}
                  </span>

                  {/* Availability Badge */}
                  <button
                    onClick={() => handleToggleAvailability(product)}
                    className={`absolute top-3 right-3 text-[10px] font-bold px-2.5 py-1 rounded-full border shadow-xs transition-transform active:scale-95 cursor-pointer flex items-center gap-1 ${
                      product.available
                        ? 'bg-emerald-500 text-white border-emerald-600'
                        : 'bg-red-500 text-white border-red-600'
                    }`}
                    title="Click to toggle availability status"
                  >
                    {product.available ? (
                      <>
                        <PackageCheck className="w-3 h-3" /> In Stock
                      </>
                    ) : (
                      <>
                        <PackageX className="w-3 h-3" /> Out of Stock
                      </>
                    )}
                  </button>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-stone-900 leading-tight mb-1">{product.name}</h3>
                    <p className="text-xs text-stone-500 line-clamp-2 mb-3 leading-relaxed">
                      {product.description || 'No detailed description provided.'}
                    </p>

                    {/* Ingredients Pills */}
                    {Array.isArray(product.ingredients) && product.ingredients.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {product.ingredients.slice(0, 3).map((ing, i) => (
                          <span
                            key={i}
                            className="text-[10px] bg-amber-50 text-amber-900 font-medium px-2 py-0.5 rounded-md border border-amber-200"
                          >
                            {ing}
                          </span>
                        ))}
                        {product.ingredients.length > 3 && (
                          <span className="text-[10px] text-stone-400 font-medium px-1">
                            +{product.ingredients.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-baseline justify-between pt-3 border-t border-stone-100 mb-4">
                      <span className="text-[11px] font-bold uppercase text-stone-400">Unit Price</span>
                      <span className="text-xl font-black text-amber-950 font-mono">
                        GH₵{Number(product.price).toFixed(2)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleEdit(product)}
                        className="py-2 px-3 bg-stone-100 hover:bg-amber-100 text-stone-800 hover:text-amber-950 font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(product.id, product.name)}
                        className="py-2 px-3 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

