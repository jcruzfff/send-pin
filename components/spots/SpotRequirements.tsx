"use client"

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronDown } from 'lucide-react';
import type { MarkerData } from '@/types/map';
import { useGoogleMaps } from '@/hooks/use-google-maps';

interface SpotRequirementsProps {
  spot: MarkerData & {
    position: {
      lat: number;
      lng: number;
    };
    title: string;
    spotType: string;
    imageUrl?: string;
  };
  onBack: () => void;
  onSubmit: (requirements: { difficulty: string; material: string; description: string }) => void;
}

const DIFFICULTY_OPTIONS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'flow', label: 'Flow' },
  { value: 'amateur', label: 'Amateur' },
  { value: 'pro', label: 'Pro' }
];

const MATERIAL_OPTIONS = [
  { value: 'concrete', label: 'Concrete' },
  { value: 'marble', label: 'Marble' },
  { value: 'granite', label: 'Granite' },
  { value: 'wood', label: 'Wood' },
  { value: 'steel', label: 'Steel' },
  { value: 'metal', label: 'Metal' },
  { value: 'aluminum', label: 'Aluminum' },
  { value: 'brass', label: 'Brass' },
  { value: 'glass', label: 'Glass' },
  { value: 'stucko', label: 'Stucko' }
];

export function SpotRequirements({ spot, onBack, onSubmit }: SpotRequirementsProps) {
  const [difficulty, setDifficulty] = useState('');
  const [material, setMaterial] = useState('');
  const [description, setDescription] = useState('');
  const [locationString, setLocationString] = useState<string>('Loading location...');

  // Use shared Google Maps hook
  const { isLoaded, loadError } = useGoogleMaps();

  // Use Geocoding to get address from coordinates
  useEffect(() => {
    if (!isLoaded || !window.google) return;

    try {
      const geocoder = new google.maps.Geocoder();
      const latLng = { lat: spot.position.lat, lng: spot.position.lng };

      geocoder.geocode({ location: latLng }, (results, status) => {
        if (status === 'OK' && results?.[0]) {
          let city = '';
          let state = '';
          
          results[0].address_components.forEach((component) => {
            if (component.types.includes('locality')) {
              city = component.long_name;
            }
            if (component.types.includes('administrative_area_level_1')) {
              state = component.short_name;
            }
          });

          setLocationString(`${city}, ${state}`);
        } else {
          setLocationString('Location not available');
        }
      });
    } catch (error) {
      console.error('Geocoding error:', error);
      setLocationString('Location not available');
    }
  }, [isLoaded, spot.position]);

  // Show loading state while Google Maps is loading
  if (!isLoaded) {
    return (
      <div className="fixed inset-0 bg-black z-[200] flex items-center justify-center">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  // Show error state if Google Maps failed to load
  if (loadError) {
    console.error('Error loading Google Maps:', loadError);
    return (
      <div className="fixed inset-0 bg-black z-[200] flex items-center justify-center">
        <div className="text-red-400">Error loading map</div>
      </div>
    );
  }

  const isValid = 
    difficulty !== '' && 
    material !== '' && 
    description.length >= 15;

  const handleSubmit = () => {
    if (!isValid) return;
    
    onSubmit({
      difficulty,
      material,
      description
    });
  };

  return (
    <div className="fixed inset-0 bg-black z-[200]">
      {/* Header */}
      <div className="flex items-center h-[65px] px-[18px] border-b border-zinc-800">
        <button
          onClick={onBack}
          className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="ml-2 text-lg font-semibold">Spot Requirements</h2>
      </div>

      <div className="flex flex-col h-[calc(100vh-65px)]">
        {/* Spot Info Section */}
        <div className="p-[18px] flex items-center gap-4">
          {/* Thumbnail */}
          <div className="w-[110px] h-[110px] rounded-lg bg-zinc-900 overflow-hidden flex-shrink-0">
            {spot.imageUrl ? (
              <img
                src={spot.imageUrl}
                alt={spot.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-700">
                No image
              </div>
            )}
          </div>

          {/* Spot Details */}
          <div className="flex-1">
            <h3 className="text-xl font-semibold mb-1">{spot.title}</h3>
            <p className="text-zinc-400 text-sm mb-1">{locationString}</p>
            <p className="text-zinc-400 text-sm capitalize">{spot.spotType}</p>
          </div>
        </div>

        {/* Form Section */}
        <div className="flex-1 px-[18px] overflow-y-auto">
          {/* Difficulty Dropdown */}
          <div className="mb-6">
            <label className="text-lg font-semibold mb-3 block">
              Difficulty
            </label>
            <div className="relative">
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full px-4 py-3 rounded-full bg-transparent border border-zinc-800
                          appearance-none text-base focus:outline-none focus:border-zinc-700
                          pr-10"
              >
                <option value="">Select the difficulty of the spot</option>
                {DIFFICULTY_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 pointer-events-none" />
            </div>
          </div>

          {/* Material Dropdown */}
          <div className="mb-6">
            <label className="text-lg font-semibold mb-3 block">
              Material
            </label>
            <div className="relative">
              <select
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                className="w-full px-4 py-3 rounded-full bg-transparent border border-zinc-800
                          appearance-none text-base focus:outline-none focus:border-zinc-700
                          pr-10"
              >
                <option value="">Choose the material of the spot</option>
                {MATERIAL_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400 pointer-events-none" />
            </div>
          </div>

          {/* Description Field */}
          <div className="mb-6">
            <label className="text-lg font-semibold mb-3 block">
              Description
              <span className="text-zinc-400 text-sm font-normal ml-2">
                ({description.length}/15 min characters)
              </span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the spot in detail"
              className="w-full px-4 py-3 rounded-lg bg-transparent border border-zinc-800
                        text-base focus:outline-none focus:border-zinc-700
                        min-h-[120px] resize-none"
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="p-[18px] border-t border-zinc-800">
          <button
            onClick={handleSubmit}
            disabled={!isValid}
            className={`w-full py-3 rounded-full font-medium text-base ${
              isValid
                ? 'bg-[#a3ff12] text-black hover:bg-[#92e610]'
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
            }`}
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
} 