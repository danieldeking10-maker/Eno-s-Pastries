'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useAdvancedMarkerRef
} from '@vis.gl/react-google-maps'
import {
  MapPin,
  Truck,
  Navigation,
  Clock,
  CheckCircle2,
  AlertCircle,
  Phone,
  User,
  ShoppingBag,
  Layers,
  Printer,
  RefreshCw,
  Search,
  ChevronRight,
  Sparkles,
  ExternalLink,
  Map as MapIcon,
  DollarSign
} from 'lucide-react'

// Types
export interface OrderItem {
  id: string
  quantity: number
  price: number | string
  product?: {
    name: string
    category?: string
  }
}

export interface Order {
  id: string
  customerName: string
  customerEmail: string
  customerPhone: string
  deliveryType: 'PICKUP' | 'DELIVERY'
  deliveryAddress?: string | null
  status: 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'DELIVERED' | 'CANCELLED'
  orderType: 'RETAIL' | 'WHOLESALE'
  totalAmount: number | string
  customerNote?: string | null
  createdAt: string
  items?: OrderItem[]
}

// Known Accra Neighborhood Coordinates (centered around Accra Central Bakery HQ)
// Bakery HQ: Independence Ave / Ridge, Accra (5.5580, -0.1970)
export const BAKERY_HQ = {
  name: "Eno's Pastries Bakery HQ",
  address: "Independence Avenue, Ridge, Accra, Ghana",
  lat: 5.5580,
  lng: -0.1970,
}

const ACCRA_NEIGHBORHOODS: Record<string, { lat: number; lng: number; zone: string }> = {
  'east legon': { lat: 5.6350, lng: -0.1600, zone: 'East Legon / Adjiringanor' },
  'legon': { lat: 5.6500, lng: -0.1870, zone: 'Legon Campus / Madina' },
  'adjiringanor': { lat: 5.6420, lng: -0.1450, zone: 'East Legon / Adjiringanor' },
  'cantonments': { lat: 5.5780, lng: -0.1710, zone: 'Cantonments / Labone' },
  'labone': { lat: 5.5670, lng: -0.1650, zone: 'Cantonments / Labone' },
  'osu': { lat: 5.5560, lng: -0.1800, zone: 'Osu / Oxford St' },
  'airport residential': { lat: 5.6020, lng: -0.1830, zone: 'Airport Residential / Dzorwulu' },
  'dzorwulu': { lat: 5.6110, lng: -0.1980, zone: 'Airport Residential / Dzorwulu' },
  'roman ridge': { lat: 5.6000, lng: -0.1920, zone: 'Airport Residential / Dzorwulu' },
  'spintex': { lat: 5.6180, lng: -0.1050, zone: 'Spintex Road Corridor' },
  'palace mall': { lat: 5.6150, lng: -0.1120, zone: 'Spintex Road Corridor' },
  'tema': { lat: 5.6690, lng: -0.0160, zone: 'Tema Township' },
  'madina': { lat: 5.6680, lng: -0.1680, zone: 'Legon Campus / Madina' },
  'achimota': { lat: 5.6200, lng: -0.2220, zone: 'Achimota / Dome' },
  'dansoman': { lat: 5.5450, lng: -0.2600, zone: 'Dansoman / Korle Bu' },
  'adabraka': { lat: 5.5600, lng: -0.2080, zone: 'Accra Central / Adabraka' },
  'ridge': { lat: 5.5580, lng: -0.1970, zone: 'Accra Central / Adabraka' },
  'teshie': { lat: 5.5800, lng: -0.1000, zone: 'Teshie / Nungua' },
  'nungua': { lat: 5.6000, lng: -0.0800, zone: 'Teshie / Nungua' },
  'kasoa': { lat: 5.5200, lng: -0.4200, zone: 'West Accra / Kasoa' }
}

// Function to resolve approximate lat/lng for an address
export function geocodeAccraAddress(address?: string | null, indexOffset: number = 0): { lat: number; lng: number; zoneName: string } {
  if (!address) {
    return {
      lat: BAKERY_HQ.lat + (indexOffset % 3 === 0 ? 0.02 : -0.015),
      lng: BAKERY_HQ.lng + (indexOffset % 2 === 0 ? 0.025 : -0.02),
      zoneName: 'Accra Central Zone'
    }
  }

  const lower = address.toLowerCase()
  for (const [key, coords] of Object.entries(ACCRA_NEIGHBORHOODS)) {
    if (lower.includes(key)) {
      // Add tiny deterministic jitter based on indexOffset so multiple orders in same area don't overlap completely
      const jitterLat = ((indexOffset % 5) - 2) * 0.0025
      const jitterLng = (((indexOffset * 3) % 5) - 2) * 0.0025
      return {
        lat: coords.lat + jitterLat,
        lng: coords.lng + jitterLng,
        zoneName: coords.zone
      }
    }
  }

  // Hash address string for consistent pseudo-location around Accra if not matched
  let hash = 0
  for (let i = 0; i < address.length; i++) {
    hash = (hash << 5) - hash + address.charCodeAt(i)
    hash |= 0
  }
  const latOffset = ((Math.abs(hash) % 100) / 1000) * (hash % 2 === 0 ? 1 : -1)
  const lngOffset = (((Math.abs(hash) >> 2) % 100) / 1000) * (hash % 3 === 0 ? 1 : -1)

  return {
    lat: BAKERY_HQ.lat + 0.015 + latOffset,
    lng: BAKERY_HQ.lng + 0.015 + lngOffset,
    zoneName: 'Accra Suburban Area'
  }
}

// Distance helper in Km (Haversine formula)
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371 // Radius of earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export interface DeliveryCluster {
  id: string
  zoneName: string
  centerLat: number
  centerLng: number
  orders: (Order & { lat: number; lng: number })[]
  totalRevenue: number
  distanceFromHQKm: number
  suggestedStopIndex: number
}

export default function DeliveryClusterMap() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [statusFilter, setStatusFilter] = useState<'PENDING_ALL' | 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY'>('PENDING_ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCluster, setSelectedCluster] = useState<DeliveryCluster | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<(Order & { lat: number; lng: number }) | null>(null)
  const [viewMode, setViewMode] = useState<'MAP' | 'RADAR'>('MAP')
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null)

  // API Key check
  const apiKey =
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_PLATFORM_KEY ||
    process.env.GOOGLE_MAPS_PLATFORM_KEY ||
    ''

  const fetchOrders = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/orders')
      if (!res.ok) throw new Error('Failed to fetch orders')
      const data = await res.json()
      setOrders(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error(err)
      setError('Could not load delivery orders.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  // Filter for active pending delivery orders
  const activeDeliveryOrders = useMemo(() => {
    return orders.filter((ord) => {
      if (ord.deliveryType !== 'DELIVERY') return false
      if (ord.status === 'DELIVERED' || ord.status === 'CANCELLED') return false

      if (statusFilter !== 'PENDING_ALL' && ord.status !== statusFilter) {
        return false
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchName = ord.customerName.toLowerCase().includes(q)
        const matchAddr = (ord.deliveryAddress || '').toLowerCase().includes(q)
        const matchPhone = ord.customerPhone.toLowerCase().includes(q)
        const matchId = ord.id.toLowerCase().includes(q)
        return matchName || matchAddr || matchPhone || matchId
      }

      return true
    })
  }, [orders, statusFilter, searchQuery])

  // Map orders to geo points and cluster into neighborhood zones
  const clusters = useMemo<DeliveryCluster[]>(() => {
    const geoOrders = activeDeliveryOrders.map((ord, idx) => {
      const geo = geocodeAccraAddress(ord.deliveryAddress, idx)
      return {
        ...ord,
        lat: geo.lat,
        lng: geo.lng,
        zoneName: geo.zoneName
      }
    })

    // Group by zoneName or distance proximity (< 2.5km)
    const clusterMap: Record<string, typeof geoOrders> = {}

    geoOrders.forEach((ord) => {
      const zoneKey = ord.zoneName
      if (!clusterMap[zoneKey]) {
        clusterMap[zoneKey] = []
      }
      clusterMap[zoneKey].push(ord)
    })

    const result: DeliveryCluster[] = Object.entries(clusterMap).map(([zoneName, items], idx) => {
      const avgLat = items.reduce((acc, curr) => acc + curr.lat, 0) / items.length
      const avgLng = items.reduce((acc, curr) => acc + curr.lng, 0) / items.length
      const totalRev = items.reduce((acc, curr) => acc + Number(curr.totalAmount || 0), 0)
      const distFromHQ = calculateDistanceKm(BAKERY_HQ.lat, BAKERY_HQ.lng, avgLat, avgLng)

      return {
        id: `cluster-${idx}-${zoneName.replace(/\s+/g, '-').toLowerCase()}`,
        zoneName,
        centerLat: avgLat,
        centerLng: avgLng,
        orders: items,
        totalRevenue: totalRev,
        distanceFromHQKm: Math.round(distFromHQ * 10) / 10,
        suggestedStopIndex: idx + 1
      }
    })

    // Sort clusters logically by distance from Bakery HQ (optimal route sequence)
    result.sort((a, b) => a.distanceFromHQKm - b.distanceFromHQKm)
    result.forEach((c, idx) => {
      c.suggestedStopIndex = idx + 1
    })

    return result
  }, [activeDeliveryOrders])

  // Summary Metrics
  const totalPendingDeliveries = activeDeliveryOrders.length
  const totalPendingRevenue = activeDeliveryOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0)
  const totalClustersCount = clusters.length
  const estTotalRouteDistanceKm = useMemo(() => {
    if (clusters.length === 0) return 0
    let dist = 0
    let currLat = BAKERY_HQ.lat
    let currLng = BAKERY_HQ.lng

    clusters.forEach((c) => {
      dist += calculateDistanceKm(currLat, currLng, c.centerLat, c.centerLng)
      currLat = c.centerLat
      currLng = c.centerLng
    })
    // Return trip back to HQ
    dist += calculateDistanceKm(currLat, currLng, BAKERY_HQ.lat, BAKERY_HQ.lng)
    return Math.round(dist * 10) / 10
  }, [clusters])

  // Status update handler
  const handleUpdateStatus = async (orderId: string, newStatus: Order['status']) => {
    setUpdatingOrderId(orderId)
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error('Failed to update status')

      await fetchOrders()
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) => prev ? { ...prev, status: newStatus } : null)
      }
    } catch (err) {
      console.error(err)
      alert('Could not update order status.')
    } finally {
      setUpdatingOrderId(null)
    }
  }

  // Print Dispatch Sheet
  const handlePrintDispatch = () => {
    window.print()
  }

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-amber-200/80 overflow-hidden">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-900 via-amber-800 to-orange-950 p-6 text-white relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 opacity-10 pointer-events-none">
          <Truck className="w-64 h-64 text-amber-200" />
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-amber-500/30 text-amber-200 text-[11px] font-black tracking-widest uppercase px-3 py-1 rounded-full border border-amber-400/30 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-amber-300" /> Daily Dispatch Hub
              </span>
              <span className="text-amber-300 text-xs font-semibold">• Today&apos;s Active Deliveries</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-amber-50">
              Delivery Cluster & Route Summary
            </h2>
            <p className="text-amber-200/80 text-xs sm:text-sm mt-1 max-w-2xl">
              Geographic clustering of all unfulfilled delivery orders in Greater Accra. Optimize driver routes, view neighborhood clusters, and manage dispatch status.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={fetchOrders}
              className="px-3.5 py-2 bg-amber-800/60 hover:bg-amber-700 text-amber-100 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors border border-amber-700/50 cursor-pointer"
              title="Refresh Orders"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              onClick={handlePrintDispatch}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-amber-950 rounded-xl font-black text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Dispatch Sheet</span>
            </button>
          </div>
        </div>

        {/* Metric Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-amber-700/50">
          <div className="bg-amber-950/50 backdrop-blur-md rounded-2xl p-3.5 border border-amber-700/40">
            <div className="text-amber-300/80 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
              <ShoppingBag className="w-3.5 h-3.5 text-amber-400" /> Pending Orders
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white mt-1">
              {totalPendingDeliveries} <span className="text-xs font-semibold text-amber-300 font-normal">deliveries</span>
            </div>
          </div>

          <div className="bg-amber-950/50 backdrop-blur-md rounded-2xl p-3.5 border border-amber-700/40">
            <div className="text-amber-300/80 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-amber-400" /> Delivery Clusters
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-300 mt-1">
              {totalClustersCount} <span className="text-xs font-semibold text-amber-200/80 font-normal">zones</span>
            </div>
          </div>

          <div className="bg-amber-950/50 backdrop-blur-md rounded-2xl p-3.5 border border-amber-700/40">
            <div className="text-amber-300/80 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Total Order Value
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-300 mt-1">
              GH₵{totalPendingRevenue.toFixed(2)}
            </div>
          </div>

          <div className="bg-amber-950/50 backdrop-blur-md rounded-2xl p-3.5 border border-amber-700/40">
            <div className="text-amber-300/80 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
              <Navigation className="w-3.5 h-3.5 text-sky-400" /> Total Est. Route
            </div>
            <div className="text-2xl sm:text-3xl font-black text-sky-200 mt-1">
              ~{estTotalRouteDistanceKm} <span className="text-xs font-semibold text-sky-300 font-normal">km circuit</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Control Toolbar */}
      <div className="p-4 sm:p-6 bg-amber-50/60 border-b border-amber-200/60 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search customer, address, or neighborhood..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-amber-200 rounded-xl text-xs sm:text-sm font-medium focus:border-amber-600 focus:outline-none shadow-xs text-stone-800 placeholder:text-stone-400"
          />
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setStatusFilter('PENDING_ALL')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs shrink-0 transition-all cursor-pointer ${
              statusFilter === 'PENDING_ALL'
                ? 'bg-amber-900 text-white shadow-xs'
                : 'bg-white text-stone-700 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            All Active ({orders.filter(o => o.deliveryType === 'DELIVERY' && o.status !== 'DELIVERED' && o.status !== 'CANCELLED').length})
          </button>
          <button
            onClick={() => setStatusFilter('PENDING')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs shrink-0 transition-all cursor-pointer ${
              statusFilter === 'PENDING'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-stone-700 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setStatusFilter('PREPARING')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs shrink-0 transition-all cursor-pointer ${
              statusFilter === 'PREPARING'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-stone-700 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            Preparing
          </button>
          <button
            onClick={() => setStatusFilter('READY')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs shrink-0 transition-all cursor-pointer ${
              statusFilter === 'READY'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-stone-700 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            Ready for Rider
          </button>
        </div>

        {/* View Switcher */}
        <div className="flex items-center bg-white border border-amber-200 rounded-xl p-1 shrink-0">
          <button
            onClick={() => setViewMode('MAP')}
            className={`px-3 py-1.5 rounded-lg font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'MAP'
                ? 'bg-amber-900 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" /> Interactive Map
          </button>
          <button
            onClick={() => setViewMode('RADAR')}
            className={`px-3 py-1.5 rounded-lg font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'RADAR'
                ? 'bg-amber-900 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Navigation className="w-3.5 h-3.5" /> Cluster Diagram
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[520px]">
        {/* Map / Radar View Area (7 Cols) */}
        <div className="lg:col-span-7 bg-stone-900 relative border-b lg:border-b-0 lg:border-r border-amber-200/80 min-h-[420px] flex flex-col">
          {viewMode === 'MAP' && (
            <div className="w-full h-full min-h-[480px] relative">
              {apiKey ? (
                <APIProvider apiKey={apiKey} version="weekly">
                  <Map
                    defaultCenter={{ lat: BAKERY_HQ.lat, lng: BAKERY_HQ.lng }}
                    defaultZoom={12}
                    mapId="ACCRA_DELIVERY_MAP_ID"
                    internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                    style={{ width: '100%', height: '100%', minHeight: '480px' }}
                  >
                    {/* Bakery HQ Pin */}
                    <AdvancedMarker position={{ lat: BAKERY_HQ.lat, lng: BAKERY_HQ.lng }} title={BAKERY_HQ.name}>
                      <div className="bg-amber-950 text-white p-2 rounded-2xl border-2 border-amber-400 shadow-2xl flex items-center gap-1.5 transform hover:scale-110 transition-transform cursor-pointer">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <span className="font-extrabold text-xs pr-1">Eno&apos;s Bakery HQ</span>
                      </div>
                    </AdvancedMarker>

                    {/* Cluster Pin Markers */}
                    {clusters.map((cluster) => (
                      <AdvancedMarker
                        key={cluster.id}
                        position={{ lat: cluster.centerLat, lng: cluster.centerLng }}
                        onClick={() => setSelectedCluster(cluster)}
                      >
                        <div
                          className={`relative group cursor-pointer transform hover:scale-110 transition-all ${
                            selectedCluster?.id === cluster.id ? 'z-30 scale-110' : 'z-10'
                          }`}
                        >
                          <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl border-2 border-white shadow-xl flex items-center justify-center text-white font-black text-sm">
                            #{cluster.suggestedStopIndex}
                          </div>
                          <div className="absolute -top-2 -right-2 bg-amber-950 text-amber-200 text-[10px] font-black px-1.5 py-0.5 rounded-full border border-amber-400 shadow-xs">
                            {cluster.orders.length}
                          </div>
                          <div className="bg-stone-900/90 text-white font-bold text-[10px] px-2 py-0.5 rounded-md mt-1 whitespace-nowrap shadow-md text-center border border-amber-500/30">
                            {cluster.zoneName.split('/')[0]}
                          </div>
                        </div>
                      </AdvancedMarker>
                    ))}
                  </Map>
                </APIProvider>
              ) : (
                /* Fallback Map Canvas when Google API Key is not set */
                <div className="w-full h-full min-h-[480px] bg-gradient-to-br from-stone-950 via-stone-900 to-amber-950 p-6 flex flex-col justify-between relative overflow-hidden">
                  {/* Subtle Map Grid overlay lines */}
                  <div className="absolute inset-0 bg-[radial-gradient(#d97706_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" />

                  {/* Header info inside Map Canvas */}
                  <div className="relative z-10 flex items-center justify-between bg-stone-900/80 backdrop-blur-md p-3 rounded-2xl border border-amber-500/30">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                      <span className="text-amber-200 text-xs font-bold font-mono">ACCRA DISPATCH RADAR</span>
                    </div>
                    <span className="text-[11px] font-medium text-amber-300/80">Origin: Independence Ave (HQ)</span>
                  </div>

                  {/* Visual Cluster Diagram in Map View */}
                  <div className="relative z-10 my-auto py-8">
                    <div className="max-w-md mx-auto relative flex flex-col items-center gap-6">
                      {/* Central Bakery HQ */}
                      <div className="bg-amber-500 text-amber-950 px-4 py-2.5 rounded-2xl font-black text-xs shadow-2xl flex items-center gap-2 border-2 border-white animate-pulse">
                        <Sparkles className="w-4 h-4 text-amber-950" />
                        <span>HQ: Eno&apos;s Bakery (Central Kitchen)</span>
                      </div>

                      {/* Cluster Nodes Flow */}
                      <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                        {clusters.map((cluster) => (
                          <div
                            key={cluster.id}
                            onClick={() => setSelectedCluster(cluster)}
                            className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                              selectedCluster?.id === cluster.id
                                ? 'bg-amber-600 text-white border-amber-300 shadow-xl scale-102'
                                : 'bg-stone-800/80 hover:bg-stone-800 text-amber-100 border-amber-500/30 shadow-md'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-extrabold uppercase tracking-wider text-amber-300 flex items-center gap-1">
                                <span className="bg-amber-500/20 px-1.5 py-0.5 rounded text-[10px]">Stop #{cluster.suggestedStopIndex}</span>
                                {cluster.zoneName}
                              </span>
                              <span className="bg-amber-400 text-amber-950 text-[10px] font-black px-2 py-0.5 rounded-full">
                                {cluster.orders.length} {cluster.orders.length === 1 ? 'order' : 'orders'}
                              </span>
                            </div>

                            <p className="text-[11px] text-amber-200/80 line-clamp-1 mb-2 font-mono">
                              {cluster.orders.map(o => o.customerName).join(', ')}
                            </p>

                            <div className="flex items-center justify-between text-[11px] font-semibold text-amber-300 pt-2 border-t border-white/10">
                              <span>~{cluster.distanceFromHQKm} km from HQ</span>
                              <span className="text-emerald-300 font-bold">GH₵{cluster.totalRevenue.toFixed(2)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Footer Notice */}
                  <div className="relative z-10 bg-amber-950/90 backdrop-blur-md p-3 rounded-xl border border-amber-800/60 text-[11px] text-amber-200/90 flex items-center justify-between">
                    <span>💡 Tip: Set <code>GOOGLE_MAPS_PLATFORM_KEY</code> in Settings to view full satellite Google Map tiles.</span>
                    <button
                      onClick={() => setViewMode('RADAR')}
                      className="text-amber-300 underline font-bold hover:text-white cursor-pointer"
                    >
                      Expand Radar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {viewMode === 'RADAR' && (
            /* Detailed Radar Route Circuit Canvas */
            <div className="w-full h-full min-h-[480px] bg-stone-950 p-6 flex flex-col justify-between relative overflow-hidden">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-stone-800">
                <div className="flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-extrabold text-amber-100">Delivery Dispatch Sequence (Accra Circuit)</h3>
                </div>
                <span className="text-xs font-mono text-amber-400">Total Circuit: ~{estTotalRouteDistanceKm} km</span>
              </div>

              {/* Sequential Route Circuit */}
              <div className="space-y-3 my-auto py-2">
                {/* Bakery HQ Node */}
                <div className="p-3 bg-amber-950/80 rounded-2xl border border-amber-600/40 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-amber-950 font-black flex items-center justify-center shrink-0">
                    HQ
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-bold text-amber-200">{BAKERY_HQ.name}</div>
                    <div className="text-[11px] text-amber-400/80">{BAKERY_HQ.address}</div>
                  </div>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded-full font-bold">
                    Dispatch Origin
                  </span>
                </div>

                {/* Arrow connector */}
                {clusters.map((cluster, idx) => (
                  <React.Fragment key={cluster.id}>
                    <div className="flex items-center justify-center my-0.5">
                      <div className="w-0.5 h-4 bg-gradient-to-b from-amber-500 to-orange-500" />
                    </div>

                    <div
                      onClick={() => setSelectedCluster(cluster)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        selectedCluster?.id === cluster.id
                          ? 'bg-gradient-to-r from-amber-800 to-orange-900 border-amber-400 text-white shadow-xl'
                          : 'bg-stone-900/90 border-stone-800 text-amber-100 hover:border-amber-600/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="w-7 h-7 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                            #{cluster.suggestedStopIndex}
                          </span>
                          <div>
                            <div className="text-xs font-black text-amber-100">{cluster.zoneName}</div>
                            <div className="text-[11px] text-amber-300/80">
                              {cluster.orders.length} {cluster.orders.length === 1 ? 'order' : 'orders'} • ~{cluster.distanceFromHQKm} km from HQ
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-xs font-bold text-emerald-400">GH₵{cluster.totalRevenue.toFixed(2)}</div>
                          <span className="text-[10px] text-amber-400 font-medium">Click to inspect</span>
                        </div>
                      </div>

                      {/* Orders list inside radar card */}
                      <div className="mt-2 pt-2 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {cluster.orders.map((o) => (
                          <div key={o.id} className="text-[11px] bg-stone-950/60 p-2 rounded-xl flex items-center justify-between">
                            <span className="font-semibold text-stone-200 truncate pr-1">{o.customerName}</span>
                            <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                              o.status === 'READY' ? 'bg-emerald-500/20 text-emerald-300' :
                              o.status === 'PREPARING' ? 'bg-blue-500/20 text-blue-300' :
                              'bg-amber-500/20 text-amber-300'
                            }`}>
                              {o.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Cluster & Orders Panel (5 Cols) */}
        <div className="lg:col-span-5 p-4 sm:p-6 bg-stone-50 overflow-y-auto max-h-[640px] space-y-4">
          <div className="flex items-center justify-between border-b border-amber-200 pb-3">
            <h3 className="font-extrabold text-stone-900 text-sm sm:text-base flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-700" />
              Neighborhood Clusters ({clusters.length})
            </h3>
            {selectedCluster && (
              <button
                onClick={() => setSelectedCluster(null)}
                className="text-xs text-amber-700 font-bold hover:underline cursor-pointer"
              >
                Clear Selection
              </button>
            )}
          </div>

          {loading ? (
            <div className="py-12 text-center text-stone-500 text-xs font-medium">
              Loading Accra delivery clusters...
            </div>
          ) : clusters.length === 0 ? (
            <div className="py-12 text-center bg-white rounded-2xl border border-dashed border-amber-300 p-6">
              <Truck className="w-10 h-10 text-amber-400 mx-auto mb-2 opacity-60" />
              <p className="text-xs font-bold text-stone-800">No active delivery orders found.</p>
              <p className="text-[11px] text-stone-500 mt-1">
                When customers place delivery orders, their addresses will cluster automatically here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {clusters.map((cluster) => {
                const isSelected = selectedCluster?.id === cluster.id
                return (
                  <div
                    key={cluster.id}
                    className={`bg-white rounded-2xl p-4 border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-amber-600 shadow-md ring-2 ring-amber-500/20'
                        : 'border-amber-200/80 hover:border-amber-400 shadow-xs'
                    }`}
                    onClick={() => setSelectedCluster(isSelected ? null : cluster)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="inline-block bg-amber-100 text-amber-900 text-[10px] font-black px-2 py-0.5 rounded-full mb-1">
                          Stop #{cluster.suggestedStopIndex} • ~{cluster.distanceFromHQKm} km from HQ
                        </span>
                        <h4 className="font-extrabold text-stone-900 text-sm">{cluster.zoneName}</h4>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-black text-amber-800 block">
                          GH₵{cluster.totalRevenue.toFixed(2)}
                        </span>
                        <span className="text-[10px] font-bold text-stone-500">
                          {cluster.orders.length} {cluster.orders.length === 1 ? 'order' : 'orders'}
                        </span>
                      </div>
                    </div>

                    {/* Orders inside cluster */}
                    <div className="mt-3 space-y-2 pt-2 border-t border-stone-100">
                      {cluster.orders.map((ord) => (
                        <div
                          key={ord.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedOrder(ord)
                          }}
                          className="p-2.5 bg-amber-50/50 hover:bg-amber-100/60 rounded-xl border border-amber-200/50 flex items-center justify-between text-xs transition-colors cursor-pointer"
                        >
                          <div className="flex-1 pr-2">
                            <div className="font-bold text-stone-900 flex items-center gap-1.5">
                              <span>{ord.customerName}</span>
                              <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-full ${
                                ord.status === 'READY' ? 'bg-emerald-100 text-emerald-800' :
                                ord.status === 'PREPARING' ? 'bg-blue-100 text-blue-800' :
                                'bg-amber-100 text-amber-900'
                              }`}>
                                {ord.status}
                              </span>
                            </div>
                            <div className="text-[11px] text-stone-600 truncate mt-0.5">
                              {ord.deliveryAddress}
                            </div>
                          </div>

                          <ChevronRight className="w-4 h-4 text-stone-400 shrink-0" />
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Selected Order Details Modal / Drawer */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-amber-200 animate-scale-up space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-amber-100 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-100 px-2.5 py-1 rounded-full">
                  Order Details • #{selectedOrder.id.slice(-6)}
                </span>
                <h3 className="text-xl font-extrabold text-stone-900 mt-1">{selectedOrder.customerName}</h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200/80 space-y-1.5">
                <div className="flex items-center gap-2 text-stone-700">
                  <MapPin className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="font-bold">{selectedOrder.deliveryAddress || 'No address provided'}</span>
                </div>
                <div className="flex items-center gap-2 text-stone-700">
                  <Phone className="w-4 h-4 text-amber-600 shrink-0" />
                  <a href={`tel:${selectedOrder.customerPhone}`} className="text-amber-800 underline font-bold">
                    {selectedOrder.customerPhone}
                  </a>
                </div>
                {selectedOrder.customerNote && (
                  <div className="text-[11px] text-amber-900 italic bg-amber-100/60 p-2 rounded-xl mt-1">
                    &quot;{selectedOrder.customerNote}&quot;
                  </div>
                )}
              </div>

              {/* Items List */}
              <div>
                <h4 className="font-bold text-stone-800 mb-1.5">Ordered Items</h4>
                <div className="space-y-1 bg-stone-50 p-2.5 rounded-2xl border border-stone-200">
                  {selectedOrder.items && selectedOrder.items.length > 0 ? (
                    selectedOrder.items.map((item) => (
                      <div key={item.id} className="flex justify-between text-stone-800 font-medium py-1 border-b last:border-0 border-stone-200">
                        <span>{item.quantity}x {item.product?.name || 'Pastry Item'}</span>
                        <span className="font-bold">GH₵{(Number(item.price || 0) * item.quantity).toFixed(2)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-stone-500 italic">No item details available</div>
                  )}
                  <div className="pt-2 flex justify-between font-extrabold text-stone-900 text-sm border-t border-stone-300">
                    <span>Total Amount</span>
                    <span className="text-amber-800">GH₵{Number(selectedOrder.totalAmount || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Quick Status Update Controls */}
              <div>
                <h4 className="font-bold text-stone-800 mb-1.5">Dispatch Status Action</h4>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    disabled={updatingOrderId === selectedOrder.id}
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'PREPARING')}
                    className={`py-2 px-2 rounded-xl font-bold text-[11px] transition-colors cursor-pointer ${
                      selectedOrder.status === 'PREPARING'
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200'
                    }`}
                  >
                    Mark Preparing
                  </button>
                  <button
                    disabled={updatingOrderId === selectedOrder.id}
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'READY')}
                    className={`py-2 px-2 rounded-xl font-bold text-[11px] transition-colors cursor-pointer ${
                      selectedOrder.status === 'READY'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                    }`}
                  >
                    Mark Ready
                  </button>
                  <button
                    disabled={updatingOrderId === selectedOrder.id}
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'DELIVERED')}
                    className="py-2 px-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold text-[11px] rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    Mark Delivered
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
