'use client';

import { useState, useEffect } from 'react';
import { PlusCircle, Trophy, UserPlus, Flag, ChevronRight, Search, MapPin, ChevronLeft, Heart } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/context/auth-context';
import { collection, getDocs, query, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { SPOT_CATEGORIES } from "@/lib/constants";
import { SpotDetail } from "@/components/spots/SpotDetail";
import { ProfileView } from '@/components/profile/ProfileView';
import { Oxanium } from 'next/font/google';
import { cn } from '@/lib/utils';

const oxanium = Oxanium({ 
  subsets: ['latin'],
  variable: '--font-oxanium',
});

interface RecentSpot {
  id: string;
  title: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  createdAt: number;
  spotType?: string;
  position?: {
    lat: number;
    lng: number;
  };
  description?: string;
}

interface UserSpot {
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
  createdBy: string;
  status?: 'draft' | 'submitted' | 'published';
  description?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  material?: string;
}

interface SpotsByCategory {
  [key: string]: UserSpot[];
}

interface CategoryViewState {
  isActive: boolean;
  categoryId: string | null;
}

interface SpotDetailViewState {
  isActive: boolean;
  spotId: string | null;
  spot: UserSpot | null;
}

export default function ProfileContent() {
  const { user } = useAuth();
  const [recentSpots, setRecentSpots] = useState<RecentSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [userSpots, setUserSpots] = useState<UserSpot[]>([]);
  const [spotsByCategory, setSpotsByCategory] = useState<SpotsByCategory>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSpot[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [categoryView, setCategoryView] = useState<CategoryViewState>({
    isActive: false,
    categoryId: null
  });
  const [spotDetailView, setSpotDetailView] = useState<SpotDetailViewState>({
    isActive: false,
    spotId: null,
    spot: null
  });
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [favoriteSpots, setFavoriteSpots] = useState<RecentSpot[]>([]);

  const tabs = [
    { id: 'profile', label: 'Media' },
    { id: 'spot-book', label: 'Spot Book' },
  ];

  const whatToDoListItems = [
    {
      id: 'favorites',
      title: 'Favorites',
      subtitle: 'Search your favorite spots',
      href: '/favorites',
      className: 'w-full flex items-center gap-4 p-4 bg-gradient-to-b from-[#1F1F1E] to-[#0E0E0E] hover:from-[#2F2F2E] hover:to-[#1E1E1E] transition-all cursor-pointer mt-3 first:mt-0 border border-[#171717] rounded-[20px]'
    },
    {
      id: 'category',
      title: 'Category',
      subtitle: 'Search through all categories',
      href: '/category',
      className: 'w-full flex items-center gap-4 p-4 bg-gradient-to-b from-[#1F1F1E] to-[#0E0E0E] hover:from-[#2F2F2E] hover:to-[#1E1E1E] transition-all cursor-pointer mt-3 first:mt-0 border border-[#171717] rounded-[20px]'
    }
  ];

  const spotCategories = [
    { id: 'ledges', title: 'Ledges', subtitle: 'Smooth ledges for grinding' },
    { id: 'rails', title: 'Rails', subtitle: 'Discover rails and handrails' },
    { id: 'stairs', title: 'Stairs', subtitle: 'Find the perfect set of stairs' },
    { id: 'gaps', title: 'Gaps', subtitle: 'Challenge yourself with gaps' },
    { id: 'manuals', title: 'Manuals', subtitle: 'Perfect for technical tricks' },
    { id: 'banks', title: 'Banks', subtitle: 'Smooth banks and inclines' },
    { id: 'transitions', title: 'Transitions', subtitle: 'Quarter pipes and transitions' },
    { id: 'flatground', title: 'Flatground', subtitle: 'Perfect flat spots' },
    { id: 'parks', title: 'Parks', subtitle: 'Skateparks and facilities' }
  ];

  useEffect(() => {
    // Get the tab parameter from the URL
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam && ['profile', 'spot-book'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, []);

  useEffect(() => {
    async function loadRecentSpots() {
      if (!user) return;

      try {
        // Get user's spots, ordered by creation date
        const spotsRef = collection(db, `users/${user.uid}/spots`);
        const spotsQuery = query(spotsRef, orderBy('createdAt', 'desc'), limit(5));
        const spotsSnapshot = await getDocs(spotsQuery);
        
        const spots: RecentSpot[] = [];
        spotsSnapshot.forEach((doc) => {
          const data = doc.data();
          spots.push({
            id: doc.id,
            title: data.title,
            imageUrl: data.imageUrl,
            thumbnailUrl: data.thumbnailUrl,
            createdAt: data.createdAt,
            spotType: data.spotType,
            position: data.position,
            description: data.description
          });
        });

        setRecentSpots(spots);
      } catch (error) {
        console.error('Error loading recent spots:', error);
      } finally {
        setLoading(false);
      }
    }

    loadRecentSpots();
  }, [user]);

  useEffect(() => {
    async function loadUserSpots() {
      if (!user) return;

      try {
        const spotsRef = collection(db, `users/${user.uid}/spots`);
        const spotsSnapshot = await getDocs(spotsRef);
        
        const spots: UserSpot[] = [];
        spotsSnapshot.forEach((doc) => {
          const data = doc.data();
          spots.push({
            id: doc.id,
            title: data.title,
            spotType: data.spotType,
            imageUrl: data.imageUrl,
            thumbnailUrl: data.thumbnailUrl,
            createdAt: data.createdAt,
            position: data.position,
            createdBy: data.createdBy,
            status: data.status,
            description: data.description,
            difficulty: data.difficulty,
            material: data.material
          });
        });

        setUserSpots(spots);

        // Organize spots by category
        const categorized: SpotsByCategory = {};
        spots.forEach(spot => {
          const category = spot.spotType || 'uncategorized';
          if (!categorized[category]) {
            categorized[category] = [];
          }
          categorized[category].push(spot);
        });
        setSpotsByCategory(categorized);
      } catch (error) {
        console.error('Error loading user spots:', error);
      }
    }

    loadUserSpots();
  }, [user]);

  useEffect(() => {
    async function loadFavorites() {
      if (!user) return;

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        const favoriteIds = userData?.favorites || [];

        // Load each favorited spot
        const spots = await Promise.all(
          favoriteIds.map(async (spotId: string) => {
            // Try personal spots first
            let spotDoc = await getDoc(doc(db, `users/${user.uid}/spots`, spotId));
            
            // If not found, try global spots
            if (!spotDoc.exists()) {
              spotDoc = await getDoc(doc(db, 'globalSpots', spotId));
            }

            if (spotDoc.exists()) {
              const data = spotDoc.data();
              return {
                id: spotDoc.id,
                title: data.title,
                imageUrl: data.imageUrl,
                thumbnailUrl: data.thumbnailUrl,
                createdAt: data.createdAt,
                spotType: data.spotType
              };
            }
            return null;
          })
        );

        setFavoriteSpots(spots.filter(Boolean));
      } catch (error) {
        console.error('Error loading favorites:', error);
      }
    }

    loadFavorites();
  }, [user]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const searchTerms = query.toLowerCase().split(' ');
    
    const filtered = userSpots.filter(spot => {
      const titleMatch = spot.title.toLowerCase().includes(query.toLowerCase());
      const typeMatch = spot.spotType?.toLowerCase().includes(query.toLowerCase());
      const anyTermMatch = searchTerms.some(term => 
        spot.title.toLowerCase().includes(term) || 
        spot.spotType?.toLowerCase().includes(term)
      );
      
      return titleMatch || typeMatch || anyTermMatch;
    });

    setSearchResults(filtered);
  };

  const handleCategoryClick = (categoryId: string) => {
    setCategoryView({
      isActive: true,
      categoryId: categoryId
    });
  };

  const handleBackToCategories = () => {
    setCategoryView({
      isActive: false,
      categoryId: null
    });
    setSearchQuery(''); // Clear search when going back
    setSearchResults([]); // Clear results when going back
  };

  const handleSpotClick = (spot: UserSpot) => {
    setSpotDetailView({
      isActive: true,
      spotId: spot.id,
      spot: spot
    });
  };

  const handleBackFromSpotDetail = () => {
    setSpotDetailView({
      isActive: false,
      spotId: null,
      spot: null
    });
  };

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

  const calculateDistanceInMeters = (
    point1: { lat: number; lng: number },
    point2: { lat: number; lng: number }
  ): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = point1.lat * Math.PI / 180;
    const φ2 = point2.lat * Math.PI / 180;
    const Δφ = (point2.lat - point1.lat) * Math.PI / 180;
    const Δλ = (point2.lng - point1.lng) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
             Math.cos(φ1) * Math.cos(φ2) *
             Math.sin(Δλ/2) * Math.sin(Δλ/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const loadFavoriteSpots = async () => {
    if (!user) return;

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      const favoriteIds = userData?.favorites || [];

      // Load each favorited spot
      const favoriteSpots = await Promise.all(
        favoriteIds.map(async (spotId: string) => {
          // Try personal spots first
          let spotDoc = await getDoc(doc(db, `users/${user.uid}/spots`, spotId));
          
          // If not found, try global spots
          if (!spotDoc.exists()) {
            spotDoc = await getDoc(doc(db, 'globalSpots', spotId));
          }

          if (spotDoc.exists()) {
            return { id: spotDoc.id, ...spotDoc.data() };
          }
          return null;
        })
      );

      // Filter out any null values and update state
      return favoriteSpots.filter(Boolean);
    } catch (error) {
      console.error('Error loading favorite spots:', error);
      return [];
    }
  };

  return (
    <div className="h-[calc(100vh-121px)]  bg-black overflow-hidden">
      <div className="max-w-5xl mx-auto">
        {/* Update the tab navigation styling */}
        <div className="h-[41px]">
          {activeTab === 'spot-book' && categoryView.isActive ? (
            // Category or Spot Detail Header
            <div className="flex items-center h-full px-[18px]">
              <button
                onClick={spotDetailView.isActive ? handleBackFromSpotDetail : handleBackToCategories}
                className="inline-flex items-center text-zinc-400 hover:text-white transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h2 className={cn("text-sm font-medium text-white text-center w-full", oxanium.className)}>
                {spotDetailView.isActive 
                  ? spotDetailView.spot?.title 
                  : SPOT_CATEGORIES.find(cat => cat.id === categoryView.categoryId)?.label}
              </h2>
            </div>
          ) : (
            <div className="px-[18px] relative">
              <nav className="flex justify-around h-full" aria-label="Profile tabs">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "relative text-sm font-medium flex-1",
                      oxanium.className,
                      activeTab === tab.id ? 'text-white' : 'text-zinc-500'
                    )}
                  >
                    {tab.label}
                    {activeTab === tab.id && (
                      <div 
                        className="absolute z-10 -bottom-[11px] h-[3px] bg-white" 
                        style={{ 
                          width: '100%',
                          transform: 'translateY(50%)'
                        }} 
                      />
                    )}
                  </button>
                ))}
              </nav>
              <div className="absolute -bottom-[12px] left-[18px] right-[18px] h-[1px] bg-zinc-800" />
            </div>
          )}
        </div>

        {/* Content Area - Now with dynamic height calculations */}
        <div className="h-[calc(100vh-162px)] overflow-hidden">
          {activeTab === 'spot-book' && (
            <div className="flex flex-col h-full">
              {/* Recently Saved Section - Full width */}
              <div className="mt-[3vh] px-[18px]">
                <h2 className={cn("text-lg font-medium mb-[2vh] text-white", oxanium.className)}>Recent Saved</h2>
              </div>
              <div className="overflow-x-auto hide-scrollbar">
                <div className="flex gap-4 pb-[2vh] pl-[18px]">
                  {loading ? (
                    <div className="flex gap-4">
                      {Array(5).fill(0).map((_, i) => (
                        <div
                          key={i}
                          className="flex-none w-[320px] h-[194px] rounded-[20px] bg-zinc-900/50 animate-pulse last:mr-[18px]"
                        />
                      ))}
                    </div>
                  ) : recentSpots.length > 0 ? (
                    <div className="flex gap-4">
                      {recentSpots.map((spot) => (
                        <Link
                          key={spot.id}
                          href={`/spots/${spot.id}`}
                          className="flex-none w-[340px] h-[194px] bg-gradient-to-b from-[#1F1F1E] to-[#0E0E0E] hover:from-[#2F2F2E] hover:to-[#1E1E1E] transition-all cursor-pointer border border-[#171717] rounded-[20px] relative overflow-hidden last:mr-[18px]"
                        >
                          {/* Spot Image */}
                          <div 
                            className="absolute top-6 right-3 w-[98px] h-[98px] bg-zinc-800 overflow-hidden"
                            style={{ borderRadius: '10px' }}
                          >
                            {spot.imageUrl ? (
                              <img
                                src={spot.thumbnailUrl || spot.imageUrl}
                                alt={spot.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <MapPin className="w-5 h-5 text-[#B9B9B9]" />
                              </div>
                            )}
                          </div>

                          {/* Spot Details */}
                          <div className="absolute top-8 left-6 flex flex-col">
                            <h3 className={cn("text-[14px] font-medium text-white", oxanium.className)}>{spot.title}</h3>
                            <div className="mt-1 space-y-2">
                              <p className="text-[12px] text-zinc-400">
                                {SPOT_CATEGORIES.find(cat => cat.id === spot.spotType)?.label || 'Uncategorized'}
                              </p>
                              <p className="text-[12px] text-zinc-400 max-w-[170px]">
                                {spot.description 
                                  ? spot.description.length > 40 
                                    ? `${spot.description.slice(0, 40)}...` 
                                    : spot.description
                                  : ''}
                              </p>
                            </div>
                          </div>

                          {/* Bottom Section with Distance and Directions */}
                          <div className="absolute bottom-0 left-0 right-0 h-[56px] border-t border-zinc-800 flex items-center justify-between pl-6 pr-3">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-zinc-400" />
                              <span className="text-[12px] text-zinc-400">
                                {userLocation && spot.position ? (
                                  calculateDistanceInMeters(userLocation, spot.position) < 1000
                                    ? `${Math.round(calculateDistanceInMeters(userLocation, spot.position))}m away`
                                    : `${(calculateDistanceInMeters(userLocation, spot.position) / 1000).toFixed(1)}km away`
                                ) : (
                                  '0.8 miles away'
                                )}
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
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="w-full text-center py-[2vh] text-zinc-500">
                      No spots saved yet
                    </div>
                  )}
                </div>
              </div>

              {/* Search Title */}
              <div className="mt-[3vh] px-[18px]">
                <h2 className={cn("text-lg font-medium mb-[2vh] text-white", oxanium.className)}>Search</h2>
              </div>

              {/* What to do List Items - Keep padding */}
              <div className="space-y-[2vh] px-[18px]">
                {whatToDoListItems.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={item.className}
                  >
                    <div className="flex-1">
                      <h3 className={cn("text-[16px] font-medium text-white", oxanium.className)}>{item.title}</h3>
                      <p className="text-sm text-zinc-400">{item.subtitle}</p>
                    </div>

                    <ChevronRight className="w-5 h-5 text-zinc-400" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <ProfileView isCurrentUser={true} />
          )}
        </div>
      </div>
    </div>
  );
} 