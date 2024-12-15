import type { MarkerData } from './map';

export interface AddedByData {
  id: string;
  displayName: string;
  username: string;
  photoURL?: string;
}

export interface SpotSubmissionData extends MarkerData {
  difficulty: string;
  material: string;
  description: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  title: string;
  spotType?: string;
  addedBy: AddedByData;
  status?: 'draft' | 'submitted' | 'published' | 'rejected';
  publishedAt?: number;
  submittedBy?: string;
  approvedAt?: number;
  isGlobal?: boolean;
}

export interface SpotSubmission {
  id: string;
  spotId: string;
  userId: string;
  spotData: SpotSubmissionData;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: number;
  processedAt?: number;
  approvedAt?: number;
} 