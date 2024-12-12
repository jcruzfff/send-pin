import { useLoadScript } from '@react-google-maps/api';

type Libraries = ("places" | "geometry" | "drawing" | "visualization" | "marker")[];

const libraries: Libraries = ["places", "marker"];

export function useGoogleMaps() {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries: libraries,
    mapIds: [process.env.NEXT_PUBLIC_GOOGLE_MAPS_ID!]
  });

  const loadMarker = async () => {
    if (!window.google) return null;
    return await google.maps.importLibrary("marker") as google.maps.MarkerLibrary;
  };

  return { isLoaded, loadError, loadMarker };
} 