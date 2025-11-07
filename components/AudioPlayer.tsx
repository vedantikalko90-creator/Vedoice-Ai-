import React, { useState, useEffect, useRef, useCallback } from 'react';

interface AudioPlayerProps {
  audioBuffer: AudioBuffer | null;
  outputAudioContext: AudioContext;
  onPlaybackEnded?: () => void;
  playbackRate: number; // New prop for playback rate
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioBuffer,
  outputAudioContext,
  onPlaybackEnded,
  playbackRate, // Destructure new prop
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 1
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const offsetRef = useRef<number>(0);

  const stopPlayback = useCallback(() => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    setIsPlaying(false);
    setProgress(0);
    offsetRef.current = 0;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    onPlaybackEnded?.();
  }, [onPlaybackEnded]);

  const updateProgress = useCallback(() => {
    if (!isPlaying || !audioBuffer) return;

    const elapsed = (outputAudioContext.currentTime - startTimeRef.current + offsetRef.current) * playbackRate;
    const newProgress = elapsed / audioBuffer.duration;
    setProgress(Math.min(newProgress, 1));

    if (newProgress >= 1) {
      stopPlayback();
    } else {
      animationFrameRef.current = requestAnimationFrame(updateProgress);
    }
  }, [isPlaying, audioBuffer, outputAudioContext, stopPlayback, playbackRate]);

  const startPlayback = useCallback((buffer: AudioBuffer, startOffset: number) => {
    stopPlayback(); // Stop any currently playing audio

    const source = outputAudioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(outputAudioContext.destination);
    source.onended = () => {
      // If the main audio ends, check if all other sounds have also ended or are loopable
      // For simplicity, we just stop all when main audio finishes
      if (sourceNodeRef.current === source) {
         stopPlayback();
      }
    };
    source.playbackRate.value = playbackRate; // Apply playback rate here
    source.start(0, startOffset / playbackRate); // Adjust start offset for playback rate
    sourceNodeRef.current = source;
    
    startTimeRef.current = outputAudioContext.currentTime;
    offsetRef.current = startOffset;
    setIsPlaying(true);
    animationFrameRef.current = requestAnimationFrame(updateProgress);
  }, [outputAudioContext, stopPlayback, updateProgress, playbackRate]);

  const handlePlayPause = useCallback(() => {
    if (!audioBuffer) return;

    if (isPlaying) {
      offsetRef.current += (outputAudioContext.currentTime - startTimeRef.current) * playbackRate;
      stopPlayback();
    } else {
      startPlayback(audioBuffer, offsetRef.current);
    }
  }, [isPlaying, audioBuffer, outputAudioContext, startPlayback, stopPlayback, playbackRate]);

  useEffect(() => {
    // Stop and reset when a new audioBuffer is provided or component unmounts
    stopPlayback();
    return () => stopPlayback();
  }, [audioBuffer, stopPlayback, playbackRate]); // Add playbackRate to dependencies

  const duration = audioBuffer?.duration || 0;
  // Calculate current time based on playback rate for display
  const currentTime = (duration * progress) / playbackRate;
  const actualDuration = duration / playbackRate;


  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center space-x-4 bg-gray-700/30 border border-gray-600 p-3 rounded-xl shadow-inner">
      <button
        onClick={handlePlayPause}
        disabled={!audioBuffer}
        className="p-3 rounded-full bg-gray-600 hover:bg-gray-400 disabled:opacity-50 transition duration-200 shadow-md"
      >
        {isPlaying ? (
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
          </svg>
        )}
      </button>

      <div className="flex-grow">
        <div className="w-full bg-gray-600 rounded-full h-2.5">
          <div
            className="bg-gray-400 h-2.5 rounded-full shadow-lg"
            style={{ width: `${progress * 100}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-xs mt-1.5 text-gray-300 font-mono">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(actualDuration)}</span>
        </div>
      </div>

      <button
        onClick={stopPlayback}
        disabled={!audioBuffer || !isPlaying}
        className="p-3 rounded-full bg-gray-600 hover:bg-gray-400 disabled:opacity-50 transition duration-200 shadow-md"
      >
        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );
};

export default AudioPlayer;