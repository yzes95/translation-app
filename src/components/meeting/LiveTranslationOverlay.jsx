import React, { useRef, useEffect, useState } from 'react';
import {
  X,
  Square,
  Volume2,
  VolumeX,
  Copy,
  Check,
  CheckCircle2,
  Sparkles,
  User,
  ArrowRight,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { isRTL, getLanguageByCode } from '../../constants/languages';

export const LiveTranslationOverlay = ({
  isOpen,
  onExit,
  entries,
  interimTranscript,
  interimTranslation,
  sourceLang,
  targetLang,
  volumeLevel,
  meetingDuration,
  onFinishSentence,
  onProduceSummary,
  isSummarizing,
  generateSummary,
  activeMode, // 'basic' | 'smart' | 'unlimited'
  onSpeakText,
  autoTTS,
  onToggleAutoTTS
}) => {
  const scrollRef = useRef(null);
  const [copiedId, setCopiedId] = useState(null);

  const sourceLangInfo = getLanguageByCode(sourceLang);
  const targetLangInfo = getLanguageByCode(targetLang);

  const isTargetRTL = isRTL(targetLang);
  const isSourceRTL = isRTL(sourceLang);

  // Auto-scroll to bottom as dialogue flows
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries, interimTranscript, interimTranslation]);

  if (!isOpen) return null;

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleCopy = (id, text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Waveform bars
  const bars = [0.4, 0.7, 1.0, 0.8, 1.2, 0.9, 0.6, 0.3];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex flex-col text-slate-100 animate-fadeIn">
      {/* 1. Top Bar: Header, Timer & Exit Button */}
      <header className="px-4 py-3 sm:px-8 sm:py-4 border-b border-slate-800/80 bg-slate-900/60 flex items-center justify-between shrink-0">
        {/* Left: Language Pair & Mode */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700/80 text-xs sm:text-sm font-semibold">
            <span>{sourceLangInfo.flag} {sourceLangInfo.name}</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-blue-400">{targetLangInfo.flag} {targetLangInfo.name}</span>
          </div>

          <span className="hidden sm:inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
            <span>{activeMode === 'smart' ? '⭐ Smart AI' : activeMode === 'unlimited' ? '♾️ Unlimited' : '🟢 Basic'}</span>
          </span>
        </div>

        {/* Center: Live REC & Audio Waveform */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
            </span>
            <span className="text-xs font-bold text-red-400">REC</span>
            <span className="text-xs font-mono font-bold text-white border-l border-red-500/30 pl-2">
              {formatTimer(meetingDuration)}
            </span>
          </div>

          {/* Sound Wave */}
          <div className="hidden md:flex h-6 items-center space-x-1 px-2.5 py-1 bg-slate-900 rounded-lg border border-slate-800">
            {bars.map((scale, i) => {
              const height = Math.max(3, Math.min(22, (volumeLevel * scale * 0.3) + 4));
              return (
                <span
                  key={i}
                  style={{ height: `${height}px` }}
                  className="w-1 rounded-full bg-gradient-to-t from-blue-500 to-indigo-400 transition-all duration-75"
                />
              );
            })}
          </div>
        </div>

        {/* Right: Exit Translation Button */}
        <div className="flex items-center space-x-2">
          {/* TTS Sound Toggle */}
          <button
            onClick={onToggleAutoTTS}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              autoTTS
                ? 'bg-blue-600/20 border-blue-500/40 text-blue-300'
                : 'bg-slate-800/80 border-slate-700/80 text-slate-400 hover:text-slate-200'
            }`}
            title={autoTTS ? 'Auto voice playback: ON' : 'Auto voice playback: OFF'}
          >
            {autoTTS ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Primary Red Exit Button */}
          <button
            onClick={onExit}
            className="flex items-center space-x-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-red-600/25 active:scale-95 transition-all cursor-pointer"
          >
            <Square className="w-4 h-4 fill-current" />
            <span>Exit Translation</span>
          </button>
        </div>
      </header>

      {/* 2. Main Stage: Big Full-Page Scale Translations */}
      <main
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8 max-w-5xl w-full mx-auto space-y-6 flex flex-col justify-start"
      >
        {/* Empty state while waiting for first speech */}
        {entries.length === 0 && !interimTranscript && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3">
            <div className="w-16 h-16 rounded-3xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 animate-pulse">
              <span className="text-2xl">🎙️</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">Listening in Real-Time...</h2>
            <p className="text-sm text-slate-400 max-w-md">
              Start speaking in <strong>{sourceLangInfo.name}</strong>. Translations will appear in large full-screen subtitles here.
            </p>
          </div>
        )}

        {/* Existing dialogue cards in big readable scale */}
        {entries.map((entry) => {
          return (
            <div
              key={entry.id}
              className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl space-y-3 transition-all animate-fadeIn"
            >
              {/* Speaker & Timestamp */}
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-full bg-indigo-600/30 text-indigo-300 font-bold text-xs flex items-center justify-center border border-indigo-500/30">
                    <User className="w-4 h-4" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-indigo-300">
                    {entry.speaker}
                  </span>
                  <span className="text-xs text-slate-500">{entry.timestamp}</span>
                </div>

                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => onSpeakText(entry.translatedText || entry.text, targetLang)}
                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-blue-400 transition-colors"
                    title="Speak translation"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleCopy(entry.id, entry.translatedText || entry.text)}
                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                    title="Copy translation"
                  >
                    {copiedId === entry.id ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Big Translated Text */}
              <div
                dir={isTargetRTL ? 'rtl' : 'ltr'}
                className="text-xl sm:text-2xl md:text-3xl font-semibold text-white tracking-normal leading-relaxed"
              >
                {entry.translatedText ? (
                  <span className="text-white">{entry.translatedText}</span>
                ) : (
                  <span className="text-slate-500 italic text-base">Translating...</span>
                )}
              </div>

              {/* Original spoken text below in secondary scale */}
              <div
                dir={isSourceRTL ? 'rtl' : 'ltr'}
                className="text-sm sm:text-base text-slate-400 pt-1 border-t border-slate-800/40"
              >
                <span className="text-slate-500 text-xs font-bold uppercase tracking-wider block mb-0.5">
                  Original ({sourceLangInfo.name}):
                </span>
                <span className="text-slate-300">{entry.text}</span>
              </div>
            </div>
          );
        })}

        {/* Live Interim Speaking Card (Grows & Updates in Real-Time) */}
        {interimTranscript && (
          <div className="bg-gradient-to-r from-blue-950/40 to-indigo-950/40 border border-blue-500/40 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-3 animate-pulse ring-1 ring-blue-500/30">
            <div className="flex items-center justify-between border-b border-blue-500/20 pb-2">
              <div className="flex items-center space-x-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                <span className="text-xs font-bold text-blue-300">Live Speaking Now...</span>
              </div>
              <button
                onClick={onFinishSentence}
                className="px-3 py-1 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow transition-all cursor-pointer"
              >
                Done Speaking ➜
              </button>
            </div>

            {/* Live Speculative Translation in Big Font */}
            <div
              dir={isTargetRTL ? 'rtl' : 'ltr'}
              className="text-xl sm:text-2xl md:text-3xl font-semibold text-blue-100 leading-relaxed"
            >
              {interimTranslation || <span className="opacity-60 italic text-base">Interpreting...</span>}
            </div>

            {/* Interim Transcript */}
            <div dir={isSourceRTL ? 'rtl' : 'ltr'} className="text-sm sm:text-base text-slate-300">
              <span className="text-slate-400 italic">"{interimTranscript}"</span>
            </div>
          </div>
        )}
      </main>

      {/* 3. Bottom Action Bar: Done Speaking & Produce Summary */}
      <footer className="px-4 py-3 sm:px-8 sm:py-4 border-t border-slate-800/80 bg-slate-900/70 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          {/* Manual Done Speaking Button */}
          <button
            onClick={onFinishSentence}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 text-xs sm:text-sm font-bold transition-all active:scale-95 cursor-pointer shadow"
            title="Finish sentence immediately"
          >
            <CheckCircle2 className="w-4 h-4 text-blue-400" />
            <span>Done Speaking</span>
          </button>
        </div>

        <div className="flex items-center space-x-2">
          {/* Produce Summary Button if allowed */}
          {entries.length > 0 && generateSummary && (
            <button
              onClick={onProduceSummary}
              disabled={isSummarizing}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 font-bold text-xs sm:text-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow"
            >
              <Sparkles className={`w-4 h-4 text-indigo-400 ${isSummarizing ? 'animate-spin' : ''}`} />
              <span>{isSummarizing ? 'Producing Summary...' : 'Produce Summary'}</span>
            </button>
          )}

          {/* Quick Exit Button */}
          <button
            onClick={onExit}
            className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-red-600/80 text-slate-300 hover:text-white text-xs sm:text-sm font-semibold transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>Stop & Exit</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
