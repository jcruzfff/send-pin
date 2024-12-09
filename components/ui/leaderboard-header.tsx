'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/context/auth-context';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { SlideMenu } from '@/components/ui/slide-menu';
import { SpotSubmission } from '@/components/spots/SpotSubmission';
import Link from 'next/link';
import { NotificationCenter } from '@/components/admin/NotificationCenter';
import { Oxanium } from 'next/font/google';
import { cn } from '@/lib/utils';
import { Zap } from 'lucide-react';

const oxanium = Oxanium({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-oxanium',
});

export function LeaderboardHeader() {
  const { user, signOut, isAdmin } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSpotSubmission, setShowSpotSubmission] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const userXP = 25000; // This will be replaced with actual user XP from the database

  return (
    <>
      <div className="sticky top-0 z-[100] bg-black w-full h-[65px] text-white">
        <div className="flex justify-between items-center px-[18px] py-4 max-w-5xl mx-auto w-full h-full">
          <div className="flex items-center gap-1 bg-zinc-900/80 rounded-full px-3 py-1.5 border border-zinc-800">
            <Zap className="w-4 h-4 text-[#B2FF4D]" />
            <span className={cn("text-zinc-400 text-sm font-medium", oxanium.className)}>
              {userXP.toLocaleString()}
            </span>
          </div>

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
        <div className="px-[18px] py-6 text-white">
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
              <h3 className={cn("font-medium text-lg", oxanium.className)}>
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
                className={cn("w-full px-4 py-3 text-left rounded-lg hover:bg-white/10 transition-colors", oxanium.className)}
              >
                Review Submissions
              </button>
            )}
            <div className="h-px bg-zinc-800 my-2" />
            <Link 
              href="/settings"
              className={cn("block w-full px-4 py-3 text-left rounded-lg hover:bg-white/10 transition-colors", oxanium.className)}
              onClick={() => setMenuOpen(false)}
            >
              Settings
            </Link>
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