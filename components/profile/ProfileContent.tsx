'use client';

import { useState, useEffect } from 'react';
import { PlusCircle, Trophy, UserPlus, Flag, ChevronRight, Search, MapPin, ArrowLeft, Heart } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/context/auth-context';
import { collection, getDocs, query, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { SPOT_CATEGORIES } from "@/lib/constants";
import { SpotDetail } from "@/components/spots/SpotDetail";
import { ProfileView } from '@/components/profile/ProfileView';

interface RecentSpot {
  id: string;
  title: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  createdAt: number;
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
  const [activeTab, setActiveTab] = useState('what-to-do');
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
    { id: 'what-to-do', label: 'What to do' },
    { id: 'spot-book', label: 'Spot Book' },
    { id: 'profile', label: 'My Posts' },
  ];

  const whatToDoListItems = [
    {
      id: 'favorites',
      title: 'Favorites',
      subtitle: 'Search your favorite spots',
      href: '/favorites',
    },
    {
      id: 'let',
      title: 'Lets go back',
      subtitle: 'We gotta go back to this spot',
      href: '/let'
    }
  ];

  const spotCategories = [
    { id: 'stairs', title: 'Stairs', subtitle: 'Find the perfect set of stairs' },
    { id: 'rails', title: 'Rails', subtitle: 'Discover rails and handrails' },
    { id: 'gaps', title: 'Gaps', subtitle: 'Challenge yourself with gaps' },
    { id: 'ledges', title: 'Ledges', subtitle: 'Smooth ledges for grinding' },
    { id: 'manual-pads', title: 'Manual Pads', subtitle: 'Perfect for technical tricks' },
  ];

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
            createdAt: data.createdAt
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
    <div className="h-[calc(100vh-121px)] bg-black overflow-hidden">
      <div className="max-w-5xl mx-auto px-[18px]">
        {/* Update the tab navigation styling */}
        <div className="border-b border-zinc-800 h-[41px]">
          {activeTab === 'spot-book' && categoryView.isActive ? (
            // Category or Spot Detail Header
            <div className="flex items-center h-full px-1">
              <button
                onClick={spotDetailView.isActive ? handleBackFromSpotDetail : handleBackToCategories}
                className="inline-flex items-center text-zinc-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h2 className="text-sm font-medium flex-1 text-center mr-5">
                {spotDetailView.isActive 
                  ? spotDetailView.spot?.title 
                  : SPOT_CATEGORIES.find(cat => cat.id === categoryView.categoryId)?.label}
              </h2>
            </div>
          ) : (
            <nav className="flex justify-around h-full relative" aria-label="Profile tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    relative text-sm font-medium flex-1
                    ${activeTab === tab.id ? 'text-white' : 'text-zinc-500'}
                  `}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <div 
                      className="absolute bottom-[-1px] h-[2px] bg-white" 
                      style={{ 
                        width: '100%',
                        transform: 'translateY(50%)'
                      }} 
                    />
                  )}
                </button>
              ))}
            </nav>
          )}
        </div>

        {/* Content Area - Now with dynamic height calculations */}
        <div className="h-[calc(100vh-162px)] overflow-hidden">
          {activeTab === 'what-to-do' && (
            <div className="flex flex-col h-full">
              {/* Recently Saved Section - Adjusted for viewport */}
              <div className="mt-[3vh]">
                <h2 className="text-lg font-medium mb-[2vh]">Recent Saved</h2>
                <div className="overflow-x-auto hide-scrollbar">
                  <div className="flex gap-4 pb-[2vh] min-w-max">
                    {loading ? (
                      Array(5).fill(0).map((_, i) => (
                        <div
                          key={i}
                          className="flex-none w-[min(320px,80vw)] h-[min(320px,80vw)] 
                                   rounded-lg bg-zinc-900/50 animate-pulse"
                        />
                      ))
                    ) : recentSpots.length > 0 ? (
                      recentSpots.map((spot) => (
                        <Link
                          key={spot.id}
                          href={`/spots/${spot.id}`}
                          className="flex-none w-[min(320px,80vw)] h-[min(320px,80vw)] 
                                   rounded-lg overflow-hidden relative group"
                        >
                          {spot.imageUrl ? (
                            <>
                              <img
                                src={spot.thumbnailUrl || spot.imageUrl}
                                alt={spot.title}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent 
                                             flex items-end p-4">
                                <p className="text-white text-sm font-medium">
                                  {spot.title}
                                </p>
                              </div>
                            </>
                          ) : (
                            <div className="w-full h-full bg-zinc-900 flex flex-col items-center justify-center gap-2">
                              <MapPin className="w-8 h-8 text-zinc-700" />
                              <p className="text-sm text-zinc-500">{spot.title}</p>
                            </div>
                          )}
                        </Link>
                      ))
                    ) : (
                      <div className="w-full text-center py-[2vh] text-zinc-500">
                        No spots saved yet
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* What to do List Items - Adjusted spacing */}
              <div className="space-y-[2vh] mt-[3vh]">
                {whatToDoListItems.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="flex items-center p-4 bg-card hover:bg-accent rounded-lg transition-colors"
                  >
                    <div className="flex-1">
                      <h3 className="text-[14px] font-medium text-foreground">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">{item.subtitle}</p>
                    </div>

                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Spot Book tab content */}
          {activeTab === 'spot-book' && (
            <div className="space-y-6 pt-4">
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
                      className="w-full pl-10 pr-4 py-3 rounded-full border-none bg-zinc-900 
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
                              <button
                                key={spot.id}
                                onClick={() => handleSpotClick(spot)}
                                className="w-full flex items-center gap-4 p-4 bg-gradient-to-b from-[#1F1F1E] to-[#0E0E0E] 
                                          hover:from-[#2F2F2E] hover:to-[#1E1E1E] transition-all cursor-pointer mt-3 first:mt-0
                                          border border-[#171717]"
                                style={{ borderRadius: '20px' }}
                              >
                                <div className="w-12 h-12 bg-zinc-800 overflow-hidden flex-shrink-0" 
                                     style={{ borderRadius: '10px' }}
                                >
                                  {spot.imageUrl ? (
                                    <img
                                      src={spot.thumbnailUrl || `${spot.imageUrl}?w=128&h=128&q=50`}
                                      alt={spot.title}
                                      className="w-full h-full object-cover"
                                      loading="lazy"
                                      decoding="async"
                                      width={48}
                                      height={48}
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <MapPin className="w-4 h-4 text-zinc-500" />
                                    </div>
                                  )}
                                </div>

                                <div className="flex-1 text-left min-w-0">
                                  <h3 className="font-medium text-white truncate">{spot.title}</h3>
                                  <div className="space-y-0.5">
                                    <p className="text-sm text-zinc-400">
                                      {SPOT_CATEGORIES.find(cat => cat.id === spot.spotType)?.label || 'Uncategorized'}
                                    </p>
                                    {userLocation && (
                                      <p className="text-sm text-zinc-500">
                                        {calculateDistanceInMeters(userLocation, spot.position) < 1000
                                          ? `${Math.round(calculateDistanceInMeters(userLocation, spot.position))}m away`
                                          : `${(calculateDistanceInMeters(userLocation, spot.position) / 1000).toFixed(1)}km away`}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <ChevronRight className="w-5 h-5 text-zinc-400" />
                              </button>
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
                        <button
                          key={spot.id}
                          onClick={() => handleSpotClick(spot)}
                          className="w-full flex items-center gap-4 p-4 bg-gradient-to-b from-[#1F1F1E] to-[#0E0E0E] 
                                    hover:from-[#2F2F2E] hover:to-[#1E1E1E] transition-all cursor-pointer mt-3 first:mt-0
                                    border border-[#171717]"
                          style={{ borderRadius: '20px' }}
                        >
                          <div className="w-12 h-12 bg-zinc-800 overflow-hidden flex-shrink-0" 
                               style={{ borderRadius: '10px' }}
                          >
                            {spot.imageUrl ? (
                              <img
                                src={spot.thumbnailUrl || `${spot.imageUrl}?w=128&h=128&q=50`}
                                alt={spot.title}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                decoding="async"
                                width={48}
                                height={48}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <MapPin className="w-4 h-4 text-zinc-500" />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 text-left min-w-0">
                            <h3 className="font-medium text-white truncate">{spot.title}</h3>
                            <div className="space-y-0.5">
                              <p className="text-sm text-zinc-400">
                                {SPOT_CATEGORIES.find(cat => cat.id === spot.spotType)?.label || 'Uncategorized'}
                              </p>
                              {userLocation && (
                                <p className="text-sm text-zinc-500">
                                  {calculateDistanceInMeters(userLocation, spot.position) < 1000
                                    ? `${Math.round(calculateDistanceInMeters(userLocation, spot.position))}m away`
                                    : `${(calculateDistanceInMeters(userLocation, spot.position) / 1000).toFixed(1)}km away`}
                                  </p>
                              )}
                            </div>
                          </div>

                          <ChevronRight className="w-5 h-5 text-zinc-400" />
                        </button>
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
                    {SPOT_CATEGORIES.map((category) => {
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
                            <h3 className="font-medium text-white">{category.label}</h3>
                            <p className="text-sm text-zinc-400">
                              {categorySpots.length} {categorySpots.length === 1 ? 'spot' : 'spots'}
                            </p>
                          </div>

                          <ChevronRight className="w-5 h-5 text-zinc-400" />
                        </button>
                      );
                    })}

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
          )}

          {activeTab === 'profile' && (
            <ProfileView isCurrentUser={true} />
          )}
        </div>
      </div>
    </div>
  );
} 