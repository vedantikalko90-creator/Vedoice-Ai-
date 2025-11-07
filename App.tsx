import React, { useState, useEffect, useRef, useCallback } from 'react';
import Header from './components/Header';
import SettingsPanel from './components/SettingsPanel';
import AudioPlayer from './components/AudioPlayer';
import DownloadOptions from './components/DownloadOptions';
import VoiceControlPanel from './components/VoiceControlPanel';
import LoadingSpinner from './components/LoadingSpinner';
import { generateSpeech } from './services/geminiService';
import {
  DEFAULT_LANGUAGE_CODE,
  DEFAULT_VOICE_ID,
  NARRATION_STYLES,
  EMOTION_BLENDS,
  VOICE_OPTIONS,
  SAMPLE_SCRIPTS,
  DEFAULT_SAMPLE_RATE,
} from './constants';
import {
  SpeakerMode,
  VoiceOption,
  GeneratedAudioChunk,
  SpeakerConfig,
  LiveSpeakerTurn,
} from './types';

// The `window.aistudio` object is assumed to be globally available in the execution environment.
// No explicit interface declaration here to avoid potential conflicts if it's already declared
// globally by the environment or in a separate declaration file (e.g., global.d.ts).
// If TypeScript issues arise regarding `window.aistudio`, a global.d.ts file would be the
// appropriate place to declare it:
/*
  declare global {
    interface Window {
      aistudio?: {
        hasSelectedApiKey: () => Promise<boolean>;
        openSelectKey: () => Promise<void>;
      };
    }
  }
*/

const App: React.FC = () => {
  type ContentMode = 'storytelling' | 'poetry' | 'dialogue';
  const [contentMode, setContentMode] = useState<ContentMode>('storytelling');

  const [script, setScript] = useState<string>(''); // Initialized empty, will be set by loadSampleScript
  const [selectedLanguage, setSelectedLanguage] = useState<string>(DEFAULT_LANGUAGE_CODE);
  const [selectedVoice, setSelectedVoice] = useState<VoiceOption>(
    VOICE_OPTIONS.find((v) => v.voiceId === DEFAULT_VOICE_ID) || VOICE_OPTIONS[0]
  );
  const [narrationStyle, setNarrationStyle] = useState<string>(NARRATION_STYLES[0]);
  const [emotionBlend, setEmotionBlend] = useState<string>(EMOTION_BLENDS[0]);
  const [systemInstruction, setSystemInstruction] = useState<string>('');
  const [speechRate, setSpeechRate] = useState<number>(1.0); // New state for speech rate

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [generatedAudioChunks, setGeneratedAudioChunks] = useState<GeneratedAudioChunk[]>([]);
  const [currentPlaybackBuffer, setCurrentPlaybackBuffer] = useState<AudioBuffer | null>(null);
  const [currentPlaybackIndex, setCurrentPlaybackIndex] = useState<number>(0);

  const [speakerMode, setSpeakerMode] = useState<SpeakerMode>(SpeakerMode.SINGLE);
  const [multiSpeakerConfigs, setMultiSpeakerConfigs] = useState<SpeakerConfig[]>([
    { name: 'Speaker1', voiceId: VOICE_OPTIONS[0].voiceId },
    { name: 'Speaker2', voiceId: VOICE_OPTIONS[1].voiceId },
  ]);

  const [liveTranscriptionTurns, setLiveTranscriptionTurns] = useState<LiveSpeakerTurn[]>([]);
  const [generationProgress, setGenerationProgress] = useState<{ current: number; total: number } | null>(null);

  // Initialize AudioContext only once
  const audioContextRef = useRef<AudioContext | null>(null);
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext({
        sampleRate: DEFAULT_SAMPLE_RATE,
      });
    }
    return audioContextRef.current;
  }, []);

  // Helper to load sample script based on language and content mode
  const loadSampleScript = useCallback((lang: string, mode: ContentMode) => {
    const key = `${lang}-${mode}`;
    const defaultKey = `${DEFAULT_LANGUAGE_CODE}-${mode}`;
    if (SAMPLE_SCRIPTS[key]) {
      setScript(SAMPLE_SCRIPTS[key]);
    } else if (SAMPLE_SCRIPTS[defaultKey]) {
      setScript(SAMPLE_SCRIPTS[defaultKey]);
    } else {
      setScript(''); // Clear if no specific sample found
    }
  }, []);

  // Set initial script and resume audio context
  useEffect(() => {
    loadSampleScript(selectedLanguage, contentMode);

    const resumeAudio = () => {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume().catch((err) => console.error('Failed to resume AudioContext:', err));
      }
    };

    // Attach event listeners to resume audio context
    document.addEventListener('click', resumeAudio);
    document.addEventListener('keydown', resumeAudio);

    return () => {
      // Clean up event listeners and close AudioContext when component unmounts
      document.removeEventListener('click', resumeAudio);
      document.removeEventListener('keydown', resumeAudio);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch((err) => console.error('Failed to close AudioContext:', err));
        audioContextRef.current = null;
      }
    };
  }, [getAudioContext, loadSampleScript, selectedLanguage, contentMode]);


  // Update script when language or content mode changes
  useEffect(() => {
    loadSampleScript(selectedLanguage, contentMode);
  }, [selectedLanguage, contentMode, loadSampleScript]);


  const handleGenerateSpeech = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setGeneratedAudioChunks([]);
    setCurrentPlaybackBuffer(null);
    setCurrentPlaybackIndex(0);
    setGenerationProgress(null); // Reset progress at start

    // Input validation: Check if script is empty
    if (script.trim() === '') {
      setError("Script cannot be empty. Please enter some text.");
      setIsLoading(false);
      return;
    }

    const outputAudioContext = getAudioContext();
    if (!outputAudioContext) {
      setError("AudioContext not available.");
      setIsLoading(false);
      return;
    }

    try {
      // The API key selection dialog via window.aistudio.openSelectKey() is specifically for
      // Veo video generation models. This model (gemini-2.5-flash-preview-tts) is not a Veo model.
      // The API key is expected from process.env.API_KEY.
      // Removed the conditional check for hasSelectedApiKey and openSelectKey as per guidelines.
      const chunks = await generateSpeech(
        {
          script,
          voiceId: selectedVoice.voiceId,
          narrationStyle,
          emotionBlend,
          speakerMode,
          multiSpeakerConfigs,
          systemInstruction,
          speechRate, // Pass speech rate (note: not directly used by current TTS model, for future client-side use)
          onProgress: (current, total) => {
            setGenerationProgress({ current, total });
          },
        },
        outputAudioContext
      );
      setGeneratedAudioChunks(chunks);
      if (chunks.length > 0) {
        setCurrentPlaybackBuffer(chunks[0].audioBuffer);
      }
    } catch (err: any) {
      console.error('Speech generation error:', err);
      // More user-friendly error messages if the error is an API error
      const errorMessage = err.message || JSON.stringify(err);
      setError(`Failed to generate speech: ${errorMessage}. Please check your script and settings.`);
    } finally {
      setIsLoading(false);
      setGenerationProgress(null); // Clear progress on finish/error
    }
  }, [
    script,
    selectedVoice,
    narrationStyle,
    emotionBlend,
    speakerMode,
    multiSpeakerConfigs,
    systemInstruction,
    speechRate, // Add speechRate to dependencies
    getAudioContext,
  ]);

  const handlePlaybackEnded = useCallback(() => {
    const nextIndex = currentPlaybackIndex + 1;
    if (nextIndex < generatedAudioChunks.length) {
      setCurrentPlaybackIndex(nextIndex);
      setCurrentPlaybackBuffer(generatedAudioChunks[nextIndex].audioBuffer);
    } else {
      setCurrentPlaybackBuffer(null);
      setCurrentPlaybackIndex(0);
    }
  }, [currentPlaybackIndex, generatedAudioChunks]);

  const onLiveTranscriptUpdate = useCallback((turns: LiveSpeakerTurn[]) => {
    setLiveTranscriptionTurns(turns);
  }, []);

  const setContentModeAndLoadScript = useCallback((mode: ContentMode) => {
    setContentMode(mode);
    loadSampleScript(selectedLanguage, mode);
  }, [loadSampleScript, selectedLanguage]);


  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-950 to-gray-800 text-white font-sans">
      <Header />

      <main className="flex-grow container mx-auto p-4 md:p-8 flex flex-col lg:flex-row gap-8">
        {/* Left Panel: Script Input, Controls, Current Playback */}
        <section className="flex-1 flex flex-col gap-8">
          <div className="bg-gray-800/40 border border-gray-700 rounded-xl shadow-xl backdrop-blur-sm p-6 space-y-4">
            <h2 className="text-2xl font-semibold text-white mb-4">
              {speakerMode === SpeakerMode.LIVE ? 'Live Chat Transcript' : 'Script Input & Preview'}
            </h2>

            {speakerMode === SpeakerMode.LIVE ? (
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {liveTranscriptionTurns.length === 0 ? (
                  <p className="text-gray-400 italic">No conversation yet. Start the live session!</p>
                ) : (
                  liveTranscriptionTurns.map((turn, index) => (
                    <div
                      key={`${turn.speaker}-${index}`}
                      className={`p-3 rounded-lg border
                        ${turn.speaker === 'user' ? 'bg-gray-700/30 border-gray-600 self-end ml-auto text-right' : 'bg-gray-700/30 border-gray-600 self-start mr-auto text-left'}
                        max-w-[90%]
                      `}
                      aria-live="polite" // Announce content changes
                    >
                      <p className="font-semibold">{turn.speaker === 'user' ? 'You:' : 'AI:'}</p>
                      <p className="text-gray-200">{turn.text}</p>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <>
                {/* Content Mode Tabs */}
                <div className="flex bg-gray-700/60 rounded-lg p-1 mb-4 shadow-inner" role="tablist">
                  <button
                    onClick={() => setContentModeAndLoadScript('storytelling')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition duration-200
                      ${contentMode === 'storytelling' ? 'bg-gray-600 text-white shadow-md' : 'text-gray-300 hover:bg-gray-500/50'}
                    `}
                    role="tab"
                    aria-selected={contentMode === 'storytelling'}
                    id="tab-storytelling"
                    aria-controls="panel-storytelling"
                  >
                    Storytelling
                  </button>
                  <button
                    onClick={() => setContentModeAndLoadScript('poetry')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition duration-200
                      ${contentMode === 'poetry' ? 'bg-gray-600 text-white shadow-md' : 'text-gray-300 hover:bg-gray-500/50'}
                    `}
                    role="tab"
                    aria-selected={contentMode === 'poetry'}
                    id="tab-poetry"
                    aria-controls="panel-poetry"
                  >
                    Poetry Recital
                  </button>
                  <button
                    onClick={() => setContentModeAndLoadScript('dialogue')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition duration-200
                      ${contentMode === 'dialogue' ? 'bg-gray-600 text-white shadow-md' : 'text-gray-300 hover:bg-gray-500/50'}
                    `}
                    role="tab"
                    aria-selected={contentMode === 'dialogue'}
                    id="tab-dialogue"
                    aria-controls="panel-dialogue"
                  >
                    Dialogue
                  </button>
                </div>

                <div
                  role="tabpanel"
                  id={`panel-${contentMode}`}
                  aria-labelledby={`tab-${contentMode}`}
                >
                  <textarea
                    className="w-full p-4 bg-gray-700/60 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-75 transition duration-200 h-60 resize-y placeholder-gray-400"
                    placeholder="Enter your script here..."
                    value={script}
                    onChange={(e) => setScript(e.target.value)}
                    aria-label="Script input for speech generation"
                    aria-multiline="true"
                  ></textarea>
                </div>

                {error && (
                  <div className="p-4 bg-red-800 border border-red-600 text-red-200 rounded-lg" role="alert">
                    Error: {error}
                  </div>
                )}

                <button
                  onClick={handleGenerateSpeech}
                  disabled={isLoading || script.trim() === ''}
                  className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg text-lg disabled:opacity-50 transition duration-200 flex items-center justify-center space-x-2 shadow-md"
                  aria-busy={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center space-x-2">
                      <LoadingSpinner />
                      <span>
                        {generationProgress
                          ? `Generating audio... (${generationProgress.current} of ${generationProgress.total} chunks)`
                          : 'Initializing generation...'}
                      </span>
                    </span>
                  ) : (
                    <span>Generate Audio</span>
                  )}
                </button>

                {generatedAudioChunks.length > 0 && currentPlaybackBuffer && (
                  <div className="mt-4" aria-live="polite">
                    <h3 className="text-lg font-medium text-gray-300 mb-2">Current Playback ({currentPlaybackIndex + 1}/{generatedAudioChunks.length}):</h3>
                    <p className="text-sm text-gray-400 mb-3 italic">"{generatedAudioChunks[currentPlaybackIndex].text}"</p>
                    <AudioPlayer
                      audioBuffer={currentPlaybackBuffer}
                      outputAudioContext={getAudioContext()}
                      onPlaybackEnded={handlePlaybackEnded}
                      playbackRate={speechRate}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* Right Panel: Settings, Download, Voice Control */}
        <section className="lg:w-1/3 flex flex-col gap-8 sticky top-20 self-start">
          {speakerMode === SpeakerMode.LIVE ? (
            <VoiceControlPanel
              outputAudioContext={getAudioContext()}
              onTranscriptUpdate={onLiveTranscriptUpdate}
            />
          ) : (
            <>
              <SettingsPanel
                selectedLanguage={selectedLanguage}
                setSelectedLanguage={setSelectedLanguage}
                selectedVoice={selectedVoice}
                setSelectedVoice={setSelectedVoice}
                narrationStyle={narrationStyle}
                setNarrationStyle={setNarrationStyle}
                emotionBlend={emotionBlend}
                setEmotionBlend={setEmotionBlend}
                outputAudioContext={getAudioContext()}
                speakerMode={speakerMode}
                setSpeakerMode={setSpeakerMode}
                multiSpeakerConfigs={multiSpeakerConfigs}
                setMultiSpeakerConfigs={setMultiSpeakerConfigs}
                systemInstruction={systemInstruction}
                setSystemInstruction={setSystemInstruction}
                speechRate={speechRate} // Pass speechRate
                setSpeechRate={setSpeechRate} // Pass setSpeechRate
              />
              <DownloadOptions
                generatedAudioChunks={generatedAudioChunks}
                outputAudioContext={getAudioContext()}
              />
            </>
          )}
        </section>
      </main>
    </div>
  );
};

export default App;