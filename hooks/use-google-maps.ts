import { useLoadScript } from '@react-google-maps/api';
import { useMemo, useCallback } from 'react';

type Libraries = ("places" | "geometry" | "drawing" | "visualization" | "marker")[];

// Move libraries outside component to prevent re-creation
const libraries: Libraries = ["places", "marker"];

export function useGoogleMaps() {
  // Debug information
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_ID;

  // Memoize the script loader options
  const options = useMemo(() => ({
    googleMapsApiKey: apiKey!,
    libraries,
    mapIds: mapId ? [mapId] : undefined
  }), [apiKey, mapId]);

  const { isLoaded, loadError } = useLoadScript(options);

  // Memoize the loadMarker function
  const loadMarker = useCallback(async () => {
    if (!window.google) return null;
    return await google.maps.importLibrary("marker") as google.maps.MarkerLibrary;
  }, []);

  // Log only when status changes
  useMemo(() => {
    console.log('Google Maps initialization:', {
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey?.length,
      hasMapId: !!mapId,
      mapIdLength: mapId?.length,
      libraries,
      currentUrl: typeof window !== 'undefined' ? window.location.href : 'SSR'
    });

    if (loadError) {
      console.error('Google Maps load error:', {
        error: loadError,
        message: loadError.message,
        stack: loadError.stack
      });
    }

    if (isLoaded) {
      console.log('Google Maps loaded successfully');
    }
  }, [apiKey, mapId, isLoaded, loadError]);

  return { isLoaded, loadError, loadMarker };
} 