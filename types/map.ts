export interface MarkerData {
  position: google.maps.LatLngLiteral;
  title: string;
  id: string;
  spotType?: string;
}

export interface SpotCategory {
  id: string;
  label: string;
  icon?: string;
} 