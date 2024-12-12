'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Globe, List, Loader2, Image as ImageIcon, Search, ChevronRight, X, ChevronDown, MapPin } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useLoadScript } from '@react-google-maps/api';
import type { LoadScriptProps } from '@react-google-maps/api';
import { ImageUpload } from "@/components/ui/image-upload";
import { WeatherInfo } from "@/components/ui/weather-info";
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, updateDoc, doc, deleteDoc, getDocs } from 'firebase/firestore';
import { ref as storageRef, deleteObject } from 'firebase/storage';
import { useAuth } from '@/lib/context/auth-context';
import { SPOT_CATEGORIES } from "@/lib/constants";
import { useRouter } from "next/navigation";
import { OptimizedImage } from "@/components/ui/optimized-image";
import Link from 'next/link';
import { useGoogleMaps } from "@/hooks/use-google-maps";
import { OnboardingOverlay } from '@/components/ui/onboarding-overlay';

// eslint-disable-next-line @typescript-eslint/no-namespace
declare global {
  namespace google.maps {
    interface MarkerLibrary {
      AdvancedMarkerElement: typeof google.maps.marker.AdvancedMarkerElement;
    }
  }
}

// Define the libraries type
type Libraries = ("places" | "geometry" | "drawing" | "visualization")[];

// Create a mutable array of libraries
const libraries: Libraries = ["places"];

// Define the props type for the GoogleMap component
interface GoogleMapComponentProps {
  center: google.maps.LatLngLiteral;
  zoom: number;
  options?: google.maps.MapOptions;
  onClick?: (e: google.maps.MapMouseEvent & { placeId?: string }) => void;
  onLoad?: (map: google.maps.Map) => void;
  mapContainerClassName?: string;
  mapContainerStyle?: { [key: string]: string };
}

// Add this type declaration
declare module '@react-google-maps/api' {
  export const GoogleMap: React.ComponentType<GoogleMapComponentProps>;
}

// Create a dynamic version of the GoogleMap component
const DynamicGoogleMap = dynamic<GoogleMapComponentProps>(
  async () => {
    const mod = await import('@react-google-maps/api');
    return mod.GoogleMap;
  },
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    ),
  }
);

// Add the type for the map props
interface MapProps {
  center: google.maps.LatLngLiteral;
  zoom: number;
  options?: google.maps.MapOptions;
  onClick?: (e: google.maps.MapMouseEvent & { placeId?: string }) => void;
  onLoad?: (map: google.maps.Map) => void;
  mapContainerClassName?: string;
}

// Remove any StandaloneSearchBox related code and replace with our custom search input
const SearchInput = ({ 
  value, 
  onChange, 
  placeholder 
}: { 
  value: string; 
  onChange: (value: string) => void; 
  placeholder: string;
}) => (
  <div className="flex-1 relative">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-4 py-3 pl-10 rounded-full border border-zinc-800 bg-black 
                text-white text-sm placeholder:text-zinc-500
                focus:outline-none focus:ring-1 focus:ring-white/20"
    />
  </div>
);

// Add proper type declaration for navigator.geolocation
declare global {
  interface Navigator {
    readonly geolocation: Geolocation;
  }
}

interface MarkerData {
  [key: string]: any;  // Add index signature
  position: google.maps.LatLngLiteral;
  title: string;
  id: string;
  spotType?: string;
  imageUrl?: string | null;
  thumbnailUrl?: string;
  createdBy: string;
  isGlobal?: boolean;
  status?: 'draft' | 'submitted' | 'published';
  createdAt: number;
  updatedAt?: number;
}

// When creating a new marker, spread the data
const createNewMarker = (data: Partial<MarkerData>): MarkerData => ({
  id: Date.now().toString(),
  createdAt: Date.now(),
  updatedAt: Date.now(),
  status: 'draft',
  isGlobal: false,
  ...data
} as MarkerData);

// Add these types and constants outside the component
type SpotState = 'new' | 'editing' | 'locked';
type SpotCollections = 'globalSpots' | 'spots';

interface SpotCategory {
  id: string;
  label: string;
}

const spotCategories: SpotCategory[] = [
  { id: 'ledges', label: 'Ledges' },
  { id: 'rails', label: 'Rails' },
  { id: 'stairs', label: 'Stairs' },
  { id: 'gaps', label: 'Gaps' },
  { id: 'manuals', label: 'Manual Pads' },
  { id: 'banks', label: 'Banks' },
  { id: 'transitions', label: 'Transitions' },
  { id: 'flatground', label: 'Flat Ground' },
  { id: 'parks', label: 'Skateparks' },
];

const calculateDistanceInMeters = (
  point1: google.maps.LatLngLiteral,
  point2: google.maps.LatLngLiteral
): number => {
  const R = 6371e3; // Earth's radius in meters
  const lat1 = point1.lat * Math.PI / 180;
  const lat2 = point2.lat * Math.PI / 180;
  const dLat = (point2.lat - point1.lat) * Math.PI / 180;
  const dLng = (point2.lng - point1.lng) * Math.PI / 180;

  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
           Math.cos(lat1) * Math.cos(lat2) *
           Math.sin(dLng/2) * Math.sin(dLng/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// First, let's create a shared Categories component to ensure consistency
const SpotCategories = ({ activeCategory, onCategoryClick, className }: {
  activeCategory: string;
  onCategoryClick: (id: string) => void;
  className?: string;
}) => (
  <div className={cn("sticky top-0 z-10 bg-transparent", className)}>
    <div className="overflow-x-auto hide-scrollbar">
      <div className="flex gap-2 p-4 min-w-max">
        <div className="flex gap-2">
          {SPOT_CATEGORIES.map((category) => (
            <button
              key={category.id}
              onClick={() => onCategoryClick(category.id)}
              className={cn(
                "flex-none px-4 py-2 rounded-full text-sm font-medium transition-colors border font-[Oxanium]",
                activeCategory === category.id
                  ? "bg-white text-black border-transparent"
                  : "bg-[#1D1E1F] text-white hover:bg-[#2D2E2F] border-white/30"
              )}
            >
              {category.label}
            </button>
          ))}
          <div className="w-6 flex-none" />
        </div>
      </div>
    </div>
  </div>
);

// Add this interface near your other interfaces
interface SearchResult {
  id: string;
  title: string;
  spotType?: string;
  imageUrl?: string | null;
  thumbnailUrl?: string;
  distance?: number;
}

// Add proper type declarations for geolocation
interface GeolocationResponse {
  location: {
    lat: number;
    lng: number;
  };
  accuracy: number;
}

interface GeolocationError {
  code: number;
  message: string;
  PERMISSION_DENIED: number;
  POSITION_UNAVAILABLE: number;
  TIMEOUT: number;
}

// Define the MarkerLibrary type
interface MarkerLibrary {
  AdvancedMarkerElement: new (options: google.maps.marker.AdvancedMarkerElementOptions) => google.maps.marker.AdvancedMarkerElement;
}

// Extend the existing google.maps type
declare module '@react-google-maps/api' {
  export interface Libraries {
    marker: MarkerLibrary;
  }
}

// Update the marker cleanup code to handle both types correctly
const clearMarker = (marker: google.maps.Marker | google.maps.marker.AdvancedMarkerElement) => {
  if (marker instanceof google.maps.Marker) {
    marker.setMap(null);
  } else if ('map' in marker) {
    marker.map = null;
  }
};

const MapComponent = () => {
  const router = useRouter();

  // 1. Context hooks
  const { user, isAdmin } = useAuth();

  // 2. State hooks
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [userLocation, setUserLocation] = useState<google.maps.LatLngLiteral | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [showSpotOverlay, setShowSpotOverlay] = useState(true);
  const [showNearbyOnly, setShowNearbyOnly] = useState(false);

  // 3. Ref hooks
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersMapRef = useRef<Map<string, google.maps.Marker | google.maps.marker.AdvancedMarkerElement>>(new Map());
  const userLocationMarkerRef = useRef<google.maps.Marker | google.maps.marker.AdvancedMarkerElement | null>(null);

  // 4. Load script hook - MOVED UP before the initialization effect
  const { isLoaded, loadMarker } = useGoogleMaps();

  // 5. Initialization effect
  useEffect(() => {
    const initializeMap = async () => {
      // Check onboarding status
      const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
      if (!hasSeenOnboarding) {
        setShowOnboarding(true);
      }

      // Only proceed with location if map is loaded
      if (!isLoaded) return;

      // Initialize location
      if (!("geolocation" in navigator)) {
        console.error('❌ Geolocation is not supported');
        return;
      }

      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          });
        });

        const userPos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };

        setUserLocation(userPos);
        
        if (mapInstanceRef.current) {
          mapInstanceRef.current.panTo(userPos);
          mapInstanceRef.current.setZoom(14);
          addUserLocationMarker(mapInstanceRef.current, userPos);
        }
      } catch (error) {
        console.error('Error getting location:', error);
        const defaultLocation = { lat: 51.5074, lng: -0.1278 };
        setUserLocation(defaultLocation);
      }
    };

    initializeMap();
  }, [isLoaded]); // Only run when isLoaded changes

  const handleOnboardingClose = (dontShowAgain: boolean) => {
    if (dontShowAgain) {
      localStorage.setItem('hasSeenOnboarding', 'true');
    }
    setShowOnboarding(false);
  };

  // Move helper functions to the top of the component
  const createMarkerElement = (markerData: MarkerData) => {
    const div = document.createElement('div');
    div.className = 'relative';
    
    div.setAttribute('data-marker-id', markerData.id);
    
    div.innerHTML = `
      <div class="relative">
        <div class="absolute -inset-4 rounded-full ${
          markerData.isGlobal 
            ? 'bg-primary/20' 
            : 'bg-secondary/20'
        }"></div>
        <div class="relative h-4 w-4 rounded-full ${
          markerData.isGlobal 
            ? 'bg-primary border-2 border-white' 
            : 'bg-secondary border-2 border-white'
        } shadow-lg"></div>
      </div>
    `;
    
    return div;
  };

  const createUserLocationMarker = () => {
    const div = document.createElement('div');
    div.className = 'relative';
    
    div.innerHTML = `
      <div class="relative">
        <div class="absolute -inset-4 rounded-full bg-blue-400/20 animate-pulse"></div>
        <div class="relative h-4 w-4 rounded-full bg-blue-500 border-2 border-white shadow-lg"></div>
      </div>
    `;
    
    return div;
  };

  const isSpotValid = (marker: MarkerData | null) => {
    if (!marker) return false;
    
    const hasImage = Boolean(marker.imageUrl);
    const hasValidTitle = Boolean(editingTitle && editingTitle !== 'New Location' && editingTitle.trim());
    const hasSpotType = Boolean(marker.spotType);

    return hasImage && hasValidTitle && hasSpotType;
  };

  // 1. All useState hooks
  const [spotCollection, setSpotCollection] = useState<SpotCollections>('globalSpots');
  const [showPersonalSpots, setShowPersonalSpots] = useState(true);
  const [showGlobalSpots, setShowGlobalSpots] = useState(true);
  const [markers, setMarkers] = useState<MarkerData[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<MarkerData | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [isMapView, setIsMapView] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [spotState, setSpotState] = useState<SpotState>('new');
  const [isEditing, setIsEditing] = useState(false);
  const [maxDistance, setMaxDistance] = useState(1609); // 1 mile in meters
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredMarkers, setFilteredMarkers] = useState<MarkerData[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  // 6. Memo hooks
  const center = useMemo(() => 
    userLocation || { lat: 51.5074, lng: -0.1278 }, // Fallback to London if no user location
  [userLocation]);
  const mapOptions = useMemo((): google.maps.MapOptions => ({
    disableDefaultUI: false,
    mapId: 'de621d29fd84f79d',
    gestureHandling: "greedy",
    zoomControl: false,
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: false,
    keyboardShortcuts: false,
    mapTypeControlOptions: {
      mapTypeIds: []
    },
    tilt: 0,
    clickableIcons: false
  }), []);

  // Move loadSpots before handleCategoryClick
  const loadSpots = useCallback(async () => {
    if (!user || !mapInstanceRef.current) return;
    
    try {
      const spots: MarkerData[] = [];

      if (showGlobalSpots) {
        const globalSpotsSnapshot = await getDocs(collection(db, 'globalSpots'));
        globalSpotsSnapshot.forEach((doc) => {
          spots.push({ ...doc.data() as MarkerData, id: doc.id, isGlobal: true });
        });
      }

      if (showPersonalSpots) {
        const userSpotsSnapshot = await getDocs(collection(db, `users/${user.uid}/spots`));
        userSpotsSnapshot.forEach((doc) => {
          spots.push({ ...doc.data() as MarkerData, id: doc.id, isGlobal: false });
        });
      }

      let filteredSpots = spots;

      // Only filter by distance if userLocation exists AND we're in "nearby" mode
      // You might want to add a state variable for this, like: const [showNearbyOnly, setShowNearbyOnly] = useState(false);
      if (userLocation && showNearbyOnly) {
        filteredSpots = spots.filter(spot => {
          const distance = calculateDistanceInMeters(userLocation, spot.position);
          return distance <= maxDistance;
        });
      }

      // Filter by category if one is selected
      if (activeCategory) {
        filteredSpots = filteredSpots.filter(spot => spot.spotType === activeCategory);
      }

      // Filter by search query if one exists
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filteredSpots = filteredSpots.filter(spot => 
          spot.title.toLowerCase().includes(query) ||
          spot.spotType?.toLowerCase().includes(query)
        );
      }

      setMarkers(filteredSpots);

      // Update markers on the map
      if (mapInstanceRef.current) {
        // Clear existing markers
        markersMapRef.current.forEach(clearMarker);
        markersMapRef.current.clear();

        // Load the marker library
        const markerLib = await loadMarker();
        if (!markerLib) return;

        // Add new markers
        filteredSpots.forEach(markerData => {
          const marker = new markerLib.AdvancedMarkerElement({
            map: mapInstanceRef.current,
            position: markerData.position,
            title: markerData.title,
            content: createMarkerElement(markerData)
          });

          marker.addListener('click', () => {
            setSelectedMarker(markerData);
            setEditingTitle(markerData.title);
            setSpotState(markerData.id.length >= 20 ? 'locked' : 'new');
          });

          markersMapRef.current.set(markerData.id, marker);
        });
      }

    } catch (error) {
      console.error('Error loading spots:', error);
    }
  }, [showGlobalSpots, showPersonalSpots, user, userLocation, maxDistance, activeCategory, searchQuery, showNearbyOnly, loadMarker]);

  // Then define handleCategoryClick
  const handleCategoryClick = useCallback((categoryId: string) => {
    // If clicking the active category (deselecting it)
    if (activeCategory === categoryId) {
      setActiveCategory(''); // Clear the active category
      setSearchQuery(''); // Clear the search query
      setSearchResults([]); // Clear search results
      setIsSearching(false); // Reset search state
      
      // Reset URL parameters
      router.replace('/', { scroll: false });
      
      // Reload all spots without filters
      loadSpots();
    } else {
      // Selecting a new category
      setActiveCategory(categoryId);
      
      // Update URL with new category
      const params = new URLSearchParams(window.location.search);
      params.set('category', categoryId);
      router.replace(`/?${params.toString()}`, { scroll: false });
    }
  }, [activeCategory, router, loadSpots]);

  // First define addUserLocationMarker before it's used
  const addUserLocationMarker = (map: google.maps.Map, position: google.maps.LatLngLiteral) => {
    if (userLocationMarkerRef.current) {
      if (userLocationMarkerRef.current instanceof google.maps.Marker) {
        userLocationMarkerRef.current.setMap(null);
      } else {
        userLocationMarkerRef.current.map = null;
      }
      userLocationMarkerRef.current = null;
    }

    if (google.maps.marker?.AdvancedMarkerElement) {
      userLocationMarkerRef.current = new google.maps.marker.AdvancedMarkerElement({
        map: map,
        position: position,
        content: createUserLocationMarker()
      });
    } else {
      userLocationMarkerRef.current = new google.maps.Marker({
        map: map,
        position: position,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 7,
          fillColor: '#3B82F6',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
        }
      });
    }
  };

  // 7. Effect hooks
  useEffect(() => {
    loadSpots();
  }, [loadSpots, userLocation, activeCategory, isMapView]); // Add isMapView as dependency

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear existing markers safely
    markersMapRef.current.forEach(clearMarker);
    markersMapRef.current.clear();

    markers.forEach(async (markerData) => {
      if ((markerData.isGlobal && !showGlobalSpots) || 
          (!markerData.isGlobal && !showPersonalSpots)) {
        return;
      }

      try {
        const markerLib = await loadMarker();
        if (markerLib) {
          const marker = new markerLib.AdvancedMarkerElement({
            map: mapInstanceRef.current,
            position: markerData.position,
            title: markerData.title,
            content: createMarkerElement(markerData)
          });

          marker.addListener('click', () => {
            setSelectedMarker(markerData);
            setEditingTitle(markerData.title);
            setSpotState(markerData.id.length >= 20 ? 'locked' : 'new');
          });

          markersMapRef.current.set(markerData.id, marker);
        }
      } catch (error) {
        console.error('Error creating marker:', error);
      }
    });
  }, [markers, showGlobalSpots, showPersonalSpots, loadMarker]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const categoryParam = params.get('category');
    if (categoryParam) {
      setActiveCategory(categoryParam);
    }
  }, []);

  // Effect to handle initial URL parameters - intentionally runs only once on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const searchParam = params.get('search');
    const categoryParam = params.get('category');
    
    if (categoryParam) {
      setActiveCategory(categoryParam);
    }
    
    if (searchParam) {
      setSearchQuery(searchParam);
      // We intentionally call handleSearch here without adding it as a dependency
      // because this effect should only run once on mount to initialize from URL parameters
      handleSearch(searchParam);
    }
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []); // Empty dependency array since this should only run once on mount

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const spotId = params.get('spot');
    if (spotId) {
      const spot = markers.find(m => m.id === spotId);
      if (spot) {
        setSelectedMarker(spot);
        setEditingTitle(spot.title);
        setSpotState('locked');
        if (mapInstanceRef.current) {
          mapInstanceRef.current.panTo(spot.position);
          mapInstanceRef.current.setZoom(16);
        }
      }
    }
  }, [markers]);

  const handleMapClick = (e: google.maps.MapMouseEvent & { placeId?: string }) => {
    if (!e.placeId && e.latLng && user) {
      const newMarker = createNewMarker({
        position: e.latLng.toJSON(),
        title: 'New Location',
        createdBy: user.uid
      });
      
      setMarkers(prev => [...prev, newMarker]);
      setSelectedMarker(newMarker);
      setEditingTitle('New Location');
      setSpotState('new');
    }
  };

  const handleTitleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (selectedMarker && editingTitle.trim() && user) {
      try {
        const spotData: MarkerData = {
          title: editingTitle,
          position: selectedMarker.position,
          spotType: selectedMarker.spotType,
          imageUrl: selectedMarker.imageUrl,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: user.uid,
          status: 'draft',
          isGlobal: false,
          id: selectedMarker.id
        };

        const isNewSpot = !selectedMarker.id || selectedMarker.id.length < 20;

        if (isNewSpot) {
          const userSpotsRef = collection(db, `users/${user.uid}/spots`);
          const docRef = await addDoc(userSpotsRef, spotData);
          
          // Update the marker with the new ID
          const updatedSpotData = { ...spotData, id: docRef.id };
          
          // Update markers state
          setMarkers(prev => prev.map(marker =>
            marker.id === selectedMarker.id ? updatedSpotData : marker
          ));

          // Update marker on the map
          if (mapInstanceRef.current) {
            // Remove old marker
            const oldMarker = markersMapRef.current.get(selectedMarker.id);
            if (oldMarker) {
              removeMarker(oldMarker);
              markersMapRef.current.delete(selectedMarker.id);
            }

            // Add new marker
            let newMarker;
            if (google.maps.marker?.AdvancedMarkerElement) {
              // Use advanced marker if available
              newMarker = new google.maps.marker.AdvancedMarkerElement({
                map: mapInstanceRef.current,
                position: updatedSpotData.position,
                title: updatedSpotData.title,
                content: createMarkerElement(updatedSpotData)
              });
            } else {
              // Fallback to regular marker
              newMarker = new google.maps.Marker({
                map: mapInstanceRef.current,
                position: updatedSpotData.position,
                title: updatedSpotData.title,
                icon: {
                  url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="8" fill="${updatedSpotData.isGlobal ? '#a3ff12' : '#ffffff'}" stroke="white" stroke-width="2"/>
                    </svg>
                  `),
                  scaledSize: new google.maps.Size(24, 24),
                  anchor: new google.maps.Point(12, 12)
                }
              });
            }

            newMarker.addListener('click', () => {
              setSelectedMarker(updatedSpotData);
              setEditingTitle(updatedSpotData.title);
              setSpotState('locked');
            });

            markersMapRef.current.set(docRef.id, newMarker);
          }
        } else {
          // Handle existing spot update
          const spotRef = doc(db, `users/${user.uid}/spots`, selectedMarker.id);
          await updateDoc(spotRef, spotData);

          // Update markers state
          setMarkers(prev => prev.map(marker =>
            marker.id === selectedMarker.id ? spotData : marker
          ));

          // Update marker on the map
          const existingMarker = markersMapRef.current.get(selectedMarker.id);
          if (existingMarker && mapInstanceRef.current) {
            if (existingMarker instanceof google.maps.Marker) {
              // Update standard marker properties
              existingMarker.setIcon({
                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="8" fill="${spotData.isGlobal ? '#a3ff12' : '#ffffff'}" stroke="white" stroke-width="2"/>
                  </svg>
                `),
                scaledSize: new google.maps.Size(24, 24),
                anchor: new google.maps.Point(12, 12)
              });
            } else {
              // Update advanced marker properties
              existingMarker.content = createMarkerElement(spotData);
            }
          }
        }

        setSelectedMarker(null);
        setSpotState('locked');

      } catch (error) {
        console.error('Error saving spot:', error);
      }
    }
  };

  const handleDeleteMarker = async () => {
    if (selectedMarker && user) {
      try {
        if (selectedMarker.isGlobal) {
          if (isAdmin) {
            await deleteDoc(doc(db, 'globalSpots', selectedMarker.id));
          } else {
            throw new Error('Only admins can delete global spots');
          }
        } else {
          await deleteDoc(doc(db, `users/${user.uid}/spots`, selectedMarker.id));
        }

        if (selectedMarker.imageUrl) {
          try {
            const imageUrl = new URL(selectedMarker.imageUrl);
            const imagePath = decodeURIComponent(imageUrl.pathname.split('/o/')[1].split('?')[0]);
            const imageRef = storageRef(storage, imagePath);
            await deleteObject(imageRef);
          } catch (imageError) {
            console.error('Error deleting image:', imageError);
          }
        }

        setMarkers(prev => prev.filter(marker => marker.id !== selectedMarker.id));
        setSelectedMarker(null);
        
      } catch (error) {
        console.error('Error deleting spot:', error);
      }
    }
  };

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      setFilteredMarkers(markers);
      return;
    }

    setIsSearching(true);
    const searchTerms = query.toLowerCase().split(' ');
    
    // First filter by active category if one is selected
    const baseMarkers = activeCategory 
      ? markers.filter(marker => marker.spotType === activeCategory)
      : markers;
    
    // Then filter by search terms
    const filtered = baseMarkers.filter(marker => {
      const titleMatch = marker.title.toLowerCase().includes(query.toLowerCase());
      const typeMatch = marker.spotType?.toLowerCase().includes(query.toLowerCase());
      const anyTermMatch = searchTerms.some(term => 
        marker.title.toLowerCase().includes(term) || 
        marker.spotType?.toLowerCase().includes(term)
      );
      
      return titleMatch || typeMatch || anyTermMatch;
    });

    // In list view, update filtered markers
    setFilteredMarkers(filtered);

    // In map view, update search results for dropdown
    if (isMapView) {
      const results = filtered.map(marker => ({
        id: marker.id,
        title: marker.title,
        spotType: marker.spotType,
        imageUrl: marker.imageUrl,
        thumbnailUrl: marker.thumbnailUrl,
        distance: userLocation ? calculateDistanceInMeters(userLocation, marker.position) : undefined
      }))
      .sort((a, b) => {
        if (a.distance && b.distance) {
          return a.distance - b.distance;
        }
        return 0;
      });

      setSearchResults(results);
    } else {
      // Clear search results in list view
      setSearchResults([]);
    }
  }, [activeCategory, isMapView, markers, userLocation]);

  const handleSearchResultClick = (spotId: string) => {
    const selectedSpot = markers.find(marker => marker.id === spotId);
    if (selectedSpot && mapInstanceRef.current) {
      mapInstanceRef.current.panTo(selectedSpot.position);
      mapInstanceRef.current.setZoom(16);
      setSelectedMarker(selectedSpot);
      setEditingTitle(selectedSpot.title);
      setSpotState('locked');
      setSearchResults([]);
      setIsSearching(false);
      setSearchQuery('');
    }
  };

  const getUserLocation = async () => {
    if (!("geolocation" in navigator)) {
      console.error('❌ Geolocation not supported');
      return;
    }

    console.log('🎯 Location button clicked');
    setIsLoadingLocation(true);

    try {
      console.log('🔍 Requesting location with high accuracy...');
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            console.log('✅ High accuracy position received');
            resolve(pos);
          },
          (error) => {
            console.log('⚠️ High accuracy failed, trying low accuracy...', error);
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                console.log('✅ Low accuracy position received');
                resolve(pos);
              },
              (finalError) => {
                console.error('❌ Both accuracy attempts failed', finalError);
                reject(finalError);
              },
              { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 }
            );
          },
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
      });

      const userPos = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      console.log('📍 Setting new user location:', userPos);
      setUserLocation(userPos);
      
      if (mapInstanceRef.current) {
        console.log('🗺️ Updating map view');
        mapInstanceRef.current.panTo(userPos);
        mapInstanceRef.current.setZoom(14);
        addUserLocationMarker(mapInstanceRef.current, userPos);
      }
    } catch (error) {
      console.error('❌ Final error getting location:', error);
      // More specific error handling
      if (error instanceof GeolocationPositionError) {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            console.error('Location permission denied');
            break;
          case error.POSITION_UNAVAILABLE:
            console.error('Location information unavailable');
            break;
          case error.TIMEOUT:
            console.error('Location request timed out');
            break;
        }
      }

      const defaultLocation = { lat: 51.5074, lng: -0.1278 };
      setUserLocation(defaultLocation);
      
      if (mapInstanceRef.current) {
        mapInstanceRef.current.panTo(defaultLocation);
        mapInstanceRef.current.setZoom(11);
        addUserLocationMarker(mapInstanceRef.current, defaultLocation);
      }
    } finally {
      setIsLoadingLocation(false);
      console.log('✨ Location request complete');
    }
  };

  // Add a loading state
  if (!isLoaded) {
    return <div className="w-full h-full flex items-center justify-center">Loading map...</div>;
  }

  // Add this helper function inside your Map component
  const calculateDistance = (
    point1: google.maps.LatLngLiteral,
    point2: google.maps.LatLngLiteral
  ): string => {
    // Use the haversine formula to calculate distance
    const R = 3959; // Earth's radius in miles
    const lat1 = point1.lat * Math.PI / 180;
    const lat2 = point2.lat * Math.PI / 180;
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLon = (point2.lng - point1.lng) * Math.PI / 180;

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
             Math.cos(lat1) * Math.cos(lat2) *
             Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;

    // Format the distance
    if (distance < 0.1) {
      return `${Math.round(distance * 5280)} ft`;
    } else {
      return `${distance.toFixed(1)} mi`;
    }
  };

  // Update the map onLoad handler
  const handleMapLoad = (map: google.maps.Map) => {
    mapInstanceRef.current = map;
    
    // Add streetViewControlOptions here after Google Maps is loaded
    map.setOptions({
      streetViewControlOptions: {
        position: google.maps.ControlPosition.BOTTOM_LEFT
      }
    });
    
    if (userLocation) {
      addUserLocationMarker(map, userLocation);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    // Only close if clicking the overlay background, not the content
    if (e.target === e.currentTarget) {
      setSelectedMarker(null);
      setShowSpotOverlay(true);
      // Reset search states
      setSearchQuery('');
      setSearchResults([]);
      setIsSearching(false);
      // Reset URL parameters
      router.replace('/', { scroll: false });
    }
  };

  // Helper function to safely remove a marker
  const removeMarker = (marker: google.maps.Marker | google.maps.marker.AdvancedMarkerElement) => {
    if (marker instanceof google.maps.Marker) {
      marker.setMap(null);
    } else {
      marker.map = null;
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-16 top-0 flex flex-col">
      {/* Search and toggle - Always visible */}
      <div className="flex-none bg-black px-4 py-3 z-50">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder={activeCategory 
                ? `Search ${SPOT_CATEGORIES.find(cat => cat.id === activeCategory)?.label.toLowerCase() || 'spots'}` 
                : "Search for a spot"}
              className="w-full px-4 py-3 pl-10 rounded-full border border-zinc-800 bg-black 
                        text-white text-sm placeholder:text-zinc-500
                        focus:outline-none focus:ring-1 focus:ring-white/20"
            />
            
            {/* Search Results Dropdown */}
            {isMapView && isSearching && searchResults.length > 0 && (
              <>
                <div 
                  className="fixed inset-0 z-[50]" 
                  onClick={() => setIsSearching(false)}
                />
                <div 
                  className="absolute top-full left-0 right-0 mt-2 max-h-60 overflow-y-auto 
                            rounded-lg bg-zinc-900 border border-zinc-800 shadow-lg z-[60]"
                  onClick={(e) => e.stopPropagation()}
                >
                  {searchResults.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => handleSearchResultClick(result.id)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-zinc-800 transition-colors text-left"
                    >
                      <div className="w-12 h-12 bg-zinc-800 rounded-md overflow-hidden flex-shrink-0">
                        {result.imageUrl ? (
                          <img
                            src={result.thumbnailUrl || `${result.imageUrl}?w=96&h=96&q=50`}
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
                        <h4 className="font-medium text-white font-[Oxanium]">{result.title}</h4>
                        {result.spotType && (
                          <p className="text-sm text-zinc-400">{result.spotType}</p>
                        )}
                        {result.distance && (
                          <p className="text-xs text-zinc-500">
                            {result.distance < 1000
                              ? `${Math.round(result.distance)}m away`
                              : `${(result.distance / 1000).toFixed(1)}km away`}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* View Toggle */}
          <div className="flex bg-zinc-900 rounded-full p-1 gap-1">
            <button
              onClick={() => setIsMapView(true)}
              className={cn(
                "p-2 rounded-full transition-colors",
                isMapView 
                  ? "bg-white text-black" 
                  : "bg-transparent text-zinc-400 hover:text-white"
              )}
              aria-label="Map view"
            >
              <Globe size={20} />
            </button>
            <button
              onClick={() => setIsMapView(false)}
              className={cn(
                "p-2 rounded-full transition-colors",
                !isMapView 
                  ? "bg-white text-black" 
                  : "bg-transparent text-zinc-400 hover:text-white"
              )}
              aria-label="List view"
            >
              <List size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Conditional render of Map or List view */}
      {isMapView ? (
        <div className="flex-1 relative">
          {/* Categories */}
          <div className="absolute inset-x-0 top-0 z-40">
            <SpotCategories
              activeCategory={activeCategory}
              onCategoryClick={handleCategoryClick}
              className="border-none"
            />
          </div>

          {/* Map */}
          <div className="absolute inset-0">
            <DynamicGoogleMap
              center={center}
              zoom={14}
              options={mapOptions}
              onClick={handleMapClick}
              onLoad={handleMapLoad}
              mapContainerClassName="w-full h-full"
              mapContainerStyle={{ width: '100%', height: '100%' }}
            />

            {/* Location Button */}
            <button
              onClick={getUserLocation}
              disabled={isLoadingLocation}
              className="absolute right-6 bottom-24 p-3 rounded-full bg-black/80 backdrop-blur-sm 
                       border border-zinc-800 shadow-lg hover:bg-black/90 transition-colors z-10"
              aria-label="Get current location"
            >
              {isLoadingLocation ? (
                <Loader2 className="h-5 w-5 animate-spin text-[#B2FF4D]" />
              ) : (
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="20" 
                  height="20" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="#B2FF4D" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M12 2v3"></path>
                  <path d="M12 19v3"></path>
                  <path d="M19 12h3"></path>
                  <path d="M2 12h3"></path>
                </svg>
              )}
            </button>
          </div>

          {/* Selected marker popup */}
          {selectedMarker && (
            <div 
              className="fixed inset-0 bg-black/25 backdrop-blur-[2px] z-40"
              onClick={handleOverlayClick}
            >
              <div 
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
                          bg-black rounded-3xl shadow-2xl w-[340px] z-50 overflow-hidden
                          border border-zinc-800"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between p-4">
                  <h3 className="text-lg font-medium font-[Oxanium] text-white">
                    {spotState === 'locked' ? selectedMarker.title : 
                     spotState === 'editing' ? 'Edit spot' : 'New spot'}
                  </h3>
                  {spotState === 'locked' ? (
                    <button
                      onClick={() => setSpotState('editing')}
                      className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                      </svg>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        if (spotState === 'new') {
                          setMarkers(prev => prev.filter(marker => marker.id !== selectedMarker.id));
                        }
                        setSelectedMarker(null);
                        setSpotState('new');
                      }}
                      className="p-1.5 rounded-full hover:bg-zinc-600 transition-colors"
                    >
                      <X className="h-5 w-5 text-white" />
                    </button>
                  )}
                </div>

                {/* Content */}
                <div className="px-4 pb-4 space-y-4">
                  <div className="flex gap-4">
                    {/* Image section with rounded corners */}
                    {spotState === 'locked' ? (
                      <div className="w-24 h-24 bg-zinc-800/50 rounded-2xl overflow-hidden">
                        {selectedMarker.imageUrl ? (
                          <img 
                            src={selectedMarker.imageUrl} 
                            alt={selectedMarker.title} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="h-8 w-8 text-zinc-400" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <ImageUpload 
                        onImageUploaded={(url) => {
                          setSelectedMarker(prev => prev ? { ...prev, imageUrl: url } : null);
                          setMarkers(prev =>
                            prev.map(marker =>
                              marker.id === selectedMarker?.id
                                ? { ...marker, imageUrl: url }
                                : marker
                            )
                          );
                        }}
                        initialImage={selectedMarker.imageUrl || undefined}
                        className="w-24 h-24 rounded-2xl bg-zinc-800/50"
                      />
                    )}

                    {/* Title and spot type with updated styling */}
                    <div className="flex-1 space-y-2">
                      {spotState === 'locked' ? (
                        <div>
                          <h2 className="text-lg font-semibold text-white font-[Oxanium]">{selectedMarker.title}</h2>
                          <p className="text-sm text-white/60">
                            {spotCategories.find(cat => cat.id === selectedMarker.spotType)?.label || 'Uncategorized'}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => {
                              setEditingTitle(e.target.value);
                              setSelectedMarker(prev => 
                                prev ? { ...prev, title: e.target.value } : null
                              );
                            }}
                            onFocus={() => {
                              if (editingTitle === 'New Location') {
                                setEditingTitle('');
                              }
                            }}
                            className={cn(
                              "w-full px-3 py-2 text-sm bg-black rounded-xl border border-zinc-800",
                              "focus:outline-none focus:ring-1 focus:ring-white/20",
                              "placeholder:text-zinc-400 font-[Oxanium]",
                              editingTitle === 'New Location' ? 'text-zinc-400' : 'text-white'
                            )}
                            placeholder="Enter spot name"
                          />
                          <div className="relative">
                            <select 
                              className="w-full px-3 py-2 text-sm bg-black rounded-xl border border-zinc-800
                                       focus:outline-none focus:ring-1 focus:ring-white/20
                                       appearance-none pr-10 font-[Oxanium] text-zinc-400"
                              value={selectedMarker.spotType || ''}
                              onChange={(e) => {
                                const newSpotType = e.target.value;
                                setSelectedMarker(prev => {
                                  const updated = prev ? { ...prev, spotType: newSpotType } : null;
                                  return updated;
                                });
                                setMarkers(prev =>
                                  prev.map(marker =>
                                    marker.id === selectedMarker.id
                                      ? { ...marker, spotType: newSpotType }
                                      : marker
                                  )
                                );
                              }}
                            >
                              <option value="" disabled className="text-zinc-400">Select spot type</option>
                              {spotCategories.map(category => (
                                <option key={category.id} value={category.id}>
                                  {category.label}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Details section with subtle separator */}
                  <div className="pt-4 border-t border-white/10">
                    <div className="flex justify-between items-start text-sm">
                      <div className="text-white/60 flex flex-col gap-1">
                        <span className="text-white/40">Distance away</span>
                        {userLocation ? (
                          <span className="text-white font-[Oxanium]">{calculateDistance(userLocation, selectedMarker.position)}</span>
                        ) : (
                          <span>Enable location to see</span>
                        )}
                      </div>
                      <div>
                        <WeatherInfo 
                          lat={selectedMarker.position.lat} 
                          lng={selectedMarker.position.lng} 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Action buttons with updated styling */}
                  <div className="flex gap-2 pt-2">
                    {(spotState === 'new' || spotState === 'editing') && (
                      <button
                        onClick={handleTitleSubmit}
                        disabled={!isSpotValid(selectedMarker)}
                        className={cn(
                          "flex-1 rounded-[20px] h-11 px-4 py-2 text-sm font-medium transition-all font-[Oxanium]",
                          isSpotValid(selectedMarker)
                            ? "bg-gradient-to-b from-[#B2FF4D] to-[#95DB3F] hover:from-[#95DB3F] hover:to-[#7CBA34] text-black"
                            : "bg-zinc-600/50 text-zinc-400 cursor-not-allowed"
                        )}
                      >
                        {spotState === 'editing' ? 'Update' : 'Save'}
                      </button>
                    )}
                    {spotState === 'editing' && (
                      <button
                        onClick={handleDeleteMarker}
                        className="flex-1 rounded-xl bg-red-500/10 text-red-500 
                                 hover:bg-red-500/20 h-11 px-4 py-2 text-sm font-medium"
                      >
                        Delete
                      </button>
                    )}
                  </div>

                  {/* View Spot Details link - only show for existing spots */}
                  {spotState === 'locked' && (
                    <div className="mt-0">
                      <Link
                        href={`/spots/${selectedMarker.id}`}
                        className="text-[#B2FF4D] text-sm hover:underline flex items-center justify-center gap-1 pb-4"
                      >
                        View Spot Details
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-auto bg-black">
          {/* Category Tabs */}
          <SpotCategories
            activeCategory={activeCategory}
            onCategoryClick={handleCategoryClick}
          />

          {/* Spots List */}
          <div className="p-4">
            {!userLocation ? (
              <div className="text-center py-8">
                <p className="text-zinc-400 mb-4">Enable location to see nearby spots</p>
                <button
                  onClick={getUserLocation}
                  className="inline-flex items-center justify-center rounded-full bg-white px-6 py-2 text-sm font-medium text-black hover:bg-white/90"
                >
                  {isLoadingLocation ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    "Enable Location"
                  )}
                </button>
              </div>
            ) : (filteredMarkers.length === 0 && searchQuery) ? (
              <div className="text-center text-zinc-400 py-8">
                No spots found matching "{searchQuery}"
              </div>
            ) : markers.length === 0 ? (
              <div className="text-center text-zinc-400 py-8">
                No spots saved in this area yet
              </div>
            ) : (
              <div className="space-y-3">
                {(searchQuery ? filteredMarkers : markers)
                  .filter(marker => !activeCategory || marker.spotType === activeCategory)
                  .map(marker => ({
                    ...marker,
                    distance: calculateDistanceInMeters(userLocation, marker.position)
                  }))
                  .sort((a, b) => a.distance - b.distance)
                  .map((marker) => (
                    <div
                      key={marker.id}
                      className="flex items-center gap-4 p-4 bg-gradient-to-b from-[#1F1F1E] to-[#0E0E0E] hover:from-[#2F2F2E] hover:to-[#1E1E1E] transition-all cursor-pointer mt-3 first:mt-0"
                      style={{ borderRadius: '20px' }}
                      onClick={() => {
                        // Include current search query and category in the URL
                        const params = new URLSearchParams();
                        if (searchQuery) params.set('search', searchQuery);
                        if (activeCategory) params.set('category', activeCategory);
                        params.set('view', 'list');
                        
                        // Add the spot data to the URL state
                        router.push(`/spots/${marker.id}?${params.toString()}`);
                      }}
                    >
                      {/* Spot Image */}
                      <div className="w-16 h-16 bg-zinc-800 overflow-hidden flex-shrink-0" style={{ borderRadius: '10px' }}>
                        {marker.imageUrl ? (
                          <img
                            src={marker.thumbnailUrl || `${marker.imageUrl}?w=128&h=128&q=50`}
                            alt={marker.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            decoding="async"
                            width={64}
                            height={64}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <MapPin className="w-5 h-5 text-zinc-500" />
                          </div>
                        )}
                      </div>

                      {/* Spot Details */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-white truncate font-[Oxanium]">{marker.title}</h3>
                        <div className="space-y-0.5">
                          <p className="text-sm text-zinc-400">
                            {SPOT_CATEGORIES.find(cat => cat.id === marker.spotType)?.label || 'Uncategorized'}
                          </p>
                          <p className="text-sm text-white font-[Oxanium]">
                            {marker.distance < 1000
                              ? `${Math.round(marker.distance)}m away`
                              : `${(marker.distance / 1000).toFixed(1)}km away`}
                          </p>
                        </div>
                      </div>

                      {/* Arrow */}
                      <ChevronRight className="w-5 h-5 text-zinc-400" />
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add the onboarding overlay */}
      {showOnboarding && (
        <OnboardingOverlay onClose={handleOnboardingClose} />
      )}
    </div>
  );
};

// Export with dynamic import and rename
export default dynamic(() => Promise.resolve(MapComponent), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-x-0 bottom-16 top-0 flex items-center justify-center bg-black">
      <Loader2 className="h-8 w-8 animate-spin text-[#B2FF4D]" />
    </div>
  )
}); 