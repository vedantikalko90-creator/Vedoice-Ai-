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
  const chunks: GeneratedAudioChunk[] = [];
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


  for (const segment of scriptSegments) {
    if (segment.trim() === '') continue;

    const basePrompt = segment.trim();
    let effectivePrompt = basePrompt;
    
    // effectivePrompt is just basePrompt now, this is good.
    effectivePrompt = basePrompt;

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
      // For multi-speaker, the prompt itself needs to contain speaker labels.
      // The model then maps these to the provided voices.
      config.speechConfig.multiSpeakerVoiceConfig = {
        speakerVoiceConfigs: multiSpeakerConfigs.map(speaker => ({
          speaker: speaker.name,
          voiceConfig: { prebuiltVoiceConfig: { voiceName: speaker.voiceId } } as VoiceConfig,
        })),
      } as MultiSpeakerVoiceConfig;
    } else {
      // Fallback or error if speakerMode is not recognized or multi-speaker config is empty (should be caught by validation)
      // This branch should ideally not be hit with proper validation
      console.warn("Invalid speaker mode or missing speaker configuration for TTS generation.");
      config.speechConfig.voiceConfig = { prebuiltVoiceConfig: { voiceName: voiceId || 'Zephyr' } } as VoiceConfig; // Provide a default to avoid empty speechConfig
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
        chunks.push({ id: crypto.randomUUID(), text: segment.trim(), audioBuffer });
        if (onProgress) {
          onProgress(chunks.length, totalChunks); // Report progress after each chunk
        }
      }
    } catch (error: any) {
      console.error(`Error generating speech for segment "${segment.trim()}":`, error);
      throw error;
    }
  }
  return chunks;
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
  sendInputMessage: (message: string) => Promise<void>; // For sending text input to the live session
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

  const sendInputMessage = async (message: string) => {
    if (sessionPromise) {
      try {
        const session = await sessionPromise;
        // As per guidelines, `ai.models.generateContent` should be used for text answers without defining the model first.
        // However, for the Live API, `session.sendMessage` is used to send user text input within an active chat session.
        // The `Chat` interface correctly defines `sendMessage` method.
        await (session as any).sendMessage({ message }); 
      } catch (error) {
        console.error("Error sending message to live session:", error);
        throw error;
      }
    } else {
      console.warn("Live session not active. Cannot send message.");
    }
  };


  return { start, stop, sendInputMessage, session: sessionPromise, resetTranscription };
};