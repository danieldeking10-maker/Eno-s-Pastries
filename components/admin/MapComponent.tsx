"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
// Fix default icons for Leaflet in Next.js builds
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import "leaflet-defaulticon-compatibility";

interface MapProps {
  /** Center of the map as [lat, lng] */
  center?: [number, number];
  /** Initial zoom level */
  zoom?: number;
}

export default function MapComponent({
  center = [5.6037, -0.1870], // Default to Accra, Ghana (example)
  zoom = 13,
}: MapProps) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      scrollWheelZoom={false}
      style={{ height: "100%", width: "100%" }}
    >
      {/* OpenStreetMap Tile Layer */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={center}>
        <Popup>Admin Dashboard Location</Popup>
      </Marker>
    </MapContainer>
  );
}
