'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/context/auth-context';
import { AvatarImage, Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { EditProfileView } from './EditProfileView';
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ChevronLeft, MoreHorizontal, Share2, Trash2 } from 'lucide-react';
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
import { deleteDoc, doc } from 'firebase/firestore';

const oxanium = Oxanium({ 
  subsets: ['latin'],
  variable: '--font-oxanium',
});

interface ProfileViewProps {
  isCurrentUser?: boolean;
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

export function ProfileView({ isCurrentUser = true }: ProfileViewProps): ReactElement {
  const { user } = useAuth();
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [userVideos, setUserVideos] = useState<VideoPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState({
    displayName: user?.displayName || 'Anonymous',
    photoURL: user?.photoURL || ''
  });

  // Fetch user's videos
  useEffect(() => {
    const fetchUserVideos = async () => {
      if (!user) return;

      try {
        const postsQuery = query(
          collection(db, 'posts'),
          where('user.id', '==', user.uid),
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
      } finally {
        setLoading(false);
      }
    };

    fetchUserVideos();
  }, [user]);

  const handleProfileUpdate = (updates: { displayName: string; photoURL: string }) => {
    setProfileData(updates);
  };

  const handleThumbnailClick = (videoId: string) => {
    setSelectedVideoId(videoId);
  };

  // Helper function to generate thumbnail from video URL
  const VideoThumbnail = ({ videoUrl }: { videoUrl: string }): ReactElement => {
    const [thumbnailUrl, setThumbnailUrl] = useState<string>('');
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
      const video = document.createElement('video');
      video.src = videoUrl;
      video.crossOrigin = 'anonymous';
      
      video.addEventListener('loadeddata', () => {
        video.currentTime = 0;
      });

      video.addEventListener('seeked', () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0);
        setThumbnailUrl(canvas.toDataURL());
      });
    }, [videoUrl]);

    return (
      <div className="aspect-square bg-zinc-900 relative rounded-lg overflow-hidden">
        {thumbnailUrl ? (
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

  const VideoPost = ({ post }: { post: VideoPost }) => {
    const { user } = useAuth();
    const videoRef = useRef<HTMLVideoElement>(null);
    const { ref, inView } = useInView({
      threshold: 0.7,
    });

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

    useEffect(() => {
      if (!videoRef.current) return;

      if (inView) {
        videoRef.current.play().catch(console.error);
      } else {
        videoRef.current.pause();
      }
    }, [inView]);

    return (
      <div>
        {/* Post Header */}
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Avatar className="w-8 h-8">
              <AvatarImage src={post.user.avatar} />
              <AvatarFallback>{post.user.name[0]}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{post.user.username}</p>
              <p className="text-xs text-zinc-400">{post.spot.location}</p>
            </div>
          </div>
          <span className="text-xs text-zinc-500">
            {formatTimestamp(post.timestamp)}
          </span>
        </div>

        {/* Video */}
        <div ref={ref} className="aspect-square bg-black relative">
          <video
            ref={videoRef}
            src={post.video.url}
            className="w-full h-full object-cover"
            loop
            muted
            playsInline
          />
        </div>

        {/* Post Info with Kebab Menu */}
        <div className="p-4">
          {/* Likes and Kebab Menu on same line */}
          <div className="flex items-center justify-between -mb-1">
            <p className="text-sm font-medium">{post.likes} Likes</p>
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
          <p className="text-sm">
            <span className="font-medium">{post.trick}</span>
            <span className="text-zinc-400"> at </span>
            <span className="font-medium">{post.spot.name}</span>
          </p>
        </div>
      </div>
    );
  };

  if (isEditing) {
    return <EditProfileView onBack={() => setIsEditing(false)} onProfileUpdate={handleProfileUpdate} />;
  }

  return (
    <div className="flex flex-col w-full h-full overflow-hidden">
      {/* Profile Header - Only show in grid view */}
      <div className="px-[18px] py-4 flex-none relative">
        <div className="flex items-center gap-4">
          <Avatar className="w-[72px] h-[72px]">
            <AvatarImage
              src={profileData.photoURL || undefined}
              alt={profileData.displayName}
            />
            <AvatarFallback className="text-lg text-white">
              {profileData.displayName[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <h2 className={cn("text-xl font-semibold mb-1 text-white", oxanium.className)}>
              {profileData.displayName}
            </h2>
            <div className="flex gap-4 text-[15px]">
              <div className="flex gap-1">
                <span className={cn("text-white", oxanium.className)}>1230</span>
                <span className="text-zinc-400">Followers</span>
              </div>
              <div className="flex gap-1">
                <span className={cn("text-white", oxanium.className)}>460</span>
                <span className="text-zinc-400">Following</span>
              </div>
            </div>
          </div>
        </div>

        {isCurrentUser && (
          <button 
            onClick={() => setIsEditing(true)}
            className={cn(
              "w-full mt-4 py-2 rounded-md bg-zinc-800 hover:bg-zinc-700 transition-colors text-sm font-medium text-white",
              oxanium.className
            )}
          >
            Edit profile
          </button>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-3 gap-0.5 px-[2px]">
          {loading ? (
            // Videos loading state
            Array(6).fill(0).map((_, i) => (
              <div
                key={`loading-${i}`}
                className="aspect-square bg-zinc-900 animate-pulse"
              />
            ))
          ) : userVideos.length > 0 ? (
            // Videos Grid
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
            // Empty videos state
            <div className="col-span-3 py-8 text-center text-zinc-400">
              No videos yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 