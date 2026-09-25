import React, { useRef, useEffect } from 'react';
import { Volume2, Copy, Check, MessageSquare, User, Sparkles } from 'lucide-react';
import { isRTL, getLanguageByCode } from '../../constants/languages';

export const TranscriptFeed = ({
  entries,
  interimTranscript,
  interimTranslation,
  sourceLang,
  targetLang,
  onSpeakText,
  isListening
}) => {
  const feedEndRef = useRef(null);
  const [copiedId, setCopiedId] = React.useState(null);

  const isTargetRTL = isRTL(targetLang);
  const isSourceRTL = isRTL(sourceLang);

  const sourceLangInfo = getLanguageByCode(sourceLang);
  const targetLangInfo = getLanguageByCode(targetLang);

  // Auto-scroll to latest entry
  useEffect(() => {
    if (feedEndRef.current) {
      feedEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [entries, interimTranscript]);

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex-1 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 sm:p-6 overflow-y-auto min-h-[380px] max-h-[580px] flex flex-col space-y-4">
      {/* Empty State */}
      {entries.length === 0 && !interimTranscript && (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4 text-blue-400">
            <MessageSquare className="w-8 h-8 opacity-80" />
          </div>
          <h3 className="text-base font-semibold text-slate-200 mb-1">
            Ready for Live Meeting Translation
          </h3>
          <p className="text-sm text-slate-400 max-w-md mb-4">
            Click <strong className="text-blue-400">Start Live Listening</strong> or click{' '}
            <strong className="text-emerald-400">Simulate Speech</strong> to test translation between{' '}
            {sourceLangInfo.name} and {targetLangInfo.name}.
          </p>
          <div className="flex flex-wrap gap-2 justify-center text-xs text-slate-500">
            <span className="px-2.5 py-1 bg-slate-800 rounded-md border border-slate-700/50">
              {sourceLangInfo.flag} {sourceLangInfo.name} spoken
            </span>
            <span className="px-2.5 py-1 bg-slate-800 rounded-md border border-slate-700/50">
              ➜
            </span>
            <span className="px-2.5 py-1 bg-slate-800 rounded-md border border-slate-700/50">
              {targetLangInfo.flag} {targetLangInfo.name} translated
            </span>
          </div>
        </div>
      )}

      {/* Transcript entries */}
      {entries.map((entry) => {
        return (
          <div
            key={entry.id}
            className="group relative bg-slate-900/90 border border-slate-800/90 hover:border-slate-700/80 rounded-2xl p-4 transition-all shadow-sm"
          >
            {/* Header: Speaker & Timestamp */}
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 text-xs">
                  <User className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-semibold text-slate-300">
                  {entry.speaker || 'Speaker'}
                </span>
                <span className="text-[11px] text-slate-500">
                  {entry.timestamp}
                </span>
              </div>

              {/* Action buttons (Copy, TTS) */}
              <div className="flex items-center space-x-1 opacity-70 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onSpeakText(entry.translatedText || entry.text, targetLang)}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-blue-400 transition-colors"
                  title="Listen to translation"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleCopy(entry.id, entry.translatedText || entry.text)}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
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

            {/* Original Spoken Text Box */}
            <div className={`p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/60 mb-2.5 ${isSourceRTL ? 'rtl-text' : 'ltr-text'}`}>
              <div className="flex items-center space-x-1.5 text-[10px] uppercase font-bold text-slate-400 mb-1">
                <span>{sourceLangInfo.flag}</span>
                <span>Original ({sourceLangInfo.name}):</span>
              </div>
              <div className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                {entry.text}
              </div>
            </div>

            {/* Live Translated Output Box */}
            <div
              className={`p-3 rounded-xl bg-indigo-950/20 border border-indigo-500/25 ${
                isTargetRTL ? 'rtl-text' : 'ltr-text'
              }`}
            >
              <div className="flex items-center space-x-1.5 text-[10px] uppercase font-bold text-indigo-400 mb-1">
                <span>{targetLangInfo.flag}</span>
                <span>Translation ({targetLangInfo.name}):</span>
              </div>
              <div
                className={`text-sm sm:text-base font-medium ${
                  isTargetRTL ? 'text-indigo-200' : 'text-indigo-100'
                }`}
              >
                {entry.translatedText ? (
                  entry.translatedText
                ) : (
                  <span className="flex items-center space-x-2 text-xs text-indigo-400/80 italic">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping inline-block"></span>
                    <span>Translating live...</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Live Interim Streaming Bubble (while actively speaking) */}
      {interimTranscript && (
        <div className="bg-slate-900/80 border border-blue-500/40 rounded-2xl p-4 animate-pulse">
          <div className="flex items-center space-x-2 mb-2 text-xs text-blue-400 font-semibold">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
            <span>Live Speaking in progress...</span>
          </div>

          <p className={`text-xs text-slate-300 mb-2 ${isSourceRTL ? 'rtl-text' : 'ltr-text'}`}>
            {interimTranscript}
          </p>

          {interimTranslation && (
            <div
              className={`text-sm font-medium text-indigo-300 pt-2 border-t border-blue-500/20 ${
                isTargetRTL ? 'rtl-text' : 'ltr-text'
              }`}
            >
              <span className="text-[10px] text-indigo-400/70 block uppercase font-bold mb-0.5">Preview:</span>
              {interimTranslation}
            </div>
          )}
        </div>
      )}

      <div ref={feedEndRef} />
    </div>
  );
};
