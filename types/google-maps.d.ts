declare module '@react-google-maps/api' {
  export interface LoadScriptProps {
    googleMapsApiKey: string;
    libraries?: ("places" | "geometry" | "drawing" | "visualization" | "marker")[];
    mapIds?: string[];
  }

  export function useLoadScript(props: LoadScriptProps): {
    isLoaded: boolean;
    loadError: Error | undefined;
  };
} 

