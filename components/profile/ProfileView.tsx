'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/context/auth-context';
import { AvatarImage, Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { EditProfileView } from './EditProfileView';
import { collection, query, where, orderBy, getDocs, Timestamp, doc, updateDoc, setDoc, deleteDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ChevronLeft, MoreHorizontal, Share2, Trash2, DollarSign, MessageCircle, X } from 'lucide-react';
import type { ReactElement } from 'react';
import { useInView } from 'react-intersection-observer';
import { deleteObject, ref as storageRef } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { Oxanium } from 'next/font/google';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from 'next/navigation';
import { openDB } from 'idb';

const oxanium = Oxanium({ 
  subsets: ['latin'],
  variable: '--font-oxanium',
});

interface ProfileViewProps {
  isCurrentUser?: boolean;
  username?: string;
}

interface VideoPost {
  id: string;
  video: {
    url: string;
  };
  user: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
  };
  spot: {
    name: string;
    location: string;
  };
  trick: string;
  likes: number;
  timestamp: Timestamp;
}

interface UserSpot {
  id: string;
  title: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  location: string;
  spotType: string;
}

type ViewMode = 'grid' | 'feed';

interface FollowStats {
  followers: number;
  following: number;
}

function formatTimestamp(timestamp: Timestamp | null): string {
  if (!timestamp) return '';
  
  const date = timestamp.toDate();
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

// Add IndexedDB initialization for thumbnails
const initThumbnailDB = async () => {
  console.log('Initializing Thumbnail IndexedDB...');
  try {
    const db = await openDB('sendpin-thumbnails', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('thumbnails')) {
          db.createObjectStore('thumbnails');
        }
      },
    });
    console.log('Thumbnail IndexedDB initialized');
    return db;
  } catch (error) {
    console.error('Error initializing Thumbnail IndexedDB:', error);
    return null;
  }
};

const cacheThumbnail = async (url: string, dataUrl: string) => {
  console.log('Caching thumbnail:', url);
  const db = await initThumbnailDB();
  if (!db) return;
  
  try {
    await db.put('thumbnails', dataUrl, url);
    console.log('Thumbnail cached successfully');
  } catch (error) {
    console.error('Error caching thumbnail:', error);
  }
};

const getCachedThumbnail = async (url: string): Promise<string | null> => {
  console.log('Fetching cached thumbnail:', url);
  const db = await initThumbnailDB();
  if (!db) return null;
  
  try {
    const dataUrl = await db.get('thumbnails', url);
    console.log('Thumbnail cache result:', dataUrl ? 'hit' : 'miss');
    return dataUrl || null;
  } catch (error) {
    console.error('Error fetching cached thumbnail:', error);
    return null;
  }
};

// Add video caching functions
const initVideoDB = async () => {
  console.log('Initializing Video IndexedDB...');
  try {
    const db = await openDB('sendpin-videos', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('videos')) {
          db.createObjectStore('videos');
        }
      },
    });
    console.log('Video IndexedDB initialized');
    return db;
  } catch (error) {
    console.error('Error initializing Video IndexedDB:', error);
    return null;
  }
};

const cacheVideo = async (url: string, blob: Blob) => {
  console.log('Caching video:', url);
  const db = await initVideoDB();
  if (!db) return;
  
  try {
    // Store the timestamp along with the blob
    const cacheData = {
      blob,
      timestamp: Date.now(),
      url
    };
    await db.put('videos', cacheData, url);
    console.log('Video cached successfully');
  } catch (error) {
    console.error('Error caching video:', error);
  }
};

const getCachedVideo = async (url: string): Promise<Blob | null> => {
  console.log('Fetching cached video:', url);
  const db = await initVideoDB();
  if (!db) return null;
  
  try {
    const cacheData = await db.get('videos', url);
    if (!cacheData) {
      console.log('Video cache miss');
      return null;
    }

    // If the cache is older than 24 hours, return null to force a refresh
    const cacheAge = Date.now() - cacheData.timestamp;
    const MAX_CACHE_AGE = 24 * 60 * 60 * 1000; // 24 hours
    
    if (cacheAge > MAX_CACHE_AGE) {
      console.log('Cache expired, fetching fresh video');
      return null;
    }

    console.log('Video cache hit');
    return cacheData.blob;
  } catch (error) {
    console.error('Error fetching cached video:', error);
    return null;
  }
};

export function ProfileView({ isCurrentUser = true, username }: ProfileViewProps): ReactElement {
  const { user } = useAuth();
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [isEditing, setIsEditing] = useState(false);
  const [userVideos, setUserVideos] = useState<VideoPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'spots' | 'videos'>('videos');
  const [profileData, setProfileData] = useState<{
    displayName: string;
    photoURL: string | null;
    uid: string;
    username?: string;
  } | null>(null);
  const [followStats, setFollowStats] = useState<FollowStats>({ followers: 0, following: 0 });
  const [isFollowing, setIsFollowing] = useState(false);
  const router = useRouter();

  // Load profile data
  useEffect(() => {
    const loadProfileData = async () => {
      setLoading(true);
      
      try {
        if (isCurrentUser && user) {
          // For current user, get data from Firestore
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const userData = userDoc.data();
          
          setProfileData({
            displayName: userData?.displayName || user.displayName || 'Anonymous',
            photoURL: userData?.photoURL || user.photoURL,
            uid: user.uid,
            username: userData?.username || user.email?.split('@')[0]
          });
        } else if (username) {
          // Query users collection to find user by username
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('username', '==', username));
          const snapshot = await getDocs(q);

          if (!snapshot.empty) {
            const userData = snapshot.docs[0].data();
            setProfileData({
              displayName: userData.displayName || username,
              photoURL: userData.photoURL || null,
              uid: snapshot.docs[0].id,
              username: userData.username
            });
          } else {
            console.error('User not found:', username);
          }
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProfileData();
  }, [isCurrentUser, user, username]);

  // Fetch user's videos
  useEffect(() => {
    const fetchUserVideos = async () => {
      if (!profileData?.uid) return;

      try {
        const postsQuery = query(
          collection(db, 'posts'),
          where('user.id', '==', profileData.uid),
          orderBy('timestamp', 'desc')
        );

        const snapshot = await getDocs(postsQuery);
        const videos = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as VideoPost));

        setUserVideos(videos);
      } catch (error) {
        console.error('Error fetching user videos:', error);
      }
    };

    fetchUserVideos();
  }, [profileData?.uid]);

  // Load follow stats
  useEffect(() => {
    if (!profileData?.uid) return;

    const unsubscribe = onSnapshot(
      doc(db, 'users', profileData.uid),
      (doc) => {
        const data = doc.data();
        setFollowStats({
          followers: data?.followersCount || 0,
          following: data?.followingCount || 0
        });
      }
    );

    return () => unsubscribe();
  }, [profileData?.uid]);

  // Check if current user is following this profile
  useEffect(() => {
    if (!user || !profileData?.uid || isCurrentUser) return;

    const checkFollowStatus = async () => {
      try {
        const followDoc = await getDocs(
          query(
            collection(db, `users/${user.uid}/following`),
            where('userId', '==', profileData.uid)
          )
        );
        setIsFollowing(!followDoc.empty);
      } catch (error) {
        console.error('Error checking follow status:', error);
      }
    };

    checkFollowStatus();
  }, [user, profileData?.uid, isCurrentUser]);

  const handleProfileUpdate = (updates: { displayName: string; photoURL: string }) => {
    // Merge updates with existing profile data
    if (profileData) {
      setProfileData({
        ...profileData,
        ...updates
      });
    }
  };

  const handleThumbnailClick = (videoId: string) => {
    setSelectedVideoId(videoId);
    setViewMode('feed');
  };

  const handleBackToGrid = () => {
    setViewMode('grid');
    setSelectedVideoId(null);
  };

  // Update the VideoThumbnail component
  const VideoThumbnail = ({ videoUrl }: { videoUrl: string }): ReactElement => {
    const [thumbnailUrl, setThumbnailUrl] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
      const loadThumbnail = async () => {
        try {
          // Try to get from cache first
          const cachedThumbnail = await getCachedThumbnail(videoUrl);
          if (cachedThumbnail) {
            setThumbnailUrl(cachedThumbnail);
            setIsLoading(false);
            return;
          }

          // If not in cache, generate thumbnail
          const video = document.createElement('video');
          video.src = videoUrl;
          video.crossOrigin = 'anonymous';
          
          const handleError = () => {
            console.error('Error loading video for thumbnail');
            setError(true);
            setIsLoading(false);
          };

          video.addEventListener('error', handleError);
          
          video.addEventListener('loadeddata', () => {
            video.currentTime = 0;
          });

          video.addEventListener('seeked', () => {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              const ctx = canvas.getContext('2d');
              ctx?.drawImage(video, 0, 0);
              const dataUrl = canvas.toDataURL();
              setThumbnailUrl(dataUrl);
              // Cache the generated thumbnail
              cacheThumbnail(videoUrl, dataUrl);
            } catch (err) {
              console.error('Error generating thumbnail:', err);
              setError(true);
            } finally {
              setIsLoading(false);
            }
          });

          return () => {
            video.removeEventListener('error', handleError);
          };
        } catch (error) {
          console.error('Error in loadThumbnail:', error);
          setError(true);
          setIsLoading(false);
        }
      };

      loadThumbnail();
    }, [videoUrl]);

    return (
      <div className="aspect-square bg-zinc-900 relative rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-zinc-600 border-t-[#a3ff12] rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex items-center justify-center text-zinc-500">
            <span>Failed to load</span>
          </div>
        ) : thumbnailUrl ? (
          <img 
            src={thumbnailUrl} 
            alt="Video thumbnail"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-zinc-900" />
        )}
      </div>
    );
  };

  const VideoModal = ({ post, onClose }: { post: VideoPost; onClose: () => void }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [videoUrl, setVideoUrl] = useState<string>(post.video.url);

    useEffect(() => {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    useEffect(() => {
      const loadVideo = async () => {
        try {
          // Try to get from cache first
          const cachedBlob = await getCachedVideo(post.video.url);
          if (cachedBlob) {
            setVideoUrl(URL.createObjectURL(cachedBlob));
            setIsLoading(false);
            return;
          }

          // If not in cache, fetch and cache
          const response = await fetch(post.video.url);
          const blob = await response.blob();
          await cacheVideo(post.video.url, blob);
          setVideoUrl(URL.createObjectURL(blob));
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

    return (
      <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
        <div className="relative w-full max-w-3xl mx-auto">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute -top-12 right-4 text-white hover:text-zinc-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Video */}
          <div className="relative aspect-square bg-black">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-zinc-600 border-t-[#a3ff12] rounded-full animate-spin" />
              </div>
            )}
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full h-full object-contain"
              controls
              autoPlay
              playsInline
              onLoadedData={() => setIsLoading(false)}
            />
          </div>

          {/* Video info */}
          <div className="mt-4 px-4 text-white">
            <div className="flex items-center gap-3 mb-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src={post.user.avatar} />
                <AvatarFallback>{post.user.name[0]}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{post.user.username}</p>
                <p className="text-xs text-zinc-400">{post.spot.location}</p>
              </div>
            </div>
            <p className="text-sm">
              <span className="font-medium">{post.trick}</span>
              <span className="text-zinc-400"> at </span>
              <span className="font-medium">{post.spot.name}</span>
            </p>
          </div>
        </div>
      </div>
    );
  };

  const VideoPost = ({ post }: { post: VideoPost }) => {
    const { user } = useAuth();
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [videoUrl, setVideoUrl] = useState<string>(post.video.url);
    const { ref, inView } = useInView({
      threshold: 0.7,
      triggerOnce: false
    });

    // Load video from cache or network
    useEffect(() => {
      let mounted = true;
      const loadVideo = async () => {
        try {
          // Try to get from cache first
          const cachedBlob = await getCachedVideo(post.video.url);
          if (!mounted) return;
          
          if (cachedBlob) {
            setVideoUrl(URL.createObjectURL(cachedBlob));
            setIsLoading(false);
            return;
          }

          // If not in cache, fetch and cache
          const response = await fetch(post.video.url);
          if (!mounted) return;
          
          const blob = await response.blob();
          await cacheVideo(post.video.url, blob);
          setVideoUrl(URL.createObjectURL(blob));
        } catch (error) {
          console.error('Error loading video:', error);
          if (!mounted) return;
          setVideoUrl(post.video.url); // Fallback to original URL
        } finally {
          if (mounted) {
            setIsLoading(false);
          }
        }
      };

      loadVideo();
      return () => {
        mounted = false;
        if (videoUrl.startsWith('blob:')) {
          URL.revokeObjectURL(videoUrl);
        }
      };
    }, [post.video.url]);

    // Handle video playback
    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      let playPromise: Promise<void> | undefined;

      const handlePlay = () => {
        if (inView && !isLoading) {
          playPromise = video.play().catch(error => {
            // Ignore abort errors when video is removed or paused
            if (error.name !== 'AbortError') {
              console.error('Error playing video:', error);
            }
          });
        }
      };

      const handlePause = () => {
        if (!inView && video) {
          if (playPromise !== undefined) {
            playPromise.then(() => {
              video.pause();
            }).catch(() => {
              // Ignore any errors during pause
            });
          } else {
            video.pause();
          }
        }
      };

      if (inView && !isLoading) {
        handlePlay();
      } else {
        handlePause();
      }

      return () => {
        if (playPromise !== undefined) {
          playPromise.then(() => {
            video.pause();
          }).catch(() => {
            // Ignore any errors during cleanup
          });
        }
      };
    }, [inView, isLoading]);

    const handleDelete = async () => {
      if (!user || user.uid !== post.user.id) return;

      try {
        // Delete video from storage
        const videoUrl = new URL(post.video.url);
        const videoPath = decodeURIComponent(videoUrl.pathname.split('/o/')[1].split('?')[0]);
        const videoRef = storageRef(storage, videoPath);
        await deleteObject(videoRef);

        // Delete post document
        await deleteDoc(doc(db, 'posts', post.id));

        // Refresh the page or update posts state
        window.location.reload();
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
      <div className="border-b border-zinc-800">
        {/* Post Header */}
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Avatar className="w-8 h-8">
              <AvatarImage src={post.user.avatar} />
              <AvatarFallback>{post.user.name[0]}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-white">{post.user.username}</p>
              <p className="text-xs text-zinc-400">{post.spot.location}</p>
            </div>
          </div>
          <span className="text-xs text-zinc-500">
            {formatTimestamp(post.timestamp)}
          </span>
        </div>

        {/* Video */}
        <div ref={ref} className="aspect-square bg-black relative">
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
            />
          )}
        </div>

        {/* Post Info with Kebab Menu */}
        <div className="p-4">
          {/* Likes and Kebab Menu on same line */}
          <div className="flex items-center justify-between -mb-1">
            <p className="text-sm font-medium text-white">{post.likes} Likes</p>
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
                  className="text-white hover:bg-zinc-800 cursor-pointer gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </DropdownMenuItem>
                
                {user && user.uid === post.user.id && (
                  <DropdownMenuItem 
                    onClick={handleDelete}
                    className="text-red-400 hover:bg-zinc-800 cursor-pointer gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Trick Info */}
          <p className="text-sm text-white">
            <span className="font-medium">{post.trick}</span>
            <span className="text-zinc-400"> at </span>
            <span className="font-medium">{post.spot.name}</span>
          </p>
        </div>
      </div>
    );
  };

  const handleFollow = async () => {
    if (!user || !profileData?.uid || isCurrentUser) return;

    try {
      const followingRef = doc(db, `users/${user.uid}/following`, profileData.uid);
      const followerRef = doc(db, `users/${profileData.uid}/followers`, user.uid);
      const currentUserRef = doc(db, 'users', user.uid);
      const targetUserRef = doc(db, 'users', profileData.uid);

      if (!isFollowing) {
        // Get current user's data from Firestore
        const currentUserDoc = await getDoc(currentUserRef);
        const currentUserData = currentUserDoc.data();

        // Follow
        const followData = {
          userId: profileData.uid,
          username: profileData.username,
          displayName: profileData.displayName,
          photoURL: profileData.photoURL,
          timestamp: Date.now()
        };

        const followerData = {
          userId: user.uid,
          username: currentUserData?.username || user.email?.split('@')[0],
          displayName: currentUserData?.displayName || user.displayName,
          photoURL: currentUserData?.photoURL || user.photoURL,
          timestamp: Date.now()
        };

        await Promise.all([
          setDoc(followingRef, followData),
          setDoc(followerRef, followerData),
          updateDoc(currentUserRef, {
            followingCount: (followStats.following || 0) + 1
          }),
          updateDoc(targetUserRef, {
            followersCount: (followStats.followers || 0) + 1
          })
        ]);
      } else {
        // Unfollow
        await Promise.all([
          deleteDoc(followingRef),
          deleteDoc(followerRef),
          updateDoc(currentUserRef, {
            followingCount: Math.max((followStats.following || 0) - 1, 0)
          }),
          updateDoc(targetUserRef, {
            followersCount: Math.max((followStats.followers || 0) - 1, 0)
          })
        ]);
      }

      setIsFollowing(!isFollowing);
    } catch (error) {
      console.error('Error updating follow status:', error);
    }
  };

  if (loading || !profileData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white"></div>
      </div>
    );
  }

  if (isEditing) {
    return <EditProfileView onBack={() => setIsEditing(false)} onProfileUpdate={handleProfileUpdate} />;
  }

  return (
    <div className="flex flex-col w-full h-[calc(100vh-121px)]">
      {/* Fixed Header Section */}
      <div className="flex-none">
        {/* Profile Header */}
        <div className="relative px-4 pt-4">
          <div className="flex justify-between items-start">
            <Avatar className="w-16 h-16 rounded-full">
              <AvatarImage
                src={profileData.photoURL || undefined}
                alt={profileData.displayName}
                className="object-cover"
              />
              <AvatarFallback className="text-lg">
                {profileData.displayName?.[0]?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            
            {isCurrentUser ? (
              <button 
                onClick={() => setIsEditing(true)}
                className={cn(
                  "px-4 py-1.5 rounded-full border border-zinc-700 text-white hover:bg-white/5",
                  "text-sm font-medium transition-colors",
                  oxanium.className
                )}
              >
                Edit profile
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button 
                  className={cn(
                    "w-8 h-8 rounded-full border border-zinc-700 flex items-center justify-center",
                    "text-white hover:bg-white/5 transition-colors"
                  )}
                >
                  <DollarSign className="w-4 h-4" />
                </button>
                <button 
                  className={cn(
                    "w-8 h-8 rounded-full border border-zinc-700 flex items-center justify-center",
                    "text-white hover:bg-white/5 transition-colors"
                  )}
                >
                  <MessageCircle className="w-4 h-4" />
                </button>
                <button 
                  onClick={handleFollow}
                  className={cn(
                    "px-5 py-1.5 rounded-full text-sm font-medium transition-colors",
                    oxanium.className,
                    isFollowing
                      ? "border border-zinc-700 text-white hover:bg-white/5"
                      : "bg-[#a3ff12] text-black hover:bg-[#b4ff3d]"
                  )}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
              </div>
            )}
          </div>

          {/* Profile Info */}
          <div className="mt-2">
            <h1 className={cn("text-lg font-bold text-white", oxanium.className)}>
              {profileData.displayName}
            </h1>
            {profileData.username && (
              <p className="text-sm text-zinc-400">@{profileData.username}</p>
            )}
          </div>

          {/* Stats */}
          <div className="flex gap-4 mt-2">
            <button 
              onClick={() => router.push(`/profile/${profileData.username}/following`)}
              className="text-white hover:underline"
            >
              <span className={cn("font-bold", oxanium.className)}>{followStats.following}</span>{' '}
              <span className={cn("text-zinc-500", oxanium.className)}>Following</span>
            </button>
            <button 
              onClick={() => router.push(`/profile/${profileData.username}/followers`)}
              className="text-white hover:underline"
            >
              <span className={cn("font-bold", oxanium.className)}>{followStats.followers}</span>{' '}
              <span className={cn("text-zinc-500", oxanium.className)}>Followers</span>
            </button>
          </div>
        </div>

        {/* Content Tabs */}
        <div className="px-4 mt-2">
          <div className="flex bg-zinc-900 rounded-full p-1">
            <button
              onClick={() => setActiveTab('videos')}
              className={cn(
                "flex-1 py-2 px-6 rounded-full text-base font-medium transition-colors",
                oxanium.className,
                activeTab === 'videos' 
                  ? 'bg-[#a3ff12] text-black' 
                  : 'text-white hover:text-[#a3ff12]'
              )}
            >
              Videos
            </button>
            <button
              onClick={() => setActiveTab('spots')}
              className={cn(
                "flex-1 py-2 px-6 rounded-full text-base font-medium transition-colors",
                oxanium.className,
                activeTab === 'spots' 
                  ? 'bg-[#a3ff12] text-black' 
                  : 'text-white hover:text-[#a3ff12]'
              )}
            >
              Spots
            </button>
          </div>
        </div>

        {/* Back Button - Only show when in feed view */}
        {activeTab === 'videos' && viewMode === 'feed' && (
          <div className="px-4 mt-2 pb-2">
            <button
              onClick={handleBackToGrid}
              className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors rounded-full hover:bg-zinc-900"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto min-h-0 py-4">
        {activeTab === 'videos' ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-3 gap-2 px-4">
              {loading ? (
                Array(6).fill(0).map((_, i) => (
                  <div
                    key={`loading-${i}`}
                    className="aspect-square bg-zinc-900 animate-pulse rounded-lg"
                  />
                ))
              ) : userVideos.length > 0 ? (
                userVideos.map((post) => (
                  <div
                    key={post.id}
                    onClick={() => handleThumbnailClick(post.id)}
                    className="cursor-pointer"
                  >
                    <VideoThumbnail videoUrl={post.video.url} />
                  </div>
                ))
              ) : (
                <div className="col-span-3 py-8 text-center text-zinc-400">
                  No videos yet
                </div>
              )}
            </div>
          ) : (
            <div className="max-w-[500px] mx-auto">
              {loading ? (
                Array(3).fill(0).map((_, i) => (
                  <div key={`loading-${i}`} className="border-b border-zinc-800">
                    <div className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-900 animate-pulse" />
                        <div className="space-y-2">
                          <div className="w-24 h-2.5 bg-zinc-900 animate-pulse rounded-full" />
                          <div className="w-16 h-2 bg-zinc-900/60 animate-pulse rounded-full" />
                        </div>
                      </div>
                    </div>
                    <div className="aspect-square bg-zinc-900 animate-pulse" />
                  </div>
                ))
              ) : (
                userVideos.map((post) => (
                  <VideoPost 
                    key={post.id}
                    post={post}
                  />
                ))
              )}
            </div>
          )
        ) : (
          <div className="grid grid-cols-3 gap-2 px-4">
            {loading ? (
              Array(6).fill(0).map((_, i) => (
                <div
                  key={`loading-${i}`}
                  className="aspect-square bg-zinc-900 animate-pulse rounded-lg"
                />
              ))
            ) : (
              <div className="col-span-3 py-8 text-center text-zinc-400">
                No spots yet
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 