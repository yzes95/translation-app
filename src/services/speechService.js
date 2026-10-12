import { getLanguageByCode } from '../constants/languages';

// ---------------------------------------------------------------------------
// Pure helper (exported for tests): words of `full` that were NOT already emitted.
// Chrome keeps growing the SAME result index after we fallback-commit its interim text,
// so we must only emit the new tail, otherwise the same phrase is emitted 2-3 times.
// ---------------------------------------------------------------------------
const normWord = (w) => w.toLowerCase().replace(/[\p{P}\p{S}]/gu, '');

export function remainderAfter(committed, full) {
  const fullText = (full || '').trim();
  if (!committed || !committed.trim()) return fullText;
  const a = committed.trim().split(/\s+/);
  const b = fullText.split(/\s+/).filter(Boolean);
  let i = 0;
  while (i < a.length && i < b.length && normWord(a[i]) === normWord(b[i])) i++;
  // Recognizer revised words inside the already-emitted part: skip as many words as were emitted.
  if (i < a.length) i = Math.min(a.length, b.length);
  return b.slice(i).join(' ');
}

const MAX_NETWORK_RETRIES = 6; // ~0.5+1+2+4+5+5 s of backoff before giving up
const WATCHDOG_INTERVAL_MS = 4000;
const WATCHDOG_STALE_MS = 15000; // no onstart/onresult for 15s => hard restart
const MAX_PENDING_WORDS = 25; // continuous speech without a Chrome final: commit anyway
const MAX_PENDING_MS = 8000;

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
    this.watchdog = null;
    this.pauseDelayMs = 1000;
    this.networkErrorCount = 0;
    this.nextRestartDelay = null;
    this.lastActivity = 0;
    this.isMobile =
      typeof navigator !== 'undefined' &&
      /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || '');

    // Per-recognition-instance bookkeeping (reset on every new instance)
    this.resetInstanceState();

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

  resetInstanceState() {
    this.finalizedIdx = new Set(); // result indexes already emitted as Chrome finals
    this.committedPrefix = new Map(); // result index -> text already emitted by fallback commit
    this.pendingParts = []; // [{ idx, full, rest }] current un-emitted interim text
    this.pendingSince = 0;
    this.lastInterim = '';
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

  get fallbackCommitMs() {
    return Math.max(2500, this.pauseDelayMs * 2);
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
    this.isListening = true;
    this.networkErrorCount = 0;
    this.nextRestartDelay = null;
    this.lastActivity = Date.now();
    this.clearTimers();

    try {
      this.initAudioVisualizer();
      this.setupRecognitionInstance();
      this.safeStart();
      this.startWatchdog();
      if (this.onStatusChange) this.onStatusChange('listening');
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
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.watchdog) {
      clearInterval(this.watchdog);
      this.watchdog = null;
    }
  }

  // Chrome sometimes stops delivering events without firing onend (long sessions,
  // device changes). If nothing happened for 15s, rebuild the recognizer.
  startWatchdog() {
    if (this.watchdog) clearInterval(this.watchdog);
    this.watchdog = setInterval(() => {
      if (!this.userActive) return;
      if (Date.now() - this.lastActivity < WATCHDOG_STALE_MS) return;
      console.warn('[speech] watchdog: recognizer stalled, restarting');
      this.commitPending();
      this.lastActivity = Date.now();
      try {
        this.setupRecognitionInstance();
        this.safeStart();
      } catch (err) {
        console.warn('[speech] watchdog restart failed:', err);
      }
    }, WATCHDOG_INTERVAL_MS);
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
        await new Promise((resolve) => setTimeout(resolve, 80));
        return true;
      } catch (err) {
        console.warn('Microphone permission request failed:', err);
        return false;
      }
    }
    return true;
  }

  emit(transcript, isFinal, confidence) {
    if (!transcript || !this.onResult) return;
    this.onResult({ transcript, isFinal, confidence });
  }

  // Emit current un-emitted interim text as a final line and remember it per result index,
  // so when Chrome later finalizes (or extends) that same result we only emit the new tail.
  commitPending() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    const parts = this.pendingParts;
    if (!parts.length) return;
    for (const p of parts) this.committedPrefix.set(p.idx, p.full);
    const text = parts.map((p) => p.rest).join(' ').trim();
    this.pendingParts = [];
    this.pendingSince = 0;
    this.lastInterim = '';
    this.emit(text, true, 0.9);
  }

  detachRecognition() {
    if (!this.recognition) return;
    try {
      this.recognition.onend = null;
      this.recognition.onerror = null;
      this.recognition.onresult = null;
      this.recognition.onstart = null;
      this.recognition.abort();
    } catch (e) {
      // ignore
    }
    this.recognition = null;
  }

  // Unrecoverable failure: stop cleanly and let the app decide (switch engine or show stopped).
  fail(code, message) {
    this.commitPending();
    this.userActive = false;
    this.isListening = false;
    this.clearTimers();
    this.detachRecognition();
    this.stopAudioVisualizer();
    if (this.onError) {
      this.onError({ code, message, fatal: true });
    } else if (this.onStatusChange) {
      this.onStatusChange('idle');
    }
  }

  handleResult(event) {
    this.lastActivity = Date.now();
    this.networkErrorCount = 0;

    const finals = [];
    const parts = [];
    for (let i = 0; i < event.results.length; i++) {
      const item = event.results[i];
      const full = (item[0]?.transcript || '').trim();
      if (item.isFinal) {
        if (this.finalizedIdx.has(i)) continue;
        this.finalizedIdx.add(i);
        const rest = remainderAfter(this.committedPrefix.get(i), full);
        this.committedPrefix.delete(i);
        if (rest) finals.push(rest);
      } else if (full) {
        const rest = remainderAfter(this.committedPrefix.get(i), full);
        if (rest) parts.push({ idx: i, full, rest });
      }
    }

    if (finals.length) {
      this.emit(finals.join(' '), true, 0.95);
    }

    this.pendingParts = parts;
    this.lastInterim = parts.map((p) => p.rest).join(' ').trim();

    if (!this.lastInterim) {
      this.pendingSince = 0;
      if (this.silenceTimer) {
        clearTimeout(this.silenceTimer);
        this.silenceTimer = null;
      }
      return;
    }

    if (!this.pendingSince) this.pendingSince = Date.now();
    this.emit(this.lastInterim, false, 0.85);

    // Fast continuous speech (videos/lectures) where Chrome holds one result open for long:
    // commit so subtitles keep flowing instead of one giant late line.
    const words = this.lastInterim.split(/\s+/).length;
    if (words >= MAX_PENDING_WORDS || Date.now() - this.pendingSince >= MAX_PENDING_MS) {
      this.commitPending();
      return;
    }

    // Fallback commit only after a real pause (Chrome normally finalizes first).
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    this.silenceTimer = setTimeout(() => {
      this.silenceTimer = null;
      if (this.userActive) this.commitPending();
    }, this.fallbackCommitMs);
  }

  handleError(event) {
    const error = event?.error;
    console.warn('SpeechRecognition error:', error);
    switch (error) {
      case 'no-speech':
      case 'aborted':
        return; // onend will restart
      case 'audio-capture':
        // Desktop: our visualizer stream may be contending for the mic. Release it.
        this.stopAudioVisualizer();
        this.nextRestartDelay = 300;
        return;
      case 'network': {
        this.networkErrorCount += 1;
        if (this.networkErrorCount >= MAX_NETWORK_RETRIES) {
          this.fail('network-fatal', 'Browser speech service unreachable. Switching to AI Voice engine.');
          return;
        }
        this.nextRestartDelay = Math.min(5000, 500 * 2 ** (this.networkErrorCount - 1));
        return;
      }
      case 'not-allowed':
        this.fail('not-allowed', 'Microphone permission denied. Allow mic access and press Start again.');
        return;
      case 'service-not-allowed':
        this.fail('service-not-allowed', 'Browser speech service is blocked. Switching to AI Voice engine.');
        return;
      case 'language-not-supported':
        this.fail('not-supported', 'This language is not supported by browser speech. Switching to AI Voice engine.');
        return;
      default:
        this.nextRestartDelay = 500;
    }
  }

  handleEnd() {
    // This instance is finished: its result indexes die with it, so emitting pending text is safe.
    this.commitPending();

    if (!this.userActive) {
      this.isListening = false;
      if (this.onStatusChange) this.onStatusChange('idle');
      return;
    }

    const delay = this.nextRestartDelay ?? (this.isMobile ? 150 : 60);
    this.nextRestartDelay = null;
    if (this.restartTimeout) clearTimeout(this.restartTimeout);
    this.restartTimeout = setTimeout(() => {
      this.restartTimeout = null;
      if (!this.userActive) return;
      try {
        this.setupRecognitionInstance();
        this.safeStart();
      } catch (err) {
        console.warn('Recognition restart note:', err); // watchdog will retry
      }
    }, delay);
  }

  setupRecognitionInstance() {
    this.detachRecognition();
    this.resetInstanceState();

    const langInfo = getLanguageByCode(this.currentLanguage);
    const rec = new this.SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = langInfo?.speechCode || 'ar-EG';
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      this.lastActivity = Date.now();
      this.isListening = true;
      if (this.onStatusChange) this.onStatusChange('listening');
    };
    rec.onresult = (event) => this.handleResult(event);
    rec.onerror = (event) => this.handleError(event);
    rec.onend = () => this.handleEnd();

    this.recognition = rec;
  }

  commitSentence() {
    this.commitPending();
  }

  forceCommit() {
    this.commitPending();
  }

  changeLanguage(langCode) {
    if (this.currentLanguage === langCode) return;
    this.currentLanguage = langCode;
    this.commitPending();

    if (this.userActive) {
      if (this.restartTimeout) clearTimeout(this.restartTimeout);
      this.restartTimeout = setTimeout(() => {
        this.restartTimeout = null;
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
    this.commitPending();
    this.clearTimers();
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
    this.resetInstanceState();
    this.stopAudioVisualizer();
    if (this.onStatusChange) this.onStatusChange('idle');
  }
}

export const speechService = new SpeechService();
export { SpeechService };
