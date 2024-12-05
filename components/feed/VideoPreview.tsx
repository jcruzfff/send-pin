'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronLeft } from 'lucide-react';
import { SpotSelector } from './SpotSelector';
import { cn } from '@/lib/utils';

interface VideoPreviewProps {
  videoBlob: Blob;
  onBack: () => void;
  onShare: () => void;
}

interface Spot {
  id: string;
  title: string;
  location?: string;
  spotType?: string;
  createdBy?: string;
  position?: {
    lat: number;
    lng: number;
  };
}

export function VideoPreview({ videoBlob, onBack, onShare }: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  const [showSpotSelector, setShowSpotSelector] = useState(false);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.src = URL.createObjectURL(videoBlob);
    }

    return () => {
      if (videoRef.current?.src) {
        URL.revokeObjectURL(videoRef.current.src);
      }
    };
  }, [videoBlob]);

  return (
    <div className="flex flex-col h-full bg-black">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-[65px] border-b border-zinc-800">
        <button
          onClick={onBack}
          className="text-white hover:text-zinc-300 transition-colors"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="text-lg font-medium text-white">New post</h1>
        <div className="w-6" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {showSpotSelector ? (
          <div className="h-full p-4">
            <SpotSelector
              selectedSpot={selectedSpot}
              onSpotSelect={setSelectedSpot}
              onShare={() => {
                setShowSpotSelector(false);
              }}
            />
          </div>
        ) : (
          <div className="h-full flex flex-col">
            {/* Video Preview */}
            <div className="aspect-square bg-zinc-900 relative">
              <video
                ref={videoRef}
                className="w-full h-full object-contain"
                playsInline
                controls
                autoPlay
                loop
                muted
              />
            </div>

            {/* Spot Selection */}
            <div className="flex-1 p-4">
              <button
                onClick={() => setShowSpotSelector(true)}
                className={cn(
                  "w-full p-4 rounded-lg text-left transition-colors mb-4",
                  selectedSpot
                    ? "bg-zinc-800 ring-1 ring-[#a3ff12]"
                    : "bg-zinc-900 hover:bg-zinc-800"
                )}
              >
                {selectedSpot ? (
                  <>
                    <h3 className="font-medium">{selectedSpot.title}</h3>
                    <p className="text-sm text-zinc-400 mt-1">
                      {selectedSpot.location || selectedSpot.spotType}
                    </p>
                  </>
                ) : (
                  <h3 className="font-medium text-zinc-400">Select a spot</h3>
                )}
              </button>

              <button
                onClick={onShare}
                disabled={!selectedSpot}
                className={cn(
                  "w-full py-3 rounded-full font-medium transition-colors",
                  selectedSpot
                    ? "bg-[#a3ff12] hover:bg-[#92e610] text-black"
                    : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                )}
              >
                Share
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 