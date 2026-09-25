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
    this.userActive = false; // Strictly set to true when user clicks Start, false when user clicks Stop
    this.currentLanguage = 'en';
    this.restartTimeout = null;
    this.retryCount = 0;

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
      if (this.audioContext && this.audioContext.state === 'running') {
        return;
      }

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
          if (this.volumeCheckInterval) clearInterval(this.volumeCheckInterval);

          this.volumeCheckInterval = setInterval(() => {
            if (!this.userActive || !this.analyser) {
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
    this.userActive = true;
    this.isListening = true;
    this.retryCount = 0;

    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }

    try {
      this.initAudioVisualizer();
      this.setupRecognitionInstance();
      this.safeStart();
      if (this.onStatusChange) this.onStatusChange('listening');
      return true;
    } catch (err) {
      console.error('Error starting speech recognition:', err);
      if (this.onError) this.onError(err);
      return false;
    }
  }

  safeStart() {
    if (!this.recognition || !this.userActive) return;
    try {
      this.recognition.start();
    } catch (e) {
      // If recognition is already started or restarting, ignore error and retry if needed
      if (e.name !== 'InvalidStateError') {
        console.warn('Recognition start caught:', e.message);
      }
    }
  }

  setupRecognitionInstance() {
    if (this.recognition) {
      try {
        this.recognition.onend = null;
        this.recognition.onerror = null;
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
      this.retryCount = 0;
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
      // 'no-speech' or 'aborted' are normal pauses in meeting rooms; DO NOT stop listening!
      if (event.error === 'no-speech' || event.error === 'aborted') {
        return;
      }
      console.warn('SpeechRecognition event error:', event.error);
      if (event.error === 'not-allowed') {
        this.userActive = false;
        this.isListening = false;
        if (this.onStatusChange) this.onStatusChange('idle');
        if (this.onError) {
          this.onError({ code: event.error, message: 'Microphone permission denied.' });
        }
      }
    };

    this.recognition.onend = () => {
      // If user still wants listening, ALWAYS restart automatically!
      if (this.userActive) {
        if (this.restartTimeout) clearTimeout(this.restartTimeout);
        // Restart quickly so no speech is missed
        this.restartTimeout = setTimeout(() => {
          if (this.userActive) {
            try {
              this.safeStart();
            } catch (err) {
              console.warn('Retry start failed, scheduling next retry:', err);
              this.restartTimeout = setTimeout(() => {
                if (this.userActive) this.safeStart();
              }, 400);
            }
          }
        }, 100);
      } else {
        this.isListening = false;
        if (this.onStatusChange) this.onStatusChange('idle');
      }
    };
  }

  changeLanguage(langCode) {
    if (this.currentLanguage === langCode) return;
    this.currentLanguage = langCode;
    if (this.userActive) {
      if (this.recognition) {
        try {
          this.recognition.abort();
        } catch (e) {
          // ignore
        }
      }
      setTimeout(() => {
        if (this.userActive) {
          this.setupRecognitionInstance();
          this.safeStart();
        }
      }, 150);
    }
  }

  stop() {
    this.userActive = false;
    this.isListening = false;
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }
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
