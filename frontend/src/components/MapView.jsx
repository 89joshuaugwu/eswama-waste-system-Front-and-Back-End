import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Leaflet's default marker icons reference image files that Vite does not
// resolve automatically; point them at a CDN so markers render correctly.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Default center: Enugu, Nigeria
const DEFAULT_CENTER = [6.5244, 7.5186];

function ClickToSetLocation({ onSelect }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/**
 * markers: [{ id, lat, lng, label }]
 * onSelectLocation: optional callback(lat, lng) enabling click-to-pick mode
 */
export default function MapView({ markers = [], center, zoom = 13, onSelectLocation }) {
  return (
    <MapContainer
      center={center || DEFAULT_CENTER}
      zoom={zoom}
      scrollWheelZoom={true}
      className="h-full w-full rounded-lg"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={20}
      />
      {onSelectLocation && <ClickToSetLocation onSelect={onSelectLocation} />}
      {markers.map((m) => (
        <Marker key={m.id} position={[m.lat, m.lng]}>
          {m.label && <Popup>{m.label}</Popup>}
        </Marker>
      ))}
    </MapContainer>
  );
}
