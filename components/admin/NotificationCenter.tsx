"use client"

import { useState, useEffect } from 'react';
import { ChevronLeft } from 'lucide-react';
import { collection, query, orderBy, getDocs, doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { SpotSubmission } from '@/types/spot-submission';

interface NotificationCenterProps {
  onClose: () => void;
}

export function NotificationCenter({ onClose }: NotificationCenterProps) {
  const [submissions, setSubmissions] = useState<SpotSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    loadSubmissions();
  }, []);

  const loadSubmissions = async () => {
    try {
      const submissionsRef = collection(db, 'spotSubmissions');
      const q = query(submissionsRef, orderBy('submittedAt', 'desc'));
      const snapshot = await getDocs(q);

      const submissionsList: SpotSubmission[] = [];
      snapshot.forEach((doc) => {
        submissionsList.push({
          id: doc.id,
          ...doc.data()
        } as SpotSubmission);
      });

      setSubmissions(submissionsList);
    } catch (error) {
      console.error('Error loading submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (submission: SpotSubmission) => {
    setProcessing(submission.id);
    console.log('Starting approval process for:', {
      submissionId: submission.id,
      spotId: submission.spotId,
      userId: submission.userId
    });

    try {
      const globalSpotData = {
        ...submission.spotData,
        status: 'published',
        publishedAt: Date.now(),
        isGlobal: true,
        submittedBy: submission.userId,
        approvedAt: Date.now(),
        originalSpotId: submission.spotId,
        difficulty: submission.spotData.difficulty,
        material: submission.spotData.material,
        description: submission.spotData.description
      };

      console.log('Adding to global spots with data:', globalSpotData);

      // Add to global spots
      const globalSpotRef = doc(db, 'globalSpots', submission.spotId);
      await setDoc(globalSpotRef, globalSpotData);

      // Update the original spot's status
      const userSpotRef = doc(db, `users/${submission.userId}/spots`, submission.spotId);
      await updateDoc(userSpotRef, {
        status: 'published',
        publishedAt: Date.now(),
        difficulty: submission.spotData.difficulty,
        material: submission.spotData.material,
        description: submission.spotData.description
      });
      console.log('Updated original spot status to published');

      // Update submission status
      const submissionRef = doc(db, 'spotSubmissions', submission.id);
      await updateDoc(submissionRef, {
        status: 'approved',
        processedAt: Date.now(),
        approvedAt: Date.now()
      });
      console.log('Updated submission status to approved');

      // Refresh submissions
      await loadSubmissions();
      console.log('Refreshed submissions list');
    } catch (error) {
      console.error('Error approving submission:', error);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (submission: SpotSubmission) => {
    setProcessing(submission.id);
    console.log('Starting rejection process for:', {
      submissionId: submission.id,
      spotId: submission.spotId,
      userId: submission.userId
    });

    try {
      // Update submission status
      const submissionRef = doc(db, 'spotSubmissions', submission.id);
      await updateDoc(submissionRef, {
        status: 'rejected',
        processedAt: Date.now()
      });
      console.log('Updated submission status to rejected');

      // Reset the spot's status to rejected
      const spotRef = doc(db, `users/${submission.userId}/spots`, submission.spotId);
      await updateDoc(spotRef, {
        status: 'rejected'
      });
      console.log('Updated spot status to rejected');

      // Refresh submissions
      await loadSubmissions();
      console.log('Refreshed submissions list');
    } catch (error) {
      console.error('Error rejecting submission:', error);
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-[200]">
      {/* Header */}
      <div className="flex items-center h-[65px] px-[18px] border-b border-zinc-800">
        <button
          onClick={onClose}
          className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors text-white"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="ml-2 text-lg font-semibold text-white font-[Oxanium]">Spot Submissions</h2>
      </div>

      {/* Content */}
      <div className="p-[18px]">
        {loading ? (
          <div className="text-center py-8 text-white font-[Oxanium]">
            Loading submissions...
          </div>
        ) : submissions.filter(sub => sub.status === 'pending').length === 0 ? (
          <div className="text-center py-8 text-white font-[Oxanium]">
            No pending submissions
          </div>
        ) : (
          <div className="space-y-4">
            {submissions
              .filter(sub => sub.status === 'pending')
              .map((submission) => (
                <div
                  key={submission.id}
                  className="bg-gradient-to-b from-[#1F1F1E] to-[#0E0E0E] border border-[#171717] rounded-[20px] overflow-hidden"
                >
                  {/* Spot Preview */}
                  <div className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-zinc-800 rounded-lg overflow-hidden flex-shrink-0">
                        {submission.spotData.imageUrl ? (
                          <img
                            src={submission.spotData.imageUrl}
                            alt={submission.spotData.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white font-[Oxanium]">
                            No image
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-white font-[Oxanium]">{submission.spotData.title}</h3>
                        <p className="text-sm text-white font-[Oxanium]">
                          {(submission.spotData.spotType || 'Uncategorized').charAt(0).toUpperCase() + (submission.spotData.spotType || 'Uncategorized').slice(1)}
                        </p>
                        <p className="text-xs text-zinc-400 mt-1 font-[Oxanium]">
                          Submitted {new Date(submission.submittedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex border-t border-zinc-800">
                    <button
                      onClick={() => handleApprove(submission)}
                      disabled={!!processing}
                      className="flex-1 p-3 flex items-center justify-center gap-2 hover:bg-white/5 transition-colors text-green-400 font-[Oxanium]"
                    >
                      Approve
                    </button>
                    <div className="w-px bg-zinc-800" />
                    <button
                      onClick={() => handleReject(submission)}
                      disabled={!!processing}
                      className="flex-1 p-3 flex items-center justify-center gap-2 hover:bg-white/5 transition-colors text-red-400 font-[Oxanium]"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
} 