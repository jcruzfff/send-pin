'use client';

import { ChevronLeft, Search } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Oxanium } from 'next/font/google';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import Link from 'next/link';

const oxanium = Oxanium({ 
  subsets: ['latin'],
  variable: '--font-oxanium',
});

interface Follower {
  id: string;
  username: string;
  displayName: string;
  photoURL?: string;
  timestamp: number;
}

export default function FollowersPage() {
  const router = useRouter();
  const params = useParams();
  const username = params?.username as string;
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function loadFollowers() {
      if (!username) return;
      
      try {
        // First get the user's ID from their username
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('username', '==', username));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          console.error('User not found');
          setLoading(false);
          return;
        }

        const userId = querySnapshot.docs[0].id;
        
        // Get the user's followers
        const followersRef = collection(db, `users/${userId}/followers`);
        const followersSnapshot = await getDocs(followersRef);
        
        const followersPromises = followersSnapshot.docs.map(async (docSnapshot) => {
          const followerData = docSnapshot.data();
          // Get the follower's current profile data
          const followerDocRef = doc(db, 'users', followerData.userId);
          const followerDoc = await getDoc(followerDocRef);
          const currentFollowerData = followerDoc.data();
          
          return {
            id: followerData.userId,
            username: currentFollowerData?.username || '',
            displayName: currentFollowerData?.displayName || '',
            photoURL: currentFollowerData?.photoURL,
            timestamp: followerData.timestamp
          };
        });

        const followersData = await Promise.all(followersPromises);
        // Sort by most recent first
        const sortedFollowers = followersData.sort((a, b) => b.timestamp - a.timestamp);
        
        setFollowers(sortedFollowers);
      } catch (error) {
        console.error('Error loading followers:', error);
      } finally {
        setLoading(false);
      }
    }

    loadFollowers();
  }, [username]);

  const handleBack = () => {
    router.back();
  };

  const filteredFollowers = followers.filter(user => 
    user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/50 backdrop-blur-sm">
        <div className="flex items-center h-[65px] px-[18px] border-b border-zinc-800">
          <button
            onClick={handleBack}
            className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors text-white"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="ml-2">
            <h2 className={cn("text-lg font-semibold text-white", oxanium.className)}>
              Followers
            </h2>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search users"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 pl-10 rounded-full text-sm bg-black text-white placeholder:text-zinc-400 border border-zinc-800 focus:outline-none focus:ring-1 focus:ring-white/20 focus:bg-zinc-900/30 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Followers List */}
      <div className="px-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white"></div>
          </div>
        ) : filteredFollowers.length === 0 ? (
          <div className="text-center py-8 text-zinc-400">
            {searchQuery ? 'No users found' : 'No followers yet'}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredFollowers.map((follower) => (
              <Link
                key={follower.id}
                href={`/profile/${follower.username}`}
                className="flex items-center gap-[18px] py-4"
              >
                <Avatar className="h-12 w-12">
                  <AvatarImage src={follower.photoURL} alt={follower.username} />
                  <AvatarFallback className="bg-zinc-800 text-white">
                    {follower.displayName[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <p className="text-white text-sm font-medium">{follower.displayName}</p>
                  <p className="text-zinc-400 text-sm">@{follower.username}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 