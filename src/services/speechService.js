import { getLanguageByCode } from '../constants/languages';

class SpeechService {
  constructor() {
    const SpeechRecognition =
      typeof window !== 'undefined'
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null;

    this.SpeechRecognition = SpeechRecognition;
    this.recognition = null;
    this.isListening = false;
    this.shouldRestart = false;
    this.currentLanguage = 'en';

    // Callbacks
    this.onResult = null;
    this.onError = null;
    this.onStatusChange = null;
    this.onVolumeChange = null;

    // Audio stream & volume analyzer
    this.audioContext = null;
    this.analyser = null;
    this.microphoneStream = null;
    this.volumeCheckInterval = null;
  }

  isSupported() {
    return Boolean(this.SpeechRecognition);
  }

  async initAudioVisualizer() {
    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        this.microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          this.audioContext = new AudioContextClass();
          const source = this.audioContext.createMediaStreamSource(this.microphoneStream);
          this.analyser = this.audioContext.createAnalyser();
          this.analyser.fftSize = 64;
          source.connect(this.analyser);

          const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
          this.volumeCheckInterval = setInterval(() => {
            if (!this.isListening || !this.analyser) {
              if (this.onVolumeChange) this.onVolumeChange(0);
              return;
            }
            this.analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const average = sum / dataArray.length;
            const normalized = Math.min(100, Math.round((average / 128) * 100));
            if (this.onVolumeChange) {
              this.onVolumeChange(normalized);
            }
          }, 100);
        }
      }
    } catch (err) {
      console.warn('Microphone audio stream could not be initialized for visualizer:', err);
    }
  }

  stopAudioVisualizer() {
    if (this.volumeCheckInterval) {
      clearInterval(this.volumeCheckInterval);
      this.volumeCheckInterval = null;
    }
    if (this.microphoneStream) {
      this.microphoneStream.getTracks().forEach((track) => track.stop());
      this.microphoneStream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch (e) {
        // ignore
      }
      this.audioContext = null;
    }
    if (this.onVolumeChange) {
      this.onVolumeChange(0);
    }
  }

  start(langCode = 'en') {
    if (!this.SpeechRecognition) {
      console.warn('SpeechRecognition is not supported in this browser.');
      if (this.onError) {
        this.onError({
          code: 'not-supported',
          message: 'Speech recognition is not natively supported in this browser. You can still type or use simulation mode!'
        });
      }
      return false;
    }

    this.currentLanguage = langCode;
    this.shouldRestart = true;

    try {
      this.initAudioVisualizer();
      this.setupRecognitionInstance();
      this.recognition.start();
      this.isListening = true;
      if (this.onStatusChange) this.onStatusChange('listening');
      return true;
    } catch (err) {
      console.error('Error starting speech recognition:', err);
      if (this.onError) this.onError(err);
      return false;
    }
  }

  setupRecognitionInstance() {
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch (e) {
        // ignore
      }
    }

    const langInfo = getLanguageByCode(this.currentLanguage);
    this.recognition = new this.SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = langInfo.speechCode;
    this.recognition.maxAlternatives = 1;

    this.recognition.onstart = () => {
      this.isListening = true;
      if (this.onStatusChange) this.onStatusChange('listening');
    };

    this.recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const item = event.results[i];
        if (item.isFinal) {
          finalTranscript += item[0].transcript;
        } else {
          interimTranscript += item[0].transcript;
        }
      }

      if (this.onResult) {
        if (finalTranscript.trim()) {
          this.onResult({
            transcript: finalTranscript.trim(),
            isFinal: true,
            confidence: event.results[event.results.length - 1]?.[0]?.confidence || 0.9
          });
        } else if (interimTranscript.trim()) {
          this.onResult({
            transcript: interimTranscript.trim(),
            isFinal: false,
            confidence: 0.7
          });
        }
      }
    };

    this.recognition.onerror = (event) => {
      // Ignore routine 'no-speech' warnings during meetings
      if (event.error === 'no-speech') {
        return;
      }
      console.warn('SpeechRecognition event error:', event.error);
      if (this.onError) {
        this.onError({ code: event.error, message: `Microphone issue: ${event.error}` });
      }
    };

    this.recognition.onend = () => {
      if (this.shouldRestart && this.isListening) {
        // Automatically resume listening so live meetings are uninterrupted
        try {
          this.recognition.start();
        } catch (e) {
          setTimeout(() => {
            if (this.shouldRestart && this.isListening) {
              try {
                this.recognition.start();
              } catch (err) {
                // ignore
              }
            }
          }, 300);
        }
      } else {
        this.isListening = false;
        if (this.onStatusChange) this.onStatusChange('idle');
      }
    };
  }

  changeLanguage(langCode) {
    this.currentLanguage = langCode;
    if (this.isListening && this.recognition) {
      const wasListening = this.isListening;
      this.shouldRestart = false;
      this.recognition.stop();
      if (wasListening) {
        setTimeout(() => {
          this.start(langCode);
        }, 150);
      }
    }
  }

  stop() {
    this.shouldRestart = false;
    this.isListening = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        // ignore
      }
    }
    this.stopAudioVisualizer();
    if (this.onStatusChange) this.onStatusChange('idle');
  }
}

export const speechService = new SpeechService();
