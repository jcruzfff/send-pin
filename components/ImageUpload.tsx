"use client"

import { useState, useRef } from 'react';
import { Camera, Upload } from 'lucide-react';
import { storage } from '@/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface ImageUploadProps {
  onImageUploaded: (url: string) => void;
}

export function ImageUpload({ onImageUploaded }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileUpload = async (file: File) => {
    try {
      setIsUploading(true);
      
      // Create a reference to the storage location
      const storageRef = ref(storage, `spot-images/${Date.now()}-${file.name}`);
      
      // Upload the file
      await uploadBytes(storageRef, file);
      
      // Get the download URL
      const downloadURL = await getDownloadURL(storageRef);
      
      onImageUploaded(downloadURL);
    } catch (error) {
      console.error('Error uploading image:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCameraCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      // Here you would typically open a modal with the camera stream
      // For now, we'll just close the stream
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      console.error('Error accessing camera:', error);
    }
  };

  return (
    <div className="relative w-24 h-24 bg-muted rounded-md overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center gap-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-2 rounded-full bg-background/80 hover:bg-background/90 transition-colors"
          disabled={isUploading}
        >
          <Upload size={18} />
        </button>
        <button
          onClick={handleCameraCapture}
          className="p-2 rounded-full bg-background/80 hover:bg-background/90 transition-colors"
          disabled={isUploading}
        >
          <Camera size={18} />
        </button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file);
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