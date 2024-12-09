import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Oxanium } from 'next/font/google';

const oxanium = Oxanium({ 
  subsets: ['latin'],
  variable: '--font-oxanium',
});

export function SplashScreen() {
  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center">
      <div className="relative w-full h-full">
        <Image
          src="/splash.svg"
          alt="Splash Screen"
          fill
          priority
          className="object-cover"
        />
      </div>
    </div>
  );
} 