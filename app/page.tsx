'use client';

import Map from '@/components/Map';

export default function HomePage() {
  return (
    <div className="bg-background text-foreground min-h-screen">
      <div className="h-screen w-full">
        <Map />
      </div>
    </div>
  );
}
