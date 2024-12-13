'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/context/auth-context';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2, MapPin, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import Link from 'next/link';
import { SPOT_CATEGORIES } from "@/lib/constants";
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Oxanium } from 'next/font/google';
import { cn } from '@/lib/utils';

const oxanium = Oxanium({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-oxanium',
});

interface FavoriteSpot {
  id: string;
  title: string;
  spotType?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  createdAt: number;
  position: {
    lat: number;
    lng: number;
  };
}

export default function FavoritesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteSpot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFavorites() {
      if (!user) return;

      try {
        console.log('Loading favorites for user:', user.uid);
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        const favoriteIds = userData?.favorites || [];
        console.log('Found favorite IDs:', favoriteIds);

        // First, try loading from favoriteSpots map if it exists
        const favoriteSpots = await Promise.all(
          favoriteIds.map(async (spotId: string) => {
            console.log('Loading spot:', spotId);
            
            // First check if the spot data is stored in favoriteSpots map
            if (userData?.favoriteSpots?.[spotId]) {
              console.log('Found spot in favoriteSpots map:', spotId);
              const data = userData.favoriteSpots[spotId];
              return { 
                id: spotId,
                ...data,
                title: data.title || 'Untitled Spot',
                spotType: data.spotType || 'uncategorized',
                imageUrl: data.imageUrl,
                thumbnailUrl: data.thumbnailUrl,
                createdAt: data.createdAt,
                position: {
                  lat: data.position.lat,
                  lng: data.position.lng,
                },
              } as FavoriteSpot;
            }
            
            // If not in map, try loading from personal spots
            let spotDoc = await getDoc(doc(db, `users/${user.uid}/spots`, spotId));
            
            // If not found in personal spots, try global spots
            if (!spotDoc.exists()) {
              console.log('Not found in personal spots, trying global spots');
              spotDoc = await getDoc(doc(db, 'globalSpots', spotId));
            }

            if (spotDoc.exists()) {
              console.log('Found spot:', spotId);
              const data = spotDoc.data();
              return { 
                id: spotDoc.id, 
                ...data,
                title: data.title || 'Untitled Spot',
                spotType: data.spotType || 'uncategorized',
                imageUrl: data.imageUrl,
                thumbnailUrl: data.thumbnailUrl,
                createdAt: data.createdAt,
                position: {
                  lat: data.position.lat,
                  lng: data.position.lng,
                },
              } as FavoriteSpot;
            }

            console.log('Spot not found:', spotId);
            return null;
          })
        );

        const validSpots = favoriteSpots.filter((spot): spot is FavoriteSpot => spot !== null);
        console.log('Loaded favorite spots:', validSpots);
        setFavorites(validSpots);

        // Clean up any invalid favorites
        if (validSpots.length !== favoriteIds.length) {
          const validIds = validSpots.map(spot => spot.id);
          await updateDoc(doc(db, 'users', user.uid), {
            favorites: validIds
          });
        }
      } catch (error) {
        console.error('Error loading favorites:', error);
      } finally {
        setLoading(false);
      }
    }

    loadFavorites();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black">
        <div className="px-[18px] py-4 flex items-center">
          <button
            onClick={() => router.push('/profile')}
            className="absolute left-[18px] text-white"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div className="flex-1 text-center">
            <h1 className={cn("text-lg font-medium text-white", oxanium.className)}>Favorites</h1>
          </div>
        </div>

        {/* Search Bar - Removed border and adjusted padding */}
        <div className="px-[18px] pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500 w-5 h-5" />
            <input
              type="text"
              placeholder="Search for spot"
              className="w-full pl-10 pr-4 py-3 rounded-full 
                                 bg-transparent border border-[#171717]
                                 text-white text-sm placeholder:text-zinc-500
                                 focus:outline-none focus:ring-1 focus:ring-white/20
                                 focus:ring-inset"
            />
          </div>
        </div>
      </div>

      {/* Content - Adjusted top padding */}
      <div className="px-[18px] pt-2">
        <div className="space-y-4">
          {favorites.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MapPin className="h-12 w-12 text-zinc-500 mb-4" />
              <p className="text-zinc-400 text-lg mb-2">No favorite spots yet</p>
              <p className="text-zinc-500 text-sm">
                Heart a spot to add it to your favorites
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {favorites.map((spot) => (
                <div
                  key={spot.id}
                  className="relative h-[194px] bg-gradient-to-b from-[#1F1F1E] to-[#0E0E0E] hover:from-[#2F2F2E] hover:to-[#1E1E1E] transition-all cursor-pointer"
                  style={{ borderRadius: '20px' }}
                  onClick={() => router.push(`/spots/${spot.id}?from=favorites`)}
                >
                  {/* Spot Image */}
                  <div 
                    className="absolute top-6 right-3 w-[98px] h-[98px] bg-zinc-800 overflow-hidden"
                    style={{ borderRadius: '10px' }}
                  >
                    {spot.imageUrl ? (
                      <Image
                        src={spot.thumbnailUrl || spot.imageUrl}
                        alt={spot.title}
                        className="w-full h-full object-cover"
                        width={98}
                        height={98}
                        priority={false}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-zinc-500" />
                      </div>
                    )}
                  </div>

                  {/* Spot Details */}
                  <div className="absolute top-8 left-6 flex flex-col">
                    <h3 className="text-[14px] font-medium text-white font-[Oxanium]">{spot.title}</h3>
                    <div className="mt-1 space-y-2">
                      <p className="text-[12px] text-zinc-400">
                        {SPOT_CATEGORIES.find(cat => cat.id === spot.spotType)?.label || 'Uncategorized'}
                      </p>
                      <p className="text-[12px] text-zinc-400 max-w-[200px]">
                        Description of the spot or something can go here
                      </p>
                    </div>
                  </div>

                  {/* Bottom Section with Distance and Directions */}
                  <div className="absolute bottom-0 left-0 right-0 h-[56px] border-t border-zinc-800 flex items-center justify-between pl-6 pr-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-zinc-400" />
                      <span className="text-[12px] text-zinc-400">
                        Added {new Date(spot.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <button 
                      className="h-6 px-4 rounded-[6px] bg-white/10 hover:bg-white/20 transition-colors flex items-center gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(
                          `https://www.google.com/maps/dir/?api=1&destination=${spot.position?.lat},${spot.position?.lng}`,
                          '_blank'
                        );
                      }}
                    >
                      <span className="text-[12px] text-white font-[Oxanium]">Directions</span>
                      <ChevronRight className="w-3 h-3 text-white" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 