import React, { useState, useEffect } from 'react';
import { Sparkles, ShieldCheck, Infinity as InfinityIcon, Zap, Key, RefreshCw, CheckCircle2, Info } from 'lucide-react';
import { apiService } from '../../services/apiService';

export const ModeSelector = ({
  activeMode, // 'basic' | 'smart' | 'unlimited'
  onSelectMode,
  onOpenAIGuide,
  onOpenSupport,
  isListening
}) => {
  const [serverStatus, setServerStatus] = useState(apiService.serverStatus);
  const [usage, setUsage] = useState({ remainingMinutes: 30, hasRemaining: true });
  const [hasPersonalKey, setHasPersonalKey] = useState(false);

  useEffect(() => {
    // Check if user has personal key configured
    try {
      const stored = localStorage.getItem('linguaflow_ai_config');
      if (stored) {
        const parsed = JSON.parse(stored);
        setHasPersonalKey(!!parsed?.apiKey?.trim());
      }
    } catch {
      setHasPersonalKey(false);
    }

    // Subscribe to backend status
    apiService.onStatusChange((status) => {
      setServerStatus(status);
    });

    // Check usage
    apiService.getUsage().then((res) => {
      if (res) setUsage(res);
    });
  }, []);

  return (
    <div className="w-full space-y-2.5">
      <div className="flex items-center justify-between px-1">
        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Select Translation Mode
        </label>

        {/* Server status pill if Smart mode is active or warming */}
        {activeMode === 'smart' && (
          <div className="flex items-center space-x-1.5 text-[11px] font-medium animate-fadeIn">
            {serverStatus === 'warming' ? (
              <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
                <span>🔥 AI warming up...</span>
              </span>
            ) : serverStatus === 'ready' ? (
              <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>Gemini Flash-Lite (Ready)</span>
              </span>
            ) : null}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {/* 1. Basic Mode */}
        <button
          type="button"
          disabled={isListening}
          onClick={() => onSelectMode('basic')}
          className={`p-3.5 rounded-2xl border text-left transition-all relative ${
            activeMode === 'basic'
              ? 'bg-amber-950/20 border-amber-500/60 shadow-lg shadow-amber-500/5 ring-1 ring-amber-500/40'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center space-x-1.5 font-bold text-white text-xs">
              <span className="text-emerald-400">🟢</span>
              <span>Basic</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
              Lowest Accuracy
            </span>
          </div>
          <p className="text-[11px] text-slate-400 m-0 leading-relaxed">
            Literal word-for-word translation. Lacks slang and context. Unlimited & zero setup.
          </p>
        </button>

        {/* 2. Smart Mode */}
        <button
          type="button"
          disabled={isListening}
          onClick={() => onSelectMode('smart')}
          className={`p-3.5 rounded-2xl border text-left transition-all relative ${
            activeMode === 'smart'
              ? 'bg-indigo-950/25 border-indigo-500/60 shadow-lg shadow-indigo-500/5 ring-1 ring-indigo-500/40'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center space-x-1.5 font-bold text-white text-xs">
              <span className="text-amber-300">⭐</span>
              <span>Smart AI</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              Shared Quota ({usage.remainingMinutes}m)
            </span>
          </div>
          <p className="text-[11px] text-slate-400 m-0 leading-relaxed">
            High AI accuracy. Shared pool: more users = faster depletion, then auto-switches to Basic.
          </p>
        </button>

        {/* 3. Unlimited Mode */}
        <button
          type="button"
          disabled={isListening}
          onClick={() => onSelectMode('unlimited')}
          className={`p-3.5 rounded-2xl border text-left transition-all relative ${
            activeMode === 'unlimited'
              ? 'bg-violet-950/25 border-violet-500/60 shadow-lg shadow-violet-500/5 ring-1 ring-violet-500/40'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center space-x-1.5 font-bold text-white text-xs">
              <span className="text-violet-400">♾️</span>
              <span>Unlimited</span>
            </div>
            {hasPersonalKey ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center space-x-1">
                <span>Active (Top)</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenAIGuide();
                }}
                className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-600 hover:bg-violet-500 text-white transition-colors"
              >
                Free Key (2 min)
              </button>
            )}
          </div>
          <p className="text-[11px] text-slate-400 m-0 leading-relaxed">
            Highest speed & top accuracy. Powered by your own free key. Never throttled or shared.
          </p>
        </button>
      </div>

      {/* Mode Accuracy & Shared Quota Transparency Notice */}
      <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 text-slate-300 text-xs space-y-2">
        <div className="flex items-center space-x-1.5 font-semibold text-slate-200">
          <Info className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>Understanding Translation Modes & Accuracy:</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] leading-relaxed">
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <div className="font-bold text-amber-300 flex items-center space-x-1">
              <span>🟢</span>
              <span>Basic (Lowest Accuracy)</span>
            </div>
            <p className="text-slate-400 m-0">
              Literal word-for-word translation. Misses idioms, slang, and dialect nuances. Always free with no time limits.
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <div className="font-bold text-indigo-300 flex items-center space-x-1">
              <span>⭐</span>
              <span>Smart AI (Shared Pool)</span>
            </div>
            <p className="text-slate-400 m-0">
              High accuracy AI. Daily quota is shared across all active users: <strong className="text-slate-200">the more users online, the less time each has</strong> before falling back to Basic.
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <div className="font-bold text-violet-300 flex items-center space-x-1">
              <span>♾️</span>
              <span>Unlimited (Top Accuracy)</span>
            </div>
            <p className="text-slate-400 m-0">
              Connect your personal free Google Gemini or Groq key (2-min setup) for 100% uninterrupted, private top-tier AI translation.
            </p>
          </div>
        </div>
      </div>

      {/* Prominent, Warm Community Banner */}
      <div
        onClick={onOpenSupport}
        className="w-full mt-3 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-rose-950/40 via-slate-900/90 to-indigo-950/40 border border-rose-500/30 hover:border-rose-500/60 shadow-lg shadow-rose-950/20 text-center cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] group"
        title="Open Support & Tips"
      >
        <div className="flex items-center justify-center flex-wrap gap-2 text-sm sm:text-base font-semibold">
          <span className="text-white font-bold">LinguaFlow is completely free.</span>
          <span className="text-rose-400 group-hover:scale-125 transition-transform duration-200 inline-block text-lg">
            💖
          </span>
          <span className="text-slate-200">
            You can tip as well to make the app more lively.
          </span>
          <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-xl bg-rose-500/20 group-hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 group-hover:text-white text-xs sm:text-sm font-bold transition-all ml-1">
            <span>Support & Tips</span>
            <span>&rarr;</span>
          </span>
        </div>
      </div>
    </div>
  );
};
