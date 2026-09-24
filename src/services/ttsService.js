import { getLanguageByCode } from '../constants/languages';

class TTSService {
  constructor() {
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.voices = [];
    this.isPlaying = false;
    this.initVoices();
  }

  initVoices() {
    if (!this.synth) return;
    this.voices = this.synth.getVoices();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = () => {
        this.voices = this.synth.getVoices();
      };
    }
  }

  getVoiceForLanguage(langCode) {
    if (!this.voices.length && this.synth) {
      this.voices = this.synth.getVoices();
    }
    const langInfo = getLanguageByCode(langCode);
    const targetCodes = [langInfo.speechCode, ...(langInfo.speechCodesFallback || []), langCode];

    for (const code of targetCodes) {
      const match = this.voices.find(
        (v) => v.lang.toLowerCase() === code.toLowerCase() || v.lang.toLowerCase().startsWith(langCode.toLowerCase())
      );
      if (match) return match;
    }
    return null;
  }

  speak(text, langCode, { rate = 1.0, pitch = 1.0, onStart, onEnd, onError } = {}) {
    if (!this.synth) {
      console.warn('SpeechSynthesis not supported on this browser');
      if (onError) onError(new Error('SpeechSynthesis not supported'));
      return;
    }

    this.stop(); // Stop any currently speaking voice

    if (!text || !text.trim()) return;

    const utterance = new SpeechSynthesisUtterance(text.trim());
    const voice = this.getVoiceForLanguage(langCode);
    if (voice) {
      utterance.voice = voice;
    }
    utterance.lang = getLanguageByCode(langCode).speechCode;
    utterance.rate = rate;
    utterance.pitch = pitch;

    utterance.onstart = () => {
      this.isPlaying = true;
      if (onStart) onStart();
    };

    utterance.onend = () => {
      this.isPlaying = false;
      if (onEnd) onEnd();
    };

    utterance.onerror = (e) => {
      this.isPlaying = false;
      console.warn('SpeechSynthesis error:', e);
      if (onError) onError(e);
    };

    try {
      this.synth.speak(utterance);
    } catch (err) {
      console.error('Failed to speak utterance:', err);
      this.isPlaying = false;
      if (onError) onError(err);
    }
  }

  stop() {
    if (this.synth) {
      this.synth.cancel();
      this.isPlaying = false;
    }
  }
}

export const ttsService = new TTSService();
