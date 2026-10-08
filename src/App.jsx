import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/layout/Header';
import { LanguageSelector } from './components/meeting/LanguageSelector';
import { LiveControlBar } from './components/meeting/LiveControlBar';
import { TranscriptFeed } from './components/meeting/TranscriptFeed';
import { SummaryModal } from './components/summary/SummaryModal';
import { HistoryDrawer } from './components/history/HistoryDrawer';
import { SettingsModal } from './components/settings/SettingsModal';
import { InstallModal } from './components/install/InstallModal';
import { SupportModal } from './components/support/SupportModal';
import { AIKeyGuideModal } from './components/settings/AIKeyGuideModal';
import { LectureNotesModal } from './components/lecture/LectureNotesModal';
import { ModeSelector } from './components/meeting/ModeSelector';
import { LiveTranslationOverlay } from './components/meeting/LiveTranslationOverlay';
import { FileAudio } from 'lucide-react';

import { speechService } from './services/speechService';
import { audioSegmentService } from './services/audioSegmentService';
import { translationEngine } from './services/translationEngine';
import { summarizerEngine } from './services/summarizerEngine';
import { ttsService } from './services/ttsService';
import { apiService } from './services/apiService';
import {
  saveMeeting,
  getAllMeetings,
  deleteMeeting,
  clearAllMeetings
} from './db/database';
import { getLanguageByCode } from './constants/languages';

export function App() {
  // Language selections
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('ar');
  const [generateSummary, setGenerateSummary] = useState(true);

  // Active translation mode: 'basic' | 'smart' | 'unlimited'
  const [activeMode, setActiveMode] = useState(() => {
    try {
      return localStorage.getItem('linguaflow_active_mode') || 'smart';
    } catch {
      return 'smart';
    }
  });

  // Live state
  const [isListening, setIsListening] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [meetingDuration, setMeetingDuration] = useState(0);
  const [entries, setEntries] = useState([]);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [interimTranslation, setInterimTranslation] = useState('');

  // Modals & Drawers
  const [activeSummary, setActiveSummary] = useState(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInstallOpen, setIsInstallOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isAIGuideOpen, setIsAIGuideOpen] = useState(false);
  const [isLectureModalOpen, setIsLectureModalOpen] = useState(false);
  const [pastMeetings, setPastMeetings] = useState([]);
  const [tipNotification, setTipNotification] = useState(null);
  const [fallbackNotice, setFallbackNotice] = useState(null);

  // Settings
  const [settings, setSettings] = useState({
    autoTTS: false,
    ttsRate: 1.0
  });

  // Voice Engine: 'browser' | 'ai_voice'
  // Auto-detect: browsers with native Web Speech API default to 'browser' for instant live streaming
  // Browsers without Web Speech API (like Firefox) default to 'ai_voice'
  const [voiceEngine, setVoiceEngine] = useState(() => {
    if (typeof navigator === 'undefined') return 'browser';
    const isFirefox = /Firefox/i.test(navigator.userAgent || '');
    const hasNoSpeech = typeof window !== 'undefined' && !(window.SpeechRecognition || window.webkitSpeechRecognition);
    return isFirefox || hasNoSpeech ? 'ai_voice' : 'browser';
  });

  const timerRef = useRef(null);
  const currentMeetingIdRef = useRef(null);
  const isListeningRef = useRef(false);
  const sessionIdRef = useRef(0);
  const voiceEngineRef = useRef(voiceEngine);

  useEffect(() => {
    voiceEngineRef.current = voiceEngine;
  }, [voiceEngine]);

  // Maintain refs for live callback access without re-binding
  const sourceLangRef = useRef(sourceLang);
  const targetLangRef = useRef(targetLang);
  const settingsRef = useRef(settings);
  const entriesRef = useRef(entries);
  const activeModeRef = useRef(activeMode);
  const interimDebounceRef = useRef(null);
  const interimReqIdRef = useRef(0);
  const interimAbortControllerRef = useRef(null);
  const latestInterimTranslationRef = useRef(null);
  const startAIVoiceListeningRef = useRef(null);

  // Check URL query parameters for Stripe checkout return (?tip=success or ?tip=cancelled)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const tipStatus = params.get('tip');
      if (tipStatus === 'success') {
        const amount = params.get('amount');
        setTipNotification({
          type: 'success',
          title: 'Contribution Received! 💖',
          message: amount
            ? `Thank you so much for your £${amount} tip! Your generous support directly helps keep LinguaFlow lively and free for everyone.`
            : 'Thank you so much for your generous support! Your contribution helps keep LinguaFlow lively and free for everyone.'
        });
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (tipStatus === 'cancelled') {
        setTipNotification({
          type: 'cancelled',
          title: 'Checkout Cancelled',
          message: 'No payment was processed. LinguaFlow remains 100% free to use anytime!'
        });
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch {}
  }, []);

  useEffect(() => {
    activeModeRef.current = activeMode;
    try {
      localStorage.setItem('linguaflow_active_mode', activeMode);
    } catch {}
  }, [activeMode]);

  // Ping backend on mount to wake up Render free tier
  useEffect(() => {
    apiService.pingHealth();
  }, []);

  useEffect(() => {
    sourceLangRef.current = sourceLang;
  }, [sourceLang]);

  useEffect(() => {
    targetLangRef.current = targetLang;
  }, [targetLang]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    entriesRef.current = entries;
  }, [entries]);

  // Load meeting history on mount
  useEffect(() => {
    loadMeetings();
  }, []);

  const loadMeetings = async () => {
    const list = await getAllMeetings();
    setPastMeetings(list);
  };

  // Setup SpeechService and Translation callbacks once on mount
  useEffect(() => {
    translationEngine.onFallbackNotice = (msg) => {
      setFallbackNotice(msg);
      setTimeout(() => setFallbackNotice(null), 5000);
    };

    speechService.onStatusChange = (status) => {
      const listening = status === 'listening';
      setIsListening(listening);
      isListeningRef.current = listening;
    };

    speechService.onVolumeChange = (vol) => {
      setVolumeLevel(vol);
    };

    speechService.onError = (err) => {
      console.warn('Speech recognition reported:', err);
      if (isListeningRef.current && startAIVoiceListeningRef.current) {
        setVoiceEngine('ai_voice');
        voiceEngineRef.current = 'ai_voice';
        setFallbackNotice('Browser speech recognition unavailable. Auto-switched to Universal AI Voice Engine.');
        setTimeout(() => setFallbackNotice(null), 5000);
        startAIVoiceListeningRef.current();
      } else {
        const msg = typeof err === 'string' ? err : err?.message;
        if (msg) {
          setFallbackNotice(msg);
          setTimeout(() => setFallbackNotice(null), 5000);
        }
        setIsListening(false);
        isListeningRef.current = false;
      }
    };

    speechService.onResult = async ({ transcript, isFinal }) => {
      if (!transcript || !transcript.trim()) return;
      const currentSession = sessionIdRef.current;
      const currentSrc = sourceLangRef.current;
      const currentTgt = targetLangRef.current;

      if (!isFinal) {
        setInterimTranscript(transcript);
        if (interimDebounceRef.current) {
          clearTimeout(interimDebounceRef.current);
        }
        if (interimAbortControllerRef.current) {
          interimAbortControllerRef.current.abort();
        }
        const abortController = new AbortController();
        interimAbortControllerRef.current = abortController;

        const reqId = ++interimReqIdRef.current;
        // Fast streaming speculative translation (130ms debounce for true real-time subtitles)
        interimDebounceRef.current = setTimeout(async () => {
          if (!isListeningRef.current || sessionIdRef.current !== currentSession) return;
          try {
            const specTranslation = await translationEngine.translate(
              transcript,
              currentSrc,
              currentTgt,
              'basic',
              abortController.signal
            );
            if (isListeningRef.current && sessionIdRef.current === currentSession && reqId === interimReqIdRef.current) {
              setInterimTranslation(specTranslation);
              latestInterimTranslationRef.current = { text: transcript, translation: specTranslation };
            }
          } catch (e) {
            // ignore abort errors
          }
        }, 130);
      } else {
        if (interimDebounceRef.current) {
          clearTimeout(interimDebounceRef.current);
          interimDebounceRef.current = null;
        }
        if (interimAbortControllerRef.current) {
          interimAbortControllerRef.current.abort();
          interimAbortControllerRef.current = null;
        }
        setInterimTranscript('');
        setInterimTranslation('');

        // Immediate zero-latency translation if preview was already translated during speech
        let immediateTranslation = '';
        if (
          latestInterimTranslationRef.current &&
          (latestInterimTranslationRef.current.text === transcript ||
            transcript.includes(latestInterimTranslationRef.current.text) ||
            latestInterimTranslationRef.current.text.includes(transcript))
        ) {
          immediateTranslation = latestInterimTranslationRef.current.translation;
        }

        const entryId = `entry-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
        const speakerNum = (entriesRef.current.length % 2) + 1;
        const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        // Add entry immediately with instant translated text if ready (ZERO LATENCY!)
        const initialEntry = {
          id: entryId,
          speaker: `Speaker ${speakerNum}`,
          timestamp: timeNow,
          text: transcript,
          translatedText: immediateTranslation
        };

        if (sessionIdRef.current !== currentSession) return;
        setEntries((prev) => [...prev, initialEntry]);

        // If in Smart / Unlimited AI mode, or if immediate translation was not ready, refine translation
        const mode = activeModeRef.current;
        if (!immediateTranslation || mode !== 'basic') {
          translationEngine
            .translate(transcript, currentSrc, currentTgt, mode)
            .then((translatedText) => {
              if (sessionIdRef.current === currentSession && translatedText) {
                setEntries((prev) =>
                  prev.map((item) => (item.id === entryId ? { ...item, translatedText: translatedText } : item))
                );

                if (settingsRef.current.autoTTS && translatedText) {
                  ttsService.speak(translatedText, currentTgt, { rate: settingsRef.current.ttsRate });
                }
              }
            })
            .catch((err) => console.error('Translation error:', err));
        } else if (immediateTranslation && settingsRef.current.autoTTS) {
          ttsService.speak(immediateTranslation, currentTgt, { rate: settingsRef.current.ttsRate });
        }
      }
    };

    return () => {
      speechService.stop();
      audioSegmentService.stop();
    };
  }, []); // Run ONLY once on mount!

  // Meeting duration timer
  useEffect(() => {
    if (isListening) {
      timerRef.current = setInterval(() => {
        setMeetingDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isListening]);

  // Controls & Voice Engine
  const startAIVoiceListening = (customSession) => {
    const session = customSession || sessionIdRef.current;
    audioSegmentService.onVolumeChange = (vol) => setVolumeLevel(vol);
    audioSegmentService.onStatusChange = (status) => {
      const listening = status === 'listening';
      setIsListening(listening);
      isListeningRef.current = listening;
    };
    audioSegmentService.onError = (err) => {
      console.warn('AI Voice service error:', err);
      setIsListening(false);
      isListeningRef.current = false;
      if (err?.message) {
        setFallbackNotice(err.message);
        setTimeout(() => setFallbackNotice(null), 5000);
      }
    };

    audioSegmentService.start(async ({ blob, mimeType, durationSeconds }) => {
      if (sessionIdRef.current !== session) return;
      const currentSrc = sourceLangRef.current;
      const currentTgt = targetLangRef.current;

      const entryId = `entry-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      const speakerNum = (entriesRef.current.length % 2) + 1;
      const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      const initialEntry = {
        id: entryId,
        speaker: `Speaker ${speakerNum}`,
        timestamp: timeNow,
        text: '🎙️ Processing speech clip...',
        translatedText: ''
      };
      setEntries((prev) => [...prev, initialEntry]);

      try {
        const result = await apiService.translateAudio({
          blob,
          mimeType,
          sourceLang: currentSrc,
          targetLang: currentTgt,
          sessionDurationSeconds: durationSeconds
        });

        if (sessionIdRef.current !== session) return;

        if (result.notYoruba && currentSrc === 'yo') {
          setEntries((prev) => prev.filter((item) => item.id !== entryId));
          setFallbackNotice("Didn't hear Yoruba speech. Please speak clearly in Yoruba.");
          setTimeout(() => setFallbackNotice(null), 4000);
          return;
        }

        if (result.transcript && result.translatedText) {
          setEntries((prev) =>
            prev.map((item) =>
              item.id === entryId
                ? { ...item, text: result.transcript, translatedText: result.translatedText }
                : item
            )
          );

          if (settingsRef.current.autoTTS && result.translatedText) {
            ttsService.speak(result.translatedText, currentTgt, { rate: settingsRef.current.ttsRate });
          }
        } else if (result.fallback && result.message) {
          setEntries((prev) => prev.filter((item) => item.id !== entryId));
          setFallbackNotice(result.message);
          setTimeout(() => setFallbackNotice(null), 5000);
        } else {
          setEntries((prev) => prev.filter((item) => item.id !== entryId));
        }
      } catch (err) {
        console.error('Audio translation error:', err);
        setEntries((prev) => prev.filter((item) => item.id !== entryId));
      }
    });
  };

  useEffect(() => {
    startAIVoiceListeningRef.current = startAIVoiceListening;
  });

  const handleToggleVoiceEngine = () => {
    if (isListening) return;
    setVoiceEngine((prev) => (prev === 'ai_voice' ? 'browser' : 'ai_voice'));
  };

  const handleStartListening = async () => {
    // Always start with a fresh clean screen and new session ID
    sessionIdRef.current += 1;
    const currentSession = sessionIdRef.current;
    isListeningRef.current = true;
    setEntries([]);
    setInterimTranscript('');
    setInterimTranslation('');
    setMeetingDuration(0);

    const isBrowserSTTSupported = speechService.isSupported();
    const shouldUseAIVoice =
      sourceLang === 'yo' ||
      voiceEngineRef.current === 'ai_voice' ||
      !isBrowserSTTSupported;

    if (shouldUseAIVoice) {
      if (voiceEngineRef.current !== 'ai_voice') {
        setVoiceEngine('ai_voice');
        voiceEngineRef.current = 'ai_voice';
      }
      startAIVoiceListening(currentSession);
    } else {
      // Actively confirm hardware mic permission on mobile and browser
      await speechService.requestMicPermission();
      if (!isListeningRef.current || sessionIdRef.current !== currentSession) return;
      speechService.start(sourceLang);
    }
  };

  const handleStopListening = () => {
    isListeningRef.current = false;
    speechService.stop();
    audioSegmentService.stop();
    if (interimDebounceRef.current) {
      clearTimeout(interimDebounceRef.current);
      interimDebounceRef.current = null;
    }
    if (interimAbortControllerRef.current) {
      interimAbortControllerRef.current.abort();
      interimAbortControllerRef.current = null;
    }
    // Auto produce summary if enabled and entries exist
    if (generateSummary && entries.length > 0) {
      handleProduceSummary();
    }
  };

  const handleFinishSentence = () => {
    const isBrowserSTTSupported = speechService.isSupported();
    if (voiceEngineRef.current === 'ai_voice' || sourceLangRef.current === 'yo' || !isBrowserSTTSupported) {
      audioSegmentService.flush();
    } else {
      speechService.forceCommit();
    }
  };

  const handleSourceChange = (newLang) => {
    const oldLang = sourceLang;
    setSourceLang(newLang);
    const isBrowserSTTSupported = speechService.isSupported();
    if (isListening) {
      if (voiceEngineRef.current === 'ai_voice' || !isBrowserSTTSupported || oldLang === 'yo' || newLang === 'yo') {
        audioSegmentService.stop();
        speechService.stop();
        setTimeout(() => {
          if (isListeningRef.current) {
            handleStartListening();
          }
        }, 150);
      } else {
        speechService.changeLanguage(newLang);
      }
    }
  };

  const handleSwapLanguages = () => {
    const oldSource = sourceLang;
    const oldTarget = targetLang;
    setSourceLang(oldTarget);
    setTargetLang(oldSource);
    const isBrowserSTTSupported = speechService.isSupported();
    if (isListening) {
      if (voiceEngineRef.current === 'ai_voice' || !isBrowserSTTSupported || oldSource === 'yo' || oldTarget === 'yo') {
        audioSegmentService.stop();
        speechService.stop();
        setTimeout(() => {
          if (isListeningRef.current) {
            handleStartListening();
          }
        }, 150);
      } else {
        speechService.changeLanguage(oldTarget);
      }
    }
  };

  const handleClearTranscript = () => {
    if (window.confirm('Clear current live transcript?')) {
      sessionIdRef.current += 1;
      setEntries([]);
      setMeetingDuration(0);
      setInterimTranscript('');
      setInterimTranslation('');
      ttsService.stop();
    }
  };

  // Simulation Mode for testing sample meeting dialogues
  const handleSimulateMeeting = async () => {
    const srcInfo = getLanguageByCode(sourceLang);
    const samplePhrases = srcInfo.samplePhrases || [
      'Good morning everyone, let us review the project milestones.',
      'We need to finalize the budget by next Friday.',
      'The client requested an update on the multilingual interface.',
      'Let us assign the action items before concluding this sync.'
    ];

    // Pick a phrase and translate it
    const randomPhrase = samplePhrases[entries.length % samplePhrases.length];
    const translated = await translationEngine.translate(randomPhrase, sourceLang, targetLang, activeModeRef.current);

    const simulatedEntry = {
      id: `sim-${Date.now()}`,
      speaker: `Speaker ${(entries.length % 2) + 1}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      text: randomPhrase,
      translatedText: translated
    };

    setEntries((prev) => [...prev, simulatedEntry]);

    if (settings.autoTTS && translated) {
      ttsService.speak(translated, targetLang, { rate: settings.ttsRate });
    }
  };

  // Conversational Summary Producer
  const handleProduceSummary = async () => {
    if (entries.length === 0) return;
    setIsSummarizing(true);

    try {
      const summary = await summarizerEngine.generateSummary(entries, {
        sourceLang,
        targetLang,
        durationSeconds: meetingDuration
      });

      setActiveSummary(summary);

      // Save meeting to IndexedDB
      const mins = Math.floor(meetingDuration / 60);
      const secs = meetingDuration % 60;
      const durationFormatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

      const meetingRecord = {
        title: `Meeting (${getLanguageByCode(sourceLang).name} ➜ ${getLanguageByCode(targetLang).name})`,
        sourceLang,
        targetLang,
        durationSeconds: meetingDuration,
        durationFormatted,
        entries: entries,
        summary: summary,
        hasSummary: true
      };

      await saveMeeting(meetingRecord);
      await loadMeetings();
    } catch (err) {
      console.error('Failed to generate summary:', err);
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleSpeakText = (text, lang) => {
    ttsService.speak(text, lang, { rate: settings.ttsRate });
  };

  const handleSelectPastMeeting = (meeting) => {
    setEntries(meeting.entries || []);
    setSourceLang(meeting.sourceLang);
    setTargetLang(meeting.targetLang);
    if (meeting.summary) {
      setActiveSummary(meeting.summary);
    }
    setIsHistoryOpen(false);
  };

  const handleDeleteMeeting = async (id) => {
    await deleteMeeting(id);
    await loadMeetings();
  };

  const handleClearAllMeetings = async () => {
    if (window.confirm('Delete all past meeting records?')) {
      await clearAllMeetings();
      await loadMeetings();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-blue-500/30">
      {/* Top Header */}
      <Header
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenInstall={() => setIsInstallOpen(true)}
        onOpenSupport={() => setIsSupportOpen(true)}
        onOpenAIGuide={() => setIsAIGuideOpen(true)}
        onOpenLectureNotes={() => setIsLectureModalOpen(true)}
        isListening={isListening}
        meetingDuration={meetingDuration}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 flex flex-col space-y-4">
        {/* Language & Summary Bar */}
        <LanguageSelector
          sourceLang={sourceLang}
          targetLang={targetLang}
          onSourceChange={handleSourceChange}
          onTargetChange={setTargetLang}
          onSwapLanguages={handleSwapLanguages}
          generateSummary={generateSummary}
          onToggleSummary={setGenerateSummary}
          disabled={false}
        />

        {/* 3-Mode Selector (Basic, Smart, Unlimited) */}
        <ModeSelector
          activeMode={activeMode}
          onSelectMode={setActiveMode}
          onOpenAIGuide={() => setIsAIGuideOpen(true)}
          onOpenSupport={() => setIsSupportOpen(true)}
          isListening={isListening}
        />

        {/* Lecture & Audio File Mode Banner (Placeholder) */}
        <div
          onClick={() => setIsLectureModalOpen(true)}
          className="w-full p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-violet-950/30 via-slate-900/80 to-indigo-950/30 border border-violet-500/25 hover:border-violet-500/50 text-left cursor-pointer transition-all hover:scale-[1.005] active:scale-[0.995] flex items-center justify-between group shadow-lg shadow-violet-950/10"
        >
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-violet-500/15 text-violet-400 flex items-center justify-center border border-violet-500/30 group-hover:scale-105 transition-transform shrink-0">
              <FileAudio className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs sm:text-sm font-bold text-white">Audio / Video File & Lecture Notes</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  Coming Soon
                </span>
              </div>
              <p className="text-[11px] text-slate-400 m-0 leading-relaxed">
                Upload audio/video files or record voice memos offline — get full transcripts, translation, and structured lecture summaries.
              </p>
            </div>
          </div>
          <div className="text-xs font-semibold text-violet-400 group-hover:text-violet-300 group-hover:translate-x-1 transition-all flex items-center space-x-1 shrink-0 ml-3">
            <span className="hidden sm:inline">Preview</span>
            <span>&rarr;</span>
          </div>
        </div>

        {/* Live Audio & Meeting Control Bar */}
        <LiveControlBar
          isListening={isListening}
          volumeLevel={volumeLevel}
          onStartListening={handleStartListening}
          onStopListening={handleStopListening}
          onFinishSentence={handleFinishSentence}
          onClearTranscript={handleClearTranscript}
          onSimulateMeeting={handleSimulateMeeting}
          hasEntries={entries.length > 0}
          generateSummary={generateSummary}
          onProduceSummary={handleProduceSummary}
          isSummarizing={isSummarizing}
          voiceEngine={voiceEngine}
          onToggleVoiceEngine={handleToggleVoiceEngine}
          sourceLang={sourceLang}
        />

        {/* Live Transcript & Translation Feed */}
        <TranscriptFeed
          entries={entries}
          interimTranscript={interimTranscript}
          interimTranslation={interimTranslation}
          sourceLang={sourceLang}
          targetLang={targetLang}
          onSpeakText={handleSpeakText}
          isListening={isListening}
        />
      </main>

      {/* Summary Modal */}
      {activeSummary && (
        <SummaryModal
          summary={activeSummary}
          targetLang={targetLang}
          onClose={() => {
            sessionIdRef.current += 1;
            setActiveSummary(null);
            setEntries([]);
            setInterimTranscript('');
            setInterimTranslation('');
            setMeetingDuration(0);
          }}
          onSaveToHistory={() => {
            sessionIdRef.current += 1;
            loadMeetings();
            setEntries([]);
            setInterimTranscript('');
            setInterimTranslation('');
            setMeetingDuration(0);
          }}
        />
      )}

      {/* History Drawer */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        meetings={pastMeetings}
        onSelectMeeting={handleSelectPastMeeting}
        onDeleteMeeting={handleDeleteMeeting}
        onClearAll={handleClearAllMeetings}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={setSettings}
        onOpenAIGuide={() => setIsAIGuideOpen(true)}
        onOpenSupport={() => setIsSupportOpen(true)}
      />

      {/* AI Key Setup Guide Modal */}
      <AIKeyGuideModal
        isOpen={isAIGuideOpen}
        onClose={() => setIsAIGuideOpen(false)}
        onSaveSuccess={() => {
          // Re-render settings or state if needed
        }}
      />

      {/* Support / Tip Developer Modal */}
      <SupportModal
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
      />

      {/* Full-Screen Immersive Live Translation Overlay */}
      <LiveTranslationOverlay
        isOpen={isListening}
        onExit={handleStopListening}
        entries={entries}
        interimTranscript={interimTranscript}
        interimTranslation={interimTranslation}
        sourceLang={sourceLang}
        targetLang={targetLang}
        volumeLevel={volumeLevel}
        meetingDuration={meetingDuration}
        onFinishSentence={handleFinishSentence}
        onProduceSummary={handleProduceSummary}
        isSummarizing={isSummarizing}
        generateSummary={generateSummary}
        activeMode={activeMode}
        onSpeakText={handleSpeakText}
        autoTTS={settings.autoTTS}
        onToggleAutoTTS={() => setSettings((s) => ({ ...s, autoTTS: !s.autoTTS }))}
      />

      {/* PWA / APK Installation Modal */}
      <InstallModal
        isOpen={isInstallOpen}
        onClose={() => setIsInstallOpen(false)}
      />

      {/* Lecture & Audio File Transcriber Modal (Placeholder) */}
      <LectureNotesModal
        isOpen={isLectureModalOpen}
        onClose={() => setIsLectureModalOpen(false)}
      />

      {/* Tip Feedback Notification Dialog */}
      {tipNotification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-md w-full p-6 sm:p-8 text-center space-y-5 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center text-3xl border border-rose-500/30 shadow-lg shadow-rose-500/20">
              {tipNotification.type === 'success' ? '💖' : 'ℹ️'}
            </div>
            <h3 className="text-2xl font-black text-white m-0">
              {tipNotification.title}
            </h3>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed m-0">
              {tipNotification.message}
            </p>
            <button
              onClick={() => setTipNotification(null)}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 via-pink-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-black text-base shadow-xl shadow-rose-600/20 transition-all cursor-pointer active:scale-98"
            >
              Continue to LinguaFlow
            </button>
          </div>
        </div>
      )}

      {/* Smart Mode Fallback Notification Toast */}
      {fallbackNotice && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs sm:text-sm font-semibold shadow-xl backdrop-blur-md flex items-center space-x-2 animate-fadeIn max-w-[90vw]">
          <span>⚡</span>
          <span>{fallbackNotice}</span>
          <button
            onClick={() => setFallbackNotice(null)}
            className="text-amber-400 hover:text-white ml-2 text-xs font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
