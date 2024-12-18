'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MapPin, Search, User, Trophy } from 'lucide-react';
import { useAuth } from '@/lib/context/auth-context';
import { cn } from '@/lib/utils';
import { Oxanium } from 'next/font/google';

const oxanium = Oxanium({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-oxanium',
});

const Navigation = () => {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  if (!user || pathname === '/feed/new' || pathname === '/setup') return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-black z-50">
      <div className="flex justify-around items-center h-16">
        <Link 
          href="/" 
          className={cn(
            "flex flex-col items-center p-2 transition-colors",
            pathname === '/' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
          )}
          prefetch={true}
        >
          <MapPin size={24} />
          <span className={cn("text-xs", oxanium.className)}>Map</span>
        </Link>

        <Link 
          href="/leaders"
          className={cn(
            "flex flex-col items-center p-2 transition-colors",
            pathname === '/leaders' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
          )}
          prefetch={true}
        >
          <Trophy size={24} />
          <span className={cn("text-xs", oxanium.className)}>Leaders</span>
        </Link>

        <Link 
          href="/feed"
          className={cn(
            "flex flex-col items-center p-2 transition-colors",
            pathname === '/feed' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
          )}
          prefetch={true}
        >
          <Search size={24} />
          <span className={cn("text-xs", oxanium.className)}>Feed</span>
        </Link>

        <Link
          href="/profile"
          className={cn(
            "flex flex-col items-center p-2 transition-colors",
            (pathname === '/profile' || pathname === '/favorites') 
              ? 'text-white' 
              : 'text-zinc-500 hover:text-zinc-300'
          )}
          prefetch={true}
        >
          <User size={24} />
          <span className={cn("text-xs", oxanium.className)}>Profile</span>
        </Link>
      </div>
    </nav>
  );
};

export default Navigation; 