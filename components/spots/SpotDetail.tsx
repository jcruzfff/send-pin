'use client';

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, ChevronRight, Search, Heart } from "lucide-react";
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/context/auth-context";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { WeatherInfo } from "@/components/ui/weather-info";
import { SPOT_CATEGORIES } from "@/lib/constants";
import { calculateDistanceInMeters } from "@/lib/utils";

interface SpotData {
  id: string;
  title: string;
  imageUrl?: string;
  spotType?: string;
  position: {
    lat: number;
    lng: number;
  };
  createdAt: number;
  createdBy: string;
  status?: 'draft' | 'submitted' | 'published';
  description?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  material?: string;
  favorites?: string[];
}

interface TrickData {
  id: string;
  name: string;
  count: number;
  clips?: {
    id: string;
    skater: string;
    videoUrl?: string;
    videoName?: string;
    uploadedAt: number;
  }[];
}

const mockTricks: TrickData[] = [
  {
    id: '1',
    name: 'Kickflip',
    count: 12,
    clips: [
      { 
        id: '1', 
        skater: 'John Doe',
        videoName: 'Morning Session',
        uploadedAt: Date.now() - 86400000 // 1 day ago
      },
      { 
        id: '2', 
        skater: 'Jane Smith',
        videoName: 'Evening Clips',
        uploadedAt: Date.now() - 172800000 // 2 days ago
      }
    ]
  },
  {
    id: '2',
    name: 'Tre Flip',
    count: 8,
    clips: [
      { id: '3', skater: 'Mike Johnson', uploadedAt: Date.now() }
    ]
  },
  {
    id: '3',
    name: 'Backside Flip',
    count: 5,
    clips: [
      { id: '4', skater: 'Sarah Wilson', uploadedAt: Date.now() }
    ]
  }
];

interface SpotDetailProps {
  spot?: SpotData;
  id?: string;
  onBack?: () => void;
  isInline?: boolean;
  hideHeader?: boolean;
}

export function SpotDetail({ 
  spot: initialSpot, 
  id, 
  onBack, 
  isInline = false,
  hideHeader = false 
}: SpotDetailProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [loadedSpot, setLoadedSpot] = useState<SpotData | null>(initialSpot || null);
  const [loading, setLoading] = useState(!initialSpot);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [searchTrick, setSearchTrick] = useState('');
  const [expandedTrickId, setExpandedTrickId] = useState<string | null>(null);
  const [isFavorited, setIsFavorited] = useState(false);

  const pathname = usePathname();

  useEffect(() => {
    if (initialSpot) {
      // If we have an initial spot, use it but ensure required fields
      setLoadedSpot({
        ...initialSpot,
        difficulty: initialSpot.difficulty || 'Not specified',
        material: initialSpot.material || 'Not specified',
        description: initialSpot.description || 'No description available'
      });
    } else if (id) {
      // Otherwise load the spot by ID
      loadSpot();
    }
  }, [id, initialSpot]);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      });
    }
  }, []);

  useEffect(() => {
    if (!user || !loadedSpot) return;
    
    const checkFavoriteStatus = async () => {
      try {
        console.log('Checking favorite status');
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        const isFav = userData?.favorites?.includes(loadedSpot.id) || false;
        console.log('Is favorited:', isFav);
        setIsFavorited(isFav);
      } catch (error) {
        console.error('Error checking favorite status:', error);
      }
    };

    checkFavoriteStatus();
  }, [user, loadedSpot]);

  const formatDistance = (meters: number) => {
    return meters < 1000
      ? `${Math.round(meters)}m away`
      : `${(meters / 1000).toFixed(1)}km away`;
  };

  const openInGoogleMaps = () => {
    if (loadedSpot) {
      const url = `https://www.google.com/maps/search/?api=1&query=${loadedSpot.position.lat},${loadedSpot.position.lng}`;
      window.open(url, '_blank');
    }
  };

  const handleBack = () => {
    const searchParams = new URLSearchParams(window.location.search);
    const fromFavorites = searchParams.get('from') === 'favorites';
    
    if (onBack) {
      onBack();
    } else if (fromFavorites) {
      router.push('/favorites');
    } else {
      const fromList = searchParams.get('view') === 'list';
      const searchQuery = searchParams.get('search');
      const category = searchParams.get('category');
      
      if (fromList) {
        const params = new URLSearchParams();
        params.set('view', 'list');
        if (searchQuery) params.set('search', searchQuery);
        if (category) params.set('category', category);
        
        router.push(`/?${params.toString()}`);
      } else {
        router.back();
      }
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const handleFavorite = async () => {
    if (!user || !loadedSpot) return;

    try {
      const userRef = doc(db, 'users', user.uid);
      
      if (isFavorited) {
        // Remove from favorites
        await updateDoc(userRef, {
          favorites: arrayRemove(loadedSpot.id)
        });
        setIsFavorited(false);
      } else {
        // Add to favorites with all spot details
        const spotData = {
          ...loadedSpot,
          // Ensure these fields are included
          difficulty: loadedSpot.difficulty,
          material: loadedSpot.material,
          description: loadedSpot.description,
          // Add any additional metadata
          favoritedAt: Date.now()
        };

        // Save both the spot ID in favorites array and the full spot data
        await updateDoc(userRef, {
          favorites: arrayUnion(loadedSpot.id),
          [`favoriteSpots.${loadedSpot.id}`]: spotData
        });
        setIsFavorited(true);
      }
    } catch (error) {
      console.error('Error updating favorites:', error);
    }
  };

  const loadSpot = async () => {
    if (!id) return;

    try {
      setLoading(true);
      console.log('Loading spot with ID:', id);

      // First try loading from global spots
      const globalSpotDoc = await getDoc(doc(db, 'globalSpots', id));
      
      if (globalSpotDoc.exists()) {
        console.log('Found spot in global spots');
        const spotData = {
          id,
          ...globalSpotDoc.data(),
          difficulty: globalSpotDoc.data().difficulty || 'Not specified',
          material: globalSpotDoc.data().material || 'Not specified',
          description: globalSpotDoc.data().description || 'No description available'
        } as SpotData;
        setLoadedSpot(spotData);
        return;
      }

      // If not found in global spots and user is logged in, try user's spots
      if (user) {
        const userSpotDoc = await getDoc(doc(db, `users/${user.uid}/spots`, id));
        
        if (userSpotDoc.exists()) {
          console.log('Found spot in user spots');
          const spotData = {
            id,
            ...userSpotDoc.data(),
            difficulty: userSpotDoc.data().difficulty || 'Not specified',
            material: userSpotDoc.data().material || 'Not specified',
            description: userSpotDoc.data().description || 'No description available'
          } as SpotData;
          setLoadedSpot(spotData);
          return;
        }

        // If still not found, check user's favorites
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        
        if (userData?.favoriteSpots?.[id]) {
          console.log('Found spot in favorites');
          const spotData = {
            ...userData.favoriteSpots[id],
            difficulty: userData.favoriteSpots[id].difficulty || 'Not specified',
            material: userData.favoriteSpots[id].material || 'Not specified',
            description: userData.favoriteSpots[id].description || 'No description available'
          };
          setLoadedSpot(spotData);
          return;
        }
      }

      throw new Error('Spot not found');
    } catch (err) {
      console.error('Error loading spot:', err);
      setError(err instanceof Error ? err.message : 'Failed to load spot');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={cn(
        "flex items-center justify-center",
        isInline ? "h-[200px]" : "min-h-screen bg-black"
      )}>
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (error || !loadedSpot) {
    return (
      <div className={cn(
        "p-4",
        isInline ? "" : "min-h-screen bg-black text-white"
      )}>
        <div className="flex items-center justify-center h-[200px]">
          <p className="text-zinc-400">
            {error || 'Spot not found'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "bg-background text-foreground",
      isInline ? "relative" : "min-h-screen"
    )}>
      {/* Only show header if NOT inline */}
      {!isInline && (
        <div className="sticky top-0 z-50 bg-black/50 backdrop-blur-sm">
          <div className="px-[18px] py-6">
            <button
              onClick={handleBack}
              className="inline-flex items-center text-zinc-400 hover:text-white transition-colors"
            >
              <ChevronRight className="h-5 w-5 mr-1 rotate-180" />
              <span className="text-[10px]">Back</span>
            </button>
          </div>
          <div className="px-[18px]">
            <h1 className="text-2xl font-bold mb-1">{loadedSpot.title}</h1>
            <p className="text-zinc-400 mb-6">
              {SPOT_CATEGORIES.find(cat => cat.id === loadedSpot.spotType)?.label || 'Uncategorized'}
            </p>
          </div>
        </div>
      )}

      {/* Main Content - Start directly with the image when inline */}
      <div className={cn(
        "space-y-6",
        isInline ? "px-[18px] pb-24" : "px-[18px] pb-24"
      )}>
        {/* Hero Image */}
        <div className="w-full aspect-square bg-zinc-900 rounded-lg overflow-hidden relative">
          {loadedSpot.imageUrl ? (
            <>
              <OptimizedImage
                src={loadedSpot.imageUrl}
                alt={loadedSpot.title}
                className="w-full h-full object-cover"
                size={1024}
                showLoadingSpinner
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleFavorite();
                }}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/50 backdrop-blur-sm
                         hover:bg-black/70 transition-colors"
              >
                <Heart
                  className={cn(
                    "w-5 h-5 transition-colors",
                    isFavorited 
                      ? "fill-white text-white" 
                      : "text-white"
                  )}
                />
              </button>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-zinc-500">No image available</span>
            </div>
          )}
        </div>

        {/* Location Section */}
        <div>
          <div className="border-b border-zinc-800 ">
            <h2 className="text-[12px] text-zinc-400  py-2">Location</h2>
          </div>
          
          <div className="pt-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-medium">This location</h3>
                {userLocation && loadedSpot && (
                  <p className="text-zinc-400 text-sm">
                    {calculateDistanceInMeters(userLocation, loadedSpot.position) < 1000
                      ? `${Math.round(calculateDistanceInMeters(userLocation, loadedSpot.position))}m away`
                      : `${(calculateDistanceInMeters(userLocation, loadedSpot.position) / 1000).toFixed(1)}km away`}
                  </p>
                )}
              </div>
              <WeatherInfo lat={loadedSpot.position.lat} lng={loadedSpot.position.lng} />
            </div>

            {/* Map Preview */}
            <button
              onClick={openInGoogleMaps}
              className="w-full h-48 bg-zinc-900 rounded-lg overflow-hidden relative group"
            >
              <img
                src={`https://maps.googleapis.com/maps/api/staticmap?center=${loadedSpot.position.lat},${loadedSpot.position.lng}&zoom=15&size=600x300&mapid=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_ID}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`}
                alt="Location map"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-white text-sm">Open in Google Maps</span>
              </div>
            </button>
          </div>
        </div>

        {/* Description Section */}
        <div>
          <div className="border-b border-zinc-800">
            <h2 className="text-[12px] text-zinc-400  py-2">Description</h2>
          </div>
          
          <div className="pt-4 ">
            {/* Difficulty and Material */}
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-zinc-400">Difficulty</p>
                <p className="text-white">
                  {loadedSpot.difficulty && loadedSpot.difficulty !== 'Not specified' ? (
                    <span className={cn(
                      "capitalize",
                      loadedSpot.difficulty === 'easy' && "text-green-500",
                      loadedSpot.difficulty === 'medium' && "text-yellow-500",
                      loadedSpot.difficulty === 'hard' && "text-red-500"
                    )}>
                      {loadedSpot.difficulty}
                    </span>
                  ) : (
                    <span className="text-zinc-600">Not specified</span>
                  )}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-zinc-400">Material</h3>
                <p className="text-base capitalize">
                  {loadedSpot.material && loadedSpot.material !== 'Not specified' 
                    ? loadedSpot.material 
                    : 'Not specified'}
                </p>
              </div>
            </div>

            {/* Description Text */}
            <div className="mt-6">
              <h3 className="text-sm font-medium text-zinc-400">Description</h3>
              <p className="text-base whitespace-pre-wrap leading-relaxed">
                {loadedSpot.description && loadedSpot.description !== 'No description available'
                  ? loadedSpot.description
                  : 'No description available'}
              </p>
            </div>
          </div>
        </div>

        {/* Trick List Section */}
        <div>
          <div className="border-b border-zinc-800">
            <h2 className="text-[12px] text-zinc-400 py-2">Trick List</h2>
          </div>
          
          <div className="pt-4 space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-500 w-4 h-4" />
              <input
                type="text"
                placeholder="Search tricks..."
                value={searchTrick}
                onChange={(e) => setSearchTrick(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-full border-none bg-zinc-900 
                  text-white text-sm placeholder:text-zinc-500
                  focus:outline-none focus:ring-1 focus:ring-white/20"
              />
            </div>

            {/* Tricks List */}
            <div className="space-y-2">
              {mockTricks
                .filter(trick => 
                  trick.name.toLowerCase().includes(searchTrick.toLowerCase())
                )
                .map(trick => (
                  <div key={trick.id}>
                    <button
                      onClick={() => setExpandedTrickId(
                        expandedTrickId === trick.id ? null : trick.id
                      )}
                      className="w-full bg-zinc-900 hover:bg-zinc-800 transition-colors rounded-xl overflow-hidden"
                    >
                      <div className="flex items-center justify-between p-4">
                        <div className="text-left">
                          <h3 className="font-medium text-white">{trick.name}</h3>
                          <p className="text-sm text-zinc-400">
                            {trick.count} {trick.count === 1 ? 'person has' : 'people have'} done this
                          </p>
                        </div>
                        <ChevronRight 
                          className={cn(
                            "w-5 h-5 text-zinc-400 transition-transform duration-200",
                            expandedTrickId === trick.id && "rotate-90"
                          )}
                        />
                      </div>
                      
                      {/* Expanded Content */}
                      <div className={cn(
                        "overflow-hidden transition-all duration-200 ease-in-out",
                        expandedTrickId === trick.id ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
                      )}>
                        {trick.clips?.map((clip, index) => (
                          <div 
                            key={clip.id} 
                            className={cn(
                              "p-4 border-t border-zinc-800/50",
                              index !== trick.clips!.length - 1 && "mb-4"
                            )}
                          >
                            <div className="flex justify-between items-center mb-3">
                              <p className="text-zinc-400">{clip.skater}</p>
                              <p className="text-sm text-zinc-500">{formatDate(clip.uploadedAt)}</p>
                            </div>
                            
                            {/* Video placeholder */}
                            <div className="aspect-video bg-zinc-800 rounded-lg flex items-center justify-center">
                              <span className="text-zinc-500">Video coming soon</span>
                            </div>
                            
                            {/* Video name */}
                            <p className="text-sm text-zinc-400 text-left pt-3">
                              {clip.videoName || 'Untitled'}
                            </p>
                          </div>
                        ))}
                      </div>
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 