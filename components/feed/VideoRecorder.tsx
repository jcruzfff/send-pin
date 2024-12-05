'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { X, RotateCcw, Zap } from 'lucide-react';

interface VideoRecorderProps {
  onClose: () => void;
  onVideoRecorded: (videoBlob: Blob) => void;
}

export function VideoRecorder({ onClose, onVideoRecorded }: VideoRecorderProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout>();

  const startCamera = useCallback(async () => {
    try {
      const viewportHeight = window.innerHeight;
      const constraints = {
        video: {
          facingMode: 'environment',
          height: { ideal: viewportHeight - 140 },
          aspectRatio: 9/16,
        },
        audio: true
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      if (videoRef.current) {
        videoRef.current.style.backgroundColor = '#000';
      }
    }
  }, []);

  const startRecording = useCallback(() => {
    if (!streamRef.current) return;
    setPreviewUrl(null);

    chunksRef.current = [];
    const mediaRecorder = new MediaRecorder(streamRef.current);
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const videoBlob = new Blob(chunksRef.current, { type: 'video/mp4' });
      const url = URL.createObjectURL(videoBlob);
      setPreviewUrl(url);
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.src = url;
        videoRef.current.play();
      }
    };

    mediaRecorder.start();
    mediaRecorderRef.current = mediaRecorder;
    setIsRecording(true);

    const startTime = Date.now();
    const maxDuration = 60000;
    progressIntervalRef.current = setInterval(() => {
      const progress = Math.min((Date.now() - startTime) / maxDuration, 1);
      setRecordingProgress(progress);
      if (progress >= 1) {
        stopRecording();
      }
    }, 100);
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    }
  }, [isRecording]);

  const acceptRecording = useCallback(() => {
    if (chunksRef.current.length > 0) {
      const videoBlob = new Blob(chunksRef.current, { type: 'video/mp4' });
      onVideoRecorded(videoBlob);
    }
  }, [onVideoRecorded]);

  const flipCamera = useCallback(async () => {
    if (streamRef.current && !previewUrl) {
      streamRef.current.getTracks().forEach(track => track.stop());
      const currentFacingMode = streamRef.current
        .getVideoTracks()[0]
        .getSettings().facingMode;

      const newFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
      
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: newFacingMode,
          aspectRatio: 9/16,
        },
        audio: true
      });

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        streamRef.current = newStream;
      }
    }
  }, [previewUrl]);

  const resetRecorder = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    
    setRecordingProgress(0);
    
    chunksRef.current = [];
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.src = '';
    }
    
    startCamera();
  }, [previewUrl, startCamera]);

  const handleClose = useCallback(() => {
    if (previewUrl) {
      resetRecorder();
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      onClose();
    }
  }, [previewUrl, onClose, resetRecorder]);

  const handleLibraryAccess = useCallback(async () => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'video/*';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const url = URL.createObjectURL(file);
          setPreviewUrl(url);
          
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
          }
          if (videoRef.current) {
            videoRef.current.srcObject = null;
            videoRef.current.src = url;
            videoRef.current.play();
          }
          
          chunksRef.current = [file];
        }
      };
      input.click();
    } catch (error) {
      console.error('Error accessing library:', error);
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (streamRef.current) {
        const track = streamRef.current.getVideoTracks()[0];
        const viewportHeight = window.innerHeight;
        track.applyConstraints({
          height: { ideal: viewportHeight - 140 }
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex flex-col h-[100dvh] bg-black">
      <div className="bg-black border-b border-zinc-800">
        <div className="flex items-center justify-between px-4 h-[65px]">
          <button
            onClick={handleClose}
            className="text-white hover:text-zinc-300 transition-colors"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-medium text-white">New post</h1>
          <div className="w-6" />
        </div>
      </div>

      <div className="relative flex-1">
        {!previewUrl && (
          <div className="absolute top-2 left-4 right-4 z-10">
            <div className="h-1 bg-zinc-800/80 rounded-full overflow-hidden">
              <div 
                className="h-full bg-red-500 transition-all duration-100"
                style={{ width: `${recordingProgress * 100}%` }}
              />
            </div>
          </div>
        )}

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          loop={!!previewUrl}
          className="absolute inset-0 w-full h-full object-cover bg-black"
        />
        
        {previewUrl && (
          <button
            onClick={resetRecorder}
            className="absolute left-4 top-4 w-10 h-10 rounded-full bg-zinc-900/80 flex items-center justify-center"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        )}
        
        {!previewUrl && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-4 bg-zinc-900/50 p-2 rounded-full">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={flipCamera}
            >
              <RotateCcw className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
            >
              <Zap className="h-5 w-5" />
            </Button>
          </div>
        )}

        {!previewUrl ? (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-12">
            <button
              onClick={handleLibraryAccess}
              className="w-14 h-14 rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800"
            >
              <div className="w-full h-full bg-zinc-800" />
            </button>

            <button
              className="w-20 h-20 rounded-full flex items-center justify-center bg-zinc-900/50 border-4 border-white"
              onPointerDown={startRecording}
              onPointerUp={stopRecording}
              onPointerLeave={stopRecording}
            >
              <div className={`w-16 h-16 rounded-full transition-colors ${
                isRecording ? 'bg-red-500' : 'bg-transparent'
              }`} />
            </button>

            <div className="w-14 h-14" />
          </div>
        ) : (
          <button
            onClick={acceptRecording}
            className="absolute right-4 bottom-8 w-10 h-10 rounded-full bg-white flex items-center justify-center"
          >
            <svg 
              viewBox="0 0 24 24" 
              className="w-5 h-5 text-black"
              fill="none" 
              stroke="currentColor" 
              strokeWidth="3"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
} 