import { VoiceOption } from './types';

export const VOICE_OPTIONS: VoiceOption[] = [
  { name: 'Default Male (Zephyr)', voiceId: 'Zephyr', gender: 'male', lang: 'en-US' },
  { name: 'Default Female (Kore)', voiceId: 'Kore', gender: 'female', lang: 'en-US' },
  { name: 'Puck (Neutral)', voiceId: 'Puck', gender: 'male', lang: 'en-US' },
  { name: 'Charon (Deep)', voiceId: 'Charon', gender: 'male', lang: 'en-US' },
  { name: 'Fenrir (Bright)', voiceId: 'Fenrir', gender: 'male', lang: 'en-US' },
  // Indian accented English voices
  { name: 'Indian Accented Female (Kore)', voiceId: 'Kore', gender: 'female', lang: 'en-IN' },
  { name: 'Indian Accented Male (Zephyr)', voiceId: 'Zephyr', gender: 'male', lang: 'en-IN' },
  // Placeholder voices for native Indian languages
  { name: 'Hindi Female (Kore)', voiceId: 'Kore', gender: 'female', lang: 'hi-IN' },
  { name: 'Hindi Male (Zephyr)', voiceId: 'Zephyr', gender: 'male', lang: 'hi-IN' },
  { name: 'Tamil Female (Kore)', voiceId: 'Kore', gender: 'female', lang: 'ta-IN' },
  { name: 'Tamil Male (Zephyr)', voiceId: 'Zephyr', gender: 'male', lang: 'ta-IN' },
  { name: 'Kannada Female (Kore)', voiceId: 'Kore', gender: 'female', lang: 'kn-IN' },
  { name: 'Kannada Male (Zephyr)', voiceId: 'Zephyr', gender: 'male', lang: 'kn-IN' },
  { name: 'Bengali Female (Kore)', voiceId: 'Kore', gender: 'female', lang: 'bn-IN' },
  { name: 'Bengali Male (Zephyr)', voiceId: 'Zephyr', gender: 'male', lang: 'bn-IN' },
  { name: 'Punjabi Female (Kore)', voiceId: 'Kore', gender: 'female', lang: 'pa-IN' },
  { name: 'Punjabi Male (Zephyr)', voiceId: 'Zephyr', gender: 'male', lang: 'pa-IN' },
];

export const NARRATION_STYLES: string[] = [
  'Standard',
  'Cheerful',
  'Dramatic',
  'Calm',
  'Excited',
  'Whispering',
  'Formal',
  'Informal',
  'Storyteller',
  'Poetic',
];

export const EMOTION_BLENDS: string[] = [
  'None',
  'Happy',
  'Sad',
  'Angry',
  'Surprised',
  'Fearful',
  'Disgusted',
  'Neutral',
  'Excitedly Happy',
  'Sadly Disappointed',
  'Angrily Frustrated',
  'Fearfully Anxious',
  'Calmly Content',
];

export const SAMPLE_SCRIPTS: { [key: string]: string } = {
  'en-US-poetry': `
Oh, to be a fly on the wall,
To see the world, both great and small.
A tiny speck, with wings so fine,
Witnessing secrets, truly divine.
`,
  'en-US-storytelling': `
In a land far away, amidst towering emerald trees and rivers that sang melodies, lived a tiny, brave mouse named Pip. Pip had an insatiable curiosity and a dream bigger than any mountain. He yearned to discover the legendary Whispering Falls, a place said to grant one true wish to any creature brave enough to find it.
`,
  'en-US-dialogue': `
Speaker1: Hello there, what brings you to this beautiful park today?
Speaker2: Oh, just enjoying the sunshine and a good book. It's truly a perfect day for it.
Speaker1: Indeed! I was thinking of grabbing some coffee from the cafe nearby. Care to join?
Speaker2: That sounds delightful! Lead the way.
`,
  'hi-IN-poetry': `
मुझे आशा है कि मैंने आपको एक ऐसी दुनिया में पहुँचाया है जहाँ सब कुछ संभव है।
जहाँ जादू होता है और सभी बाधाएँ दूर हो जाती हैं।
`, // Hindi: I hope I have transported you to a world where everything is possible. Where magic happens and all obstacles are overcome.
  'hi-IN-storytelling': `
एक समय की बात है, एक हरे-भरे जंगल में एक बुद्धिमान उल्लू रहता था। वह अपनी बुद्धिमत्ता के लिए जाना जाता था और जंगल के सभी जानवर उससे सलाह लेने आते थे। एक दिन, एक युवा हिरण उसके पास आया, जो एक बड़ी दुविधा में था।
`, // Hindi: Once upon a time, in a lush green forest, lived a wise owl. He was known for his wisdom, and all the animals of the forest would come to him for advice. One day, a young deer approached him, in a great dilemma.
  'ta-IN-poetry': `
வானம் மழை பொழிகிறது,
பூமியின் தாகம் தணிகிறது.
புதிய வாழ்வு துளிர்க்கிறது,
இயற்கையின் இசை ஒலிக்கிறது.
`, // Tamil: The sky showers rain, The earth's thirst is quenched. New life sprouts, Nature's music resounds.
  'ta-IN-storytelling': `
ஒரு காலத்தில், ஒரு சிறிய கிராமத்தில் ஒரு தைரியமான சிறுவன் இருந்தான். அவன் எப்போதும் சாகசங்களை தேடுவான். ஒரு நாள், அவன் ஒரு மர்மமான குகையை கண்டுபிடித்தான், அது அவனை ஒரு புதிய உலகத்திற்கு அழைத்துச் சென்றது.
`, // Tamil: Once upon a time, in a small village, there lived a brave boy. He always sought adventures. One day, he discovered a mysterious cave that led him to a new world.
  'kn-IN-poetry': `
ಹೂವು ಅರಳಿತು, ಬಣ್ಣ ಚೆಲ್ಲಿತು,
ಜೇನು ನೊಣ ಬಂದು ಮಕರಂದ ಹೀರಿತು.
ಪ್ರಕೃತಿಯ ಸೌಂದರ್ಯ ಅಪ್ರತಿಮ,
ನೋಡಿದ ಕಣ್ಣಿಗೆ ಆನಂದ ಅಮರ.
`, // Kannada: The flower bloomed, scattered colors, The bee came and sucked nectar. Nature's beauty is unparalleled, Joy for the eyes that see.
  'kn-IN-storytelling': `
ಒಂದು ಪುಟ್ಟ ಹಳ್ಳಿಯಲ್ಲಿ, ಒಬ್ಬ ಜಾಣ ರೈತ ವಾಸಿಸುತ್ತಿದ್ದನು. ಅವನು ತನ್ನ ಹೊಲದಲ್ಲಿ ಕಷ್ಟಪಟ್ಟು ಕೆಲಸ ಮಾಡುತ್ತಿದ್ದನು. ಒಂದು ದಿನ, ಅವನಿಗೆ ಒಂದು ವಿಚಿತ್ರ ಬೀಜ ಸಿಕ್ಕಿತು, ಅದು ಮಾಂತ್ರಿಕ ಗುಣಗಳನ್ನು ಹೊಂದಿತ್ತು.
`, // Kannada: In a small village, lived a wise farmer. He worked hard in his field. One day, he found a strange seed that had magical qualities.
  'bn-IN-poetry': `
আকাশে মেঘেরা ভাসে,
বৃষ্টির ছোঁয়ায় প্রাণ জাগে ঘাসে।
নতুন স্বপ্নরা বাসা বাঁধে মনে,
প্রকৃতির শোভা অতুলনীয় বনে।
`, // Bengali: Clouds float in the sky, life awakens in grass with the touch of rain. New dreams reside in the mind, nature's beauty is incomparable in the forest.
  'bn-IN-storytelling': `
এক ছিল রাজা, তার ছিল এক বিশাল রাজ্য। সেই রাজ্যে প্রজারা সুখে শান্তিতে বাস করত। রাজার ছিল এক দুষ্টু মন্ত্রী, যে সব সময় রাজার ক্ষতি করার চেষ্টা করত। একদিন মন্ত্রী এক জাদুকরী মন্ত্র দিয়ে রাজাকে বোকা বানানোর চেষ্টা করল।
`, // Bengali: There was a king, who had a vast kingdom. The subjects lived happily and peacefully in that kingdom. The king had a wicked minister, who always tried to harm the king. One day the minister tried to fool the king with a magical spell.
  'pa-IN-poetry': `
ਅੰਬਰ ਦੇ ਤਾਰੇ ਚਮਕਣ,
ਚੰਨ ਦੀ ਰੋਸ਼ਨੀ ਫੈਲੇ।
ਰੂਹ ਨੂੰ ਸਕੂਨ ਮਿਲਦਾ,
ਪਿਆਰ ਦੀ ਜੋਤ ਜਗਦੀ।
`, // Punjabi: Stars of the sky shine, moonlight spreads. The soul finds peace, the light of love ignites.
  'pa-IN-storytelling': `
ਇੱਕ ਪਿੰਡ ਵਿੱਚ ਇੱਕ ਬੁੱਢਾ ਕਿਸਾਨ ਰਹਿੰਦਾ ਸੀ। ਉਹ ਬਹੁਤ ਮਿਹਨਤੀ ਅਤੇ ਇਮਾਨਦਾਰ ਸੀ। ਉਸਦੇ ਕੋਲ ਇੱਕ ਛੋਟਾ ਜਿਹਾ ਖੇਤ ਸੀ ਜਿਸ ਵਿੱਚ ਉਹ ਸਬਜ਼ੀਆਂ ਉਗਾਉਂਦਾ ਸੀ। ਇੱਕ ਦਿਨ, ਕਿਸਾਨ ਨੂੰ ਖੇਤ ਵਿੱਚ ਇੱਕ ਪੁਰਾਣਾ ਖਜ਼ਾਨਾ ਮਿਲਿਆ।
`, // Punjabi: An old farmer lived in a village. He was very hardworking and honest. He had a small field where he grew vegetables. One day, the farmer found an old treasure in the field.
};

export const DEFAULT_LANGUAGE_CODE = 'en-US';
export const DEFAULT_VOICE_ID = 'Zephyr';
export const DEFAULT_SAMPLE_RATE = 24000; // Output sample rate from Gemini TTS
export const INPUT_SAMPLE_RATE = 16000; // Input sample rate for Live API
export const LIVE_MODEL_NAME = 'gemini-2.5-flash-native-audio-preview-09-2025';
export const TTS_MODEL_NAME = 'gemini-2.5-flash-preview-tts';