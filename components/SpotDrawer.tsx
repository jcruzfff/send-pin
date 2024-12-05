"use client"

import { Drawer, DrawerContent } from "@/components/ui/drawer";
import type { MarkerData, SpotCategory } from "@/types/map";

interface SpotDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  activeCategory: string;
  markers: MarkerData[];
  spotCategories: SpotCategory[];
  onSpotClick: (marker: MarkerData) => void;
}

export function SpotDrawer({
  isOpen,
  onOpenChange,
  activeCategory,
  markers,
  spotCategories,
  onSpotClick,
}: SpotDrawerProps) {
  const activeSpots = markers.filter(marker => 
    !activeCategory || marker.spotType === activeCategory
  );

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[40vh]">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              {spotCategories.find(cat => cat.id === activeCategory)?.label || 'Spots'}
            </h2>
            <button
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              ×
            </button>
          </div>
          
          {activeSpots.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No spots in this category yet
            </div>
          ) : (
            <div className="space-y-4">
              {activeSpots.map((marker) => (
                <div
                  key={marker.id}
                  className="p-4 rounded-lg border border-border hover:bg-accent 
                           transition-colors cursor-pointer"
                  onClick={() => {
                    onSpotClick(marker);
                    onOpenChange(false);
                  }}
                >
                  <h3 className="font-medium">{marker.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {marker.spotType || 'Uncategorized'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
} 