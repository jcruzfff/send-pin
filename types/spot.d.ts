import type { MarkerData } from './map';

export interface SpotSubmissionData extends MarkerData {
  difficulty: string;
  material: string;
  description: string;
}

export interface SpotSubmission {
  id: string;
  spotId: string;
  userId: string;
  spotData: SpotSubmissionData;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: number;
} 