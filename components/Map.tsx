'use client';

import dynamic from 'next/dynamic';
import { useLoadScript } from '@react-google-maps/api';
import { useMemo, useState, useEffect, useRef } from 'react';

// Dynamically import GoogleMap with no SSR
const GoogleMap = dynamic(
  () => import('@react-google-maps/api').then(mod => mod.GoogleMap),
  { 
    ssr: false, // This is the key change
    loading: () => <div>Loading map...</div>
  }
) as unknown as typeof import('@react-google-maps/api')['GoogleMap'];

interface MarkerData {
  position: google.maps.LatLngLiteral;
  title: string;
  id: string;
}

// Add this constant outside the component
const libraries: ("marker" | "places")[] = ["marker", "places"];

// Add this type for the advanced marker
interface AdvancedMarkerElement extends google.maps.marker.AdvancedMarkerElement {
  addListener(event: string, handler: () => void): google.maps.MapsEventListener;
}

const Map = () => {
  const [markers, setMarkers] = useState<MarkerData[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<MarkerData | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries: libraries,  // Use the constant defined above
    mapIds: [process.env.NEXT_PUBLIC_GOOGLE_MAPS_ID!],
  });

  // Default center coordinates (you can adjust these)
  const center = useMemo(() => ({ lat: 51.5074, lng: -0.1278 }), []); // London coordinates

  // Map container style
  const containerStyle = useMemo(() => ({
    width: '100%',
    height: 'calc(100vh - 64px)' // Subtract navigation height
  }), []);

  // Simplified map options
  const options = {
    disableDefaultUI: true,
    zoomControl: true,
    mapId: process.env.NEXT_PUBLIC_GOOGLE_MAPS_ID,
  };

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const newMarker: MarkerData = {
        position: e.latLng.toJSON(),
        title: 'New Location',
        id: Date.now().toString(),
      };
      setMarkers(prev => [...prev, newMarker]);
      setSelectedMarker(newMarker);
      setEditingTitle('New Location');
    }
  };

  const handleTitleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMarker) {
      setMarkers(prev =>
        prev.map(marker =>
          marker.id === selectedMarker.id
            ? { ...marker, title: editingTitle }
            : marker
        )
      );
      setSelectedMarker({ ...selectedMarker, title: editingTitle });
    }
  };

  const handleDeleteMarker = () => {
    if (selectedMarker) {
      setMarkers(prev => prev.filter(marker => marker.id !== selectedMarker.id));
      setSelectedMarker(null);
    }
  };

  // Rename to be more specific
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersMapRef = useRef<Map<string, AdvancedMarkerElement>>(
    new globalThis.Map()  // Use globalThis.Map to explicitly reference the built-in Map
  );

  // Update the markers rendering logic
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear old markers
    markersMapRef.current.forEach(marker => marker.map = null);
    markersMapRef.current.clear();

    // Create new markers
    markers.forEach(markerData => {
      const marker = new google.maps.marker.AdvancedMarkerElement({
        map: mapInstanceRef.current,
        position: markerData.position,
        title: markerData.title
      });

      marker.addListener('click', () => {
        setSelectedMarker(markerData);
        setEditingTitle(markerData.title);
      });

      markersMapRef.current.set(markerData.id, marker);
    });
  }, [markers]);

  // Add a loading state
  if (!isLoaded) {
    return <div className="w-full h-full flex items-center justify-center">Loading map...</div>;
  }

  return (
    <div className="relative w-full h-full">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={13}
        options={options}
        onClick={handleMapClick}
        onLoad={(map: google.maps.Map) => {
          mapInstanceRef.current = map;
        }}
      >
        {/* Markers handled in useEffect */}
      </GoogleMap>

      {selectedMarker && (
        <div className="absolute top-4 left-4 bg-background border rounded-lg shadow-lg p-4">
          <button
            onClick={() => setSelectedMarker(null)}
            className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
          >
            ×
          </button>
          <form onSubmit={handleTitleSubmit}>
            <input
              type="text"
              value={editingTitle}
              onChange={(e) => setEditingTitle(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
            />
            <button
              type="submit"
              className="ml-2 inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-10 px-4 py-2 text-sm font-medium"
            >
              Save
            </button>
          </form>
          <button
            onClick={handleDeleteMarker}
            className="mt-2 inline-flex items-center justify-center rounded-md bg-destructive text-destructive-foreground h-10 px-4 py-2 text-sm font-medium w-full"
          >
            Delete Marker
          </button>
        </div>
      )}
    </div>
  );
};

// Use dynamic export to avoid SSR
export default dynamic(() => Promise.resolve(Map), {
  ssr: false
}); 