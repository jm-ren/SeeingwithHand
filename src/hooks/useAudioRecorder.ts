import { useRef, useState, useCallback } from 'react';

export function useAudioRecorder() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const start = useCallback(async () => {
    if (isRecording) return;
    
    console.log('[AudioRecorder] Starting audio recording...');
    setAudioUrl(null);
    setAudioBlob(null);
    chunksRef.current = [];
    
    try {
      // Check if MediaRecorder is supported
      if (!window.MediaRecorder) {
        throw new Error('MediaRecorder is not supported in this browser');
      }
      
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia is not supported in this browser');
      }
      
      console.log('[AudioRecorder] Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      console.log('[AudioRecorder] Microphone access granted, creating MediaRecorder...');
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (e) => {
        console.log('[AudioRecorder] Data available:', e.data.size, 'bytes');
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        console.log('[AudioRecorder] Recording stopped, total chunks:', chunksRef.current.length);
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        console.log('[AudioRecorder] Audio blob created:', blob.size, 'bytes');
        // Stop all tracks to release microphone access
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };
      
      mediaRecorder.onerror = (e) => {
        console.error('[AudioRecorder] MediaRecorder error:', e);
      };
      
      mediaRecorder.start();
      console.log('[AudioRecorder] Recording started successfully');
      setIsRecording(true);
      setIsPaused(false);
    } catch (err: any) {
      console.error('[AudioRecorder] Error starting recording:', err);
      let errorMessage = 'Could not start audio recording.';
      
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Microphone access denied. Please allow microphone access and try again.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No microphone found. Please connect a microphone and try again.';
      } else if (err.name === 'NotSupportedError') {
        errorMessage = 'Audio recording is not supported in this browser.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      alert(errorMessage);
    }
  }, [isRecording]);

  const pause = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
    }
  }, []);

  const resume = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
    }
  }, []);

  const stop = useCallback(() => {
    console.log('[AudioRecorder] Stopping audio recording...');
    console.log('[AudioRecorder] MediaRecorder state:', mediaRecorderRef.current?.state);
    
    if (mediaRecorderRef.current && (mediaRecorderRef.current.state === 'recording' || mediaRecorderRef.current.state === 'paused')) {
      mediaRecorderRef.current.stop();
      console.log('[AudioRecorder] MediaRecorder.stop() called');
      setIsRecording(false);
      setIsPaused(false);
    }
    
    // Also stop tracks immediately in case onstop doesn't fire
    if (streamRef.current) {
      console.log('[AudioRecorder] Stopping stream tracks...');
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  return {
    isRecording,
    isPaused,
    audioUrl,
    audioBlob,
    start,
    pause,
    resume,
    stop,
  };
} 