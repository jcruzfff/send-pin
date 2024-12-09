'use client';

import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Oxanium } from 'next/font/google';
import { cn } from '@/lib/utils';

const oxanium = Oxanium({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-oxanium',
});

export function FeedHeader() {
  const router = useRouter();

  return (
    <div className="sticky top-0 z-[100] bg-black w-full h-[65px]">
      <div className="flex justify-between items-center px-[18px] py-4 max-w-5xl mx-auto w-full h-full">
        <h1 className={cn("text-lg font-semibold text-white", oxanium.className)}>Send Pin</h1>
        
        <button 
          className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-800 hover:bg-zinc-700 transition-colors"
          onClick={() => router.push('/feed/new')}
        >
          <Plus className="w-5 h-5 text-white" />
        </button>
      </div>
    </div>
  );
} 