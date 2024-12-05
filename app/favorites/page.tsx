'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/context/auth-context';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2, MapPin, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import Link from 'next/link';
import { SPOT_CATEGORIES } from "@/lib/constants";
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface FavoriteSpot {
  id: string;
  title: string;
  spotType?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  createdAt: number;
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

        const favoriteSpots = await Promise.all(
          favoriteIds.map(async (spotId: string) => {
            console.log('Loading spot:', spotId);
            
            // First try loading from user's spots data
            if (userData?.spots?.[spotId]) {
              console.log('Found spot in user data:', spotId);
              return {
                id: spotId,
                ...userData.spots[spotId]
              } as FavoriteSpot;
            }

            // If not in user data, try global spots
            let spotDoc = await getDoc(doc(db, 'globalSpots', spotId));
            
            // If not found in global, try personal spots
            if (!spotDoc.exists()) {
              spotDoc = await getDoc(doc(db, `users/${user.uid}/spots`, spotId));
            }

            if (spotDoc.exists()) {
              console.log('Found spot in collections:', spotId);
              const data = spotDoc.data();
              return { 
                id: spotDoc.id, 
                ...data,
                title: data.title || 'Untitled Spot',
                spotType: data.spotType || 'uncategorized',
                imageUrl: data.imageUrl,
                thumbnailUrl: data.thumbnailUrl,
                createdAt: data.createdAt
              } as FavoriteSpot;
            }

            console.log('Spot not found:', spotId);
            return null;
          })
        );

        const validSpots = favoriteSpots.filter((spot): spot is FavoriteSpot => spot !== null);
        console.log('Loaded favorite spots:', validSpots);
        setFavorites(validSpots);
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
        <div className="px-[18px] py-4 flex items-center gap-3">
          <button
            onClick={() => router.push('/profile')}
            className="text-white"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div className="m-auto items-center justify-center ">
        
            <h1 className="text-lg font-medium">Favorites</h1>
          </div>
        </div>

        {/* Search Bar - Removed border and adjusted padding */}
        <div className="px-[18px] pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500 w-5 h-5" />
            <input
              type="text"
              placeholder="Search for spot"
              className="w-full pl-10 pr-4 py-3 rounded-full border-none bg-zinc-900 
                       text-white text-sm placeholder:text-zinc-500
                       focus:outline-none focus:ring-1 focus:ring-white/20"
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
            favorites.map((spot) => (
              <Link
                key={spot.id}
                href={`/spots/${spot.id}?from=favorites`}
                className="flex items-center gap-4 p-4 bg-zinc-900 hover:bg-zinc-800 
                         transition-colors rounded-xl"
              >
                <div className="w-16 h-16 bg-zinc-800 rounded-lg overflow-hidden flex-shrink-0">
                  {spot.imageUrl ? (
                    <Image
                      src={spot.thumbnailUrl || spot.imageUrl}
                      alt={spot.title}
                      className="w-full h-full object-cover"
                      width={64}
                      height={64}
                      priority={false}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <MapPin className="w-6 h-6 text-zinc-500" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h2 className="font-medium text-white truncate">{spot.title}</h2>
                  <p className="text-sm text-zinc-400">
                    {SPOT_CATEGORIES.find(cat => cat.id === spot.spotType)?.label || 'Uncategorized'}
                  </p>
                </div>

                <ChevronRight className="w-5 h-5 text-zinc-400" />
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
} 