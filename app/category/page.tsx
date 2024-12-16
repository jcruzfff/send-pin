'use client';

import { useState, useEffect } from 'react';
import { MapPin, Search, ChevronRight, ChevronLeft } from 'lucide-react';
import { useAuth } from '@/lib/context/auth-context';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { SPOT_CATEGORIES } from "@/lib/constants";
import { SpotDetail } from "@/components/spots/SpotDetail";
import Link from 'next/link';
import { Oxanium } from 'next/font/google';
import { cn } from '@/lib/utils';

const oxanium = Oxanium({ 
  subsets: ['latin'],
  variable: '--font-oxanium',
});

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

export default function CategoryPage() {
  const { user } = useAuth();
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
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      });
    }
  }, []);

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

  return (
    <div className="h-[calc(100vh-121px)]  px-[18px] bg-black overflow-hidden">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className=" pt-6 pb-4">
          <div className="flex items-center gap-3">
            {categoryView.isActive ? (
              // Back button when viewing a specific category
              <button
                onClick={spotDetailView.isActive ? handleBackFromSpotDetail : handleBackToCategories}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            ) : (
              // Back button for main categories view
              <Link
                href="/profile?tab=spot-book"
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </Link>
            )}
            <h2 className={cn("text-[16px] font-medium text-white", oxanium.className)}>
              {spotDetailView.isActive 
                ? spotDetailView.spot?.title 
                : categoryView.isActive
                ? SPOT_CATEGORIES.find(cat => cat.id === categoryView.categoryId)?.label
                : 'Category'}
            </h2>
          </div>
        </div>

        {/* Content */}
        <div className="h-[calc(100vh-162px)] overflow-hidden">
          <div className="space-y-6 pt-2">
            {spotDetailView.isActive && spotDetailView.spot ? (
              <div className="relative">
                <div className="overflow-y-auto">
                  <SpotDetail 
                    spot={spotDetailView.spot}
                    isInline={true}
                  />
                </div>
              </div>
            ) : categoryView.isActive ? (
              // Category View
              <div className="space-y-6">
                {/* Search Bar */}
                <div className="relative px-1 py-1">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                  <input
                    type="text"
                    placeholder={`Search ${SPOT_CATEGORIES.find(cat => cat.id === categoryView.categoryId)?.label.toLowerCase() || 'spots'}...`}
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-full 
                               bg-transparent border border-[#171717]
                               text-white text-sm placeholder:text-zinc-500
                               focus:outline-none focus:ring-1 focus:ring-white/20
                               focus:ring-inset"
                  />
                </div>

                {/* Category Spots List */}
                <div className="space-y-4">
                  {searchQuery.trim() !== '' ? (
                    // Filtered spots when searching
                    searchResults
                      .filter(spot => spot.spotType === categoryView.categoryId)
                      .length > 0 ? (
                        searchResults
                          .filter(spot => spot.spotType === categoryView.categoryId)
                          .map((spot) => (
                            <div
                              key={spot.id}
                              onClick={() => handleSpotClick(spot)}
                              className="relative h-[194px] bg-gradient-to-b from-[#1F1F1E] to-[#0E0E0E] hover:from-[#2F2F2E] hover:to-[#1E1E1E] transition-all cursor-pointer"
                              style={{ borderRadius: '20px' }}
                            >
                              {/* Spot Image */}
                              <div 
                                className="absolute top-6 right-3 w-[98px] h-[98px] bg-zinc-800 overflow-hidden"
                                style={{ borderRadius: '10px' }}
                              >
                                {spot.imageUrl ? (
                                  <img
                                    src={spot.thumbnailUrl || `${spot.imageUrl}?w=98&h=98&q=75`}
                                    alt={spot.title}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                    decoding="async"
                                    width={98}
                                    height={98}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <MapPin className="w-5 h-5 text-[#B9B9B9]" />
                                  </div>
                                )}
                              </div>

                              {/* Spot Details */}
                              <div className="absolute top-8 left-6 flex flex-col">
                                <h3 className="text-[14px] font-medium text-white font-[Oxanium]">{spot.title}</h3>
                                <div className="mt-1 space-y-2">
                                  <p className="text-[12px] text-[#B9B9B9]">
                                    {SPOT_CATEGORIES.find(cat => cat.id === spot.spotType)?.label || 'Uncategorized'}
                                  </p>
                                  <p className="text-[12px] text-[#B9B9B9] max-w-[200px]">
                                    {spot.description 
                                      ? spot.description.length > 65 
                                        ? `${spot.description.slice(0, 65)}...` 
                                        : spot.description
                                      : ''}
                                  </p>
                                </div>
                              </div>

                              {/* Bottom Section with Distance and Directions */}
                              <div className="absolute bottom-0 left-0 right-0 h-[56px] border-t border-zinc-800 flex items-center justify-between pl-6 pr-3">
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-4 h-4 text-[#B9B9B9]" />
                                  <span className="text-[12px] text-[#B9B9B9]">
                                    {userLocation && (
                                      calculateDistanceInMeters(userLocation, spot.position) < 1000
                                        ? `${Math.round(calculateDistanceInMeters(userLocation, spot.position))}m away`
                                        : `${(calculateDistanceInMeters(userLocation, spot.position) / 1000).toFixed(1)}km away`
                                    )}
                                  </span>
                                </div>
                                <button 
                                  className="h-6 px-4 rounded-[6px] bg-white/10 hover:bg-white/20 transition-colors flex items-center gap-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(
                                      `https://www.google.com/maps/dir/?api=1&destination=${spot.position.lat},${spot.position.lng}`,
                                      '_blank'
                                    );
                                  }}
                                >
                                  <span className="text-[12px] text-[#B9B9B9] font-[Oxanium]">Directions</span>
                                  <ChevronRight className="w-3 h-3 text-[#B9B9B9]" />
                                </button>
                              </div>
                            </div>
                          ))
                      ) : (
                        // No results found
                        <div className="text-center text-zinc-400 py-8">
                          No spots found matching "{searchQuery}"
                        </div>
                      )
                  ) : (
                    // Show all category spots when not searching
                    (spotsByCategory[categoryView.categoryId!] || []).map((spot) => (
                      <div
                        key={spot.id}
                        onClick={() => handleSpotClick(spot)}
                        className="relative h-[194px] bg-gradient-to-b from-[#1F1F1E] to-[#0E0E0E] hover:from-[#2F2F2E] hover:to-[#1E1E1E] transition-all cursor-pointer"
                        style={{ borderRadius: '20px' }}
                      >
                        {/* Spot Image */}
                        <div 
                          className="absolute top-6 right-3 w-[98px] h-[98px] bg-zinc-800 overflow-hidden"
                          style={{ borderRadius: '10px' }}
                        >
                          {spot.imageUrl ? (
                            <img
                              src={spot.thumbnailUrl || `${spot.imageUrl}?w=98&h=98&q=75`}
                              alt={spot.title}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              decoding="async"
                              width={98}
                              height={98}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <MapPin className="w-5 h-5 text-[#B9B9B9]" />
                            </div>
                          )}
                        </div>

                        {/* Spot Details */}
                        <div className="absolute top-8 left-6 flex flex-col">
                          <h3 className="text-[14px] font-medium text-white font-[Oxanium]">{spot.title}</h3>
                          <div className="mt-1 space-y-2">
                            <p className="text-[12px] text-[#B9B9B9]">
                              {SPOT_CATEGORIES.find(cat => cat.id === spot.spotType)?.label || 'Uncategorized'}
                            </p>
                            <p className="text-[12px] text-[#B9B9B9] max-w-[200px]">
                              {spot.description 
                                ? spot.description.length > 65 
                                  ? `${spot.description.slice(0, 65)}...` 
                                  : spot.description
                                : ''}
                            </p>
                          </div>
                        </div>

                        {/* Bottom Section with Distance and Directions */}
                        <div className="absolute bottom-0 left-0 right-0 h-[56px] border-t border-zinc-800 flex items-center justify-between pl-6 pr-3">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-[#B9B9B9]" />
                            <span className="text-[12px] text-[#B9B9B9]">
                              {userLocation && (
                                calculateDistanceInMeters(userLocation, spot.position) < 1000
                                  ? `${Math.round(calculateDistanceInMeters(userLocation, spot.position))}m away`
                                  : `${(calculateDistanceInMeters(userLocation, spot.position) / 1000).toFixed(1)}km away`
                              )}
                            </span>
                          </div>
                          <button 
                            className="h-6 px-4 rounded-[6px] bg-white/10 hover:bg-white/20 transition-colors flex items-center gap-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(
                                `https://www.google.com/maps/dir/?api=1&destination=${spot.position.lat},${spot.position.lng}`,
                                '_blank'
                              );
                            }}
                          >
                            <span className="text-[12px] text-[#B9B9B9] font-[Oxanium]">Directions</span>
                            <ChevronRight className="w-3 h-3 text-[#B9B9B9]" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              // Original Categories View
              <>
                {/* Search Bar */}
                <div className="relative px-1 py-1">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search your spots..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-full 
                               bg-transparent border border-[#171717]
                               text-white text-sm placeholder:text-zinc-500
                               focus:outline-none focus:ring-1 focus:ring-white/20
                               focus:ring-inset"
                  />

                  {/* Search Results Dropdown */}
                  {isSearching && searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 max-h-60 overflow-y-auto 
                                  rounded-lg bg-zinc-900 border border-zinc-800 shadow-lg z-50">
                      {searchResults.map((spot) => (
                        <Link
                          key={spot.id}
                          href={`/spots/${spot.id}`}
                          className="flex items-center gap-3 p-3 hover:bg-zinc-800 transition-colors"
                        >
                          <div className="w-10 h-10 bg-zinc-800 rounded-md overflow-hidden flex-shrink-0">
                            {spot.imageUrl ? (
                              <img
                                src={spot.thumbnailUrl || spot.imageUrl}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <MapPin className="w-4 h-4 text-zinc-500" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-white">{spot.title}</h4>
                            {spot.spotType && (
                              <p className="text-sm text-zinc-400">
                                {SPOT_CATEGORIES.find(cat => cat.id === spot.spotType)?.label || 'Uncategorized'}
                              </p>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {/* Categories List */}
                <div className="space-y-4">
                  {Object.keys(spotsByCategory).length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <MapPin className="w-12 h-12 text-zinc-700 mb-4" />
                      <p className={cn("text-zinc-400 text-lg mb-2", oxanium.className)}>
                        Your Spot Book is empty
                      </p>
                      <p className="text-zinc-500 text-sm">
                        Start saving spots to populate your spot book
                      </p>
                    </div>
                  ) : (
                    SPOT_CATEGORIES.map((category) => {
                      const categorySpots = spotsByCategory[category.id] || [];
                      if (categorySpots.length === 0) return null;

                      return (
                        <button
                          key={category.id}
                          onClick={() => handleCategoryClick(category.id)}
                          className="w-full flex items-center gap-4 p-4 bg-gradient-to-b from-[#1F1F1E] to-[#0E0E0E] 
                                    hover:from-[#2F2F2E] hover:to-[#1E1E1E] transition-all cursor-pointer mt-3 first:mt-0
                                    border border-[#171717]"
                          style={{ borderRadius: '20px' }}
                        >
                          <div className="w-12 h-12 flex items-center justify-center flex-shrink-0" 
                               style={{ borderRadius: '10px' }}
                          >
                            {category.icon && <category.icon className="w-6 h-6 text-zinc-500" />}
                          </div>
                          
                          <div className="flex-1 text-left">
                            <h3 className={cn("font-medium text-white", oxanium.className)}>{category.label}</h3>
                            <p className="text-sm text-zinc-400">
                              {categorySpots.length} {categorySpots.length === 1 ? 'spot' : 'spots'}
                            </p>
                          </div>

                          <ChevronRight className="w-5 h-5 text-zinc-400" />
                        </button>
                      );
                    })
                  )}

                  {/* Uncategorized spots */}
                  {spotsByCategory['uncategorized']?.length > 0 && (
                    <Link
                      href="/spots?category=uncategorized"
                      className="flex items-center p-4 bg-zinc-900 hover:bg-zinc-800 rounded-lg transition-colors text-left"
                    >
                      <div className="h-12 w-12 rounded-full border-2 border-dashed border-muted-foreground/25 flex items-center justify-center">
                        <MapPin className="w-6 h-6 text-muted-foreground" />
                      </div>
                      
                      <div className="ml-4 flex-1">
                        <h3 className="font-medium text-white">Uncategorized</h3>
                        <p className="text-sm text-zinc-400">
                          {spotsByCategory['uncategorized'].length} {spotsByCategory['uncategorized'].length === 1 ? 'spot' : 'spots'}
                        </p>
                      </div>

                      <ChevronRight className="w-5 h-5 text-zinc-400" />
                    </Link>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 