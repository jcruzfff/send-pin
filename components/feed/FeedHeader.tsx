'use client';

import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function FeedHeader() {
  const router = useRouter();

  return (
    <div className="sticky top-0 z-[100] bg-black w-full h-[65px]">
      <div className="flex justify-between items-center px-[18px] py-4 max-w-5xl mx-auto w-full h-full">
        <h1 className="text-lg font-semibold">Spottt</h1>
        
        <button 
          className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-800 hover:bg-zinc-700 transition-colors"
          onClick={() => router.push('/feed/new')}
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
} 