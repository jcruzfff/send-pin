export interface SpotLocation {
  lat: number;
  lng: number;
}

export interface Spot {
  id: string;
  title: string;
  position: SpotLocation;
  spotType?: string;
  imageUrl?: string;
  createdAt: number;
  updatedAt: number;
} 