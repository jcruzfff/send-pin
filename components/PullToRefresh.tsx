'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface PullToRefreshProps {
  children: React.ReactNode;
}

export default function PullToRefresh({ children }: PullToRefreshProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [startY, setStartY] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const threshold = 150; // Minimum pull distance to trigger refresh

  useEffect(() => {
    let touchStartY = 0;
    let touchEndY = 0;
    let contentWrapper: HTMLDivElement | null = null;

    const handleTouchStart = (e: TouchEvent) => {
      // Disable pull-to-refresh on the map view (root path)
      if (pathname === '/') return;
      
      // Only enable pull-to-refresh when at the top of the page
      if (window.scrollY === 0) {
        touchStartY = e.touches[0].clientY;
        setStartY(touchStartY);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      // Disable pull-to-refresh on the map view
      if (pathname === '/') return;
      
      if (startY === null) return;
      
      touchEndY = e.touches[0].clientY;
      const pullDistance = touchEndY - touchStartY;
      
      if (pullDistance > 0 && pullDistance < threshold) {
        // Get or create the content wrapper
        if (!contentWrapper) {
          contentWrapper = document.createElement('div');
          contentWrapper.style.position = 'fixed';
          contentWrapper.style.top = '0';
          contentWrapper.style.left = '0';
          contentWrapper.style.right = '0';
          contentWrapper.style.bottom = '0';
          contentWrapper.style.backgroundColor = 'black';
          contentWrapper.style.zIndex = '-1';
          document.body.appendChild(contentWrapper);
        }

        // Add some resistance to the pull
        document.body.style.transform = `translateY(${pullDistance / 2}px)`;
      }
    };

    const handleTouchEnd = async () => {
      // Disable pull-to-refresh on the map view
      if (pathname === '/') return;
      
      if (startY === null) return;
      
      const pullDistance = touchEndY - touchStartY;
      document.body.style.transform = '';
      
      // Remove the background wrapper
      if (contentWrapper) {
        contentWrapper.remove();
        contentWrapper = null;
      }
      
      if (pullDistance > threshold) {
        setRefreshing(true);
        console.log('🔄 Page refreshed');
        router.refresh();
        await new Promise(resolve => setTimeout(resolve, 1000));
        setRefreshing(false);
      }
      
      setStartY(null);
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      if (contentWrapper) {
        contentWrapper.remove();
      }
    };
  }, [startY, router, pathname]);

  return (
    <div className="min-h-screen bg-black">
      {refreshing && (
        <div className="fixed top-0 left-0 w-full h-1 bg-primary z-50">
          <div className="h-full bg-accent animate-[loading_1s_ease-in-out_infinite]" />
        </div>
      )}
      {children}
    </div>
  );
} 