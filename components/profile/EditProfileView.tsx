'use client';

import { useState, useCallback, useEffect } from 'react';
import { Camera, ChevronLeft } from 'lucide-react';
import { useAuth } from '@/lib/context/auth-context';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { db, storage } from '@/lib/firebase';
import { doc, setDoc, updateDoc, collection, query, where, getDocs, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';
import { toast } from 'sonner';
import { Oxanium } from 'next/font/google';

const oxanium = Oxanium({ 
  subsets: ['latin'],
  variable: '--font-oxanium',
});

interface EditProfileViewProps {
  onBack: () => void;
  onProfileUpdate: (updates: { displayName: string; photoURL: string; username: string }) => void;
}

export function EditProfileView({ onBack, onProfileUpdate }: EditProfileViewProps) {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isChanged, setIsChanged] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Load user data from Firestore
  useEffect(() => {
    const loadUserData = async () => {
      if (!user) return;
      
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setDisplayName(data.displayName || '');
          setUsername(data.username || '');
          setPreviewUrl(data.photoURL || null);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        toast.error('Failed to load profile data');
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, [user]);

  const handleImageChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setIsChanged(true);
    }
  }, []);

  const handleDisplayNameChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setDisplayName(event.target.value);
    setIsChanged(true);
  }, []);

  const handleUsernameChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(value);
    setUsernameError('');
    setIsChanged(true);
  }, []);

  const validateUsername = useCallback(async (username: string) => {
    if (!username) return 'Username is required';
    if (username.length < 3) return 'Username must be at least 3 characters';
    if (username.length > 20) return 'Username must be less than 20 characters';
    if (!/^[a-z0-9_]+$/.test(username)) return 'Username can only contain letters, numbers, and underscores';
    
    // Check if username is already taken
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '==', username));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty && snapshot.docs[0].id !== user?.uid) {
      return 'Username is already taken';
    }
    
    return '';
  }, [user?.uid]);

  const handleSave = async () => {
    if (!user) return;
    
    try {
      // Validate username first
      const usernameValidationError = await validateUsername(username);
      if (usernameValidationError) {
        setUsernameError(usernameValidationError);
        return;
      }

      setIsSaving(true);
      let photoURL = previewUrl;

      // Upload new profile image if changed
      if (imageFile) {
        const imageRef = ref(storage, `profile-images/${user.uid}`);
        await uploadBytes(imageRef, imageFile);
        photoURL = await getDownloadURL(imageRef);
      }

      const updates: { displayName?: string; photoURL?: string } = {};
      
      // Only include fields that have values
      if (displayName.trim()) {
        updates.displayName = displayName.trim();
      }
      if (photoURL) {
        updates.photoURL = photoURL;
      }

      // Only update auth profile if there are changes
      if (Object.keys(updates).length > 0) {
        await updateProfile(user, updates);
      }

      // Update Firestore document
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        ...(displayName.trim() ? { displayName: displayName.trim() } : {}),
        ...(username.trim() ? { username: username.trim() } : {}),
        ...(photoURL ? { photoURL } : {}),
        email: user.email,
        updatedAt: Date.now()
      }, { merge: true });

      // Update parent component
      onProfileUpdate({ 
        displayName: displayName.trim() || user.email?.split('@')[0] || 'Anonymous User',
        username: username.trim(),
        photoURL: photoURL || '' 
      });
      
      toast.success('Profile updated successfully');
      onBack();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#a3ff12] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/50 backdrop-blur-sm">
        <div className="flex items-center h-[65px] px-[18px]">
          <button
            onClick={onBack}
            className="p-0 -ml-2 hover:bg-white/10 rounded-full transition-colors text-white"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-2">
        {/* User Image Section */}
        <div className="mb-4">
          <h2 className={cn("text-1xl text-white mb-4", oxanium.className)}>User image</h2>
          
          <div className="relative w-24 h-24">
            <Avatar className="w-full h-full bg-zinc-800">
              <AvatarImage
                src={previewUrl || undefined}
                alt="Profile"
              />
              <AvatarFallback className="text-lg">
                {displayName?.[0]?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            
            <label
              htmlFor="profile-image"
              className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full cursor-pointer"
            >
              <Camera className="w-8 h-8 text-white" />
              <input
                type="file"
                id="profile-image"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
                disabled={isSaving}
              />
            </label>
          </div>
        </div>

        {/* Display Name Section */}
        <div className="mb-4">
          <h2 className={cn("text-1xl text-white mb-4", oxanium.className)}>Display Name</h2>
          <input
            type="text"
            value={displayName}
            onChange={handleDisplayNameChange}
            placeholder="Display name"
            className="w-full px-4 py-3 rounded-full text-sm bg-black 
                     text-white placeholder:text-zinc-400
                     border border-zinc-800 
                     focus:outline-none focus:ring-1 focus:ring-white/20
                     focus:bg-zinc-900/30 transition-colors"
            disabled={isSaving}
          />
        </div>

        {/* Username Section */}
        <div className="mb-4">
          <h2 className={cn("text-1xl text-white mb-4", oxanium.className)}>User name</h2>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">@</span>
            <input
              type="text"
              value={username}
              onChange={handleUsernameChange}
              placeholder="username"
              className={cn(
                "w-full pl-8 pr-4 py-3 rounded-full text-sm bg-black",
                "text-white placeholder:text-zinc-400",
                "border border-zinc-800",
                "focus:outline-none focus:ring-1 focus:ring-white/20",
                "focus:bg-zinc-900/30 transition-colors",
                usernameError && "border-red-500 focus:ring-red-500/20"
              )}
              disabled={isSaving}
            />
          </div>
          {usernameError && (
            <p className="mt-2 text-red-500 text-sm">{usernameError}</p>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="fixed bottom-[72px] left-0 right-0 p-4">
        <button
          onClick={handleSave}
          disabled={!isChanged || isSaving}
          className={cn(
            "w-full py-3 rounded-full font-medium text-black relative",
            isChanged && !isSaving && !usernameError
              ? "bg-[#a3ff12] hover:bg-[#92e610] transition-colors" 
              : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
          )}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
} 