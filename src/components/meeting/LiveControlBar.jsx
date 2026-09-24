import React from 'react';
import { Mic, Square, Play, RotateCcw, Sparkles, Volume2 } from 'lucide-react';

export const LiveControlBar = ({
  isListening,
  volumeLevel,
  onStartListening,
  onStopListening,
  onClearTranscript,
  onSimulateMeeting,
  hasEntries,
  generateSummary,
  onProduceSummary,
  isSummarizing
}) => {
  // Generate 8 dynamic visualizer bars based on volume level
  const bars = [0.4, 0.7, 1.0, 0.8, 1.2, 0.9, 0.6, 0.3];

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl backdrop-blur-md">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Left: Audio Wave Visualizer & Status */}
        <div className="flex items-center space-x-3 w-full sm:w-auto justify-center sm:justify-start">
          <div className="h-8 flex items-center space-x-1 px-3 py-1 bg-slate-950/60 rounded-xl border border-slate-800">
            {bars.map((scale, i) => {
              const height = isListening
                ? Math.max(4, Math.min(28, (volumeLevel * scale * 0.35) + 6))
                : 4;
              return (
                <span
                  key={i}
                  style={{ height: `${height}px` }}
                  className={`w-1 rounded-full transition-all duration-75 ${
                    isListening
                      ? 'bg-gradient-to-t from-blue-500 to-indigo-400'
                      : 'bg-slate-700'
                  }`}
                />
              );
            })}
          </div>

          <div className="text-xs">
            <span className="font-semibold text-slate-300 block">
              {isListening ? 'Listening to Meeting Audio...' : 'Microphone Ready'}
            </span>
            <span className="text-[11px] text-slate-400">
              {isListening ? 'Speak naturally into device' : 'Click Start to listen'}
            </span>
          </div>
        </div>

        {/* Center: Big Primary Record Button */}
        <div className="flex items-center space-x-3">
          {!isListening ? (
            <button
              onClick={onStartListening}
              className="group relative flex items-center space-x-2 px-6 py-3.5 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-blue-500/25 active:scale-95 transition-all cursor-pointer"
            >
              <Mic className="w-5 h-5 transition-transform group-hover:scale-110" />
              <span>Start Live Listening</span>
            </button>
          ) : (
            <button
              onClick={onStopListening}
              className="flex items-center space-x-2 px-6 py-3.5 rounded-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-semibold text-sm shadow-lg shadow-red-500/25 active:scale-95 transition-all cursor-pointer animate-pulse"
            >
              <Square className="w-5 h-5 fill-current" />
              <span>Stop Listening</span>
            </button>
          )}

          {/* End & Produce Summary Button (if allowed and entries exist) */}
          {hasEntries && generateSummary && (
            <button
              onClick={onProduceSummary}
              disabled={isSummarizing}
              className="flex items-center space-x-1.5 px-4 py-3 rounded-full bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-medium text-xs sm:text-sm transition-all active:scale-95 disabled:opacity-50"
              title="Generate summary of discussion"
            >
              <Sparkles className={`w-4 h-4 text-indigo-400 ${isSummarizing ? 'animate-spin' : ''}`} />
              <span>{isSummarizing ? 'Generating...' : 'Produce Summary'}</span>
            </button>
          )}
        </div>

        {/* Right: Quick Test Simulator & Clear */}
        <div className="flex items-center space-x-2 w-full sm:w-auto justify-center sm:justify-end">
          <button
            onClick={onSimulateMeeting}
            disabled={isListening}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 text-xs font-medium transition-all active:scale-95 disabled:opacity-40"
            title="Simulate sample meeting speech for testing"
          >
            <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400/20" />
            <span>Simulate Speech</span>
          </button>

          {hasEntries && (
            <button
              onClick={onClearTranscript}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-red-400 border border-slate-700/60 transition-colors"
              title="Clear Transcript"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
