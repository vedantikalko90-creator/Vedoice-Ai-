import {
  Chat,
  FunctionDeclaration,
  GoogleGenAI,
  LiveServerMessage,
  Modality,
  SpeechConfig,
  MultiSpeakerVoiceConfig,
  VoiceConfig,
} from '@google/genai';
import {
  decode,
  decodeAudioData,
  encode,
  createPcmBlob,
} from '../utils/audioUtils';
import { INPUT_SAMPLE_RATE, DEFAULT_SAMPLE_RATE } from '../constants';
import { GeneratedAudioChunk, LiveSpeakerTurn, SpeakerConfig } from '../types';

interface GenerateSpeechOptions {
  script: string;
  voiceId: string;
  narrationStyle: string;
  emotionBlend: string;
  speakerMode: 'single' | 'multi';
  multiSpeakerConfigs?: SpeakerConfig[];
  systemInstruction?: string;
  speechRate: number; // Added speech rate
  onProgress?: (processedChunks: number, totalChunks: number) => void;
}

// Function to safely instantiate GoogleGenAI
const getGenAI = () => {
  if (!process.env.API_KEY || process.env.API_KEY.trim() === '') {
    const errorMsg = "API_KEY is not set or is empty. Please ensure it's available as an environment variable.";
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export async function generateSpeech(
  options: GenerateSpeechOptions,
  outputAudioContext: AudioContext
): Promise<GeneratedAudioChunk[]> {
  const { script, voiceId, narrationStyle, emotionBlend, speakerMode, multiSpeakerConfigs, systemInstruction, speechRate, onProgress } = options;
  const ai = getGenAI();
  const scriptSegments = script.split(/(\r?\n\r?\n|\. |\? |! |。|？|！)/).filter(s => s.trim() !== '');

  const totalChunks = scriptSegments.length;
  if (onProgress) {
    onProgress(0, totalChunks); // Report initial progress
  }

  // Multi-speaker mode validation
  if (speakerMode === 'multi') {
    const validSpeakerConfigs = multiSpeakerConfigs?.filter(s => s.name.trim() !== '' && s.voiceId.trim() !== '') || [];
    if (validSpeakerConfigs.length === 0) {
      throw new Error("Multi-speaker mode requires at least one speaker with a defined name and voice.");
    }
  }

  let processedCount = 0; // Keep track of successfully processed chunks for progress reporting

  const segmentPromises = scriptSegments.map(async (segment, originalIndex) => {
    if (segment.trim() === '') {
      processedCount++; // Increment even for empty segments to ensure progress matches totalChunks
      if (onProgress) {
        onProgress(processedCount, totalChunks);
      }
      return { originalIndex, chunk: null };
    }

    const effectivePrompt = segment.trim();
    
    const config: {
      responseModalities: Modality[];
      speechConfig: SpeechConfig;
    } = {
      responseModalities: [Modality.AUDIO],
      speechConfig: {}, 
    };

    if (speakerMode === 'single') {
      config.speechConfig.voiceConfig = { prebuiltVoiceConfig: { voiceName: voiceId } } as VoiceConfig;
    } else if (speakerMode === 'multi' && multiSpeakerConfigs && multiSpeakerConfigs.length > 0) {
      config.speechConfig.multiSpeakerVoiceConfig = {
        speakerVoiceConfigs: multiSpeakerConfigs.map(speaker => ({
          speaker: speaker.name,
          voiceConfig: { prebuiltVoiceConfig: { voiceName: speaker.voiceId } } as VoiceConfig,
        })),
      } as MultiSpeakerVoiceConfig;
    } else {
      console.warn("Invalid speaker mode or missing speaker configuration for TTS generation. Falling back to default voice.");
      config.speechConfig.voiceConfig = { prebuiltVoiceConfig: { voiceName: voiceId || 'Zephyr' } } as VoiceConfig;
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: [{ parts: [{ text: effectivePrompt }] }],
        config,
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const audioBuffer = await decodeAudioData(
          decode(base64Audio),
          outputAudioContext,
          DEFAULT_SAMPLE_RATE,
          1
        );
        processedCount++;
        if (onProgress) {
          onProgress(processedCount, totalChunks); // Report progress after each chunk is ready
        }
        return { originalIndex, chunk: { id: crypto.randomUUID(), text: segment.trim(), audioBuffer } };
      } else {
        processedCount++;
        if (onProgress) {
          onProgress(processedCount, totalChunks);
        }
        return { originalIndex, chunk: null }; // No audio data received
      }
    } catch (error: any) {
      console.error(`Error generating speech for segment "${segment.trim()}":`, error);
      processedCount++; // Still increment count even if an error occurred for this segment
      if (onProgress) {
        onProgress(processedCount, totalChunks);
      }
      throw error; // Re-throw to propagate the error and stop Promise.all
    }
  });

  const results = await Promise.all(segmentPromises);

  // Filter out null chunks and sort them by their original index to maintain the script's order
  const orderedChunks = results
    .filter(res => res.chunk !== null)
    .sort((a, b) => a.originalIndex - b.originalIndex)
    .map(res => res.chunk as GeneratedAudioChunk);

  return orderedChunks;
}

export interface LiveSessionManager {
  start: (
    systemInstruction: string,
    voiceId: string,
    onTranscriptionUpdate: (input: string, output: string) => void,
    onCompleteTurn: (turn: LiveSpeakerTurn[]) => void,
    onAudioChunk: (audioBuffer: AudioBuffer) => void,
    onError: (error: Error) => void,
    onClose: () => void
  ) => Promise<void>;
  stop: () => void;
  session: Promise<Chat> | null;
  resetTranscription: () => void;
}

export const createLiveSessionManager = (
  audioContext: AudioContext
): LiveSessionManager => {
  let sessionPromise: Promise<Chat> | null = null;
  let mediaStream: MediaStream | null = null;
  let scriptProcessorNode: ScriptProcessorNode | null = null;
  let currentInputTranscription: string = '';
  let currentOutputTranscription: string = '';
  let accumulatedTurns: LiveSpeakerTurn[] = [];

  const resetTranscription = () => {
    currentInputTranscription = '';
    currentOutputTranscription = '';
    accumulatedTurns = [];
  };

  const stop = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      mediaStream = null;
    }
    if (scriptProcessorNode) {
      scriptProcessorNode.disconnect();
      scriptProcessorNode = null;
    }
    // Correctly close the session if it exists and has a close method
    if (sessionPromise) {
      sessionPromise.then((session: any) => {
        if (session && typeof session.close === 'function') {
          session.close();
        }
      }).catch(error => console.error("Error closing live session:", error));
      sessionPromise = null;
    }
    resetTranscription();
  };

  const start = async (
    systemInstruction: string,
    voiceId: string,
    onTranscriptionUpdate: (input: string, output: string) => void,
    onCompleteTurn: (turn: LiveSpeakerTurn[]) => void,
    onAudioChunk: (audioBuffer: AudioBuffer) => void,
    onError: (error: Error) => void,
    onClose: () => void
  ) => {
    stop(); // Ensure any previous session is stopped
    resetTranscription();

    const ai = getGenAI();

    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = audioContext.createMediaStreamSource(mediaStream);
      scriptProcessorNode = audioContext.createScriptProcessor(4096, 1, 1);

      sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            console.log('Gemini Live session opened.');
            scriptProcessorNode!.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const pcmBlob = createPcmBlob(inputData);
              // CRITICAL: Solely rely on sessionPromise resolves and then call `session.sendRealtimeInput`, **do not** add other condition checks.
              sessionPromise!.then((session: any) => { // Cast to 'any' for sendRealtimeInput
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            source.connect(scriptProcessorNode!);
            scriptProcessorNode!.connect(audioContext.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.outputTranscription) {
              currentOutputTranscription += message.serverContent.outputTranscription.text;
              onTranscriptionUpdate(currentInputTranscription, currentOutputTranscription);
            }
            if (message.serverContent?.inputTranscription) {
              currentInputTranscription += message.serverContent.inputTranscription.text;
              onTranscriptionUpdate(currentInputTranscription, currentOutputTranscription);
            }

            if (message.serverContent?.turnComplete) {
              const fullInput = currentInputTranscription;
              const fullOutput = currentOutputTranscription;
              if (fullInput) {
                accumulatedTurns.push({ id: crypto.randomUUID(), speaker: 'user', text: fullInput });
              }
              if (fullOutput) {
                accumulatedTurns.push({ id: crypto.randomUUID(), speaker: 'model', text: fullOutput });
              }
              onCompleteTurn([...accumulatedTurns]); // Pass a copy
              currentInputTranscription = '';
              currentOutputTranscription = '';
            }

            const base64EncodedAudioString = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64EncodedAudioString) {
              try {
                const audioBuffer = await decodeAudioData(
                  decode(base64EncodedAudioString),
                  audioContext,
                  DEFAULT_SAMPLE_RATE,
                  1
                );
                onAudioChunk(audioBuffer);
              } catch (audioDecodeError) {
                console.error("Error decoding audio data from Live API:", audioDecodeError);
                onError(audioDecodeError as Error);
              }
            }
          },
          onerror: (e: ErrorEvent) => {
            console.error('Gemini Live error:', e.error);
            onError(e.error);
            stop(); // Stop session on error
          },
          onclose: (e: CloseEvent) => {
            console.log('Gemini Live session closed:', e.code, e.reason);
            onClose();
            stop(); // Ensure resources are cleaned up on close
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceId } },
          },
          systemInstruction: systemInstruction,
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        },
      }) as Promise<Chat>; // Live.connect returns LiveChatSession, which implements Chat.

    } catch (error: any) {
      console.error('Error starting Gemini Live session:', error);
      onError(error);
      stop(); // Stop session on error
    }
  };

  return { start, stop, session: sessionPromise, resetTranscription };
};