export interface MarkerData {
  id?: string;
  title: string;
  position: {
    lat: number;
    lng: number;
  };
  spotType?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  status?: 'draft' | 'submitted' | 'published' | 'rejected';
  createdAt?: number;
  createdBy?: string;
  difficulty?: string;
  material?: string;
  description?: string;
} 