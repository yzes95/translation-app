import React, { useState, useEffect } from 'react';
import {
  X,
  Volume2,
  HardDrive,
  Smartphone,
  Check,
  Sparkles,
  Key,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Heart
} from 'lucide-react';
import { translationEngine } from '../../services/translationEngine';

export const SettingsModal = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onOpenAIGuide,
  onOpenSupport
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  // AI Configuration State
  const [aiProvider, setAiProvider] = useState('default');
  const [apiKey, setApiKey] = useState('');
  const [isSavedAI, setIsSavedAI] = useState(false);
  const [isTestingAI, setIsTestingAI] = useState(false);
  const [aiTestResult, setAiTestResult] = useState(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('linguaflow_ai_config');
      if (stored) {
        const parsed = JSON.parse(stored);
        setAiProvider(parsed.provider || 'default');
        setApiKey(parsed.apiKey || '');
      }
    } catch {
      // ignore
    }

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  if (!isOpen) return null;

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const handleSaveAIConfig = () => {
    if (aiProvider === 'default') {
      localStorage.removeItem('linguaflow_ai_config');
      setAiTestResult(null);
    } else {
      localStorage.setItem(
        'linguaflow_ai_config',
        JSON.stringify({
          provider: aiProvider,
          apiKey: apiKey.trim(),
          model: aiProvider === 'gemini' ? 'gemini-1.5-flash' : 'llama-3.3-70b-versatile'
        })
      );
    }
    setIsSavedAI(true);
    setTimeout(() => setIsSavedAI(false), 2500);
  };

  const handleTestConnection = async () => {
    if (!apiKey.trim()) {
      setAiTestResult({ success: false, error: 'Please enter your API key first.' });
      return;
    }
    setIsTestingAI(true);
    setAiTestResult(null);
    const res = await translationEngine.testAIConnection({
      provider: aiProvider,
      apiKey: apiKey.trim(),
      model: aiProvider === 'gemini' ? 'gemini-1.5-flash' : 'llama-3.3-70b-versatile'
    });
    setIsTestingAI(false);
    setAiTestResult(res);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <h2 className="text-base font-bold text-white m-0">Settings & AI Models</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 text-sm max-h-[75vh] overflow-y-auto">
          {/* AI Model Provider Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>AI Translation Engine</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onOpenAIGuide) onOpenAIGuide();
                }}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center space-x-1 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20 transition-colors"
              >
                <HelpCircle className="w-3 h-3" />
                <span>3-Step Key Guide</span>
              </button>
            </div>

            <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800/80 space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Active Mode
                </label>
                <select
                  value={aiProvider}
                  onChange={(e) => {
                    setAiProvider(e.target.value);
                    setAiTestResult(null);
                  }}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value="default">Basic Mode (Lowest Accuracy - Zero Setup)</option>
                  <option value="groq">Groq Llama 3.3 70B (Free Personal Key - Ultra Fast)</option>
                  <option value="gemini">Google Gemini 1.5 Flash (Free Personal Key - Slang Pro)</option>
                </select>
              </div>

              {aiProvider === 'default' ? (
                <div className="p-3 bg-amber-950/20 rounded-xl border border-amber-500/30 flex items-start space-x-2 text-xs text-amber-300">
                  <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                  <p className="m-0 leading-relaxed text-[11px]">
                    <strong>Basic Mode is active (Lowest Accuracy):</strong> Literal word-for-word translation without context or slang awareness. Always free and unlimited. For superior AI accuracy with slang and dialect comprehension, use Smart AI or enter a free personal key below.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-slate-300 flex items-center">
                      <Key className="w-3.5 h-3.5 mr-1 text-amber-400" />
                      <span>{aiProvider === 'gemini' ? 'Gemini API Key' : 'Groq API Key'}</span>
                    </label>
                    <a
                      href={aiProvider === 'gemini' ? 'https://aistudio.google.com/app/apikey' : 'https://console.groq.com/keys'}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-blue-400 hover:underline flex items-center"
                    >
                      <span>Get Free Key</span>
                      <ExternalLink className="w-3 h-3 ml-0.5" />
                    </a>
                  </div>

                  <input
                    type="password"
                    placeholder={`Paste your ${aiProvider === 'gemini' ? 'AIza...' : 'gsk_...'} key here`}
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value);
                      setAiTestResult(null);
                    }}
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-mono placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                  <p className="text-[10px] text-slate-400 leading-tight">
                    Your key is stored securely in your browser's private local storage and never leaves your device.
                  </p>

                  {/* Test Feedback */}
                  {aiTestResult && (
                    <div
                      className={`p-2.5 rounded-xl border flex items-start space-x-2 text-xs animate-fadeIn ${
                        aiTestResult.success
                          ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                          : 'bg-red-950/40 border-red-500/40 text-red-300'
                      }`}
                    >
                      {aiTestResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      )}
                      <span className="text-[11px] leading-tight">
                        {aiTestResult.message || aiTestResult.error}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                {aiProvider !== 'default' ? (
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTestingAI || !apiKey.trim()}
                    className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-medium transition-colors"
                  >
                    {isTestingAI ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    )}
                    <span>{isTestingAI ? 'Testing...' : 'Test Key'}</span>
                  </button>
                ) : (
                  <div />
                )}

                <button
                  onClick={handleSaveAIConfig}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition-all"
                >
                  {isSavedAI ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : null}
                  <span>{isSavedAI ? 'Saved!' : 'Save Settings'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Voice Output Settings (TTS) */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
              <Volume2 className="w-4 h-4 text-blue-400" />
              <span>Voice Playback (TTS)</span>
            </h3>

            <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
              <div>
                <span className="text-xs font-medium text-slate-200 block">Auto-read translations</span>
                <span className="text-[11px] text-slate-400">Speak each translation out loud when received</span>
              </div>
              <input
                type="checkbox"
                checked={settings.autoTTS}
                onChange={(e) => onUpdateSettings({ ...settings, autoTTS: e.target.checked })}
                className="w-4 h-4 accent-blue-600 cursor-pointer"
              />
            </div>

            <div className="space-y-2 p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Voice Speed: {settings.ttsRate}x</span>
              </div>
              <input
                type="range"
                min="0.7"
                max="1.5"
                step="0.1"
                value={settings.ttsRate}
                onChange={(e) => onUpdateSettings({ ...settings, ttsRate: parseFloat(e.target.value) })}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>
          </div>

          {/* Support Developer Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-950/30 to-slate-900 border border-rose-500/20 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400">
                <Heart className="w-5 h-5 fill-rose-400" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white m-0">Support LinguaFlow</h3>
                <p className="text-[11px] text-slate-400 m-0">
                  Tip from £1 to support development
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                onClose();
                if (onOpenSupport) onOpenSupport();
              }}
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow transition-all cursor-pointer"
            >
              Tip / Support
            </button>
          </div>

          {/* PWA Installation Card */}
          <div className="bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border border-blue-500/20 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white m-0">Install Progressive Web App</h3>
                <p className="text-[11px] text-slate-400 m-0">
                  {isInstalled
                    ? 'Installed as standalone desktop/mobile app'
                    : 'Add to Windows Desktop or mobile home screen'}
                </p>
              </div>
            </div>

            {!isInstalled && deferredPrompt && (
              <button
                onClick={handleInstallPWA}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition-all"
              >
                Install
              </button>
            )}
            {isInstalled && (
              <span className="flex items-center text-xs text-emerald-400 font-medium">
                <Check className="w-4 h-4 mr-1" />
                Active
              </span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
