import { MapPin } from 'lucide-react';

export const SPOT_CATEGORIES = [
  { 
    id: 'ledges', 
    label: 'Ledges',
    icon: MapPin,
    description: 'Perfect for grinds and slides'
  },
  { 
    id: 'rails', 
    label: 'Rails',
    icon: MapPin,
    description: 'Time to get technical'
  },
  { 
    id: 'stairs', 
    label: 'Stairs',
    icon: MapPin,
    description: 'Send it down these sets'
  },
  { 
    id: 'gaps', 
    label: 'Gaps',
    icon: MapPin,
    description: 'Clear these obstacles'
  },
  { 
    id: 'manuals', 
    label: 'Manual Pads',
    icon: MapPin,
    description: 'Balance and precision'
  },
  { 
    id: 'banks', 
    label: 'Banks',
    icon: MapPin,
    description: 'Smooth transitions'
  },
  { 
    id: 'transitions', 
    label: 'Transitions',
    icon: MapPin,
    description: 'Flow and carve'
  },
  { 
    id: 'flatground', 
    label: 'Flat Ground',
    icon: MapPin,
    description: 'Perfect for technical tricks'
  },
  { 
    id: 'parks', 
    label: 'Skateparks',
    icon: MapPin,
    description: 'All-in-one spots'
  }
] as const;

export type SpotCategory = typeof SPOT_CATEGORIES[number]['id'];