import React, { useState } from 'react';
import {
  X,
  Upload,
  Mic,
  FileAudio,
  FileVideo,
  FileText,
  Sparkles,
  CheckCircle2,
  Clock,
  BookOpen,
  ListChecks,
  AlertCircle
} from 'lucide-react';

export const LectureNotesModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'record'
  const [selectedFile, setSelectedFile] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [summaryFormat, setSummaryFormat] = useState('lecture'); // 'lecture' | 'meeting' | 'verbatim'

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full flex flex-col shadow-2xl overflow-hidden max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-violet-950/40 via-slate-950 to-indigo-950/40">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-violet-500/20 text-violet-400 flex items-center justify-center border border-violet-500/30">
              <FileAudio className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white m-0">Lecture & Audio Notes</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  Coming Soon
                </span>
              </div>
              <p className="text-[11px] text-slate-400 m-0">Upload media files or record offline voice memos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto text-sm">
          {/* Info Banner */}
          <div className="p-3.5 rounded-2xl bg-violet-950/25 border border-violet-500/30 flex items-start space-x-2.5">
            <Sparkles className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-0.5">
              <span className="font-bold text-violet-200 block text-xs">
                Asynchronous AI Transcription & Summarization
              </span>
              <p className="text-violet-200/80 m-0 text-[11px] leading-relaxed">
                No need for live translation while speaking! Record long lectures, consultations, or upload full audio/video recordings. The AI analyzes the entire file and produces full transcripts with executive summaries.
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'upload'
                  ? 'bg-violet-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Audio / Video</span>
            </button>
            <button
              onClick={() => setActiveTab('record')}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'record'
                  ? 'bg-violet-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Record Voice Memo</span>
            </button>
          </div>

          {/* Tab 1: Upload File */}
          {activeTab === 'upload' && (
            <div className="space-y-3">
              <label
                htmlFor="lecture-file-input"
                className="border-2 border-dashed border-slate-700 hover:border-violet-500/60 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-slate-950/40 hover:bg-slate-950/80 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-violet-500/10 text-violet-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6" />
                </div>
                <span className="text-sm font-bold text-white block">
                  {selectedFile ? selectedFile.name : 'Choose an audio or video file'}
                </span>
                <span className="text-xs text-slate-400 mt-1 block">
                  {selectedFile
                    ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for analysis`
                    : 'Supports MP3, M4A, WAV, AAC, MP4, WEBM (up to 100MB)'}
                </span>
                <input
                  id="lecture-file-input"
                  type="file"
                  accept="audio/*,video/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {/* Tab 2: Record Voice Memo */}
          {activeTab === 'record' && (
            <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 text-center space-y-4">
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="text-2xl font-mono font-bold text-white tracking-widest">
                  {formatTimer(recordSeconds)}
                </div>
                <span className="text-xs text-slate-400">
                  {isRecording ? '🎙️ Recording voice memo in progress...' : 'Ready to record offline speech'}
                </span>
              </div>

              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setIsRecording(!isRecording)}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-2xl font-bold text-xs sm:text-sm shadow-lg transition-all active:scale-95 ${
                    isRecording
                      ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30 animate-pulse'
                      : 'bg-violet-600 hover:bg-violet-500 text-white shadow-violet-600/30'
                  }`}
                >
                  <Mic className="w-4 h-4" />
                  <span>{isRecording ? 'Stop Recording' : 'Start Recording Voice Memo'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Output Format Preference */}
          <div className="space-y-2 pt-1">
            <label className="text-xs font-bold text-slate-300 block uppercase tracking-wider">
              AI Summary & Notes Format:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSummaryFormat('lecture')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  summaryFormat === 'lecture'
                    ? 'bg-violet-950/30 border-violet-500 text-white ring-1 ring-violet-500/50'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center space-x-1.5 font-bold text-xs mb-1">
                  <BookOpen className="w-3.5 h-3.5 text-violet-400" />
                  <span>Lecture Outline</span>
                </div>
                <p className="text-[10px] text-slate-400 m-0">Key concepts, definitions, and takeaways.</p>
              </button>

              <button
                type="button"
                onClick={() => setSummaryFormat('meeting')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  summaryFormat === 'meeting'
                    ? 'bg-violet-950/30 border-violet-500 text-white ring-1 ring-violet-500/50'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center space-x-1.5 font-bold text-xs mb-1">
                  <ListChecks className="w-3.5 h-3.5 text-violet-400" />
                  <span>Meeting Action Items</span>
                </div>
                <p className="text-[10px] text-slate-400 m-0">Decisions, assignments, and follow-ups.</p>
              </button>

              <button
                type="button"
                onClick={() => setSummaryFormat('verbatim')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  summaryFormat === 'verbatim'
                    ? 'bg-violet-950/30 border-violet-500 text-white ring-1 ring-violet-500/50'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center space-x-1.5 font-bold text-xs mb-1">
                  <FileText className="w-3.5 h-3.5 text-violet-400" />
                  <span>Full Transcript</span>
                </div>
                <p className="text-[10px] text-slate-400 m-0">Timestamped side-by-side translation.</p>
              </button>
            </div>
          </div>

          {/* Under Development Notice */}
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Pipeline development in progress for multi-minute audio batches.</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors cursor-pointer shrink-0 ml-2"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
