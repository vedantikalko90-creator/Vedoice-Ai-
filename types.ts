import { Modality, VoiceConfig } from "@google/genai";

export enum SpeakerMode {
  SINGLE = 'single',
  MULTI = 'multi',
  LIVE = 'live',
}

export interface VoiceOption {
  name: string;
  voiceId: string;
  gender: 'male' | 'female';
  lang: string;
}

export interface SpeakerConfig {
  name: string;
  voiceId: string;
}

export interface GeneratedAudioChunk {
  id: string;
  text: string;
  audioBuffer: AudioBuffer;
}

export interface LiveSpeakerTurn {
  id: string;
  speaker: 'user' | 'model';
  text: string;
}

// Re-export Modality for convenience
export { Modality };