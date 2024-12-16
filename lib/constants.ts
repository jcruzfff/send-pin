import { MapPin } from 'lucide-react';

export const SPOT_CATEGORIES = [
  { 
    id: 'ledges', 
    label: 'Ledges',
    icon: MapPin,
    description: 'Smooth ledges for grinding and sliding'
  },
  { 
    id: 'rails', 
    label: 'Rails',
    icon: MapPin,
    description: 'Handrails and technical rail spots'
  },
  { 
    id: 'stairs', 
    label: 'Stairs',
    icon: MapPin,
    description: 'Perfect stair sets for all levels'
  },
  { 
    id: 'gaps', 
    label: 'Gaps',
    icon: MapPin,
    description: 'Challenge yourself with various gaps'
  },
  { 
    id: 'manuals', 
    label: 'Manuals',
    icon: MapPin,
    description: 'Manual pads and manual spots'
  },
  { 
    id: 'banks', 
    label: 'Banks',
    icon: MapPin,
    description: 'Smooth banks and inclines'
  },
  { 
    id: 'transitions', 
    label: 'Transitions',
    icon: MapPin,
    description: 'Quarter pipes and transition spots'
  },
  { 
    id: 'flatground', 
    label: 'Flatground',
    icon: MapPin,
    description: 'Perfect flat spots for street skating'
  },
  { 
    id: 'parks', 
    label: 'Parks',
    icon: MapPin,
    description: 'Skateparks and skate facilities'
  }
] as const;

export type SpotCategory = typeof SPOT_CATEGORIES[number]['id'];