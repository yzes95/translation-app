import React, { useState, useEffect } from 'react';
import { X, Smartphone, Download, Check, Sparkles, Apple, Globe, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

export const InstallModal = ({ isOpen, onClose }) => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [activeTab, setActiveTab] = useState('pwa'); // 'pwa' or 'apk'

  useEffect(() => {
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
    if (!deferredPrompt) {
      alert('To install as PWA on this browser:\n\n• On iPhone/Safari: Tap Share (square with arrow) -> "Add to Home Screen".\n• On Android/Chrome: Tap the 3 dots menu -> "Install App" or "Add to Home Screen".\n• On Windows/Edge: Click the Install icon in the address bar.');
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white m-0">Install on Your Device</h2>
              <p className="text-xs text-slate-400 m-0">Choose your preferred installation format</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="grid grid-cols-2 p-3 gap-2 bg-slate-950/40 border-b border-slate-800/80">
          <button
            onClick={() => setActiveTab('pwa')}
            className={`flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'pwa'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Option A: PWA (Recommended)</span>
          </button>

          <button
            onClick={() => setActiveTab('apk')}
            className={`flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'apk'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Option B: Android APK</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto text-sm">
          {activeTab === 'pwa' ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-blue-950/20 border border-blue-500/20">
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400 mt-0.5">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white mb-1">
                      Progressive Web App (Instant Install)
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed mb-3">
                      Works on <strong>Android, iPhone (iOS), and Windows</strong>. Runs 100% offline, requires 0 MB download to start, and updates automatically.
                    </p>

                    <div className="flex flex-wrap gap-2 text-[11px] text-slate-400">
                      <span className="flex items-center px-2 py-1 bg-slate-800 rounded-lg">
                        <Check className="w-3 h-3 text-emerald-400 mr-1" /> Offline Capable
                      </span>
                      <span className="flex items-center px-2 py-1 bg-slate-800 rounded-lg">
                        <Check className="w-3 h-3 text-emerald-400 mr-1" /> iOS & Android
                      </span>
                      <span className="flex items-center px-2 py-1 bg-slate-800 rounded-lg">
                        <Check className="w-3 h-3 text-emerald-400 mr-1" /> Windows Desktop
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Install action button */}
              <button
                onClick={handleInstallPWA}
                className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-blue-500/25 transition-all cursor-pointer"
              >
                <Smartphone className="w-4 h-4" />
                <span>{isInstalled ? 'Already Installed (Re-install)' : 'Install PWA to Home Screen / Desktop'}</span>
              </button>

              {/* Quick instructions for iOS and Android */}
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-2 text-xs text-slate-400">
                <div className="font-semibold text-slate-300">How to install manually:</div>
                <div className="flex items-center space-x-2">
                  <Apple className="w-3.5 h-3.5 text-slate-300" />
                  <span><strong>iPhone:</strong> Tap Share button in Safari ➔ "Add to Home Screen"</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Globe className="w-3.5 h-3.5 text-slate-300" />
                  <span><strong>Android:</strong> Tap the 3 dots in Chrome ➔ "Install App"</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/20">
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400 mt-0.5">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white mb-1">
                      Android Standalone Package (.APK)
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed mb-3">
                      For Android users who prefer installing a standalone binary file directly onto their device.
                    </p>

                    <div className="flex flex-wrap gap-2 text-[11px] text-slate-400">
                      <span className="flex items-center px-2 py-1 bg-slate-800 rounded-lg">
                        <ShieldCheck className="w-3 h-3 text-emerald-400 mr-1" /> Native Android Binary
                      </span>
                      <span className="flex items-center px-2 py-1 bg-slate-800 rounded-lg">
                        <Check className="w-3 h-3 text-emerald-400 mr-1" /> Sideloadable
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* GitHub Releases APK Link */}
              <a
                href="https://github.com/yzes95/translation-app/releases"
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs shadow-lg shadow-indigo-500/25 transition-all cursor-pointer no-underline"
              >
                <Download className="w-4 h-4" />
                <span>Download APK from GitHub Releases</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </a>

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 text-xs text-slate-400 space-y-1.5">
                <span className="font-semibold text-slate-300 block">Sideloading Instructions:</span>
                <ol className="list-decimal pl-4 space-y-1 m-0">
                  <li>Download the <code className="text-indigo-300">.apk</code> file from GitHub Releases.</li>
                  <li>Tap the downloaded file on your Android device.</li>
                  <li>Enable "Install from Unknown Sources" if prompted by Android.</li>
                  <li>Launch LinguaFlow directly from your app drawer!</li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
