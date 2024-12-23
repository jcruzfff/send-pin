'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { X, RotateCcw, Zap } from 'lucide-react';
import { Oxanium } from 'next/font/google';
import { cn } from '@/lib/utils';

const oxanium = Oxanium({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-oxanium',
});

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
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const progressIntervalRef = useRef<NodeJS.Timeout>();

  const startCamera = useCallback(async () => {
    console.log('Starting camera...');
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      console.log('Available video devices:', videoDevices);
      
      const backCamera = videoDevices.find(device => 
        device.label.toLowerCase().includes('back') || 
        device.label.toLowerCase().includes('environment')
      );
      console.log('Selected camera:', backCamera?.label || 'default');

      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const aspectRatio = 9/16;

      const constraints: MediaStreamConstraints = {
        audio: true,
        video: {
          deviceId: backCamera?.deviceId ? { exact: backCamera.deviceId } : undefined,
          facingMode: backCamera ? 'environment' : 'user',
          width: { ideal: Math.min(1920, viewportWidth * window.devicePixelRatio) },
          height: { ideal: Math.min(1080, viewportHeight * window.devicePixelRatio) },
          aspectRatio: { ideal: aspectRatio },
          frameRate: { ideal: 30, max: 60 }
        }
      };

      console.log('Requesting media with constraints:', constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('Stream obtained:', stream.getTracks());
      
      if (videoRef.current) {
        console.log('Setting up video element with stream');
        videoRef.current.srcObject = stream;
        videoRef.current.playsInline = true;
        videoRef.current.autoplay = true;
        videoRef.current.muted = true;
        streamRef.current = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
    }
  }, []);

  const stopRecording = useCallback(() => {
    console.log('Stopping recording...');
    if (!mediaRecorderRef.current || !isRecording) {
      console.log('No active recording to stop');
      return;
    }
    
    setIsRecording(false);
    if (progressIntervalRef.current) {
      console.log('Clearing progress interval');
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = undefined;
    }

    console.log('Stopping MediaRecorder');
    mediaRecorderRef.current.stop();
    // Don't reset recording time here, let it show the final duration
  }, [isRecording]);

  const startRecording = useCallback(() => {
    console.log('Starting recording...');
    if (!streamRef.current) {
      console.log('No stream available');
      return;
    }

    // Reset state
    setRecordedBlob(null);
    setIsPreviewMode(false);
    setRecordingTime(0);
    chunksRef.current = [];

    const options: MediaRecorderOptions = {
      mimeType: 'video/webm;codecs=h264,opus',
      videoBitsPerSecond: 2500000,
      audioBitsPerSecond: 128000
    };

    try {
      console.log('Creating MediaRecorder with options:', options);
      const mediaRecorder = new MediaRecorder(streamRef.current, options);
      
      mediaRecorder.ondataavailable = (event) => {
        console.log('Data available:', event.data.size, 'bytes');
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        console.log('MediaRecorder stopped, processing chunks...');
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        console.log('Created video blob:', blob.size, 'bytes');
        setRecordedBlob(blob);
        setIsPreviewMode(true);

        // Switch video source to recorded blob
        if (videoRef.current) {
          console.log('Setting up video preview');
          const url = URL.createObjectURL(blob);
          videoRef.current.srcObject = null;
          videoRef.current.src = url;
          videoRef.current.play().catch(error => {
            console.error('Error playing preview:', error);
          });
        }
      };

      mediaRecorder.start(1000); // Collect data every second
      console.log('MediaRecorder started');
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);

      const startTime = Date.now();
      const maxDuration = 60000; // 60 seconds
      console.log('Starting progress interval');
      progressIntervalRef.current = setInterval(() => {
        const progress = Math.min((Date.now() - startTime) / maxDuration, 1);
        setRecordingTime(progress);
        if (progress >= 1) {
          console.log('Max duration reached');
          stopRecording();
        }
      }, 100);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  }, [stopRecording]);

  const acceptRecording = useCallback(() => {
    console.log('Accepting recording');
    if (recordedBlob) {
      console.log('Sending recorded blob:', recordedBlob.size, 'bytes');
      onVideoRecorded(recordedBlob);
    } else {
      console.log('No recorded blob available');
    }
  }, [recordedBlob, onVideoRecorded]);

  const resetRecording = useCallback(() => {
    console.log('Resetting recording...');
    if (videoRef.current) {
      videoRef.current.pause();
      if (videoRef.current.src) {
        console.log('Revoking preview URL');
        URL.revokeObjectURL(videoRef.current.src);
      }
    }
    
    setRecordedBlob(null);
    setIsPreviewMode(false);
    setRecordingTime(0);
    chunksRef.current = [];
    
    console.log('Restarting camera');
    startCamera();
  }, [startCamera]);

  const flipCamera = useCallback(async () => {
    if (streamRef.current && !isPreviewMode) {
      streamRef.current.getTracks().forEach(track => track.stop());
      const currentFacingMode = streamRef.current
        .getVideoTracks()[0]
        .getSettings().facingMode;

      const newFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
      
      try {
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
      } catch (error) {
        console.error('Error flipping camera:', error);
      }
    }
  }, [isPreviewMode]);

  const handleClose = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (videoRef.current?.src) {
      URL.revokeObjectURL(videoRef.current.src);
    }
    onClose();
  }, [onClose]);

  useEffect(() => {
    console.log('Component mounted, starting camera');
    startCamera();
    return () => {
      console.log('Component unmounting, cleaning up');
      if (streamRef.current) {
        console.log('Stopping camera tracks');
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (progressIntervalRef.current) {
        console.log('Clearing progress interval');
        clearInterval(progressIntervalRef.current);
      }
      if (videoRef.current?.src) {
        console.log('Revoking video URL');
        URL.revokeObjectURL(videoRef.current.src);
      }
    };
  }, [startCamera]);

  return (
    <div className="flex flex-col h-[100dvh] bg-black">
      {!isPreviewMode && (
        <div className="bg-black border-b border-zinc-800">
          <div className="flex items-center justify-between px-4 h-[65px]">
            <button
              onClick={handleClose}
              className="text-white hover:text-zinc-300 transition-colors"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <h1 className={cn("text-lg font-medium text-white", oxanium.className)}>New post</h1>
            <div className="w-6" />
          </div>
        </div>
      )}

      <div className={cn(
        "relative flex-1",
        isPreviewMode && "h-[100dvh]"
      )}>
        {!isPreviewMode && (
          <div className="absolute top-2 left-4 right-4 z-10">
            <div className="h-1 bg-zinc-800/80 rounded-full overflow-hidden">
              <div 
                className="h-full bg-red-500 transition-all duration-100"
                style={{ width: `${recordingTime * 100}%` }}
              />
            </div>
          </div>
        )}

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          loop={isPreviewMode}
          className="absolute inset-0 w-full h-full object-cover bg-black"
        />
        
        {!isPreviewMode && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-4 bg-zinc-900/50 p-2 rounded-full">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full text-white hover:text-black hover:bg-white"
              onClick={flipCamera}
            >
              <RotateCcw className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full text-white hover:text-black hover:bg-white"
            >
              <Zap className="h-5 w-5" />
            </Button>
          </div>
        )}

        {isPreviewMode ? (
          <>
            <button
              onClick={resetRecording}
              className="absolute left-4 top-4 w-10 h-10 rounded-full bg-zinc-900/80 flex items-center justify-center"
            >
              <X className="w-6 h-6 text-white" />
            </button>

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
          </>
        ) : (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-12">
            <div className="w-14 h-14" />

            <button
              className="w-20 h-20 rounded-full flex items-center justify-center bg-zinc-900/50 border-4 border-white"
              onClick={isRecording ? stopRecording : startRecording}
            >
              <div className={`w-16 h-16 rounded-full transition-colors ${
                isRecording ? 'bg-red-500' : 'bg-transparent'
              }`} />
            </button>

            <div className="w-14 h-14" />
          </div>
        )}
      </div>
    </div>
  );
} 