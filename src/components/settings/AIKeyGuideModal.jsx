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
  ChevronLeft,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { translationEngine } from '../../services/translationEngine';

const GEMINI_SLIDES = [
  {
    image: './guide/gemini/step1_choose_account.png',
    title: '1. Select Your Google Account',
    caption: 'Sign in with your usual Google or Gmail account. No credit card or billing is ever asked.'
  },
  {
    image: './guide/gemini/step2_click_create_key.png',
    title: '2. Click "Create API Key"',
    caption: 'On Google AI Studio, look at the top right and tap the blue button highlighted in cyan.'
  },
  {
    image: './guide/gemini/step3_confirm_create.png',
    title: '3. Name Your Key & Confirm',
    caption: 'Type any name (e.g. LinguaFlow) or leave the default, then tap the "Create key" button.'
  },
  {
    image: './guide/gemini/step4_copy_key.png',
    title: '4. Tap "Copy Key"',
    caption: 'Tap the green-highlighted "Copy key" button. Then come back here and paste it below!'
  }
];

export const AIKeyGuideModal = ({ isOpen, onClose, onSaveSuccess }) => {
  const [selectedProvider, setSelectedProvider] = useState('gemini'); // 'gemini' | 'groq'
  const [currentSlide, setCurrentSlide] = useState(0);
  const [apiKey, setApiKey] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  if (!isOpen) return null;

  const slides = selectedProvider === 'gemini' ? GEMINI_SLIDES : [];

  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const handlePrevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full flex flex-col shadow-2xl overflow-hidden max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-950/40 via-slate-950 to-blue-950/40">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Sparkles className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white m-0">Setup Guide: Unlimited Mode</h2>
              <p className="text-[11px] text-slate-400 m-0">Step-by-step visual pictures for everyone</p>
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
        <div className="p-6 space-y-4 overflow-y-auto text-sm">
          {/* Reassurance Banner */}
          <div className="p-3.5 bg-emerald-950/25 rounded-2xl border border-emerald-500/30 flex items-start space-x-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-0.5">
              <span className="font-bold text-emerald-300 block text-xs">
                No setup required if you prefer!
              </span>
              <p className="text-emerald-200/80 m-0 text-[11px] leading-relaxed">
                You can always use <strong>🟢 Basic</strong> or <strong>⭐ Smart</strong> mode without setting up any keys. This step is only if you want <strong>♾️ Unlimited</strong> usage.
              </p>
            </div>
          </div>

          {/* Provider Tabs */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => {
                setSelectedProvider('gemini');
                setCurrentSlide(0);
                setTestResult(null);
              }}
              className={`flex-1 flex items-center justify-center space-x-1.5 py-2 text-xs font-semibold rounded-lg transition-all ${
                selectedProvider === 'gemini'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-300" />
              <span>Google Gemini (Visual Guide)</span>
            </button>
            <button
              onClick={() => {
                setSelectedProvider('groq');
                setCurrentSlide(0);
                setTestResult(null);
              }}
              className={`flex-1 flex items-center justify-center space-x-1.5 py-2 text-xs font-semibold rounded-lg transition-all ${
                selectedProvider === 'groq'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>Groq Llama 3.3 (Ultra Fast)</span>
            </button>
          </div>

          {/* Picture Slider for Gemini */}
          {selectedProvider === 'gemini' ? (
            <div className="space-y-2">
              <div className="relative rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 aspect-[16/9] flex items-center justify-center group">
                <img
                  src={slides[currentSlide].image}
                  alt={slides[currentSlide].title}
                  className="w-full h-full object-contain"
                />

                {/* Left/Right Arrows */}
                <button
                  onClick={handlePrevSlide}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white border border-slate-700 transition-all cursor-pointer shadow-lg"
                  title="Previous step"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNextSlide}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white border border-slate-700 transition-all cursor-pointer shadow-lg"
                  title="Next step"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                {/* Dots indicator */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-1.5 bg-black/60 px-2.5 py-1 rounded-full backdrop-blur-sm">
                  {slides.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentSlide(i)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        currentSlide === i ? 'bg-indigo-400 w-4' : 'bg-slate-600'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Caption */}
              <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800/80 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white m-0">{slides[currentSlide].title}</h4>
                  <p className="text-[11px] text-slate-400 m-0 pt-0.5">{slides[currentSlide].caption}</p>
                </div>
                <a
                  href={providerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all ml-2"
                >
                  <span>Open Page</span>
                  <ExternalLink className="w-3 h-3 ml-0.5" />
                </a>
              </div>
            </div>
          ) : (
            /* Groq Placeholder */
            <div className="p-6 bg-slate-950/70 rounded-2xl border border-slate-800 text-center space-y-3">
              <Zap className="w-8 h-8 text-amber-400 mx-auto" />
              <div>
                <h4 className="text-xs font-bold text-white m-0">Groq Fast AI Key</h4>
                <p className="text-[11px] text-slate-400 m-0 pt-1">
                  1. Tap the button below to open Groq Console.<br />
                  2. Sign in and click <strong>Create API Key</strong>.<br />
                  3. Copy and paste it into the box below.
                </p>
              </div>
              <a
                href={providerUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all"
              >
                <span>Open Groq Console</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {/* Key Input Section */}
          <div className="space-y-2 pt-1">
            <label className="text-xs font-semibold text-slate-300 block">
              Paste Your Free Key:
            </label>
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

            {testResult && (
              <div
                className={`p-3 rounded-xl border flex items-start space-x-2 text-xs animate-fadeIn ${
                  testResult.success
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                    : 'bg-red-950/40 border-red-500/40 text-red-300'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                )}
                <span className="text-[11px] leading-tight">
                  {testResult.message || testResult.error}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
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
                <span>Checking Key...</span>
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
