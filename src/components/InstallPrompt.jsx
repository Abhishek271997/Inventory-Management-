import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X } from 'lucide-react';

const InstallPrompt = () => {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
            return;
        }

        // Check if dismissed before
        const dismissed = localStorage.getItem('pwa-install-dismissed');
        if (dismissed) {
            return;
        }

        // Listen for install prompt
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);

            // Show prompt after 10 seconds
            setTimeout(() => {
                setShowPrompt(true);
            }, 10000);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Check if app was installed
        window.addEventListener('appinstalled', () => {
            setIsInstalled(true);
            setShowPrompt(false);
        });

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;



        setDeferredPrompt(null);
        setShowPrompt(false);
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        localStorage.setItem('pwa-install-dismissed', 'true');
    };

    if (isInstalled || !showPrompt) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                className="fixed bottom-6 right-6 z-50 max-w-sm"
            >
                <div className="glass-panel p-6 rounded-2xl border border-brand-orange/30 shadow-2xl">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-brand-orange/20 flex items-center justify-center flex-shrink-0">
                            <Download className="text-brand-orange" size={24} />
                        </div>

                        <div className="flex-1">
                            <h3 className="text-white font-bold text-lg mb-1">Install MPM App</h3>
                            <p className="text-slate-400 text-sm mb-4">
                                Install our app for quick access, offline mode, and a better mobile experience!
                            </p>

                            <div className="flex gap-3">
                                <button
                                    onClick={handleInstallClick}
                                    className="bg-brand-orange hover:bg-orange-600 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"
                                >
                                    <Download size={16} />
                                    Install
                                </button>
                                <button
                                    onClick={handleDismiss}
                                    className="text-slate-400 hover:text-white px-4 py-2 rounded-lg text-sm transition-colors"
                                >
                                    Not now
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={handleDismiss}
                            className="text-slate-400 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default InstallPrompt;
