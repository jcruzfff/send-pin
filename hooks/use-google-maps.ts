import { useLoadScript } from '@react-google-maps/api';
import { useEffect, useState } from 'react';

const libraries: ("places" | "geometry" | "drawing" | "visualization")[] = ["places"];

// Create a singleton to track the script loading state
let isScriptLoading = false;
let scriptLoadPromise: Promise<void> | null = null;

export function useGoogleMaps() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!scriptLoadPromise && !isScriptLoading) {
      isScriptLoading = true;
      scriptLoadPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=${libraries.join(',')}&v=weekly`;
        script.async = true;
        script.defer = true;

        script.onload = () => {
          isScriptLoading = false;
          resolve();
        };

        script.onerror = () => {
          isScriptLoading = false;
          reject(new Error('Failed to load Google Maps script'));
        };

        document.head.appendChild(script);
      });
    }

    if (scriptLoadPromise) {
      scriptLoadPromise
        .then(() => setIsReady(true))
        .catch((err) => setError(err));
    }
  }, []);

  return {
    isLoaded: isReady,
    loadError: error
  };
} 