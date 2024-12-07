"use client"

import { useRef, useState, useEffect } from "react";
import { ImageIcon } from "lucide-react";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  onImageUploaded: (url: string) => void;
  initialImage?: string;
  className?: string;
}

export function ImageUpload({ onImageUploaded, initialImage, className }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(initialImage);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update preview when initialImage changes
  useEffect(() => {
    setPreviewUrl(initialImage);
  }, [initialImage]);

  const handleImageChange = async (file: File) => {
    try {
      setIsUploading(true);
      console.log('Starting upload for file:', file.name);
      console.log('Storage bucket:', storage.app.options.storageBucket);
      
      // Create storage reference
      const storageRef = ref(storage, `spot-images/${Date.now()}-${file.name}`);
      console.log('Storage reference:', storageRef.fullPath);
      
      // Upload to Firebase Storage
      console.log('Attempting upload...');
      const snapshot = await uploadBytes(storageRef, file);
      console.log('Upload successful:', snapshot);
      
      // Get the download URL
      const downloadUrl = await getDownloadURL(storageRef);
      console.log('Download URL:', downloadUrl);
      
      setPreviewUrl(downloadUrl);
      onImageUploaded(downloadUrl);
    } catch (error) {
      console.error('Error uploading image:', error);
      
      // Type guard for FirebaseError or Error
      if (error && typeof error === 'object') {
        const errorDetails: Record<string, unknown> = {};
        
        // Check for common error properties
        if ('code' in error) errorDetails.code = error.code;
        if ('message' in error) errorDetails.message = error.message;
        if ('serverResponse' in error) errorDetails.serverResponse = error.serverResponse;
        if ('stack' in error) errorDetails.stack = error.stack;
        
        console.error('Error details:', errorDetails);
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div 
      onClick={() => fileInputRef.current?.click()}
      className={cn(
        "relative w-24 h-24 bg-zinc-600/50 rounded-2xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity",
        className
      )}
    >
      {previewUrl ? (
        <img 
          src={previewUrl} 
          alt="Spot preview" 
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <ImageIcon className="h-8 w-8 text-zinc-400" />
        </div>
      )}
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImageChange(file);
        }}
      />
      
      {isUploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
} 