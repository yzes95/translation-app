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
  Eye,
  EyeOff,
  Tv,
  ListFilter
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
  // Option: show original spoken language (default: FALSE - only shows translation)
  const [showOriginal, setShowOriginal] = useState(false);
  // View mode: 'subtitles' (Cinema Subtitle Mode) vs 'transcript' (Full List)
  const [viewMode, setViewMode] = useState('subtitles');
  // Subtitle font size scale: 'normal' | 'large' | 'huge'
  const [subtitleSize, setSubtitleSize] = useState('large');
  const [copiedId, setCopiedId] = useState(null);

  const scrollRef = useRef(null);

  const sourceLangInfo = getLanguageByCode(sourceLang);
  const targetLangInfo = getLanguageByCode(targetLang);

  const isTargetRTL = isRTL(targetLang);
  const isSourceRTL = isRTL(sourceLang);

  // Auto-scroll in transcript mode
  useEffect(() => {
    if (viewMode === 'transcript' && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries, interimTranscript, interimTranslation, viewMode]);

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

  // Determine active translation vs previous sentence for Subtitle Mode
  const isSpeakingNow = !!interimTranscript;

  let activeTranslation = '';
  let activeOriginal = '';
  let previousTranslation = '';
  let previousOriginal = '';

  if (isSpeakingNow) {
    activeTranslation = interimTranslation || '...';
    activeOriginal = interimTranscript;
    if (entries.length > 0) {
      const prev = entries[entries.length - 1];
      previousTranslation = prev.translatedText;
      previousOriginal = prev.text;
    }
  } else if (entries.length > 0) {
    const last = entries[entries.length - 1];
    activeTranslation = last.translatedText;
    activeOriginal = last.text;
    if (entries.length > 1) {
      const prev = entries[entries.length - 2];
      previousTranslation = prev.translatedText;
      previousOriginal = prev.text;
    }
  }

  // Audio wave visualizer bars
  const bars = [0.4, 0.7, 1.0, 0.8, 1.2, 0.9, 0.6, 0.3];

  // Proportional font sizes: 1:3 scale for previous/old, 2:3 scale for active/new
  const oldFontClasses = {
    normal: 'text-xl sm:text-2xl md:text-3xl lg:text-4xl',
    large: 'text-2xl sm:text-3xl md:text-4xl lg:text-5xl',
    huge: 'text-3xl sm:text-4xl md:text-5xl lg:text-6xl'
  };

  const newFontClasses = {
    normal: 'text-4xl sm:text-6xl md:text-7xl lg:text-8xl',
    large: 'text-5xl sm:text-7xl md:text-8xl lg:text-9xl',
    huge: 'text-6xl sm:text-8xl md:text-9xl lg:text-[10rem]'
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col text-slate-100 select-none animate-fadeIn">
      {/* 1. Cinema Top Bar */}
      <header className="px-4 py-3 sm:px-8 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md flex items-center justify-between shrink-0">
        {/* Left: Languages & View Mode Toggle */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm font-semibold">
            <span>{sourceLangInfo.flag} {sourceLangInfo.name}</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-blue-400">{targetLangInfo.flag} {targetLangInfo.name}</span>
          </div>

          {/* Subtitles vs Transcript Mode Switcher */}
          <div className="hidden sm:flex bg-slate-900 p-0.5 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setViewMode('subtitles')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg font-medium transition-all ${
                viewMode === 'subtitles'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>Subtitles</span>
            </button>
            <button
              onClick={() => setViewMode('transcript')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg font-medium transition-all ${
                viewMode === 'transcript'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>Transcript</span>
            </button>
          </div>
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

          {/* Audio Waveform */}
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

        {/* Right: Controls & Exit Button */}
        <div className="flex items-center space-x-2">
          {/* Toggle Show Original Spoken Language (Default: OFF) */}
          <button
            onClick={() => setShowOriginal(!showOriginal)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
              showOriginal
                ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle showing original spoken language"
          >
            {showOriginal ? <Eye className="w-3.5 h-3.5 text-indigo-400" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">{showOriginal ? 'Original: ON' : 'Original: OFF'}</span>
          </button>

          {/* Subtitle Size Selector */}
          {viewMode === 'subtitles' && (
            <div className="hidden lg:flex items-center space-x-1 bg-slate-900 p-0.5 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setSubtitleSize('normal')}
                className={`px-2 py-1 rounded-lg ${subtitleSize === 'normal' ? 'bg-slate-800 text-white font-bold' : 'text-slate-500'}`}
              >
                A
              </button>
              <button
                onClick={() => setSubtitleSize('large')}
                className={`px-2 py-1 rounded-lg ${subtitleSize === 'large' ? 'bg-slate-800 text-white font-bold' : 'text-slate-500'}`}
              >
                A+
              </button>
              <button
                onClick={() => setSubtitleSize('huge')}
                className={`px-2 py-1 rounded-lg ${subtitleSize === 'huge' ? 'bg-slate-800 text-white font-bold' : 'text-slate-500'}`}
              >
                A++
              </button>
            </div>
          )}

          {/* TTS Sound Toggle */}
          <button
            onClick={onToggleAutoTTS}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              autoTTS
                ? 'bg-blue-600/20 border-blue-500/40 text-blue-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title={autoTTS ? 'Auto voice playback: ON' : 'Auto voice playback: OFF'}
          >
            {autoTTS ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Primary Exit Translation Button */}
          <button
            onClick={onExit}
            className="flex items-center space-x-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-red-600/25 active:scale-95 transition-all cursor-pointer"
          >
            <Square className="w-4 h-4 fill-current" />
            <span>Exit Translation</span>
          </button>
        </div>
      </header>

      {/* 2. Main Stage: Cinema Subtitle View (1:3 for Old, 2:3 for New) */}
      {viewMode === 'subtitles' ? (
        <main className="flex-1 flex flex-col w-full h-full overflow-hidden select-none">
          {/* Top 1/3: Old / Previous Sentence (1/3 Screen Height, 1/3 Text Scale) */}
          <section className="basis-1/3 h-1/3 min-h-[30%] max-h-[35%] w-full border-b border-slate-900/80 bg-slate-950/70 flex flex-col justify-center items-center px-6 sm:px-12 md:px-20 text-center relative overflow-y-auto">
            <span className="absolute top-2 left-4 sm:left-8 text-[10px] tracking-widest font-mono text-slate-600 uppercase select-none">
              Previous
            </span>

            {previousTranslation ? (
              <div className="w-full max-w-5xl mx-auto space-y-2">
                <div
                  dir={isTargetRTL ? 'rtl' : 'ltr'}
                  className={`${oldFontClasses[subtitleSize]} text-slate-400 font-semibold opacity-70 tracking-tight leading-snug transition-all duration-200`}
                >
                  {previousTranslation}
                </div>
                {showOriginal && previousOriginal && (
                  <div
                    dir={isSourceRTL ? 'rtl' : 'ltr'}
                    className="text-xs sm:text-base text-slate-500 font-normal opacity-70 max-w-3xl mx-auto"
                  >
                    <span className="text-[10px] uppercase tracking-wider text-slate-600 mr-2">
                      Original:
                    </span>
                    {previousOriginal}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-slate-600/70 text-xs sm:text-sm tracking-wider font-mono uppercase">
                Previous sentence will appear here
              </div>
            )}
          </section>

          {/* Bottom 2/3: New / Active Translation (2/3 Screen Height, 2/3 Massive Text Scale) */}
          <section className="basis-2/3 h-2/3 flex-1 w-full bg-black flex flex-col justify-center items-center px-6 sm:px-12 md:px-20 text-center relative overflow-y-auto">
            <span className="absolute top-3 left-4 sm:left-8 text-[10px] tracking-widest font-mono text-blue-500/80 uppercase select-none flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
              <span>Current</span>
            </span>

            {/* Speaking Now Badge */}
            {isSpeakingNow && (
              <div className="absolute top-3 right-4 sm:right-8 flex items-center space-x-2 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold animate-pulse">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
                <span>Speaking now...</span>
              </div>
            )}

            <div className="w-full max-w-6xl mx-auto space-y-4">
              {activeTranslation ? (
                <div>
                  <div
                    dir={isTargetRTL ? 'rtl' : 'ltr'}
                    className={`${newFontClasses[subtitleSize]} font-black text-white tracking-tight leading-tight drop-shadow-2xl transition-all duration-150`}
                  >
                    {activeTranslation}
                  </div>

                  {/* Optional Original Spoken Text (Hidden by default, shown only if toggled ON) */}
                  {showOriginal && activeOriginal && (
                    <div
                      dir={isSourceRTL ? 'rtl' : 'ltr'}
                      className="text-lg sm:text-2xl md:text-3xl text-slate-400 font-medium max-w-4xl mx-auto pt-3 opacity-80"
                    >
                      <span className="text-slate-500 text-xs uppercase tracking-wider block mb-1">
                        Original ({sourceLangInfo.name}):
                      </span>
                      <span>{activeOriginal}</span>
                    </div>
                  )}
                </div>
              ) : (
                /* Idle / Listening prompt */
                <div className="space-y-4 py-8">
                  <div className="w-20 h-20 rounded-full bg-blue-600/10 border border-blue-500/20 text-blue-400 mx-auto flex items-center justify-center text-4xl animate-pulse">
                    🎙️
                  </div>
                  <h2 className="text-2xl sm:text-4xl font-bold text-slate-200">
                    Listening in {sourceLangInfo.name}...
                  </h2>
                  <p className="text-base sm:text-lg text-slate-500 max-w-lg mx-auto">
                    Live translation in {targetLangInfo.name} will appear here in cinema scale.
                  </p>
                </div>
              )}
            </div>
          </section>
        </main>
      ) : (
        /* Alternate: Full Transcript List View */
        <main
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 max-w-4xl w-full mx-auto space-y-4"
        >
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow space-y-2"
            >
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-bold text-indigo-300">{entry.speaker}</span>
                <span>{entry.timestamp}</span>
              </div>
              <div
                dir={isTargetRTL ? 'rtl' : 'ltr'}
                className="text-lg sm:text-xl font-bold text-white leading-relaxed"
              >
                {entry.translatedText || 'Translating...'}
              </div>
              {showOriginal && (
                <div dir={isSourceRTL ? 'rtl' : 'ltr'} className="text-sm text-slate-400 pt-1 border-t border-slate-800/60">
                  {entry.text}
                </div>
              )}
            </div>
          ))}
        </main>
      )}

      {/* 3. Bottom Cinema Action Bar */}
      <footer className="px-4 py-3 sm:px-8 border-t border-slate-900 bg-slate-950/80 backdrop-blur-md flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          {/* Done Speaking Immediate Commit Button */}
          <button
            onClick={onFinishSentence}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold transition-all active:scale-95 cursor-pointer shadow-lg shadow-blue-600/20"
            title="Finish sentence immediately"
          >
            <CheckCircle2 className="w-4 h-4" />
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
              <span>{isSummarizing ? 'Summarizing...' : 'Produce Summary'}</span>
            </button>
          )}

          {/* Stop & Exit */}
          <button
            onClick={onExit}
            className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-red-600/80 text-slate-300 hover:text-white border border-slate-800 text-xs sm:text-sm font-semibold transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>Stop & Exit</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
