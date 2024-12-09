import BackButton from '@/components/BackButton';
import { Oxanium } from 'next/font/google';
import { cn } from '@/lib/utils';

const oxanium = Oxanium({ 
  subsets: ['latin'],
  variable: '--font-oxanium',
});

export default function LetPage() {
  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-5xl mx-auto px-[18px]">
        <div className="py-4">
          <BackButton />
        </div>
        
        <h1 className={cn("text-2xl font-bold mb-6 text-white", oxanium.className)}>
          Let's Go Back
        </h1>
        
        {/* Coming Soon Message */}
        <div className="flex flex-col items-center justify-center py-20">
          <p className={cn("text-xl text-white mb-2", oxanium.className)}>
            Feature Coming Soon
          </p>
          <p className="text-zinc-400 text-center">
            We're working on something special.
          </p>
        </div>
      </div>
    </div>
  );
} 