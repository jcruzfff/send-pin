"use client"

import { useState, useEffect } from 'react';
import { ChevronLeft } from 'lucide-react';
import { collection, getDocs, doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/context/auth-context';
import type { MarkerData } from '@/types/map';
import { SpotRequirements } from './SpotRequirements';

interface SpotSubmissionProps {
  onClose: () => void;
}

interface UserSpot extends MarkerData {
  id: string;
  status?: 'draft' | 'submitted' | 'published' | 'rejected';
  imageUrl?: string;
  thumbnailUrl?: string;
}

interface SpotRequirements {
  difficulty: string;
  material: string;
  description: string;
}

export function SpotSubmission({ onClose }: SpotSubmissionProps) {
  const { user } = useAuth();
  const [userSpots, setUserSpots] = useState<UserSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showRequirements, setShowRequirements] = useState(false);

  const isSpotAvailable = (status?: string) => {
    const available = !status || status === 'draft' || status === 'rejected';
    console.log('Checking spot availability:', { status, available });
    return available;
  };

  const loadUserSpots = async () => {
    if (!user) return;
    
    try {
      const spotsRef = collection(db, `users/${user.uid}/spots`);
      const snapshot = await getDocs(spotsRef);
      
      console.log('Loading all user spots');
      
      const spots: UserSpot[] = [];
      snapshot.forEach((doc) => {
        const spotData = doc.data() as UserSpot;
        console.log('Spot data:', { id: doc.id, ...spotData });
        
        if (!spotData.status || 
            spotData.status === 'draft' || 
            spotData.status === 'rejected') {
          spots.push({
            ...spotData,
            id: doc.id
          });
        }
      });
      
      console.log('Filtered spots available for submission:', spots);
      setUserSpots(spots);
    } catch (error) {
      console.error('Error loading spots:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      setLoading(true);
      loadUserSpots();
    }
  }, [user]);

  const refreshSpots = () => {
    setLoading(true);
    loadUserSpots();
  };

  const handleClose = () => {
    refreshSpots();
    onClose();
  };

  const handleContinue = () => {
    if (!selectedSpotId) return;
    const selectedSpot = userSpots.find(spot => spot.id === selectedSpotId);
    if (selectedSpot) {
      setShowRequirements(true);
    }
  };

  const handleSubmit = async (requirements: SpotRequirements) => {
    if (!selectedSpotId || !user || submitting) return;
    
    setSubmitting(true);
    try {
      const selectedSpot = userSpots.find(spot => spot.id === selectedSpotId);
      if (!selectedSpot) return;

      // Create submission document with requirements
      const submissionRef = doc(collection(db, 'spotSubmissions'));
      const submissionData = {
        spotId: selectedSpotId,
        userId: user.uid,
        spotData: {
          ...selectedSpot,
          difficulty: requirements.difficulty,
          material: requirements.material,
          description: requirements.description
        },
        status: 'pending',
        submittedAt: Date.now()
      };

      console.log('Submitting spot with data:', submissionData); // Debug log
      await setDoc(submissionRef, submissionData);

      // Update spot status
      const spotRef = doc(db, `users/${user.uid}/spots`, selectedSpotId);
      await updateDoc(spotRef, {
        status: 'submitted',
        difficulty: requirements.difficulty,
        material: requirements.material,
        description: requirements.description
      });

      onClose();
    } catch (error) {
      console.error('Error submitting spot:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {showRequirements ? (
        <SpotRequirements
          spot={userSpots.find(spot => spot.id === selectedSpotId)!}
          onBack={() => setShowRequirements(false)}
          onSubmit={handleSubmit}
        />
      ) : (
        <div className="fixed inset-0 bg-black z-[200]">
          {/* Header */}
          <div className="flex items-center h-[65px] px-[18px] border-b border-zinc-800">
            <button
              onClick={handleClose}
              className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h2 className="ml-2 text-lg font-semibold">Submit a Spot</h2>
          </div>

          {/* Content */}
          <div className="p-[18px]">
            <p className="text-zinc-400 mb-6">
              Submit one of your spots to be featured in the global spot book.
              All submissions are reviewed before being published.
            </p>

            {loading ? (
              <div className="text-center py-8 text-zinc-400">
                Loading your spots...
              </div>
            ) : userSpots.length === 0 ? (
              <div className="text-center py-8 text-zinc-400">
                You haven't created any spots yet.
              </div>
            ) : (
              <div className="space-y-4">
                {userSpots.map((spot) => (
                  <button
                    key={spot.id}
                    onClick={() => setSelectedSpotId(spot.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-lg transition-colors ${
                      selectedSpotId === spot.id
                        ? 'bg-white/10 ring-1 ring-white/20'
                        : 'bg-zinc-900 hover:bg-white/5'
                    }`}
                  >
                    {/* Spot Image */}
                    <div className="w-16 h-16 bg-zinc-800 rounded-lg overflow-hidden flex-shrink-0">
                      {spot.imageUrl ? (
                        <img
                          src={spot.thumbnailUrl || spot.imageUrl}
                          alt={spot.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-700">
                          No image
                        </div>
                      )}
                    </div>

                    {/* Spot Info */}
                    <div className="flex-1 text-left">
                      <h3 className="font-medium">{spot.title}</h3>
                      <p className="text-sm text-zinc-400">
                        {spot.spotType || 'Uncategorized'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleContinue}
              disabled={!selectedSpotId}
              className={`w-full py-3 rounded-full font-medium mt-6 ${
                selectedSpotId
                  ? 'bg-[#a3ff12] text-black hover:bg-[#92e610]'
                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
              }`}
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </>
  );
} 