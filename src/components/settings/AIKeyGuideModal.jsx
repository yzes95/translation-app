import React, { useState } from 'react';
import {
  X,
  Sparkles,
  ExternalLink,
  Key,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Zap,
  HelpCircle,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { translationEngine } from '../../services/translationEngine';

export const AIKeyGuideModal = ({ isOpen, onClose, onSaveSuccess }) => {
  const [selectedProvider, setSelectedProvider] = useState('groq'); // 'groq' | 'gemini'
  const [apiKey, setApiKey] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // { success: boolean, message: string }

  if (!isOpen) return null;

  const handleTestAndSave = async () => {
    if (!apiKey.trim()) {
      setTestResult({
        success: false,
        message: 'Please paste your API key into the box first.'
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    const config = {
      provider: selectedProvider,
      apiKey: apiKey.trim(),
      model: selectedProvider === 'gemini' ? 'gemini-1.5-flash' : 'llama-3.3-70b-versatile'
    };

    const res = await translationEngine.testAIConnection(config);
    setIsTesting(false);
    setTestResult(res);

    if (res.success) {
      localStorage.setItem('linguaflow_ai_config', JSON.stringify(config));
      if (onSaveSuccess) onSaveSuccess(config);
    }
  };

  const providerUrl =
    selectedProvider === 'gemini'
      ? 'https://aistudio.google.com/app/apikey'
      : 'https://console.groq.com/keys';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full flex flex-col shadow-2xl overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-950/40 via-slate-950 to-blue-950/40">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Sparkles className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white m-0">AI Key Setup Guide</h2>
              <p className="text-[11px] text-slate-400 m-0">Simple 3-step guide for personal AI translation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-5 overflow-y-auto text-sm">
          {/* Elder / Non-Tech Reassurance Banner */}
          <div className="p-4 bg-emerald-950/30 rounded-2xl border border-emerald-500/30 flex items-start space-x-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <h4 className="font-bold text-emerald-300 m-0 text-sm">
                No Setup Required For Elders & Casual Users!
              </h4>
              <p className="text-emerald-200/80 m-0 leading-relaxed">
                If you find getting a key difficult, <strong>you do not need to do anything</strong>. LinguaFlow works automatically for free across all 9 languages without any keys or passwords. You can simply close this guide and use the app.
              </p>
            </div>
          </div>

          {/* Provider Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 block">
              Choose Your Free AI Provider
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Groq Card */}
              <button
                type="button"
                onClick={() => {
                  setSelectedProvider('groq');
                  setTestResult(null);
                }}
                className={`p-3.5 rounded-2xl border text-left transition-all relative ${
                  selectedProvider === 'groq'
                    ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-md'
                    : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-1.5 font-bold text-sm">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>Groq Llama 3.3</span>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                    Fastest
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 m-0">
                  Instant ~300ms speed. Free 14,400 queries daily.
                </p>
              </button>

              {/* Gemini Card */}
              <button
                type="button"
                onClick={() => {
                  setSelectedProvider('gemini');
                  setTestResult(null);
                }}
                className={`p-3.5 rounded-2xl border text-left transition-all relative ${
                  selectedProvider === 'gemini'
                    ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-md'
                    : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-1.5 font-bold text-sm">
                    <Sparkles className="w-4 h-4 text-blue-400" />
                    <span>Google Gemini</span>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">
                    Slang Pro
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 m-0">
                  Best for colloquial Arabic slang and idioms.
                </p>
              </button>
            </div>
          </div>

          {/* Simple 3-Step Visual Guide */}
          <div className="space-y-3 pt-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 m-0">
              3 Simple Steps to Connect:
            </h3>

            {/* Step 1 */}
            <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800 flex items-start space-x-3">
              <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                1
              </div>
              <div className="flex-1 space-y-2">
                <div>
                  <h4 className="font-semibold text-white text-xs m-0">
                    Open the official {selectedProvider === 'gemini' ? 'Google AI Studio' : 'Groq Console'} website
                  </h4>
                  <p className="text-[11px] text-slate-400 m-0 pt-0.5">
                    It will open safely in a new tab. No credit card or payment is ever required.
                  </p>
                </div>
                <a
                  href={providerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow transition-all cursor-pointer"
                >
                  <span>Open {selectedProvider === 'gemini' ? 'Google AI Studio' : 'Groq Console'}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800 flex items-start space-x-3">
              <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                2
              </div>
              <div className="space-y-1">
                <h4 className="font-semibold text-white text-xs m-0">
                  Sign in & click "Create API Key"
                </h4>
                <p className="text-[11px] text-slate-400 m-0 leading-relaxed">
                  Sign in with your Google or email account. Click the blue button labeled <strong>"Create API Key"</strong>, then click <strong>Copy</strong>.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800 flex items-start space-x-3">
              <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                3
              </div>
              <div className="flex-1 space-y-2">
                <h4 className="font-semibold text-white text-xs m-0">
                  Paste the key below and tap "Test & Save"
                </h4>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    placeholder={`Paste key here (${selectedProvider === 'gemini' ? 'AIza...' : 'gsk_...'})`}
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value);
                      setTestResult(null);
                    }}
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl pl-9 pr-3 py-2 text-xs font-mono placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <p className="text-[10px] text-slate-500 m-0">
                  🔒 Stored safely inside your browser's private memory. Never shared with anyone.
                </p>
              </div>
            </div>
          </div>

          {/* Test & Verification Feedback */}
          {testResult && (
            <div
              className={`p-3.5 rounded-2xl border flex items-start space-x-2.5 text-xs animate-fadeIn ${
                testResult.success
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                  : 'bg-red-950/40 border-red-500/40 text-red-200'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <span className="font-bold block">
                  {testResult.success ? 'Key Verified & Saved!' : 'Connection Check Failed'}
                </span>
                <span className="text-[11px] opacity-90">{testResult.message || testResult.error}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
          >
            Close
          </button>

          <button
            onClick={handleTestAndSave}
            disabled={isTesting || !apiKey.trim()}
            className="flex items-center space-x-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
          >
            {isTesting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Testing Connection...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                <span>Test & Save Key</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
