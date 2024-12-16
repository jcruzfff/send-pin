'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/auth-context';
import { Oxanium } from 'next/font/google';
import { cn } from '@/lib/utils';
import { doc, updateDoc } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { Camera } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Image from 'next/image';

const oxanium = Oxanium({ 
  subsets: ['latin'],
  weight: ['500'],
  variable: '--font-oxanium',
});

export default function SetupPage() {
  const { user } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user, router]);

  const handleUsernameChange = (value: string) => {
    // Remove spaces and special characters, convert to lowercase
    const formattedUsername = value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(formattedUsername);
    setUsernameAvailable(false);
    setError('');
  };

  const handleContinue = async () => {
    if (!displayName.trim() || !username.trim()) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      // Update user profile in Firestore
      if (user) {
        await updateDoc(doc(db, 'users', user.uid), {
          displayName: displayName.trim(),
          username: username.trim(),
          setupComplete: false, // Will be set to true after image step
        });
        setStep(2);
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageSelect = async (file: File) => {
    try {
      // Create preview URL
      const preview = URL.createObjectURL(file);
      setPreviewUrl(preview);
      setSelectedImage(file);
    } catch (error) {
      console.error('Error handling image:', error);
      setError('Error selecting image. Please try again.');
    }
  };

  const handleSkip = async () => {
    try {
      if (user) {
        await updateDoc(doc(db, 'users', user.uid), {
          setupComplete: true,
        });
      }
      router.push('/');
    } catch (error) {
      setError('An error occurred. Please try again.');
    }
  };

  const handleNext = async () => {
    if (!selectedImage) {
      router.push('/');
      return;
    }

    setIsUploading(true);
    try {
      // Upload image to Firebase Storage
      const storageRef = ref(storage, `profile-images/${user?.uid}-${Date.now()}`);
      await uploadBytes(storageRef, selectedImage);
      const downloadUrl = await getDownloadURL(storageRef);

      // Update user profile with image URL
      if (user) {
        await updateDoc(doc(db, 'users', user.uid), {
          photoURL: downloadUrl,
          setupComplete: true,
        });
      }
      router.push('/');
    } catch (error) {
      console.error('Error uploading image:', error);
      setError('Error uploading image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  if (step === 1) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="flex flex-col min-h-screen">
          {/* Icon */}
          <div className="flex justify-center mt-12">
            <Image
              src="/icons/profile-setup-icon.svg"
              alt="Profile Setup"
              width={48}
              height={48}
            />
          </div>

          {/* Content */}
          <div className="px-8 mt-12">
            <h1 className={cn(
              "text-[32px] font-medium",
              oxanium.className
            )}>
              Create your account
            </h1>

            <div className="mt-12 space-y-8">
              <div>
                <label className={cn("block text-1xl mb-4", oxanium.className)}>Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Display name"
                  className="w-full px-4 py-3 rounded-full text-sm bg-black text-white placeholder:text-zinc-400 border border-zinc-800 focus:outline-none focus:ring-1 focus:ring-white/20 focus:bg-zinc-900/30 transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className={cn("block text-1xl mb-4", oxanium.className)}>Username</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    placeholder="username"
                    className="w-full pl-8 pr-4 py-3 rounded-full text-sm bg-black text-white placeholder:text-zinc-400 border border-zinc-800 focus:outline-none focus:ring-1 focus:ring-white/20 focus:bg-zinc-900/30 transition-colors"
                  />
                </div>
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-sm text-center mt-4">{error}</p>
            )}
          </div>

          {/* Button */}
          <div className="fixed bottom-8 left-0 right-0 px-8">
            <button
              onClick={handleContinue}
              disabled={isLoading || !displayName || !username}
              className={cn(
                "w-full rounded-full py-3 font-medium transition-all duration-200",
                displayName && username
                  ? "bg-[#B2FF4D] text-black hover:bg-[#9FE646]"
                  : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
              )}
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="flex flex-col min-h-screen">
        {/* Icon */}
        <div className="flex justify-center mt-12">
          <Image
            src="/icons/profile-setup-icon.svg"
            alt="Profile Setup"
            width={48}
            height={48}
          />
        </div>

        {/* Content */}
        <div className="px-8 mt-12">
          <h1 className={cn(
            "text-[32px] font-medium",
            oxanium.className
          )}>
            Pick a profile picture
          </h1>
          <p className="text-[15px] text-zinc-400 mt-3">
            Please choose your favorite picture
          </p>

          <div className="flex justify-center mt-16">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-32 h-32 rounded-full bg-zinc-800 flex items-center justify-center hover:bg-zinc-700 transition-colors relative overflow-hidden"
            >
              {previewUrl ? (
                <>
                  <img 
                    src={previewUrl} 
                    alt="Profile preview" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 transition-opacity hover:opacity-100">
                    <Camera className="w-12 h-12 text-white" />
                  </div>
                </>
              ) : (
                <Camera className="w-12 h-12 text-zinc-400" />
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageSelect(file);
                }}
              />
            </button>
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center mt-4">{error}</p>
          )}
        </div>

        {/* Buttons */}
        <div className="fixed bottom-8 left-0 right-0 px-8 space-y-4">
          <button
            onClick={handleNext}
            disabled={isUploading}
            className={cn(
              "w-full rounded-full py-3 font-medium transition-all duration-200",
              selectedImage && !isUploading
                ? "bg-[#B2FF4D] text-black hover:bg-[#9FE646]"
                : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
            )}
          >
            {isUploading ? 'Uploading...' : 'Next'}
          </button>

          <button
            onClick={handleSkip}
            disabled={isUploading}
            className="w-full text-zinc-400 hover:text-white transition-colors disabled:text-zinc-600"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
} 