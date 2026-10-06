// Audio Segment Service: Microphone audio chunker with Voice Activity Detection (VAD)
// Used for languages not supported by browser Web Speech API (like Yoruba)

class AudioSegmentService {
  constructor() {
    this.isListening = false;
    this.stream = null;
    this.audioContext = null;
    this.analyser = null;
    this.mediaRecorder = null;
    this.chunks = [];
    this.mimeType = 'audio/webm';
    this.speechDetected = false;
    this.segmentStartTime = 0;
    this.silenceTimer = null;
    this.volumeCheckInterval = null;

    // Callbacks
    this.onSegment = null;
    this.onStatusChange = null;
    this.onVolumeChange = null;
    this.onError = null;
  }

  getBestMimeType() {
    if (typeof MediaRecorder === 'undefined') return 'audio/webm';
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return 'audio/webm;codecs=opus';
    if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm';
    if (MediaRecorder.isTypeSupported('audio/mp4')) return 'audio/mp4';
    return '';
  }

  async start(onSegment) {
    if (this.isListening) return;
    this.onSegment = onSegment;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      this.mimeType = this.getBestMimeType();
      this.isListening = true;
      if (this.onStatusChange) this.onStatusChange('listening');

      this.initAudioAnalyser();
      this.startNewRecordingSegment();
      return true;
    } catch (err) {
      console.error('Failed to access microphone for audio segmentation:', err);
      this.stop();
      if (this.onError) {
        this.onError({ code: 'mic_denied', message: 'Microphone permission denied.' });
      }
      return false;
    }
  }

  initAudioAnalyser() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx || !this.stream) return;

      this.audioContext = new AudioCtx();
      const source = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);

      const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      const SILENCE_THRESHOLD = 8; // Out of 100 volume scale
      const PAUSE_DURATION_MS = 900; // 0.9s responsive pause (keeps up with videos)

      this.volumeCheckInterval = setInterval(() => {
        if (!this.analyser || !this.isListening) return;

        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalizedVolume = Math.min(100, Math.round((avg / 128) * 100));

        if (this.onVolumeChange) {
          this.onVolumeChange(normalizedVolume);
        }

        // Voice activity detection
        if (normalizedVolume > SILENCE_THRESHOLD) {
          this.speechDetected = true;
          if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
          }

          // Responsive auto-flush: If continuous speech exceeds 3.5 seconds, flush segment so video sentences stream continuously
          const elapsed = Date.now() - this.segmentStartTime;
          if (elapsed >= 3500 && this.isListening) {
            this.flush();
          }
        } else if (this.speechDetected && !this.silenceTimer) {
          // Speech was active, now silent: start silence countdown
          this.silenceTimer = setTimeout(() => {
            this.silenceTimer = null;
            if (this.speechDetected && this.isListening) {
              this.flush();
            }
          }, PAUSE_DURATION_MS);
        }
      }, 70);
    } catch (err) {
      console.warn('AudioAnalyser could not be initialized:', err);
    }
  }

  startNewRecordingSegment() {
    if (!this.stream || !this.isListening) return;

    this.chunks = [];
    this.speechDetected = false;
    this.segmentStartTime = Date.now();

    try {
      const options = {
        audioBitsPerSecond: 32000
      };
      if (this.mimeType) {
        options.mimeType = this.mimeType;
      }
      this.mediaRecorder = new MediaRecorder(this.stream, options);

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.chunks.push(e.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        const durationMs = Date.now() - this.segmentStartTime;
        // Ignore clips shorter than 600ms or with no detected speech to save server quota
        if (this.chunks.length > 0 && durationMs >= 600 && this.speechDetected) {
          const blob = new Blob(this.chunks, { type: this.mimeType || 'audio/webm' });
          if (this.onSegment) {
            this.onSegment({
              blob,
              mimeType: this.mimeType || 'audio/webm',
              durationSeconds: Math.round(durationMs / 1000)
            });
          }
        }
        this.chunks = [];
        this.speechDetected = false;

        // Automatically start recording the next sentence if still active
        if (this.isListening) {
          this.startNewRecordingSegment();
        }
      };

      this.mediaRecorder.start(250); // Timeslice 250ms
    } catch (err) {
      console.error('Failed to start MediaRecorder segment:', err);
    }
  }

  // Immediately commit current segment (triggered by Done Speaking or Silence)
  flush() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      try {
        this.mediaRecorder.stop();
      } catch (e) {
        // ignore
      }
    }
  }

  stop() {
    this.isListening = false;

    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    if (this.volumeCheckInterval) {
      clearInterval(this.volumeCheckInterval);
      this.volumeCheckInterval = null;
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.onstop = null; // Don't trigger onstop callback during full stop
        this.mediaRecorder.stop();
      } catch (e) {
        // ignore
      }
      this.mediaRecorder = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
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
    if (this.onStatusChange) this.onStatusChange('idle');
  }
}

export const audioSegmentService = new AudioSegmentService();
