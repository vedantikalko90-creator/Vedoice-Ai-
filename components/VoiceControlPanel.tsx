import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createLiveSessionManager, LiveSessionManager } from '../services/geminiService';
import { DEFAULT_SAMPLE_RATE, VOICE_OPTIONS, DEFAULT_VOICE_ID } from '../constants';
import { GeneratedAudioChunk, LiveSpeakerTurn, VoiceOption } from '../types';
import LoadingSpinner from './LoadingSpinner';

interface VoiceControlPanelProps {
  outputAudioContext: AudioContext;
  onTranscriptUpdate: (turns: LiveSpeakerTurn[]) => void;
}

const VoiceControlPanel: React.FC<VoiceControlPanelProps> = ({ outputAudioContext, onTranscriptUpdate }) => {
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [currentInputText, setCurrentInputText] = useState('');
  const [currentOutputText, setCurrentOutputText] = useState('');
  const [systemInstruction, setSystemInstruction] = useState('You are a friendly and helpful conversational AI.');
  const [selectedLiveVoice, setSelectedLiveVoice] = useState<VoiceOption>(VOICE_OPTIONS.find(v => v.voiceId === DEFAULT_VOICE_ID) || VOICE_OPTIONS[0]);

  const liveSessionManagerRef = useRef<LiveSessionManager | null>(null);
  const audioQueueRef = useRef<AudioBuffer[]>([]);
  const nextStartTimeRef = useRef<number>(0);
  const audioSourceNodesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  useEffect(() => {
    liveSessionManagerRef.current = createLiveSessionManager(outputAudioContext);
    return () => {
      liveSessionManagerRef.current?.stop();
      audioQueueRef.current = [];
      nextStartTimeRef.current = 0;
      audioSourceNodesRef.current.forEach(node => { try { node.stop(); node.disconnect(); } catch (e) { /* ignore */ } });
      audioSourceNodesRef.current.clear();
    };
  }, [outputAudioContext]);

  const playQueuedAudio = useCallback(() => {
    if (audioQueueRef.current.length === 0 || !isLiveActive) return;

    const buffer = audioQueueRef.current.shift();
    if (!buffer) return;

    const source = outputAudioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(outputAudioContext.destination);

    source.onended = () => {
      audioSourceNodesRef.current.delete(source);
      // Automatically play next if available, but only if we are the last one in the queue
      if (audioQueueRef.current.length > 0) {
          playQueuedAudio();
      }
    };

    nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContext.currentTime);
    source.start(nextStartTimeRef.current);
    nextStartTimeRef.current += buffer.duration;
    audioSourceNodesRef.current.add(source);

  }, [isLiveActive, outputAudioContext]);

  const handleLiveAudioChunk = useCallback((audioBuffer: AudioBuffer) => {
    audioQueueRef.current.push(audioBuffer);
    if (audioSourceNodesRef.current.size === 0 || outputAudioContext.currentTime >= nextStartTimeRef.current) {
        playQueuedAudio();
    }
  }, [outputAudioContext, playQueuedAudio]);

  const handleTranscriptionUpdate = useCallback((input: string, output: string) => {
    setCurrentInputText(input);
    setCurrentOutputText(output);
  }, []);

  const handleCompleteTurn = useCallback((turns: LiveSpeakerTurn[]) => {
    onTranscriptUpdate(turns);
    setCurrentInputText('');
    setCurrentOutputText('');
    audioQueueRef.current = []; // Clear audio queue on turn completion to avoid stale audio
    nextStartTimeRef.current = 0;
    audioSourceNodesRef.current.forEach(node => { try { node.stop(); node.disconnect(); } catch (e) { /* ignore */ } });
    audioSourceNodesRef.current.clear();
  }, [onTranscriptUpdate]);

  const handleLiveError = useCallback((error: Error) => {
    setLiveError(error.message);
    setIsLiveActive(false);
    setIsConnecting(false);
    console.error("Live session error:", error);
    // Explicitly stop the session on error to clean up resources
    liveSessionManagerRef.current?.stop();
  }, []);

  const handleLiveClose = useCallback(() => {
    setIsLiveActive(false);
    setIsConnecting(false);
    setCurrentInputText('');
    setCurrentOutputText('');
    setLiveError(null);
  }, []);

  const startLiveSession = useCallback(async () => {
    setIsConnecting(true);
    setLiveError(null);
    setCurrentInputText('');
    setCurrentOutputText('');
    onTranscriptUpdate([]); // Clear existing transcript
    audioQueueRef.current = [];
    nextStartTimeRef.current = 0;
    audioSourceNodesRef.current.forEach(node => { try { node.stop(); node.disconnect(); } catch (e) { /* ignore */ } });
    audioSourceNodesRef.current.clear();

    try {
      // The API key selection dialog via window.aistudio.openSelectKey() is specifically for
      // Veo video generation models. This model (gemini-2.5-flash-native-audio-preview-09-2025)
      // is not a Veo model. The API key is expected from process.env.API_KEY.
      // Removed the conditional check for hasSelectedApiKey and openSelectKey as per guidelines.
      await liveSessionManagerRef.current?.start(
        systemInstruction,
        selectedLiveVoice.voiceId,
        handleTranscriptionUpdate,
        handleCompleteTurn,
        handleLiveAudioChunk,
        handleLiveError,
        handleLiveClose
      );
      setIsLiveActive(true);
    } catch (err: any) {
      setLiveError(`Failed to start live session: ${err.message}`);
      setIsLiveActive(false);
      console.error("Error during live session start:", err);
      // Ensure session is stopped if an error occurs during initial start
      liveSessionManagerRef.current?.stop();
    } finally {
      setIsConnecting(false);
    }
  }, [
    systemInstruction,
    selectedLiveVoice,
    handleTranscriptionUpdate,
    handleCompleteTurn,
    handleLiveAudioChunk,
    handleLiveError,
    handleLiveClose,
    onTranscriptUpdate
  ]);

  const stopLiveSession = useCallback(() => {
    liveSessionManagerRef.current?.stop();
    setIsLiveActive(false);
    setLiveError(null);
    audioQueueRef.current = [];
    nextStartTimeRef.current = 0;
    audioSourceNodesRef.current.forEach(node => { try { node.stop(); node.disconnect(); } catch (e) { /* ignore */ } });
    audioSourceNodesRef.current.clear();
  }, []);

  return (
    <div className="bg-gray-800/40 border border-gray-700 rounded-xl shadow-xl backdrop-blur-sm p-6 space-y-4">
      <h2 className="text-2xl font-semibold text-white mb-4">Live Voice Control</h2>

      {/* System Instruction for Live */}
      <div>
        <label htmlFor="liveSystemInstruction" className="block text-gray-300 text-sm font-medium mb-1">System Instruction:</label>
        <textarea
          id="liveSystemInstruction"
          value={systemInstruction}
          onChange={(e) => setSystemInstruction(e.target.value)}
          rows={2}
          className="w-full p-2 bg-gray-700/60 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-75 transition duration-200 resize-y placeholder-gray-400"
          placeholder="e.g., You are a friendly customer support agent."
          disabled={isLiveActive || isConnecting}
        ></textarea>
        <p className="text-xs text-gray-400 mt-1">Sets the AI's persona for the live conversation.</p>
      </div>

      {/* Voice Selection for Live */}
      <div>
        <label htmlFor="liveVoice" className="block text-gray-300 text-sm font-medium mb-1">AI Voice:</label>
        <select
          id="liveVoice"
          value={selectedLiveVoice.voiceId}
          onChange={(e) => {
            const voice = VOICE_OPTIONS.find(v => v.voiceId === e.target.value);
            if (voice) setSelectedLiveVoice(voice);
          }}
          className="w-full p-2 bg-gray-700/60 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-75 transition duration-200"
          disabled={isLiveActive || isConnecting}
        >
          {VOICE_OPTIONS.map((voice) => (
            <option key={voice.voiceId} value={voice.voiceId}>
              {voice.name} ({voice.gender})
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={isLiveActive ? stopLiveSession : startLiveSession}
        disabled={isConnecting}
        className={`w-full py-3 px-4 rounded-lg font-semibold text-lg transition duration-300 shadow-md
          ${isLiveActive
            ? 'bg-red-600 hover:bg-red-700' // Changed stop button color for better UX
            : 'bg-green-600 hover:bg-green-700'} // Changed start button color for better UX
          ${isConnecting ? 'opacity-70 cursor-not-allowed' : ''}
        `}
      >
        {isConnecting ? (
          <span className="flex items-center justify-center space-x-2">
            <LoadingSpinner />
            <span>Connecting...</span>
          </span>
        ) : (
          <span>{isLiveActive ? 'Stop Voice Control' : 'Start Voice Control'}</span>
        )}
      </button>

      {liveError && (
        <div className="p-3 bg-red-800 border border-red-600 text-red-200 rounded-md text-sm">
          Error: {liveError}
        </div>
      )}

      {isLiveActive && (
        <div className="space-y-2 text-sm text-gray-300 bg-gray-700/50 p-3 rounded-md border border-gray-600 custom-scrollbar max-h-48 overflow-y-auto">
          <p className="font-medium text-gray-300">User Input:</p>
          <p className="pl-2 italic">{currentInputText || 'Listening...'}</p>
          <p className="font-medium text-gray-300 mt-2">AI Response:</p>
          <p className="pl-2">{currentOutputText || 'Thinking...'}</p>
        </div>
      )}
    </div>
  );
};

export default VoiceControlPanel;