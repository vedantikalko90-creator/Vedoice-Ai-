import React, { useCallback } from 'react';
import { NARRATION_STYLES, EMOTION_BLENDS, VOICE_OPTIONS, SAMPLE_SCRIPTS, DEFAULT_LANGUAGE_CODE } from '../constants';
import { SpeakerMode, VoiceOption, SpeakerConfig } from '../types';
import { fileToAudioBuffer } from '../utils/audioUtils';

interface SettingsPanelProps {
  selectedLanguage: string;
  setSelectedLanguage: (lang: string) => void;
  selectedVoice: VoiceOption;
  setSelectedVoice: (voice: VoiceOption) => void;
  narrationStyle: string;
  setNarrationStyle: (style: string) => void;
  emotionBlend: string;
  setEmotionBlend: (emotion: string) => void;
  outputAudioContext: AudioContext;
  speakerMode: SpeakerMode;
  setSpeakerMode: (mode: SpeakerMode) => void;
  multiSpeakerConfigs: SpeakerConfig[];
  setMultiSpeakerConfigs: (configs: SpeakerConfig[]) => void;
  systemInstruction: string;
  setSystemInstruction: (instruction: string) => void;
  speechRate: number; // New prop for speech rate
  setSpeechRate: (rate: number) => void; // New prop for setting speech rate
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  selectedLanguage,
  setSelectedLanguage,
  selectedVoice,
  setSelectedVoice,
  narrationStyle,
  setNarrationStyle,
  emotionBlend,
  setEmotionBlend,
  outputAudioContext,
  speakerMode,
  setSpeakerMode,
  multiSpeakerConfigs,
  setMultiSpeakerConfigs,
  systemInstruction,
  setSystemInstruction,
  speechRate, // Destructure new prop
  setSpeechRate, // Destructure new prop
}) => {
  const handleSpeakerConfigChange = useCallback((index: number, field: keyof SpeakerConfig, value: string) => {
    setMultiSpeakerConfigs(prev => {
      const newConfigs = [...prev];
      if (!newConfigs[index]) {
        newConfigs[index] = { name: `Speaker${index + 1}`, voiceId: VOICE_OPTIONS[0].voiceId };
      }
      (newConfigs[index] as any)[field] = value; // Type assertion as field is dynamic
      return newConfigs;
    });
  }, [setMultiSpeakerConfigs]);

  const addSpeaker = useCallback(() => {
    setMultiSpeakerConfigs(prev => [
      ...prev,
      { name: `Speaker${prev.length + 1}`, voiceId: VOICE_OPTIONS[0].voiceId }
    ]);
  }, [setMultiSpeakerConfigs]);

  const removeSpeaker = useCallback((index: number) => {
    setMultiSpeakerConfigs(prev => prev.filter((_, i) => i !== index));
  }, [setMultiSpeakerConfigs]);

  const handleLanguageChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value;
    setSelectedLanguage(newLang);
    // Script loading logic is now handled in App.tsx based on contentMode
  }, [setSelectedLanguage]);

  const availableVoices = VOICE_OPTIONS.filter(v => v.lang === selectedLanguage || v.lang === DEFAULT_LANGUAGE_CODE);

  return (
    <div className="p-6 bg-gray-800/40 border border-gray-700 rounded-xl shadow-xl backdrop-blur-sm space-y-6">
      <h2 className="text-2xl font-semibold text-white mb-4">Settings</h2>

      {/* Speaker Mode Selection */}
      <div className="flex flex-col gap-2">
        <label className="text-gray-300 font-medium">Speaker Mode:</label>
        <div className="flex gap-4">
          <label className="inline-flex items-center text-white cursor-pointer">
            <input
              type="radio"
              className="form-radio text-gray-400 bg-gray-700 border-gray-600 focus:ring-gray-400"
              name="speakerMode"
              value={SpeakerMode.SINGLE}
              checked={speakerMode === SpeakerMode.SINGLE}
              onChange={() => setSpeakerMode(SpeakerMode.SINGLE)}
            />
            <span className="ml-2">Single Speaker</span>
          </label>
          <label className="inline-flex items-center text-white cursor-pointer">
            <input
              type="radio"
              className="form-radio text-gray-400 bg-gray-700 border-gray-600 focus:ring-gray-400"
              name="speakerMode"
              value={SpeakerMode.MULTI}
              checked={speakerMode === SpeakerMode.MULTI}
              onChange={() => setSpeakerMode(SpeakerMode.MULTI)}
            />
            <span className="ml-2">Multi-Speaker</span>
          </label>
          <label className="inline-flex items-center text-white cursor-pointer">
            <input
              type="radio"
              className="form-radio text-gray-400 bg-gray-700 border-gray-600 focus:ring-gray-400"
              name="speakerMode"
              value={SpeakerMode.LIVE}
              checked={speakerMode === SpeakerMode.LIVE}
              onChange={() => setSpeakerMode(SpeakerMode.LIVE)}
            />
            <span className="ml-2">Live Voice Control</span>
          </label>
        </div>
      </div>

      {speakerMode === SpeakerMode.SINGLE && (
        <>
          {/* Language Selection */}
          <div>
            <label htmlFor="language" className="block text-gray-300 text-sm font-medium mb-1">Language:</label>
            <select
              id="language"
              value={selectedLanguage}
              onChange={handleLanguageChange}
              className="w-full p-2 bg-gray-700/60 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-75 transition duration-200"
            >
              <option value={DEFAULT_LANGUAGE_CODE}>English (US)</option>
              <option value="en-IN">English (Indian Accented)</option>
              <option value="hi-IN">Hindi (India)</option>
              <option value="ta-IN">Tamil (India)</option>
              <option value="kn-IN">Kannada (India)</option>
              <option value="bn-IN">Bengali (India)</option>
              <option value="pa-IN">Punjabi (India)</option>
              {/* Add more languages as needed */}
            </select>
          </div>

          {/* Voice Selection */}
          <div>
            <label htmlFor="voice" className="block text-gray-300 text-sm font-medium mb-1">Voice:</label>
            <select
              id="voice"
              value={selectedVoice.voiceId}
              onChange={(e) => {
                const voice = VOICE_OPTIONS.find(v => v.voiceId === e.target.value);
                if (voice) setSelectedVoice(voice);
              }}
              className="w-full p-2 bg-gray-700/60 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-75 transition duration-200"
            >
              {availableVoices.map((voice) => (
                <option key={voice.voiceId} value={voice.voiceId}>
                  {voice.name} ({voice.gender})
                </option>
              ))}
            </select>
          </div>

          {/* Narration Style */}
          <div>
            <label htmlFor="narrationStyle" className="block text-gray-300 text-sm font-medium mb-1">Narration Style (guides script writing):</label>
            <select
              id="narrationStyle"
              value={narrationStyle}
              onChange={(e) => setNarrationStyle(e.target.value)}
              className="w-full p-2 bg-gray-700/60 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-75 transition duration-200"
            >
              {NARRATION_STYLES.map((style) => (
                <option key={style} value={style}>
                  {style}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">This helps you craft your script with a desired tone.</p>
          </div>

          {/* Emotion Blend */}
          <div>
            <label htmlFor="emotionBlend" className="block text-gray-300 text-sm font-medium mb-1">Emotion Blend (guides script writing):</label>
            <select
              id="emotionBlend"
              value={emotionBlend}
              onChange={(e) => setEmotionBlend(e.target.value)}
              className="w-full p-2 bg-gray-700/60 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-75 transition duration-200"
            >
              {EMOTION_BLENDS.map((emotion) => (
                <option key={emotion} value={emotion}>
                  {emotion}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">Further helps you refine the emotional tone of your script.</p>
          </div>

          {/* Speech Rate Slider */}
          <div>
            <label htmlFor="speechRate" className="block text-gray-300 text-sm font-medium mb-1">
              Speech Rate: <span className="font-mono text-gray-200">{speechRate.toFixed(1)}x</span>
            </label>
            <input
              type="range"
              id="speechRate"
              min="0.5"
              max="2.0"
              step="0.1"
              value={speechRate}
              onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gray-700/60 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-75 transition duration-200
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gray-400 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:hover:bg-gray-300
                [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-gray-400 [&::-moz-range-thumb]:shadow-lg [&::-moz-range-thumb]:hover:bg-gray-300
              "
            />
            <p className="text-xs text-gray-400 mt-1">Adjusts the playback speed of the generated audio client-side (0.5x to 2.0x).</p>
          </div>
        </>
      )}

      {speakerMode === SpeakerMode.MULTI && (
        <div className="space-y-4">
          <p className="text-gray-300">
            For multi-speaker mode, format your script like: <code className="bg-gray-700 p-1 rounded">Speaker1: Hello. Speaker2: Hi there.</code>
          </p>
          {multiSpeakerConfigs.map((speaker, index) => (
            <div key={index} className="flex items-center gap-2 bg-gray-700/30 border border-gray-600 p-3 rounded-md shadow-sm">
              <input
                type="text"
                placeholder={`Speaker ${index + 1} Name`}
                value={speaker.name}
                onChange={(e) => handleSpeakerConfigChange(index, 'name', e.target.value)}
                className="flex-grow p-2 bg-gray-600/60 text-white border border-gray-500 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 placeholder-gray-400"
              />
              <select
                value={speaker.voiceId}
                onChange={(e) => handleSpeakerConfigChange(index, 'voiceId', e.target.value)}
                className="p-2 bg-gray-600/60 text-white border border-gray-500 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400"
              >
                {VOICE_OPTIONS.map((voice) => (
                  <option key={voice.voiceId} value={voice.voiceId}>
                    {voice.name} ({voice.gender})
                  </option>
                ))}
              </select>
              <button
                onClick={() => removeSpeaker(index)}
                className="p-2 bg-gray-600 hover:bg-gray-400 text-white rounded-md transition duration-200 shadow-sm"
                title="Remove speaker"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              </button>
            </div>
          ))}
          <button
            onClick={addSpeaker}
            className="w-full py-2 px-4 bg-gray-600 hover:bg-gray-400 text-white font-semibold rounded-lg transition duration-200 shadow-md"
          >
            Add Speaker
          </button>
        </div>
      )}

      {/* System Instruction (for all non-live modes) */}
      {speakerMode !== SpeakerMode.LIVE && (
         <div>
          <label htmlFor="systemInstruction" className="block text-gray-300 text-sm font-medium mb-1">System Instruction (Optional, for text generation model):</label>
          <textarea
            id="systemInstruction"
            value={systemInstruction}
            onChange={(e) => setSystemInstruction(e.target.value)}
            rows={3}
            className="w-full p-2 bg-gray-700/60 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-75 transition duration-200 resize-y placeholder-gray-400"
            placeholder="e.g., You are a friendly AI assistant. Always respond concisely."
          ></textarea>
          <p className="text-xs text-gray-400 mt-1">This guides the behavior of a generative text model, if integrated before TTS.</p>
        </div>
      )}
    </div>
  );
};

export default SettingsPanel;