import React, { useState, useEffect } from 'react';
import {
  Languages,
  History,
  Settings,
  Wifi,
  WifiOff,
  Smartphone,
  Heart,
  Sparkles
} from 'lucide-react';

export const Header = ({
  onOpenHistory,
  onOpenSettings,
  onOpenInstall,
  onOpenSupport,
  onOpenAIGuide,
  isListening,
  meetingDuration
}) => {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 sm:px-8">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-blue-500/25 shrink-0">
            <Languages className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white m-0">LinguaFlow</h1>
              <span className="px-2 py-0.5 text-xs font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30 rounded-lg">
                PWA / APK
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 m-0">Live Meeting Translator</p>
          </div>
        </div>

        {/* Live indicator if listening */}
        {isListening && (
          <div className="flex items-center space-x-2 px-3.5 py-2 rounded-full bg-red-500/15 border border-red-500/30">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <span className="text-xs sm:text-sm font-bold text-red-400">REC</span>
            <span className="text-xs sm:text-sm font-mono font-bold text-slate-200 border-l border-red-500/30 pl-2">
              {formatTimer(meetingDuration)}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* AI Setup / Guide button */}
          <button
            onClick={onOpenAIGuide}
            className="hidden sm:flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs sm:text-sm font-bold transition-all cursor-pointer"
            title="AI Setup & Guide (Groq / Gemini)"
          >
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>AI Setup</span>
          </button>

          {/* Support & Tips Button */}
          <button
            onClick={onOpenSupport}
            className="flex items-center space-x-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-rose-600/25 active:scale-95 transition-all cursor-pointer"
            title="Support & Tips"
          >
            <Heart className="w-4 h-4 fill-white text-white" />
            <span>Support & Tips</span>
          </button>

          {/* Get App / Install Button (PWA or APK Choice) */}
          <button
            onClick={onOpenInstall}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs sm:text-sm shadow-md shadow-blue-600/20 active:scale-95 transition-all cursor-pointer"
            title="Install as PWA or Download Android APK"
          >
            <Smartphone className="w-4 h-4" />
            <span className="hidden md:inline">Install</span>
          </button>

          {/* Offline / Online badge */}
          <div
            className={`hidden lg:flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs font-semibold border ${
              isOnline
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }`}
            title={isOnline ? 'Online mode active' : 'Offline ready - local inference'}
          >
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            <span>{isOnline ? 'Online' : 'Offline'}</span>
          </div>

          <button
            onClick={onOpenHistory}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 transition-colors text-xs sm:text-sm font-semibold cursor-pointer"
            title="Meeting History"
          >
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">History</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="p-2 sm:p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 transition-colors cursor-pointer"
            title="Settings"
          >
            <Settings className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
