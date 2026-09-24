import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/layout/Header';
import { LanguageSelector } from './components/meeting/LanguageSelector';
import { LiveControlBar } from './components/meeting/LiveControlBar';
import { TranscriptFeed } from './components/meeting/TranscriptFeed';
import { SummaryModal } from './components/summary/SummaryModal';
import { HistoryDrawer } from './components/history/HistoryDrawer';
import { SettingsModal } from './components/settings/SettingsModal';
import { InstallModal } from './components/install/InstallModal';

import { speechService } from './services/speechService';
import { translationEngine } from './services/translationEngine';
import { summarizerEngine } from './services/summarizerEngine';
import { ttsService } from './services/ttsService';
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
  const [pastMeetings, setPastMeetings] = useState([]);

  // Settings
  const [settings, setSettings] = useState({
    autoTTS: false,
    ttsRate: 1.0
  });

  const timerRef = useRef(null);
  const currentMeetingIdRef = useRef(null);

  // Load meeting history on mount
  useEffect(() => {
    loadMeetings();
  }, []);

  const loadMeetings = async () => {
    const list = await getAllMeetings();
    setPastMeetings(list);
  };

  // Setup SpeechService callbacks
  useEffect(() => {
    speechService.onStatusChange = (status) => {
      setIsListening(status === 'listening');
    };

    speechService.onVolumeChange = (vol) => {
      setVolumeLevel(vol);
    };

    speechService.onError = (err) => {
      console.warn('Speech recognition reported:', err);
    };

    speechService.onResult = async ({ transcript, isFinal }) => {
      if (!transcript || !transcript.trim()) return;

      if (!isFinal) {
        setInterimTranscript(transcript);
        // Fast speculative translation for interim text
        const specTranslation = await translationEngine.translate(transcript, sourceLang, targetLang);
        setInterimTranslation(specTranslation);
      } else {
        setInterimTranscript('');
        setInterimTranslation('');

        // Final translation
        const translatedText = await translationEngine.translate(transcript, sourceLang, targetLang);

        const newEntry = {
          id: `entry-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          speaker: `Speaker ${entries.length % 2 === 0 ? '1' : '2'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          text: transcript,
          translatedText: translatedText
        };

        setEntries((prev) => [...prev, newEntry]);

        if (settings.autoTTS && translatedText) {
          ttsService.speak(translatedText, targetLang, { rate: settings.ttsRate });
        }
      }
    };

    return () => {
      speechService.stop();
    };
  }, [sourceLang, targetLang, settings, entries.length]);

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

  // Controls
  const handleStartListening = () => {
    speechService.start(sourceLang);
  };

  const handleStopListening = () => {
    speechService.stop();
    // Auto produce summary if enabled and entries exist
    if (generateSummary && entries.length > 0) {
      handleProduceSummary();
    }
  };

  const handleSwapLanguages = () => {
    const oldSource = sourceLang;
    setSourceLang(targetLang);
    setTargetLang(oldSource);
    if (isListening) {
      speechService.changeLanguage(targetLang);
    }
  };

  const handleClearTranscript = () => {
    if (window.confirm('Clear current live transcript?')) {
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
    const translated = await translationEngine.translate(randomPhrase, sourceLang, targetLang);

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
        isListening={isListening}
        meetingDuration={meetingDuration}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 flex flex-col space-y-4">
        {/* Language & Summary Bar */}
        <LanguageSelector
          sourceLang={sourceLang}
          targetLang={targetLang}
          onSourceChange={setSourceLang}
          onTargetChange={setTargetLang}
          onSwapLanguages={handleSwapLanguages}
          generateSummary={generateSummary}
          onToggleSummary={setGenerateSummary}
          disabled={isListening}
        />

        {/* Live Audio & Meeting Control Bar */}
        <LiveControlBar
          isListening={isListening}
          volumeLevel={volumeLevel}
          onStartListening={handleStartListening}
          onStopListening={handleStopListening}
          onClearTranscript={handleClearTranscript}
          onSimulateMeeting={handleSimulateMeeting}
          hasEntries={entries.length > 0}
          generateSummary={generateSummary}
          onProduceSummary={handleProduceSummary}
          isSummarizing={isSummarizing}
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
          onClose={() => setActiveSummary(null)}
          onSaveToHistory={() => loadMeetings()}
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
      />

      {/* PWA / APK Installation Modal */}
      <InstallModal
        isOpen={isInstallOpen}
        onClose={() => setIsInstallOpen(false)}
      />
    </div>
  );
}

export default App;
