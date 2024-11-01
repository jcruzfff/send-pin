'use client';

import { ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function BackButton() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors p-2"
    >
      <ChevronLeft className="w-5 h-5" />
      <span>Back</span>
    </button>
  );
} 