// Function to convert Blob to Base64 string (for image/video uploads if needed)
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result.split(',')[1]); // Extract base64 part
      } else {
        reject(new Error("Failed to read blob as base64 string."));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Decodes a base64 string to a Uint8Array.
export function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Decodes raw PCM audio data (Uint8Array) into an AudioBuffer.
export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// Encodes a Uint8Array to a base64 string.
export function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Mixes multiple AudioBuffers into a single AudioBuffer.
export async function mixAudioBuffers(
  audioBuffers: AudioBuffer[],
  outputAudioContext: AudioContext,
): Promise<AudioBuffer> {
  if (audioBuffers.length === 0) {
    throw new Error('No audio buffers to mix.');
  }

  const sampleRate = audioBuffers[0].sampleRate;
  const numberOfChannels = audioBuffers[0].numberOfChannels;

  const maxLength = audioBuffers.reduce((max, buffer) => Math.max(max, buffer.length), 0);

  const mixedBuffer = outputAudioContext.createBuffer(numberOfChannels, maxLength, sampleRate);

  for (const buffer of audioBuffers) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const mixedChannelData = mixedBuffer.getChannelData(channel);
      const bufferChannelData = buffer.getChannelData(channel);

      for (let i = 0; i < buffer.length; i++) {
        mixedChannelData[i] += bufferChannelData[i];
      }
    }
  }

  // Normalize the mixed audio to prevent clipping
  let maxVal = 0;
  for (let channel = 0; channel < numberOfChannels; channel++) {
    const channelData = mixedBuffer.getChannelData(channel);
    for (let i = 0; i < mixedBuffer.length; i++) {
      maxVal = Math.max(maxVal, Math.abs(channelData[i]));
    }
  }

  if (maxVal > 1) {
    const gain = 1 / maxVal;
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const channelData = mixedBuffer.getChannelData(channel);
      for (let i = 0; i < mixedBuffer.length; i++) {
        channelData[i] *= gain;
      }
    }
  }

  return mixedBuffer;
}

// Converts an AudioBuffer to a WAV Blob.
export function audioBufferToWavBlob(audioBuffer: AudioBuffer): Blob {
  const numOfChan = audioBuffer.numberOfChannels;
  const totalLength = audioBuffer.length * numOfChan * 2 + 44; // 2 bytes per sample, 44 bytes for header
  const dataView = new DataView(new ArrayBuffer(totalLength));
  let offset = 0;

  function writeString(s: string) {
    for (let i = 0; i < s.length; i++) {
      dataView.setUint8(offset + i, s.charCodeAt(i));
    }
    offset += s.length;
  }

  function writeUint32(i: number) {
    dataView.setUint32(offset, i, true);
    offset += 4;
  }

  function writeUint16(i: number) {
    dataView.setUint16(offset, i, true);
    offset += 2;
  }

  writeString('RIFF'); // ChunkID
  writeUint32(totalLength - 8); // ChunkSize
  writeString('WAVE'); // Format
  writeString('fmt '); // Subchunk1ID
  writeUint32(16); // Subchunk1Size (16 for PCM)
  writeUint16(1); // AudioFormat (1 for PCM)
  writeUint16(numOfChan); // NumChannels
  writeUint32(audioBuffer.sampleRate); // SampleRate
  writeUint32(audioBuffer.sampleRate * numOfChan * 2); // ByteRate
  writeUint16(numOfChan * 2); // BlockAlign
  writeUint16(16); // BitsPerSample
  writeString('data'); // Subchunk2ID
  writeUint32(audioBuffer.length * numOfChan * 2); // Subchunk2Size

  const interleaved = new Float32Array(audioBuffer.length * numOfChan);
  for (let channel = 0; channel < numOfChan; channel++) {
    const channelData = audioBuffer.getChannelData(channel);
    for (let i = 0; i < audioBuffer.length; i++) {
      interleaved[i * numOfChan + channel] = channelData[i];
    }
  }

  for (let i = 0; i < interleaved.length; i++) {
    let s = Math.max(-1, Math.min(1, interleaved[i])); // Clamp to [-1, 1]
    s = s < 0 ? s * 0x8000 : s * 0x7FFF; // Scale to 16-bit
    dataView.setInt16(offset, s, true);
    offset += 2;
  }

  return new Blob([dataView.buffer], { type: 'audio/wav' });
}

// Converts an uploaded audio file (Blob) to an AudioBuffer.
export async function fileToAudioBuffer(file: File, audioContext: AudioContext): Promise<AudioBuffer> {
  const arrayBuffer = await file.arrayBuffer();
  return await audioContext.decodeAudioData(arrayBuffer);
}

// Creates a PCM Blob suitable for the Gemini Live API.
export function createPcmBlob(data: Float32Array): { data: string; mimeType: string } {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}