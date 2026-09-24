import React, { useState } from 'react';
import { X, Search, Trash2, Calendar, Clock, ChevronRight, Sparkles, MessageSquare } from 'lucide-react';
import { getLanguageByCode } from '../../constants/languages';

export const HistoryDrawer = ({
  isOpen,
  onClose,
  meetings,
  onSelectMeeting,
  onDeleteMeeting,
  onClearAll
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const filteredMeetings = meetings.filter((m) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const matchTitle = m.title?.toLowerCase().includes(term);
    const matchContent = m.entries?.some(
      (e) => e.text.toLowerCase().includes(term) || (e.translatedText && e.translatedText.toLowerCase().includes(term))
    );
    return matchTitle || matchContent;
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-bold text-white m-0">Meeting History</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
              {meetings.length}
            </span>
          </div>

          <div className="flex items-center space-x-1">
            {meetings.length > 0 && (
              <button
                onClick={onClearAll}
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                title="Clear all meetings"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/40">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search past transcripts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
            />
          </div>
        </div>

        {/* Meeting List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredMeetings.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 text-xs">
              <MessageSquare className="w-10 h-10 mb-2 opacity-30" />
              <p>No past meetings found</p>
            </div>
          ) : (
            filteredMeetings.map((meeting) => {
              const srcLang = getLanguageByCode(meeting.sourceLang);
              const tgtLang = getLanguageByCode(meeting.targetLang);

              return (
                <div
                  key={meeting.id}
                  onClick={() => onSelectMeeting(meeting)}
                  className="group relative bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 rounded-2xl p-4 transition-all cursor-pointer hover:shadow-md"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-200">
                      {meeting.title || 'Live Meeting'}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteMeeting(meeting.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-opacity"
                      title="Delete meeting"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center space-x-2 text-[11px] text-slate-400 mb-2">
                    <span>{srcLang.flag} {srcLang.code.toUpperCase()}</span>
                    <span>➜</span>
                    <span>{tgtLang.flag} {tgtLang.code.toUpperCase()}</span>
                    <span>•</span>
                    <span className="flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {meeting.durationFormatted || '00:00'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-800/60 pt-2">
                    <span className="flex items-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      {formatDate(meeting.createdAt)}
                    </span>

                    {meeting.hasSummary && (
                      <span className="flex items-center text-indigo-400 font-medium">
                        <Sparkles className="w-3 h-3 mr-1" />
                        Summary
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
