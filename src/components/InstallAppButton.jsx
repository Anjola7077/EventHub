import React, { useState, useEffect } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { Download, Share, X } from 'lucide-react';

const InstallAppButton = ({ darkMode }) => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    window.addEventListener('appinstalled', () => {
      setDeferredPrompt(null); // Hide button once installed
    });

    // Detect iOS and Standalone mode
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isAppleDevice);
    setIsStandalone(window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches);

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    // If it's iOS and not installed, show our custom instructional modal
    if (isIOS && !isStandalone) {
      setShowIOSModal(true);
      return;
    }

    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  };

  // Show the button if the prompt is ready OR if they are an uninstalled iOS user
  if (!deferredPrompt && (!isIOS || isStandalone)) return null;

  return (
    <>
      <Motion.button
        initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
        onClick={handleInstallClick}
        className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-full text-sm font-bold shadow-md transition-all bg-blue-600 text-white hover:bg-blue-700 whitespace-nowrap`}
      >
        <Download size={16} />
        <span>Install App</span>
      </Motion.button>

      <AnimatePresence>
        {showIOSModal && (
          <Motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6"
            onClick={() => setShowIOSModal(false)}
          >
            <Motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-sm p-6 pb-8 rounded-[2rem] shadow-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className={`text-xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>Install EventHub</h3>
                <button onClick={() => setShowIOSModal(false)} className={`p-2 rounded-full ${darkMode ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-slate-100 text-slate-900 hover:bg-slate-200'}`}><X size={18} /></button>
              </div>
              <p className={`text-sm font-medium mb-6 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Install this app on your device for quick access and a better experience!
              </p>
              <ol className={`space-y-4 text-sm font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                <li className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400"><Share size={16} /></span>
                  Tap the <strong>Share</strong> button at the bottom of Safari.
                </li>
                <li className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">2</span>
                  Scroll down and select <strong>Add to Home Screen</strong>.
                </li>
              </ol>
              <button onClick={() => setShowIOSModal(false)} className="mt-8 w-full py-3.5 rounded-2xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition-colors">Got it!</button>
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default InstallAppButton;