'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThumbsUp, DollarSign, Share2, MoreHorizontal, Trash2, Link } from 'lucide-react';
import { FeedHeader } from '@/components/feed/FeedHeader';
import { collection, query, orderBy, limit, getDocs, deleteDoc, doc, getDoc, updateDoc, increment, setDoc, serverTimestamp, where } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { useInView } from 'react-intersection-observer';
import { useAuth } from '@/lib/context/auth-context';
import { ref, deleteObject } from 'firebase/storage';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Oxanium } from 'next/font/google';
import { cn } from '@/lib/utils';
import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { openDB } from 'idb';
import { cacheVideo, getCachedVideo } from '@/lib/utils/video-cache';
import { useUploadStore } from '@/lib/store/upload-store';
import { useCacheStore } from '@/lib/store/cache-store';

const oxanium = Oxanium({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-oxanium',
});

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

interface UploadingPost {
  id: string;
  progress: number;
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
  trick: string;
}

interface UploadStore {
  uploadingPosts: UploadingPost[];
  addUploadingPost: (post: UploadingPost) => void;
  updateProgress: (id: string, progress: number) => void;
  removeUploadingPost: (id: string) => void;
}

interface CacheStore {
  lastFetchTimestamp: number | null;
  cachedPosts: FeedPost[];
  setCachedPosts: (posts: FeedPost[]) => void;
  setLastFetchTimestamp: (timestamp: number) => void;
}

function formatTimestamp(timestamp: any) {
  if (!timestamp) return '';
  
  // Convert Firebase Timestamp to Date
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function VideoPost({ post, onDelete }: { post: FeedPost; onDelete?: () => void }) {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { ref: inViewRef, inView } = useInView({
    threshold: 0.5,
    triggerOnce: false
  });
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes);
  const [videoUrl, setVideoUrl] = useState<string>(post.video.url);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      containerRef.current = node;
      inViewRef(node);
    },
    [inViewRef],
  );

  // Check if user has liked this post
  useEffect(() => {
    if (!user) return;
    
    const checkLikeStatus = async () => {
      const likeRef = doc(db, `posts/${post.id}/likes/${user.uid}`);
      const likeDoc = await getDoc(likeRef);
      setIsLiked(likeDoc.exists());
    };
    
    checkLikeStatus();
  }, [post.id, user]);

  // Load video from cache or network
  useEffect(() => {
    const loadVideo = async () => {
      try {
        setIsLoading(true);
        // Try to get from cache first
        const cachedBlob = await getCachedVideo(post.video.url);
        if (cachedBlob) {
          const url = URL.createObjectURL(cachedBlob);
          setVideoUrl(url);
          setIsLoading(false);
          return;
        }

        // If not in cache, fetch and cache
        const response = await fetch(post.video.url);
        if (!response.ok) throw new Error('Failed to fetch video');
        
        const blob = await response.blob();
        await cacheVideo(post.video.url, blob);
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);
      } catch (error) {
        console.error('Error loading video:', error);
        setVideoUrl(post.video.url); // Fallback to original URL
      } finally {
        setIsLoading(false);
      }
    };

    loadVideo();

    return () => {
      if (videoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [post.video.url]);

  // Handle video playback
  useEffect(() => {
    if (!videoRef.current || isLoading) return;

    const videoElement = videoRef.current;

    if (inView) {
      const playPromise = videoElement.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
          })
          .catch((error) => {
            console.error('Error playing video:', error);
            setIsPlaying(false);
          });
      }
    } else {
      videoElement.pause();
      setIsPlaying(false);
    }
  }, [inView, isLoading]);

  const handleLike = async () => {
    if (!user) return;

    const postRef = doc(db, 'posts', post.id);
    const likeRef = doc(db, `posts/${post.id}/likes/${user.uid}`);

    try {
      if (isLiked) {
        // Unlike
        await deleteDoc(likeRef);
        await updateDoc(postRef, {
          likes: increment(-1)
        });
        setLikeCount(prev => prev - 1);
        setIsLiked(false);
      } else {
        // Like
        await setDoc(likeRef, {
          userId: user.uid,
          timestamp: serverTimestamp()
        });
        await updateDoc(postRef, {
          likes: increment(1)
        });
        setLikeCount(prev => prev + 1);
        setIsLiked(true);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      // Revert optimistic update if error occurs
      setLikeCount(post.likes);
      setIsLiked(!isLiked);
    }
  };

  const handleDelete = async () => {
    if (!user || user.uid !== post.user.id) return;

    try {
      // Delete video from storage
      const videoUrl = new URL(post.video.url);
      const videoPath = decodeURIComponent(videoUrl.pathname.split('/o/')[1].split('?')[0]);
      const videoRef = ref(storage, videoPath);
      await deleteObject(videoRef);

      // Delete post document
      await deleteDoc(doc(db, 'posts', post.id));

      // Call onDelete callback instead of refreshing page
      if (onDelete) {
        onDelete();
      }
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${post.trick} at ${post.spot.name}`,
          text: `Check out this trick at ${post.spot.name}!`,
          url: window.location.href
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        // You might want to add a toast notification here
        alert('Link copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  return (
    <div ref={setRefs} className="border-b border-zinc-800">
      {/* Post Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <Avatar className="w-8 h-8">
            <AvatarImage src={post.user.avatar} />
            <AvatarFallback>{post.user.name[0]}</AvatarFallback>
          </Avatar>
          <div>
            <p className={cn("text-sm font-medium text-white", oxanium.className)}>{post.user.username}</p>
            <p className={cn("text-xs text-zinc-400", oxanium.className)}>{post.spot.location}</p>
          </div>
        </div>
        <span className={cn("text-xs text-zinc-500", oxanium.className)}>
          {formatTimestamp(post.timestamp)}
        </span>
      </div>

      {/* Video Content */}
      <div className="aspect-square bg-zinc-900 relative">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-zinc-600 border-t-[#a3ff12] rounded-full animate-spin" />
          </div>
        ) : (
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full object-cover"
            loop
            muted
            playsInline
            preload="auto"
          />
        )}
      </div>

      {/* Post Actions - Updated with menu */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <button 
              onClick={handleLike}
              className={`transition-colors ${
                isLiked 
                  ? 'text-white' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <ThumbsUp 
                className="w-6 h-6" 
                fill={isLiked ? 'currentColor' : 'none'} 
              />
            </button>
            <button className="text-zinc-400 hover:text-white transition-colors">
              <DollarSign className="w-6 h-6" />
            </button>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="text-zinc-400 hover:text-white transition-colors p-2 rounded-full hover:bg-zinc-800">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end"
              className="w-[160px] bg-zinc-900 border border-zinc-800"
            >
              <DropdownMenuItem 
                onClick={handleShare}
                className={cn("text-white hover:bg-zinc-800 cursor-pointer gap-2", oxanium.className)}
              >
                <Share2 className="w-4 h-4" />
                Share
              </DropdownMenuItem>
              
              {user && user.uid === post.user.id && (
                <DropdownMenuItem 
                  onClick={handleDelete}
                  className={cn("text-red-400 hover:bg-zinc-800 cursor-pointer gap-2", oxanium.className)}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-1">
          <p className={cn("text-sm font-medium text-white", oxanium.className)}>{likeCount} likes</p>
          <p className={cn("text-sm text-white", oxanium.className)}>
            <span className="font-medium">{post.trick}</span>
            <span className="text-zinc-400"> at </span>
            <span className="font-medium">{post.spot.name}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function UploadingPostCard({ post }: { post: UploadingPost }) {
  return (
    <div className="border-b border-zinc-800">
      {/* Post Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <Avatar className="w-8 h-8">
            <AvatarImage src={post.user.avatar} />
            <AvatarFallback>{post.user.name[0]}</AvatarFallback>
          </Avatar>
          <div>
            <p className={cn("text-sm font-medium text-white", oxanium.className)}>{post.user.username}</p>
            <p className={cn("text-xs text-zinc-400", oxanium.className)}>{post.spot.location}</p>
          </div>
        </div>
        <span className={cn("text-xs text-zinc-500", oxanium.className)}>
          Uploading...
        </span>
      </div>

      {/* Video Content Placeholder with Loading Spinner */}
      <div className="aspect-square bg-zinc-900 relative">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-zinc-600 border-t-[#a3ff12] rounded-full animate-spin" />
        </div>
      </div>

      {/* Post Info */}
      <div className="p-4">
        <div className="flex items-center gap-4 mb-3">
          <button className="text-zinc-400">
            <ThumbsUp className="w-6 h-6" />
          </button>
          <button className="text-zinc-400">
            <DollarSign className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-1">
          <p className={cn("text-sm text-white", oxanium.className)}>
            <span className="font-medium">{post.trick}</span>
            <span className="text-zinc-400"> at </span>
            <span className="font-medium">{post.spot.name}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function FeedPage() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const uploadingPosts = useUploadStore((state) => state.uploadingPosts);
  const { lastFetchTimestamp, cachedPosts, setCachedPosts, setLastFetchTimestamp } = useCacheStore();

  const fetchPosts = useCallback(async (useCache = true) => {
    console.log('Fetching posts...', { lastFetch: lastFetchTimestamp, useCache });
    
    // Use cache if available and requested, but NOT if there are uploading posts
    if (useCache && uploadingPosts.length === 0) {
      if (cachedPosts.length > 0) {
        console.log('Using cached posts:', cachedPosts.length);
        setPosts(cachedPosts);
        setLoading(false);
        return;
      }
    }

    try {
      let postsQuery = query(
        collection(db, 'posts'),
        orderBy('timestamp', 'desc'),
        limit(10)
      );
      
      const snapshot = await getDocs(postsQuery);
      const newPosts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as FeedPost));
      
      console.log('Posts fetched:', newPosts.length);
      if (newPosts.length > 0) {
        console.log('Sample post timestamp:', newPosts[0].timestamp);
      }
      setPosts(newPosts);
      
      // Only cache if there are no uploads in progress
      if (uploadingPosts.length === 0) {
        setCachedPosts(newPosts);
        setLastFetchTimestamp(Date.now());
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  }, [lastFetchTimestamp, cachedPosts, uploadingPosts.length, setCachedPosts, setLastFetchTimestamp]);

  // Handle post deletion
  const handlePostDelete = useCallback(() => {
    console.log('Post deleted, refreshing feed');
    fetchPosts(false); // Force fetch new posts
  }, [fetchPosts]);

  // Check for new posts periodically when there are uploads
  const checkForNewPosts = useCallback(async () => {
    if (uploadingPosts.length === 0) {
      console.log('No uploads in progress, skipping check');
      return;
    }

    try {
      const postsQuery = query(
        collection(db, 'posts'),
        orderBy('timestamp', 'desc'),
        limit(1)
      );
      
      const snapshot = await getDocs(postsQuery);
      if (!snapshot.empty) {
        const latestPost = snapshot.docs[0];
        const isNewPost = !posts.some(p => p.id === latestPost.id);
        
        if (isNewPost) {
          console.log('New post found:', latestPost.id);
          // Force a fresh fetch to get the latest posts
          const freshQuery = query(
            collection(db, 'posts'),
            orderBy('timestamp', 'desc'),
            limit(10)
          );
          
          const freshSnapshot = await getDocs(freshQuery);
          const newPosts = freshSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as FeedPost));
          
          console.log('Fresh posts fetched:', newPosts.length);
          setPosts(newPosts);
          setCachedPosts(newPosts);
          setLastFetchTimestamp(Date.now());
        } else {
          console.log('Latest post already in feed');
        }
      }
    } catch (error) {
      console.error('Error checking for new posts:', error);
    }
  }, [uploadingPosts.length, posts, setCachedPosts, setLastFetchTimestamp]);

  // Initial load - only run once
  useEffect(() => {
    console.log('Initial load');
    fetchPosts(true);
  }, []); // Remove fetchPosts from dependencies

  // Handle uploads and post updates
  useEffect(() => {
    const prevUploadCount = uploadingPosts.length;
    let intervalId: NodeJS.Timeout | null = null;

    if (prevUploadCount > 0) {
      console.log('Setting up refresh interval for uploads');
      intervalId = setInterval(checkForNewPosts, 2000);
    } else if (prevUploadCount === 0) {
      // Only fetch if we're not already fetching
      console.log('No uploads in progress, doing final fetch');
      fetchPosts(false);
    }

    return () => {
      if (intervalId) {
        console.log('Clearing refresh interval');
        clearInterval(intervalId);
      }
    };
  }, [uploadingPosts.length]); // Only depend on uploadingPosts.length

  // Show loading spinner instead of default loading text
  if (loading && posts.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-zinc-600 border-t-[#a3ff12] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-20">
      <FeedHeader />
      
      <div className="max-w-[500px] mx-auto">
        {uploadingPosts.map((post) => (
          <UploadingPostCard key={post.id} post={post} />
        ))}

        {posts.length === 0 && uploadingPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 mt-8">
            {/* Post Mockup */}
            <div className="w-full max-w-[500px] rounded-lg overflow-hidden mb-6">
              {/* Header mockup */}
              <div className="p-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-zinc-800" />
                <div className="space-y-2">
                  <div className="w-24 h-2.5 bg-zinc-800 rounded-full" />
                  <div className="w-16 h-2 bg-zinc-800/60 rounded-full" />
                </div>
              </div>
              
              {/* Content mockup */}
              <div className="aspect-square bg-zinc-900 flex items-center justify-center">
                <p className={cn(
                  "text-lg text-white/80 text-center px-6",
                  oxanium.className
                )}>
                  Share your first post today clicking the + button above
                </p>
              </div>
              
              {/* Actions mockup */}
              <div className="p-4">
                <div className="flex gap-4 mb-4">
                  <div className="w-6 h-6 rounded-full bg-zinc-800" />
                  <div className="w-6 h-6 rounded-full bg-zinc-800" />
                </div>
                <div className="space-y-2">
                  <div className="w-20 h-2.5 bg-zinc-800 rounded-full" />
                  <div className="w-32 h-2.5 bg-zinc-800 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        ) : (
          posts.map((post) => (
            <VideoPost 
              key={post.id} 
              post={post} 
              onDelete={handlePostDelete}
            />
          ))
        )}
      </div>
    </div>
  );
} 