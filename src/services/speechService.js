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
    this.currentLanguage = 'ar';
    this.restartTimeout = null;
    this.silenceTimer = null;

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

  start(langCode = 'ar') {
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
        console.warn('SafeStart note:', e.message);
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
    this.recognition.lang = langInfo.speechCode || 'ar-EG';
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

      if (finalTranscript.trim()) {
        // Accumulate final chunk into the current conversational thought
        this.accumulatedSentence = (this.accumulatedSentence + ' ' + finalTranscript.trim()).trim();
      }

      this.lastInterim = interimTranscript.trim();
      const currentFullText = (this.accumulatedSentence + ' ' + this.lastInterim).trim();

      // Show real-time interim speech bubble
      if (this.onResult && currentFullText) {
        this.onResult({
          transcript: currentFullText,
          isFinal: false,
          confidence: 0.8
        });
      }

      // Reset sentence pause debouncer (1.4 seconds of silence before finalizing sentence)
      if (this.silenceTimer) clearTimeout(this.silenceTimer);

      if (this.accumulatedSentence) {
        this.silenceTimer = setTimeout(() => {
          this.commitSentence();
        }, 1400);
      }
    };

    this.recognition.onerror = (event) => {
      // Natural silence or pauses in meetings: keep listening without aborting!
      if (event.error === 'no-speech' || event.error === 'aborted') {
        return;
      }
      console.warn('SpeechRecognition error:', event.error);
      if (event.error === 'not-allowed') {
        this.userActive = false;
        this.isListening = false;
        if (this.onStatusChange) this.onStatusChange('idle');
        if (this.onError) {
          this.onError({ code: event.error, message: 'Microphone permission was denied.' });
        }
      }
    };

    this.recognition.onend = () => {
      // If user still wants listening, seamlessly reconnect without losing words
      if (this.userActive) {
        if (this.restartTimeout) clearTimeout(this.restartTimeout);
        this.restartTimeout = setTimeout(() => {
          if (this.userActive) {
            try {
              this.setupRecognitionInstance();
              this.safeStart();
            } catch (err) {
              console.warn('Reconnect retry scheduled:', err);
            }
          }
        }, 80);
      } else {
        this.isListening = false;
        if (this.onStatusChange) this.onStatusChange('idle');
      }
    };
  }

  commitSentence() {
    if (!this.accumulatedSentence || !this.accumulatedSentence.trim()) return;

    const sentenceToCommit = this.accumulatedSentence.trim();
    this.accumulatedSentence = '';
    this.lastInterim = '';

    if (this.onResult) {
      this.onResult({
        transcript: sentenceToCommit,
        isFinal: true,
        confidence: 0.95
      });
    }
  }

  changeLanguage(langCode) {
    if (this.currentLanguage === langCode) return;
    this.currentLanguage = langCode;
    // Commit any pending words before switching language
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
