'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  size?: number;
  showLoadingSpinner?: boolean;
}

export function OptimizedImage({ 
  src, 
  alt, 
  className, 
  size = 96, // Default size for thumbnails
  showLoadingSpinner = false 
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  // Generate thumbnail URL
  const thumbnailUrl = src.includes('?') 
    ? `${src}&w=${size}&h=${size}&q=75` 
    : `${src}?w=${size}&h=${size}&q=75`;

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-zinc-800">
        <span className="text-xs text-zinc-500">Error</span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {isLoading && showLoadingSpinner && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-800">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
        </div>
      )}
      <img
        src={thumbnailUrl}
        alt={alt}
        className={className}
        loading="lazy"
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setError(true);
        }}
        style={{ opacity: isLoading ? 0 : 1 }}
      />
    </div>
  );
} 