import { create } from 'zustand';

interface FeedPost {
  id: string;
  user: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
  };
  spot: {
    id: string;
    name: string;
    location: string;
  };
  video: {
    url: string;
  };
  trick: string;
  likes: number;
  timestamp: any;
}

interface CacheStore {
  lastFetchTimestamp: number | null;
  cachedPosts: FeedPost[];
  setCachedPosts: (posts: FeedPost[]) => void;
  setLastFetchTimestamp: (timestamp: number) => void;
}

export const useCacheStore = create<CacheStore>((set) => ({
  lastFetchTimestamp: null,
  cachedPosts: [],
  setCachedPosts: (posts) => set({ cachedPosts: posts }),
  setLastFetchTimestamp: (timestamp) => set({ lastFetchTimestamp: timestamp }),
})); 