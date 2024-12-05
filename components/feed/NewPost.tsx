'use client';

import { useState } from 'react';
import { VideoRecorder } from './VideoRecorder';

export function NewPost() {
  const [isRecording, setIsRecording] = useState(true);

  const handleVideoRecorded = async (videoBlob: Blob) => {
    // Here you would typically:
    // 1. Upload the video to storage
    // 2. Create a new post document
    // 3. Navigate to the post preview/edit screen
    console.log('Video recorded:', videoBlob);
  };

  if (!isRecording) return null;

  return (
    <VideoRecorder
      onClose={() => setIsRecording(false)}
      onVideoRecorded={handleVideoRecorded}
    />
  );
} 