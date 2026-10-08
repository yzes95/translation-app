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
    this.userActive = false; // Strictly controlled by Start and Stop buttons
    this.currentLanguage = 'en';
    this.restartTimeout = null;
    this.silenceTimer = null;
    this.pauseDelayMs = 1000; // Responsive natural pause delay (1.0s, ideal for videos and conversation)

    // Conversational Accumulator: keeps full sentence intact across natural pauses
    this.accumulatedSentence = '';
    this.lastInterim = '';

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
    const isFirefox =
      typeof navigator !== 'undefined' && /Firefox/i.test(navigator.userAgent || '');
    if (isFirefox) return false;
    return Boolean(this.SpeechRecognition);
  }

  setPauseDelay(seconds) {
    this.pauseDelayMs = Math.max(600, Math.min(4000, seconds * 1000));
  }

  async initAudioVisualizer() {
    try {
      // CRITICAL FOR ANDROID & SAMSUNG DEVICES:
      // Android enforces an exclusive hardware microphone lock.
      // If getUserMedia opens the mic, SpeechRecognition fails with 'audio-capture' or stays deaf.
      // Therefore, on mobile devices we do NOT open getUserMedia, giving SpeechRecognition exclusive mic access.
      const isMobile =
        typeof navigator !== 'undefined' &&
        /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || '');
      if (isMobile) {
        return;
      }

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
          message: 'Speech recognition is not natively supported in this browser.'
        });
      }
      return false;
    }

    this.currentLanguage = langCode;
    this.userActive = true;
    this.isListening = true;
    this.accumulatedSentence = '';
    this.lastInterim = '';
    this.networkErrorCount = 0;

    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
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
      if (e.name !== 'InvalidStateError') {
        console.warn('SafeStart caught:', e.message);
      }
    }
  }

  async requestMicPermission() {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Immediately release mic stream tracks so recognition has exclusive access
        stream.getTracks().forEach((track) => track.stop());
        // Small delay to allow mobile OS HAL to cleanly release the microphone lock
        await new Promise((resolve) => setTimeout(resolve, 80));
        return true;
      } catch (err) {
        console.warn('Microphone permission request failed:', err);
        return false;
      }
    }
    return true;
  }

  setupRecognitionInstance() {
    if (this.recognition) {
      try {
        this.recognition.onend = null;
        this.recognition.onerror = null;
        this.recognition.onresult = null;
        this.recognition.onstart = null;
        this.recognition.abort();
      } catch (e) {
        // ignore
      }
    }

    const langInfo = getLanguageByCode(this.currentLanguage);
    const isMobile =
      typeof navigator !== 'undefined' &&
      /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || '');
    this.recognition = new this.SpeechRecognition();
    // Continuous is true across all platforms to ensure seamless real-time listening without clipping words
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = langInfo.speechCode || 'ar-EG';
    this.recognition.maxAlternatives = 1;

    this.recognition.onstart = () => {
      this.isListening = true;
      if (this.onStatusChange) this.onStatusChange('listening');
    };

    this.recognition.onresult = (event) => {
      let newlyFinalized = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const item = event.results[i];
        if (item.isFinal) {
          newlyFinalized += item[0].transcript + ' ';
        } else {
          interimTranscript += item[0].transcript;
        }
      }

      newlyFinalized = newlyFinalized.trim();
      this.lastInterim = interimTranscript.trim();
      this.networkErrorCount = 0;

      // 1. Instant Commit: When the speech model finalizes a phrase, commit immediately!
      if (newlyFinalized) {
        if (this.silenceTimer) {
          clearTimeout(this.silenceTimer);
          this.silenceTimer = null;
        }
        if (this.onResult) {
          this.onResult({
            transcript: newlyFinalized,
            isFinal: true,
            confidence: 0.95
          });
        }
      }

      // 2. Real-time Live Interim Stream (Zero latency live words as you speak):
      if (this.lastInterim) {
        if (this.onResult) {
          this.onResult({
            transcript: this.lastInterim,
            isFinal: false,
            confidence: 0.85
          });
        }

        // Natural pause timer (700ms): If the speaker pauses, commit the interim text as final
        // WITHOUT aborting or stopping the mic! The microphone stays open continuously.
        if (this.silenceTimer) clearTimeout(this.silenceTimer);
        this.silenceTimer = setTimeout(() => {
          this.silenceTimer = null;
          if (this.lastInterim && this.userActive) {
            const chunkToCommit = this.lastInterim;
            this.lastInterim = '';
            if (this.onResult) {
              this.onResult({
                transcript: chunkToCommit,
                isFinal: true,
                confidence: 0.92
              });
            }
          }
        }, 700);
      }
    };

    this.recognition.onerror = (event) => {
      console.warn('SpeechRecognition error:', event.error);
      if (event.error === 'no-speech' || event.error === 'aborted') {
        return;
      }
      if (event.error === 'audio-capture') {
        this.stopAudioVisualizer();
        setTimeout(() => {
          if (this.userActive) this.safeStart();
        }, 300);
        return;
      }
      if (event.error === 'network') {
        this.networkErrorCount = (this.networkErrorCount || 0) + 1;
        if (this.networkErrorCount > 2) {
          this.userActive = false;
          this.isListening = false;
          if (this.onStatusChange) this.onStatusChange('idle');
          if (this.onError) {
            this.onError({
              code: 'network',
              message: 'Browser speech recognition network error. Auto-switching to AI Voice engine.'
            });
          }
          return;
        }
        setTimeout(() => {
          if (this.userActive) this.safeStart();
        }, 400);
        return;
      }
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        this.userActive = false;
        this.isListening = false;
        if (this.onStatusChange) this.onStatusChange('idle');
        if (this.onError) {
          this.onError({
            code: event.error,
            message: 'Browser speech recognition unavailable. Auto-switching to AI Voice engine.'
          });
        }
      }
    };

    this.recognition.onend = () => {
      if (this.lastInterim.trim()) {
        const chunkToCommit = this.lastInterim.trim();
        this.lastInterim = '';
        if (this.onResult) {
          this.onResult({
            transcript: chunkToCommit,
            isFinal: true,
            confidence: 0.92
          });
        }
      }

      if (this.userActive) {
        if (this.restartTimeout) clearTimeout(this.restartTimeout);
        const restartDelay = isMobile ? 150 : 60;
        this.restartTimeout = setTimeout(() => {
          if (this.userActive) {
            try {
              this.setupRecognitionInstance();
              this.safeStart();
            } catch (err) {
              console.warn('Recognition restart note:', err);
            }
          }
        }, restartDelay);
      } else {
        this.isListening = false;
        if (this.onStatusChange) this.onStatusChange('idle');
      }
    };
  }

  commitSentence() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    const toCommit = (this.lastInterim || '').trim();
    if (!toCommit) return;
    this.lastInterim = '';
    if (this.onResult) {
      this.onResult({
        transcript: toCommit,
        isFinal: true,
        confidence: 0.95
      });
    }
  }

  forceCommit() {
    this.commitSentence();
  }

  changeLanguage(langCode) {
    if (this.currentLanguage === langCode) return;
    this.currentLanguage = langCode;
    this.commitSentence();

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
      }, 120);
    }
  }

  stop() {
    this.userActive = false;
    this.isListening = false;

    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }

    // Commit any speech remaining in the accumulator
    this.commitSentence();

    if (this.recognition) {
      try {
        this.recognition.onresult = null;
        this.recognition.onend = null;
        this.recognition.onerror = null;
        this.recognition.stop();
      } catch (e) {
        // ignore
      }
      this.recognition = null;
    }
    this.accumulatedSentence = '';
    this.lastInterim = '';
    this.stopAudioVisualizer();
    if (this.onStatusChange) this.onStatusChange('idle');
  }
}

export const speechService = new SpeechService();
