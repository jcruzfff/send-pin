'use client';

import { Search, MapPin, Mic } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Card from '@/components/Card';
import { SPOT_CATEGORIES } from "@/lib/constants";
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { useAuth } from '@/lib/context/auth-context';
import { Oxanium } from 'next/font/google';
import { cn } from '@/lib/utils';
import { ProfileHeader } from '@/components/profile/ProfileHeader';

interface SearchResult {
  id: string;
  title: string;
  spotType?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
}

const oxanium = Oxanium({ 
  subsets: ['latin'],
  variable: '--font-oxanium',
});

export default function HomePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const setAdminStatus = async () => {
      if (user?.email === 'hello@sendpin.app') {
        try {
          const userRef = doc(db, 'users', user.uid);
          await setDoc(userRef, {
            email: user.email,
            name: user.displayName,
            photoURL: user.photoURL,
            isAdmin: true,
            lastLogin: new Date().toISOString()
          }, { merge: true });
          console.log('Admin status updated successfully');
        } catch (error) {
          console.error('Error updating admin status:', error);
        }
      }
    };

    if (user) {
      setAdminStatus();
    }
  }, [user]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim() || !user) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const searchTerms = query.toLowerCase().split(' ');

    try {
      const spots: SearchResult[] = [];
      
      // Get global spots
      const globalSpotsSnapshot = await getDocs(collection(db, 'globalSpots'));
      globalSpotsSnapshot.forEach((doc) => {
        const data = doc.data();
        spots.push({ 
          id: doc.id, 
          title: data.title, 
          spotType: data.spotType,
          imageUrl: data.imageUrl,
          thumbnailUrl: data.thumbnailUrl
        });
      });

      // Get user spots
      const userSpotsSnapshot = await getDocs(collection(db, `users/${user.uid}/spots`));
      userSpotsSnapshot.forEach((doc) => {
        const data = doc.data();
        spots.push({ 
          id: doc.id, 
          title: data.title, 
          spotType: data.spotType,
          imageUrl: data.imageUrl,
          thumbnailUrl: data.thumbnailUrl
        });
      });

      // Filter spots based on search terms only
      const filtered = spots.filter(spot => {
        const titleMatch = spot.title.toLowerCase().includes(query.toLowerCase());
        const typeMatch = spot.spotType?.toLowerCase().includes(query.toLowerCase());
        const anyTermMatch = searchTerms.some(term => 
          spot.title.toLowerCase().includes(term)
        );
        
        return titleMatch || typeMatch || anyTermMatch;
      });

      setSearchResults(filtered);
    } catch (error) {
      console.error('Error searching spots:', error);
    }
  };

  const handleSearchResultClick = (spotId: string) => {
    router.push(`/?spot=${spotId}&search=${encodeURIComponent(searchQuery)}`);
  };

  const handleCardClick = (category: typeof SPOT_CATEGORIES[number]) => {
    router.push(`/?category=${category.id}&search=${encodeURIComponent(category.label)}`);
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-black text-white pb-24">
      <ProfileHeader showTitle={true} isHome={true} />
      
      <div className="w-full max-w-[700px] space-y-8 px-4 py-8">
        {/* Search Bar with Microphone */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
          <input 
            type="search"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Ask spots anything"
            className="w-full pl-10 pr-4 py-3 rounded-full 
                                 bg-transparent border border-[#171717]
                                 text-white text-sm placeholder:text-zinc-500
                                 focus:outline-none focus:ring-1 focus:ring-white/20
                                 focus:ring-inset"
          />
          <button className="absolute right-3 top-1/2 -translate-y-1/2">
            <Mic className="w-5 h-5 text-zinc-400" />
          </button>
          
          {/* Search Results Dropdown */}
          {isSearching && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 max-h-60 overflow-y-auto 
                          rounded-lg bg-zinc-900 border border-zinc-800 shadow-lg z-[9999]">
              {searchResults.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleSearchResultClick(result.id)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-accent transition-colors text-left"
                >
                  <div className="w-10 h-10 bg-zinc-800 rounded-md overflow-hidden flex-shrink-0">
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
                    <h4 className="font-medium">{result.title}</h4>
                    {result.spotType && (
                      <p className="text-sm text-muted-foreground">{result.spotType}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <h1 className={cn(
          "text-[22px] font-bold",
          oxanium.className
        )}>
          What kind of spot do you want to skate today?
        </h1>

        {/* Grid of Cards */}
        <div className="grid grid-cols-2 gap-4">
          {SPOT_CATEGORIES.map((category) => {
            const IconComponent = category.icon;
            return (
              <Card 
                key={category.id}
                title={category.label}
                description={`Find ${category.label.toLowerCase()} near you`}
                icon={IconComponent}
                onClick={() => handleCardClick(category)}
                className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors h-[172px]"
                iconClassName="text-[#a3ff12]"
              />
            );
          })}
        </div>
      </div>
    </div>
  );
} 