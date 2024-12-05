"use client"

import { useRef, useState, useEffect } from "react";
import { ImageIcon } from "lucide-react";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

interface ImageUploadProps {
  onImageUploaded: (url: string) => void;
  initialImage?: string;
}

export function ImageUpload({ onImageUploaded, initialImage }: ImageUploadProps) {
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
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        serverResponse: error.serverResponse,
        stack: error.stack
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div 
      onClick={() => fileInputRef.current?.click()}
      className="relative w-24 h-24 bg-muted rounded-md overflow-hidden cursor-pointer 
                 hover:opacity-90 transition-opacity"
    >
      {previewUrl ? (
        <img 
          src={previewUrl} 
          alt="Spot preview" 
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <ImageIcon className="h-8 w-8 text-muted-foreground" />
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