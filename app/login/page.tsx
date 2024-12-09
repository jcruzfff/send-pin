'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/auth-context';
import { Oxanium } from 'next/font/google';
import { cn } from '@/lib/utils';
import Image from 'next/image';

const oxanium = Oxanium({ 
  subsets: ['latin'],
  variable: '--font-oxanium',
});

export default function LoginPage() {
  const { user, signInWithGoogle } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center">
          <h2 className={cn("text-2xl font-bold text-white mb-2", oxanium.className)}>
            Welcome to Send Pin!
          </h2>
          <p className={cn("text-zinc-400", oxanium.className)}>
            Sign in to continue
          </p>
        </div>

        <button
          onClick={signInWithGoogle}
          className={cn(
            "w-full flex items-center justify-center gap-3 px-4 py-3",
            "bg-white text-black rounded-full",
            "hover:bg-white/90 transition-colors",
            oxanium.className
          )}
        >
          <div className="relative w-5 h-5">
            <Image
              src="/icons/google.svg"
              alt="Google"
              fill
              className="object-contain"
            />
          </div>
          Continue with Google
        </button>
      </div>
    </div>
  );
} 