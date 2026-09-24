import React, { useState, useEffect } from 'react';
import { Languages, History, Settings, Wifi, WifiOff, Smartphone } from 'lucide-react';

export const Header = ({
  onOpenHistory,
  onOpenSettings,
  onOpenInstall,
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
    <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-4 py-3 sm:px-6">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Languages className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold tracking-tight text-white m-0">LinguaFlow</h1>
              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded">
                PWA / APK
              </span>
            </div>
            <p className="text-xs text-slate-400 m-0">Live Meeting Translator</p>
          </div>
        </div>

        {/* Live indicator if listening */}
        {isListening && (
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/30">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
            </span>
            <span className="text-xs font-semibold text-red-400">REC</span>
            <span className="text-xs font-mono font-medium text-slate-300 border-l border-red-500/30 pl-2">
              {formatTimer(meetingDuration)}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center space-x-2">
          {/* Get App / Install Button (PWA or APK Choice) */}
          <button
            onClick={onOpenInstall}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-xs shadow-md shadow-blue-600/20 active:scale-95 transition-all cursor-pointer"
            title="Install as PWA or Download Android APK"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Install / APK</span>
          </button>

          {/* Offline / Online badge */}
          <div
            className={`hidden md:flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium border ${
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
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-colors text-sm"
            title="Meeting History"
          >
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">History</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-colors"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
