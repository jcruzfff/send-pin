import { useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Oxanium } from 'next/font/google';
import Image from 'next/image';

const oxanium = Oxanium({ 
  subsets: ['latin'],
  variable: '--font-oxanium',
});

interface OnboardingOverlayProps {
  onClose: (dontShowAgain: boolean) => void;
}

export function OnboardingOverlay({ onClose }: OnboardingOverlayProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-black border border-zinc-800 rounded-3xl max-w-md w-full p-6 relative">
        {/* Close button */}
        <button 
          onClick={() => onClose(dontShowAgain)}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        {/* Content */}
        <div className="space-y-6">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="relative w-16 h-16">
              <Image
                src="/icons/icon-512x512.svg"
                alt="Send Pin"
                fill
                className="object-contain"
              />
            </div>
          </div>

          {/* Title */}
          <div className="text-center">
            <h2 className={cn("text-[28px] font-bold text-white mb-2", oxanium.className)}>
              Welcome to Send Pin
            </h2>
          </div>

          {/* Features list */}
          <div className="space-y-8">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#B2FF4D]/10 flex items-center justify-center flex-shrink-0">
                <span className="text-[#B2FF4D]">1</span>
              </div>
              <div>
                <p className={cn("text-white text-sm font-medium", oxanium.className)}>
                  Save Your Spots
                </p>
                <p className="text-zinc-400 text-sm">
                  Click anywhere on the map to drop a pin and save a spot. Globally share the ones you're ready to give up.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#B2FF4D]/10 flex items-center justify-center flex-shrink-0">
                <span className="text-[#B2FF4D]">2</span>
              </div>
              <div>
                <p className={cn("text-white text-sm font-medium", oxanium.className)}>
                  Show Off Your Tricks
                </p>
                <p className="text-zinc-400 text-sm">
                  Post your best tricks to the feed and let the world see your creativity. 
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#B2FF4D]/10 flex items-center justify-center flex-shrink-0">
                <span className="text-[#B2FF4D]">3</span>
              </div>
              <div>
                <p className={cn("text-white text-sm font-medium", oxanium.className)}>
                  Share Skate History
                </p>
                <p className="text-zinc-400 text-sm">
                Help create the ultimate archive of skateboarding spots and tricks.
                </p>
              </div>
            </div>
          </div>

          {/* Get Started button */}
          <button
            onClick={() => onClose(dontShowAgain)}
            className={cn(
              "w-full py-3 rounded-full bg-[#B2FF4D] text-black font-medium",
              "hover:bg-[#9EE53D] transition-colors",
              oxanium.className
            )}
          >
            Get Started
          </button>

          {/* Don't show again link */}
          <button
            onClick={() => {
              setDontShowAgain(true);
              onClose(true);
            }}
            className={cn(
              "w-full text-center mt-4 text-[#B2FF4D] text-sm hover:text-[#9EE53D] transition-colors",
              oxanium.className
            )}
          >
            Don't show this again
          </button>
        </div>
      </div>
    </div>
  );
} 