import React, { useState } from 'react';
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

const MAP_PROVIDERS = {
  primary: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  fallback: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012',
    maxZoom: 19,
  }
};

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
  const [provider, setProvider] = useState(MAP_PROVIDERS.primary);

  const handleTileError = () => {
    if (provider.url === MAP_PROVIDERS.primary.url) {
      console.warn('Primary map tiles failed to load (network issue). Switching to fallback provider.');
      setProvider(MAP_PROVIDERS.fallback);
    }
  };

  return (
    <MapContainer
      center={center || DEFAULT_CENTER}
      zoom={zoom}
      scrollWheelZoom={true}
      className="h-full w-full rounded-lg"
    >
      <TileLayer
        key={provider.url} // Force re-render of TileLayer when URL changes
        attribution={provider.attribution}
        url={provider.url}
        maxZoom={provider.maxZoom || 18}
        eventHandlers={{
          tileerror: handleTileError,
        }}
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
