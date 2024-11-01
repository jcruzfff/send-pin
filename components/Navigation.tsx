'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MapPin, User } from 'lucide-react';

const Navigation = () => {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background dark:bg-background border-t border-border z-50">
      <div className="flex justify-around items-center h-16">
        <Link 
          href="/home"
          className={`flex flex-col items-center p-2 transition-colors ${
            pathname === '/home' 
              ? 'text-primary dark:text-primary' 
              : 'text-muted-foreground dark:text-muted-foreground hover:text-primary dark:hover:text-primary'
          }`}
          prefetch={true}
        >
          <Home size={24} />
          <span className="text-xs">Home</span>
        </Link>

        <Link 
          href="/" 
          className={`flex flex-col items-center p-2 transition-colors ${
            pathname === '/' ? 'text-primary' : 'text-muted-foreground hover:text-primary'
          }`}
          prefetch={true}
        >
          <MapPin size={24} />
          <span className="text-xs">Map</span>
        </Link>

        <Link 
          href="/profile" 
          className={`flex flex-col items-center p-2 transition-colors ${
            pathname === '/profile' ? 'text-primary' : 'text-muted-foreground hover:text-primary'
          }`}
          prefetch={true}
        >
          <User size={24} />
          <span className="text-xs">Profile</span>
        </Link>
      </div>
    </nav>
  );
};

export default Navigation; 