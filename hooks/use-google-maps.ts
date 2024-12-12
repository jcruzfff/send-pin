import { useLoadScript } from '@react-google-maps/api';

type Libraries = ("places" | "geometry" | "drawing" | "visualization" | "marker")[];

const libraries: Libraries = ["places", "marker"];

export function useGoogleMaps() {
  // Debug information
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_ID;

  console.log('Google Maps initialization:', {
    hasApiKey: !!apiKey,
    apiKeyLength: apiKey?.length,
    hasMapId: !!mapId,
    mapIdLength: mapId?.length,
    libraries,
    currentUrl: typeof window !== 'undefined' ? window.location.href : 'SSR'
  });

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey!,
    libraries: libraries,
    mapIds: mapId ? [mapId] : undefined
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

  return { isLoaded, loadError };
} 