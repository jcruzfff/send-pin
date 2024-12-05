'use client';

import { useState, useCallback } from 'react';
import { Camera, ChevronLeft } from 'lucide-react';
import { useAuth } from '@/lib/context/auth-context';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { db, storage } from '@/lib/firebase';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';
import { toast } from 'sonner';

interface EditProfileViewProps {
  onBack: () => void;
  onProfileUpdate: (updates: { displayName: string; photoURL: string }) => void;
}

export function EditProfileView({ onBack, onProfileUpdate }: EditProfileViewProps) {
  const { user } = useAuth();
  const [username, setUsername] = useState(user?.displayName || '');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(user?.photoURL || null);
  const [isChanged, setIsChanged] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleImageChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setIsChanged(true);
    }
  }, []);

  const handleUsernameChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(event.target.value);
    setIsChanged(true);
  }, []);

  const handleSave = async () => {
    if (!user || !isChanged) return;
    
    try {
      setIsSaving(true);
      let photoURL = user.photoURL;

      // Upload new profile image if changed
      if (imageFile) {
        const imageRef = ref(storage, `profile-images/${user.uid}`);
        await uploadBytes(imageRef, imageFile);
        photoURL = await getDownloadURL(imageRef);
      }

      // Update Firebase Auth profile
      await updateProfile(user, {
        displayName: username,
        photoURL: photoURL
      });

      // Update or create user document in Firestore
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        displayName: username,
        photoURL: photoURL,
        email: user.email,
        updatedAt: Date.now()
      }, { merge: true });

      // Update parent component
      onProfileUpdate({ displayName: username, photoURL: photoURL || '' });
      
      toast.success('Profile updated successfully');
      onBack();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-full bg-black">
      {/* Back Button */}
      <div className="px-4 py-4">
        <button
          onClick={onBack}
          className="text-zinc-400 hover:text-white transition-colors"
          disabled={isSaving}
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      </div>

      <div className="px-4">
        {/* User Image Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-2">User image</h2>
          <p className="text-zinc-400 text-base mb-6">Choose your account image</p>
          
          <div className="relative w-24 h-24">
            <Avatar className="w-full h-full bg-zinc-800">
              <AvatarImage
                src={previewUrl || undefined}
                alt="Profile"
              />
              <AvatarFallback className="text-lg">
                {user?.email?.[0].toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            
            <label 
              htmlFor="profile-image"
              className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full cursor-pointer"
            >
              <Camera className="w-8 h-8 text-white" />
            </label>
            <input
              type="file"
              id="profile-image"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
              disabled={isSaving}
            />
          </div>
        </div>

        {/* Username Section - Updated input styling */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-2">User name</h2>
          <p className="text-zinc-400 text-base mb-6">Choose a user name</p>
          
          <input
            type="text"
            value={username}
            onChange={handleUsernameChange}
            placeholder="Enter username"
            className="w-full px-4 py-3 rounded-full bg-zinc-900/50 
                     text-white placeholder:text-zinc-400
                     border border-zinc-800 
                     focus:outline-none focus:ring-1 focus:ring-zinc-700"
            disabled={isSaving}
          />
        </div>
      </div>

      {/* Save Button */}
      <div className="fixed bottom-[72px] left-0 right-0 p-4">
        <button
          onClick={handleSave}
          disabled={!isChanged || isSaving}
          className={cn(
            "w-full py-3 rounded-full font-medium text-black relative",
            isChanged && !isSaving
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