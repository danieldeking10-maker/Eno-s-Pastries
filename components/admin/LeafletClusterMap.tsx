'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css'
import 'leaflet-defaulticon-compatibility'

import type { DeliveryCluster } from '@/components/DeliveryClusterMap'
import { BAKERY_HQ } from '@/components/DeliveryClusterMap'

// ─── Custom Marker Icons ────────────────────────────────────────────────────

const hqIcon = L.divIcon({
  className: '',
  html: `
    <div style="
      background: #451a03;
      color: #fde68a;
      border: 2px solid #f59e0b;
      border-radius: 14px;
      padding: 5px 10px;
      font-size: 11px;
      font-weight: 900;
      white-space: nowrap;
      box-shadow: 0 4px 16px rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      gap: 5px;
    ">✦ Eno's Bakery HQ</div>`,
  iconAnchor: [75, 20],
})

function clusterIcon(stopIndex: number, orderCount: number, isSelected: boolean) {
  const bg = isSelected ? '#d97706' : '#ea580c'
  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;display:inline-block;">
        <div style="
          width:40px;height:40px;
          background: linear-gradient(135deg, ${bg}, #c2410c);
          border:2px solid white;
          border-radius:12px;
          display:flex;align-items:center;justify-content:center;
          color:white;font-weight:900;font-size:14px;
          box-shadow:0 4px 12px rgba(0,0,0,0.4);
          cursor:pointer;
        ">#${stopIndex}</div>
        <div style="
          position:absolute;top:-8px;right:-8px;
          background:#1c0a00;color:#fde68a;
          font-size:9px;font-weight:900;
          padding:1px 5px;border-radius:999px;
          border:1px solid #f59e0b;
        ">${orderCount}</div>
      </div>`,
    iconAnchor: [20, 20],
  })
}

// ─── Auto-fit map to all markers ────────────────────────────────────────────

function FitBounds({ clusters }: { clusters: DeliveryCluster[] }) {
  const map = useMap()

  useEffect(() => {
    const points: [number, number][] = [
      [BAKERY_HQ.lat, BAKERY_HQ.lng],
      ...clusters.map((c) => [c.centerLat, c.centerLng] as [number, number]),
    ]
    if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40] })
    } else {
      map.setView([BAKERY_HQ.lat, BAKERY_HQ.lng], 12)
    }
  }, [clusters, map])

  return null
}

// ─── Main Component ──────────────────────────────────────────────────────────

interface Props {
  clusters: DeliveryCluster[]
  selectedCluster: DeliveryCluster | null
  onClusterClick: (cluster: DeliveryCluster) => void
}

export default function LeafletClusterMap({ clusters, selectedCluster, onClusterClick }: Props) {
  return (
    <MapContainer
      center={[BAKERY_HQ.lat, BAKERY_HQ.lng]}
      zoom={12}
      scrollWheelZoom={false}
      style={{ width: '100%', height: '100%', minHeight: '480px' }}
    >
      {/* OpenStreetMap tiles */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Auto-fit bounds whenever clusters change */}
      <FitBounds clusters={clusters} />

      {/* Bakery HQ marker */}
      <Marker position={[BAKERY_HQ.lat, BAKERY_HQ.lng]} icon={hqIcon}>
        <Popup>
          <strong>{BAKERY_HQ.name}</strong>
          <br />
          {BAKERY_HQ.address}
        </Popup>
      </Marker>

      {/* Delivery cluster markers */}
      {clusters.map((cluster) => (
        <Marker
          key={cluster.id}
          position={[cluster.centerLat, cluster.centerLng]}
          icon={clusterIcon(
            cluster.suggestedStopIndex,
            cluster.orders.length,
            selectedCluster?.id === cluster.id
          )}
          eventHandlers={{ click: () => onClusterClick(cluster) }}
        >
          <Popup>
            <div style={{ minWidth: '180px', fontFamily: 'sans-serif' }}>
              <div style={{ fontWeight: 900, fontSize: '13px', marginBottom: '4px' }}>
                Stop #{cluster.suggestedStopIndex} · {cluster.zoneName}
              </div>
              <div style={{ fontSize: '11px', color: '#57534e' }}>
                {cluster.orders.length} {cluster.orders.length === 1 ? 'order' : 'orders'} ·
                ~{cluster.distanceFromHQKm} km from HQ
              </div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#059669', marginTop: '4px' }}>
                GH₵{cluster.totalRevenue.toFixed(2)}
              </div>
              <div style={{ marginTop: '6px', fontSize: '11px', color: '#292524' }}>
                {cluster.orders.map((o) => o.customerName).join(', ')}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
