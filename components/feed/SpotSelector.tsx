'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { useAuth } from '@/lib/context/auth-context';
import { cn } from '@/lib/utils';

interface Spot {
  id: string;
  title: string;
  location?: string;
  spotType?: string;
  createdBy?: string;
  position?: {
    lat: number;
    lng: number;
  };
}

interface SpotSelectorProps {
  onSpotSelect: (spot: Spot | null) => void;
  selectedSpot: Spot | null;
  onShare: () => void;
}

export function SpotSelector({ onSpotSelect, selectedSpot, onShare }: SpotSelectorProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Spot[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const searchSpots = async (query: string) => {
    if (!query.trim() || !user) return [];
    
    try {
      const spots: Spot[] = [];
      const searchTerms = query.toLowerCase().split(' ');

      // Search in global spots
      const globalSpotsRef = collection(db, 'globalSpots');
      const globalSpotsSnapshot = await getDocs(globalSpotsRef);
      
      globalSpotsSnapshot.forEach((doc) => {
        const data = doc.data();
        const matchesSearch = searchTerms.some(term => 
          data.title?.toLowerCase().includes(term) ||
          data.location?.toLowerCase().includes(term) ||
          data.spotType?.toLowerCase().includes(term)
        );

        if (matchesSearch) {
          spots.push({
            id: doc.id,
            title: data.title,
            location: data.location,
            spotType: data.spotType,
            createdBy: data.createdBy,
            position: data.position
          });
        }
      });

      // Search in user's personal spots
      const userSpotsRef = collection(db, `users/${user.uid}/spots`);
      const userSpotsSnapshot = await getDocs(userSpotsRef);
      
      userSpotsSnapshot.forEach((doc) => {
        const data = doc.data();
        const matchesSearch = searchTerms.some(term => 
          data.title?.toLowerCase().includes(term) ||
          data.location?.toLowerCase().includes(term) ||
          data.spotType?.toLowerCase().includes(term)
        );

        if (matchesSearch) {
          spots.push({
            id: doc.id,
            title: data.title,
            location: data.location,
            spotType: data.spotType,
            createdBy: user.uid,
            position: data.position
          });
        }
      });

      return Array.from(new Map(spots.map(spot => [spot.id, spot])).values());
    } catch (error) {
      console.error('Error searching spots:', error);
      return [];
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      setIsLoading(true);
      setIsSearching(true);
      const results = await searchSpots(query);
      setSearchResults(results);
      setIsLoading(false);
    } else {
      setIsSearching(false);
      setSearchResults([]);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search for a spot..."
            className="w-full pl-10 pr-4 py-3 rounded-full bg-zinc-900/50 
                     text-white placeholder:text-zinc-400
                     border border-zinc-800 
                     focus:outline-none focus:ring-1 focus:ring-zinc-700"
          />
        </div>

        {/* Search Results */}
        {isSearching && (
          <div className="mt-4 space-y-2">
            {isLoading ? (
              <div className="text-center text-zinc-400 py-4">
                Searching...
              </div>
            ) : searchResults.length > 0 ? (
              searchResults.map((spot) => (
                <button
                  key={spot.id}
                  onClick={() => onSpotSelect(spot)}
                  className={cn(
                    "w-full p-4 rounded-lg text-left transition-colors",
                    selectedSpot?.id === spot.id
                      ? "bg-zinc-800 ring-1 ring-[#a3ff12]"
                      : "bg-zinc-900 hover:bg-zinc-800"
                  )}
                >
                  <h3 className="font-medium">{spot.title}</h3>
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-sm text-zinc-400">
                      {spot.location || spot.spotType}
                    </p>
                    {spot.createdBy === user?.uid && (
                      <span className="text-xs text-[#a3ff12]">Your spot</span>
                    )}
                  </div>
                </button>
              ))
            ) : (
              <div className="text-center text-zinc-400 py-4">
                No spots found
              </div>
            )}
          </div>
        )}
      </div>

      {/* Share Button */}
      <button
        onClick={onShare}
        disabled={!selectedSpot}
        className={cn(
          "w-full py-3 rounded-full font-medium transition-colors mt-4",
          selectedSpot
            ? "bg-[#a3ff12] hover:bg-[#92e610] text-black"
            : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
        )}
      >
        Share
      </button>
    </div>
  );
} 