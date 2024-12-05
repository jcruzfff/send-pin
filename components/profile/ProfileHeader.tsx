'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/auth-context';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { SlideMenu } from '@/components/ui/slide-menu';
import { SpotSubmission } from '@/components/spots/SpotSubmission';
import Link from 'next/link';
import { NotificationCenter } from '@/components/admin/NotificationCenter';

interface ProfileHeaderProps {
  showTitle?: boolean;
  isHome?: boolean;
}

export function ProfileHeader({ showTitle = true, isHome = false }: ProfileHeaderProps) {
  const { user, signOut, isAdmin } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSpotSubmission, setShowSpotSubmission] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Load pending submissions count
  useEffect(() => {
    const loadPendingCount = async () => {
      if (!isAdmin) return;
      
      try {
        const submissionsRef = collection(db, 'spotSubmissions');
        const q = query(submissionsRef, where('status', '==', 'pending'));
        const snapshot = await getDocs(q);
        setPendingCount(snapshot.size);
      } catch (error) {
        console.error('Error loading pending count:', error);
      }
    };

    loadPendingCount();
  }, [isAdmin]);

  return (
    <>
      <div className="sticky top-0 z-[100] bg-black w-full h-[65px]">
        <div className="flex justify-between items-center px-[18px] py-4 max-w-5xl mx-auto w-full h-full">
          {isHome ? (
            <h1 className="text-lg font-semibold">Spottt</h1>
          ) : (
            showTitle && <h1 className="text-lg font-semibold">Profile</h1>
          )}
          
          <button 
            onClick={() => setMenuOpen(true)}
            className="w-8 h-8 relative group"
          >
            <div className="absolute inset-[-1px] rounded-full border border-zinc-700 group-hover:border-zinc-600 transition-colors" />
            <Avatar className="w-full h-full">
              <AvatarImage
                src={user?.photoURL || undefined}
                alt={user?.displayName || 'Profile'}
              />
              <AvatarFallback className="text-sm">
                {user?.email?.[0].toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
          </button>
        </div>
      </div>

      <SlideMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <div className="px-[18px] py-6">
          {/* User Info */}
          <div className="flex items-center gap-4 mb-8">
            <Avatar className="w-16 h-16">
              <AvatarImage
                src={user?.photoURL || undefined}
                alt={user?.displayName || 'Profile'}
              />
              <AvatarFallback className="text-xl">
                {user?.email?.[0].toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-medium text-lg">
                {user?.displayName || 'Anonymous User'}
              </h3>
              <p className="text-sm text-zinc-400">
                {user?.email}
              </p>
            </div>
          </div>

          {/* Menu Items */}
          <div className="space-y-2">
            <button 
              onClick={() => {
                setMenuOpen(false);
                setShowSpotSubmission(true);
              }}
              className="w-full px-4 py-3 text-left rounded-lg hover:bg-white/10 transition-colors"
            >
              Submit a spot
            </button>
            <button className="w-full px-4 py-3 text-left rounded-lg hover:bg-white/10 transition-colors">
              Add a trick
            </button>
            <button className="w-full px-4 py-3 text-left rounded-lg hover:bg-white/10 transition-colors">
              Tip a skater
            </button>
            <button className="w-full px-4 py-3 text-left rounded-lg hover:bg-white/10 transition-colors">
              Report Updates
            </button>
            {isAdmin && (
              <button 
                onClick={() => {
                  setMenuOpen(false);
                  setShowNotifications(true);
                }}
                className="w-full px-4 py-3 text-left rounded-lg hover:bg-white/10 transition-colors
                          flex items-center"
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
            <Link 
              href="/settings"
              className="block w-full px-4 py-3 text-left rounded-lg hover:bg-white/10 transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              Settings
            </Link>
            <button 
              onClick={() => signOut()}
              className="w-full px-4 py-3 text-left rounded-lg hover:bg-white/10 transition-colors text-red-400"
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