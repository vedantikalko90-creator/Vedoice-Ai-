import React, { useCallback, useState } from 'react';
import { GeneratedAudioChunk } from '../types';
import { audioBufferToWavBlob, mixAudioBuffers } from '../utils/audioUtils';
import LoadingSpinner from './LoadingSpinner';

interface DownloadOptionsProps {
  generatedAudioChunks: GeneratedAudioChunk[];
  outputAudioContext: AudioContext;
}

const DownloadOptions: React.FC<DownloadOptionsProps> = ({
  generatedAudioChunks,
  outputAudioContext,
}) => {
  const [isCombining, setIsCombining] = useState(false);

  const handleDownloadChunk = useCallback((chunk: GeneratedAudioChunk) => {
    const blob = audioBufferToWavBlob(chunk.audioBuffer);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vedoice-ai-chunk-${chunk.id.substring(0, 8)}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const handleDownloadCombined = useCallback(async () => {
    if (generatedAudioChunks.length === 0) return;

    setIsCombining(true);
    try {
      let combinedBuffer = generatedAudioChunks[0].audioBuffer;

      // Concatenate all speech chunks first
      if (generatedAudioChunks.length > 1) {
        const tempBuffers = generatedAudioChunks.map(chunk => chunk.audioBuffer);
        const totalLength = tempBuffers.reduce((acc, buffer) => acc + buffer.length, 0);
        const concatenatedBuffer = outputAudioContext.createBuffer(
          tempBuffers[0].numberOfChannels,
          totalLength,
          tempBuffers[0].sampleRate
        );

        let offset = 0;
        for (const buffer of tempBuffers) {
          for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
            concatenatedBuffer.getChannelData(channel).set(buffer.getChannelData(channel), offset);
          }
          offset += buffer.length;
        }
        combinedBuffer = concatenatedBuffer;
      }
      
      const finalMixedBuffer = combinedBuffer; // No SFX/BGM to mix
      const blob = audioBufferToWavBlob(finalMixedBuffer);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vedoice-ai-combined-${Date.now()}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error combining and downloading audio:", error);
      alert("Failed to combine and download audio. See console for details.");
    } finally {
      setIsCombining(false);
    }
  }, [generatedAudioChunks, outputAudioContext]);

  return (
    <div className="bg-gray-800/40 border border-gray-700 rounded-xl shadow-xl backdrop-blur-sm p-6 space-y-4">
      <h3 className="text-xl font-semibold text-white">Download Options</h3>

      {generatedAudioChunks.length === 0 ? (
        <p className="text-gray-400 italic">Generate some audio first to enable download options.</p>
      ) : (
        <>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
            {generatedAudioChunks.map((chunk, index) => (
              <div key={chunk.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg border border-gray-600 shadow-sm hover:bg-gray-600/60 transition duration-150">
                <span className="text-gray-300 text-sm truncate mr-2 font-mono">{index + 1}. {chunk.text}</span>
                <button
                  onClick={() => handleDownloadChunk(chunk)}
                  className="py-1 px-3 bg-gray-600 hover:bg-gray-400 text-white rounded-md text-sm transition duration-200 shadow-sm"
                  title="Download individual chunk"
                >
                  Download
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={handleDownloadCombined}
            disabled={generatedAudioChunks.length === 0 || isCombining}
            className="w-full py-3 px-4 bg-gray-600 hover:bg-gray-400 text-white font-semibold rounded-lg disabled:opacity-50 transition duration-200 flex items-center justify-center space-x-2 shadow-md"
          >
            {isCombining && <LoadingSpinner />}
            <span>{isCombining ? 'Combining...' : 'Download Combined Audio (.wav)'}</span>
          </button>
        </>
      )}
    </div>
  );
};

export default DownloadOptions;