import Link from 'next/link'
import Header from '@/components/Header'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-amber-50 flex flex-col items-center justify-center px-4">
      <Header />
      <div className="text-center max-w-md bg-white p-8 rounded-2xl shadow-lg mt-20">
        <div className="text-6xl mb-4">🥐</div>
        <h1 className="text-4xl font-bold text-amber-900 mb-2">404</h1>
        <h2 className="text-xl font-semibold text-stone-800 mb-4">Page Not Found</h2>
        <p className="text-stone-600 mb-6">
          Sorry, the page or pastry you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-block bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white px-8 py-3 rounded-full font-semibold shadow-md transition-all duration-300"
        >
          Return Home
        </Link>
      </div>
    </div>
  )
}
