import React, { useState } from 'react';
import { X, Sparkles, CheckSquare, Square, Copy, Download, Check, Clock, FileText } from 'lucide-react';
import { isRTL, getLanguageByCode } from '../../constants/languages';

export const SummaryModal = ({ summary, targetLang, onClose, onSaveToHistory }) => {
  const [copied, setCopied] = useState(false);
  const [itemsState, setItemsState] = useState(() => {
    return (summary?.actionItems || []).map((item) => ({ ...item }));
  });

  if (!summary) return null;

  const isTargetRTL = isRTL(targetLang);
  const targetLangInfo = getLanguageByCode(targetLang);

  const toggleItem = (idx) => {
    setItemsState((prev) => {
      const updated = [...prev];
      updated[idx].completed = !updated[idx].completed;
      return updated;
    });
  };

  const getExportText = () => {
    let text = `# Meeting Summary\n\n`;
    text += `Language: ${targetLangInfo.name}\n`;
    text += `Duration: ${summary.stats?.durationFormatted || 'N/A'}\n`;
    text += `Exchanges: ${summary.stats?.totalUtterances || 0} (${summary.stats?.totalWords || 0} words)\n\n`;
    text += `## Executive Overview\n${summary.overview}\n\n`;

    if (summary.keyPoints?.length > 0) {
      text += `## Key Discussion Points\n`;
      summary.keyPoints.forEach((p) => {
        text += `- ${p.translatedText || p.text}\n`;
      });
      text += `\n`;
    }

    if (summary.decisions?.length > 0) {
      text += `## Decisions Made\n`;
      summary.decisions.forEach((d) => {
        text += `- ${d.translatedText || d.text}\n`;
      });
      text += `\n`;
    }

    if (itemsState.length > 0) {
      text += `## Action Items\n`;
      itemsState.forEach((a) => {
        text += `- [${a.completed ? 'x' : ' '}] ${a.translatedText || a.text} (${a.speaker})\n`;
      });
    }

    return text;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getExportText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const text = getExportText();
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meeting-summary-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white m-0">Conversational Summary</h2>
              <div className="flex items-center space-x-2 text-xs text-slate-400 mt-0.5">
                <span className="flex items-center">
                  <Clock className="w-3.5 h-3.5 mr-1" />
                  {summary.stats?.durationFormatted || '00:00'}
                </span>
                <span>•</span>
                <span>{summary.stats?.totalWords || 0} words analyzed</span>
                <span>•</span>
                <span className="text-indigo-400">{targetLangInfo.name}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {/* Executive Overview */}
          <div className="bg-gradient-to-br from-indigo-950/30 to-blue-950/20 border border-indigo-500/20 rounded-2xl p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2 flex items-center space-x-1.5">
              <FileText className="w-3.5 h-3.5" />
              <span>Executive Overview</span>
            </h3>
            <p className={`text-slate-200 leading-relaxed ${isTargetRTL ? 'rtl-text text-base' : 'ltr-text'}`}>
              {summary.overview}
            </p>
          </div>

          {/* Action Items */}
          {itemsState.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center justify-between">
                <span>Action Items & Next Steps</span>
                <span className="text-[11px] font-normal text-slate-400">
                  {itemsState.filter((i) => i.completed).length}/{itemsState.length} done
                </span>
              </h3>
              <div className="space-y-2">
                {itemsState.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    onClick={() => toggleItem(idx)}
                    className={`flex items-start space-x-3 p-3 rounded-xl border transition-all cursor-pointer ${
                      item.completed
                        ? 'bg-slate-950/40 border-slate-800/60 opacity-60'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <button className="mt-0.5 text-slate-400 hover:text-emerald-400 transition-colors">
                      {item.completed ? (
                        <CheckSquare className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                    <div className="flex-1">
                      <p
                        className={`text-slate-200 ${item.completed ? 'line-through text-slate-400' : ''} ${
                          isTargetRTL ? 'rtl-text' : 'ltr-text'
                        }`}
                      >
                        {item.translatedText || item.text}
                      </p>
                      {item.speaker && (
                        <span className="text-[10px] text-slate-500 font-medium block mt-1">
                          Assignee: {item.speaker}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key Discussion Points */}
          {summary.keyPoints?.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400">
                Key Discussion Points
              </h3>
              <ul className="space-y-2 list-none p-0">
                {summary.keyPoints.map((point, idx) => (
                  <li
                    key={point.id || idx}
                    className={`p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl text-slate-300 ${
                      isTargetRTL ? 'rtl-text' : 'ltr-text'
                    }`}
                  >
                    <div className="flex items-baseline space-x-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1 flex-shrink-0"></span>
                      <span>{point.translatedText || point.text}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Decisions Made */}
          {summary.decisions?.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">
                Decisions Made
              </h3>
              <div className="space-y-2">
                {summary.decisions.map((decision, idx) => (
                  <div
                    key={decision.id || idx}
                    className={`p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl text-amber-200 ${
                      isTargetRTL ? 'rtl-text' : 'ltr-text'
                    }`}
                  >
                    {decision.translatedText || decision.text}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export Markdown</span>
            </button>
          </div>

          <button
            onClick={() => {
              if (onSaveToHistory) onSaveToHistory(summary);
              onClose();
            }}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
};
