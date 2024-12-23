'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/auth-context';
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';
import { db } from '@/lib/firebase';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { SlideMenu } from '@/components/ui/slide-menu';
import { SpotSubmission } from '@/components/spots/SpotSubmission';
import Link from 'next/link';
import { NotificationCenter } from '@/components/admin/NotificationCenter';
import { Oxanium } from 'next/font/google';
import { cn } from '@/lib/utils';
import { Zap, Loader2 } from 'lucide-react';

const oxanium = Oxanium({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-oxanium',
});

interface ProfileHeaderProps {
  showTitle?: boolean;
  isHome?: boolean;
  showXP?: boolean;
  xpAmount?: number;
}

export function ProfileHeader({ 
  showTitle = true, 
  isHome = false,
  showXP = false,
  xpAmount = 0
}: ProfileHeaderProps) {
  const { user, signOut, isAdmin } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSpotSubmission, setShowSpotSubmission] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [userData, setUserData] = useState<{
    displayName: string | null;
    username: string | null;
    photoURL: string | null;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Debug logging
  useEffect(() => {
    if (user) {
      console.log('Current user info:', {
        uid: user.uid,
        email: user.email,
        isAdmin: isAdmin
      });
    }
  }, [user, isAdmin]);

  // Load pending submissions count
  useEffect(() => {
    const loadPendingCount = async () => {
      console.log('Checking admin status:', {
        isAdmin,
        user: user ? {
          uid: user.uid,
          email: user.email
        } : null
      });

      if (!isAdmin) {
        console.log('User is not admin, skipping pending count');
        return;
      }
      
      try {
        console.log('Attempting to query spotSubmissions collection...');
        const submissionsRef = collection(db, 'spotSubmissions');
        const q = query(submissionsRef, where('status', '==', 'pending'));
        
        console.log('Executing query...');
        const snapshot = await getDocs(q);
        console.log('Query result:', {
          size: snapshot.size,
          empty: snapshot.empty,
          docs: snapshot.docs.map(doc => ({
            id: doc.id,
            exists: doc.exists(),
            status: doc.data()?.status
          }))
        });
        
        setPendingCount(snapshot.size);
      } catch (error) {
        if (error instanceof FirebaseError) {
          console.error('Error loading pending count:', error);
          console.error('Error details:', {
            code: error.code,
            message: error.message
          });
        } else {
          console.error('Unknown error:', error);
        }
      }
    };

    loadPendingCount();
  }, [isAdmin, user]);

  // Load user data from Firestore
  useEffect(() => {
    const loadUserData = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }
      
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserData({
            displayName: data.displayName || null,
            username: data.username || null,
            photoURL: data.photoURL || null,
          });
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, [user]);

  return (
    <>
      <div className="sticky top-0 z-[100] bg-black w-full h-[65px] text-white">
        <div className="flex justify-between items-center px-[18px] py-4 max-w-5xl mx-auto w-full h-full text-white">
          {showXP ? (
            <div className="flex items-center gap-1 bg-zinc-900/80 rounded-full px-3 py-1.5 border border-zinc-800">
              <Zap className="w-4 h-4 text-[#B2FF4D]" />
              <span className={cn("text-zinc-400 text-sm font-medium", oxanium.className)}>
                {xpAmount.toLocaleString()}
              </span>
            </div>
          ) : (
            isHome ? (
              <h1 className={cn("text-lg text-white font-semibold", oxanium.className)}>Spottt</h1>
            ) : (
              showTitle && <h1 className={cn("text-lg text-white font-semibold", oxanium.className)}>Profile</h1>
            )
          )}
          
          <button 
            onClick={() => setMenuOpen(true)}
            className="w-8 h-8 relative group"
          >
            <div className="absolute inset-[-1px] rounded-full border border-zinc-700 group-hover:border-zinc-600 transition-colors text-white" />
            <Avatar className="w-full h-full">
              <AvatarImage
                src={userData?.photoURL || user?.photoURL || undefined}
                alt={userData?.displayName || user?.displayName || 'User'}
              />
              <AvatarFallback className="text-sm bg-zinc-800">
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                ) : (
                  (userData?.displayName || user?.displayName)?.[0]?.toUpperCase() || '?'
                )}
              </AvatarFallback>
            </Avatar>
          </button>
        </div>
      </div>

      <SlideMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <div className="px-[18px] py-6 text-white">
          {/* User Info */}
          <div className="flex items-center gap-4 mb-8">
            <Avatar className="w-16 h-16">
              <AvatarImage
                src={userData?.photoURL || user?.photoURL || undefined}
                alt={userData?.displayName || user?.displayName || 'User'}
              />
              <AvatarFallback className="text-xl bg-zinc-800">
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                ) : (
                  (userData?.displayName || user?.displayName)?.[0]?.toUpperCase() || '?'
                )}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className={cn("font-medium text-lg", oxanium.className)}>
                {userData?.displayName || user?.displayName || 'Anonymous User'}
              </h3>
              {userData?.username && (
                <p className="text-sm text-zinc-400">@{userData.username}</p>
              )}
            </div>
          </div>

          {/* Menu Items */}
          <div className="space-y-2">
            <button 
              onClick={() => {
                setMenuOpen(false);
                setShowSpotSubmission(true);
              }}
              className={cn("w-full px-4 py-3 text-left rounded-lg hover:bg-white/10 transition-colors", oxanium.className)}
            >
              Submit a spot
            </button>
            <button className={cn("w-full px-4 py-3 text-left rounded-lg hover:bg-white/10 transition-colors", oxanium.className)}>
              Add a trick
            </button>
            <button className={cn("w-full px-4 py-3 text-left rounded-lg hover:bg-white/10 transition-colors", oxanium.className)}>
              Tip a skater
            </button>
            <button className={cn("w-full px-4 py-3 text-left rounded-lg hover:bg-white/10 transition-colors", oxanium.className)}>
              Report Updates
            </button>
            {isAdmin && (
              <button 
                onClick={() => {
                  setMenuOpen(false);
                  setShowNotifications(true);
                }}
                className={cn("w-full px-4 py-3 text-left rounded-lg hover:bg-white/10 transition-colors flex items-center", oxanium.className)}
              >
                <span>Review Submissions</span>
                <div className={`flex items-center justify-center h-5 min-w-[20px] ml-3
                              ${pendingCount > 0 ? 'bg-[#a3ff12] text-black' : 'bg-zinc-800 text-zinc-400'} 
                              text-xs font-medium rounded-full px-1.5`}
                >
                  {pendingCount}
                </div>
              </button>
            )}
            <div className="h-px bg-zinc-800 my-2" />
            {isAdmin && (
              <Link 
                href="/settings"
                className={cn("block w-full px-4 py-3 text-left rounded-lg hover:bg-white/10 transition-colors", oxanium.className)}
                onClick={() => setMenuOpen(false)}
              >
                Admin Settings
              </Link>
            )}
            <button 
              onClick={() => signOut()}
              className={cn("w-full px-4 py-3 text-left rounded-lg hover:bg-white/10 transition-colors text-red-400", oxanium.className)}
            >
              Sign out
            </button>
          </div>
        </div>
      </SlideMenu>

      {/* Show SpotSubmission when active */}
      {showSpotSubmission && (
        <SpotSubmission onClose={() => setShowSpotSubmission(false)} />
      )}

      {showNotifications && (
        <NotificationCenter onClose={() => setShowNotifications(false)} />
      )}
    </>
  );
} 