import Link from 'next/link'
import Header from '@/components/Header'

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-amber-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-amber-900 mb-2">Admin Dashboard</h1>
          <p className="text-amber-700">Manage your pastry shop</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href="/admin/products" className="bg-white rounded-xl shadow-md p-8 hover:shadow-xl transition-shadow">
            <h2 className="text-2xl font-semibold text-amber-800 mb-2">Products</h2>
            <p className="text-gray-600">Add, edit, or remove products</p>
          </Link>
          <Link href="/admin/orders" className="bg-white rounded-xl shadow-md p-8 hover:shadow-xl transition-shadow">
            <h2 className="text-2xl font-semibold text-amber-800 mb-2">Orders</h2>
            <p className="text-gray-600">View and manage customer orders</p>
          </Link>
          <Link href="/admin/analytics" className="bg-white rounded-xl shadow-md p-8 hover:shadow-xl transition-shadow">
            <h2 className="text-2xl font-semibold text-amber-800 mb-2">Analytics</h2>
            <p className="text-gray-600">View sales and inventory reports</p>
          </Link>
        </div>
      </main>
    </div>
  )
}