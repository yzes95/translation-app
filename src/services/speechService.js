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

    // Restart and watchdog timers
    this.restartTimeout = null;
    this.watchdog = null;
    this.networkErrorCount = 0;
    this.lastActivity = 0;

    // Result tracking: ensures 0 duplicates and zero dropped speech
    this.finalizedIndex = -1;
    this.lastInterim = '';

    this.isMobile =
      typeof navigator !== 'undefined' &&
      /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || '');

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

  async initAudioVisualizer() {
    try {
      // Android enforces an exclusive hardware microphone lock; never open getUserMedia there.
      if (this.isMobile) return;
      if (this.audioContext && this.audioContext.state === 'running') return;

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
            for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
            const average = sum / dataArray.length;
            const normalized = Math.min(100, Math.round((average / 128) * 100));
            if (this.onVolumeChange) this.onVolumeChange(normalized);
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
    if (this.onVolumeChange) this.onVolumeChange(0);
  }

  start(langCode = 'en') {
    if (!this.SpeechRecognition) {
      console.warn('SpeechRecognition is not supported in this browser.');
      if (this.onError) {
        this.onError({
          code: 'not-supported',
          fatal: true,
          message: 'Speech recognition is not natively supported in this browser.'
        });
      }
      return false;
    }

    this.currentLanguage = langCode;
    this.userActive = true;
    this.networkErrorCount = 0;
    this.lastActivity = Date.now();
    this.clearTimers();

    try {
      this.initAudioVisualizer();
      this.startSession();
      this.startWatchdog();
      return true;
    } catch (err) {
      console.error('Error starting speech recognition:', err);
      if (this.onError) this.onError(err);
      return false;
    }
  }

  clearTimers() {
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }
    if (this.watchdog) {
      clearInterval(this.watchdog);
      this.watchdog = null;
    }
  }

  startWatchdog() {
    if (this.watchdog) clearInterval(this.watchdog);
    this.watchdog = setInterval(() => {
      if (!this.userActive) return;
      // If user active but recognition dropped and no restart is pending:
      if (!this.isListening && !this.restartTimeout) {
        console.log('[speech] Watchdog: reviving listening session');
        this.startSession();
      }
    }, 2000);
  }

  startSession() {
    if (!this.userActive) return;
    this.cleanupCurrentInstance();
    this.setupRecognitionInstance();

    try {
      this.recognition.start();
    } catch (e) {
      // Browser audio subsystem might still be releasing previous session (InvalidStateError)
      console.warn('Recognition start caught, scheduling retry:', e.message);
      if (this.userActive) {
        this.scheduleRestart(350);
      }
    }
  }

  scheduleRestart(delay = 250) {
    if (!this.userActive) return;
    if (this.restartTimeout) clearTimeout(this.restartTimeout);
    this.restartTimeout = setTimeout(() => {
      this.restartTimeout = null;
      if (!this.userActive) return;
      this.startSession();
    }, delay);
  }

  async requestMicPermission() {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Immediately release mic stream tracks so recognition has exclusive access
        stream.getTracks().forEach((track) => track.stop());
        await new Promise((resolve) => setTimeout(resolve, 80));
        return true;
      } catch (err) {
        console.warn('Microphone permission request failed:', err);
        return false;
      }
    }
    return true;
  }

  emit(transcript, isFinal, confidence = 0.9) {
    if (!transcript || !transcript.trim() || !this.onResult) return;
    this.onResult({ transcript: transcript.trim(), isFinal, confidence });
  }

  cleanupCurrentInstance() {
    if (!this.recognition) return;
    try {
      this.recognition.onstart = null;
      this.recognition.onresult = null;
      this.recognition.onerror = null;
      this.recognition.onend = null;
      this.recognition.abort();
    } catch (e) {
      // ignore
    }
    this.recognition = null;
  }

  setupRecognitionInstance() {
    const langInfo = getLanguageByCode(this.currentLanguage);
    const rec = new this.SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = langInfo?.speechCode || 'ar-EG';
    rec.maxAlternatives = 1;

    // Reset session result tracking for the new instance
    this.finalizedIndex = -1;
    this.lastInterim = '';

    rec.onstart = () => {
      this.lastActivity = Date.now();
      this.isListening = true;
      this.networkErrorCount = 0;
      if (this.onStatusChange) this.onStatusChange('listening');
    };

    rec.onresult = (event) => {
      this.lastActivity = Date.now();
      this.networkErrorCount = 0;

      let finalPhrase = '';
      let interimPhrase = '';

      for (let i = 0; i < event.results.length; i++) {
        const item = event.results[i];
        const text = (item[0]?.transcript || '').trim();
        if (!text) continue;

        if (item.isFinal) {
          // Exactly-once final commitment per result index
          if (i > this.finalizedIndex) {
            this.finalizedIndex = i;
            finalPhrase += (finalPhrase ? ' ' : '') + text;
          }
        } else {
          interimPhrase += (interimPhrase ? ' ' : '') + text;
        }
      }

      // 1. Emit finalized sentence chunk
      if (finalPhrase) {
        this.emit(finalPhrase, true, 0.95);
      }

      // 2. Emit active real-time interim speech
      this.lastInterim = interimPhrase;
      if (interimPhrase) {
        this.emit(interimPhrase, false, 0.85);
      }
    };

    rec.onerror = (event) => {
      const error = event?.error;
      console.warn('SpeechRecognition error:', error);

      if (error === 'no-speech' || error === 'aborted') {
        // Normal silence or browser audio reconfiguration; onend will smoothly restart
        return;
      }

      if (error === 'audio-capture') {
        this.stopAudioVisualizer();
        this.scheduleRestart(400);
        return;
      }

      if (error === 'network') {
        this.networkErrorCount += 1;
        if (this.networkErrorCount >= 8) {
          this.fail('network-fatal', 'Browser speech recognition network disconnected. Auto-switching to AI Voice engine.');
          return;
        }
        this.scheduleRestart(Math.min(3000, 400 * 2 ** (this.networkErrorCount - 1)));
        return;
      }

      if (error === 'not-allowed') {
        this.fail('not-allowed', 'Microphone permission denied. Allow mic access and press Start again.');
        return;
      }

      if (error === 'service-not-allowed') {
        this.fail('service-not-allowed', 'Browser speech service is unavailable. Switching to AI Voice engine.');
        return;
      }
    };

    rec.onend = () => {
      this.isListening = false;
      if (this.onStatusChange) this.onStatusChange('idle');

      // Flush any leftover interim words that Chrome did not finalize before ending
      if (this.lastInterim && this.lastInterim.trim()) {
        const leftover = this.lastInterim.trim();
        this.lastInterim = '';
        this.emit(leftover, true, 0.90);
      }

      // In continuous listening mode, seamlessly restart with clean 250ms buffer
      if (this.userActive) {
        const delay = this.isMobile ? 250 : 200;
        this.scheduleRestart(delay);
      }
    };

    this.recognition = rec;
  }

  fail(code, message) {
    this.userActive = false;
    this.isListening = false;
    this.clearTimers();
    this.cleanupCurrentInstance();
    this.stopAudioVisualizer();
    if (this.onError) {
      this.onError({ code, message, fatal: true });
    } else if (this.onStatusChange) {
      this.onStatusChange('idle');
    }
  }

  commitSentence() {
    if (this.lastInterim && this.lastInterim.trim()) {
      const chunk = this.lastInterim.trim();
      this.lastInterim = '';
      this.emit(chunk, true, 0.92);
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
      this.scheduleRestart(100);
    }
  }

  stop() {
    this.userActive = false;
    this.isListening = false;
    this.clearTimers();
    this.commitSentence();

    if (this.recognition) {
      try {
        this.recognition.onresult = null;
        this.recognition.onend = null;
        this.recognition.onerror = null;
        this.recognition.onstart = null;
        this.recognition.stop();
      } catch (e) {
        // ignore
      }
      this.recognition = null;
    }

    this.finalizedIndex = -1;
    this.lastInterim = '';
    this.stopAudioVisualizer();
    if (this.onStatusChange) this.onStatusChange('idle');
  }
}

export const speechService = new SpeechService();
export { SpeechService };
