import { useLoadScript } from '@react-google-maps/api';

type Libraries = ("places" | "marker" | "geometry" | "drawing")[];

const libraries: Libraries = ["places", "marker", "geometry", "drawing"];

export function useGoogleMaps() {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries: libraries as any,
    version: "weekly",
    mapIds: [process.env.NEXT_PUBLIC_GOOGLE_MAPS_ID!],
  });

  const loadMarker = async () => {
    if (!window.google) return null;
    return await google.maps.importLibrary("marker") as google.maps.MarkerLibrary;
  };

  return { isLoaded, loadError, loadMarker };
} 