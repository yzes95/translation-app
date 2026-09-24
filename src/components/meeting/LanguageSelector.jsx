import React from 'react';
import { ArrowLeftRight, Sparkles, HelpCircle } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../../constants/languages';

export const LanguageSelector = ({
  sourceLang,
  targetLang,
  onSourceChange,
  onTargetChange,
  onSwapLanguages,
  generateSummary,
  onToggleSummary,
  disabled = false
}) => {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg">
      <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr,auto] gap-3 items-center">
        {/* Source Language (Meeting Spoken) */}
        <div className="flex flex-col space-y-1.5">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Meeting Spoken Language</span>
            <span className="text-[11px] text-blue-400 font-normal">Listening</span>
          </label>
          <div className="relative">
            <select
              value={sourceLang}
              onChange={(e) => onSourceChange(e.target.value)}
              disabled={disabled}
              className="w-full appearance-none bg-slate-800/90 text-white border border-slate-700 hover:border-slate-600 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={`src-${lang.code}`} value={lang.code} className="bg-slate-900 text-white">
                  {lang.flag} {lang.name} ({lang.nativeName})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Swap button */}
        <div className="flex justify-center pt-2 md:pt-4">
          <button
            onClick={onSwapLanguages}
            disabled={disabled}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Swap Languages"
          >
            <ArrowLeftRight className="w-4 h-4" />
          </button>
        </div>

        {/* Target Language (My Language) */}
        <div className="flex flex-col space-y-1.5">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Translation Output Language</span>
            <span className="text-[11px] text-indigo-400 font-normal">Translating to</span>
          </label>
          <div className="relative">
            <select
              value={targetLang}
              onChange={(e) => onTargetChange(e.target.value)}
              disabled={disabled}
              className="w-full appearance-none bg-slate-800/90 text-white border border-slate-700 hover:border-slate-600 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={`tgt-${lang.code}`} value={lang.code} className="bg-slate-900 text-white">
                  {lang.flag} {lang.name} ({lang.nativeName})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Summary Toggle Option */}
        <div className="flex md:flex-col justify-between items-center border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0 md:pl-4 mt-1 md:mt-0">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-200 block">AI Summary</span>
              <span className="text-[10px] text-slate-400 hidden sm:block">Action items & notes</span>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer md:mt-2">
            <input
              type="checkbox"
              checked={generateSummary}
              onChange={(e) => onToggleSummary(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>
      </div>
    </div>
  );
};
