
import React, { useState, useEffect, FC, useRef } from 'react';

interface PwaInstallPromptProps {
    appName: string;
    logoUrl: string;
}

const XIcon: FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
);

const DownloadIcon: FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
);

const PwaInstallPrompt: FC<PwaInstallPromptProps> = ({ appName, logoUrl }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const hasBeenShownRef = useRef(false);

    useEffect(() => {
        // 1. Check if we already have the event stored globally
        if ((window as any).deferredPrompt) {
            setDeferredPrompt((window as any).deferredPrompt);
            initShowTimer();
        }

        // 2. Listen for the custom ready event if index.tsx catches it later
        const readyHandler = (e: any) => {
            setDeferredPrompt(e.detail);
            initShowTimer();
        };

        // 3. Robust fallback listener
        const handler = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
            (window as any).deferredPrompt = e;
            initShowTimer();
        };

        function initShowTimer() {
            if (hasBeenShownRef.current) return;
            
            // Wait 5 seconds after entry to show the premium custom banner
            const timer = setTimeout(() => {
                // Check if already in standalone mode
                const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
                    || (navigator as any).standalone 
                    || document.referrer.includes('android-app://');

                if (!isStandalone) {
                    setIsVisible(true);
                    hasBeenShownRef.current = true;
                    
                    // Auto hide after 15 seconds of being visible
                    setTimeout(() => {
                        setIsVisible(false);
                    }, 15000);
                }
            }, 5000);
            
            return () => clearTimeout(timer);
        }

        window.addEventListener('beforeinstallprompt', handler);
        window.addEventListener('pwa-prompt-ready', readyHandler as EventListener);
        
        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
            window.removeEventListener('pwa-prompt-ready', readyHandler as EventListener);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) {
            // Very rare fallback: If event is gone but component is visible
            alert("To install: Open browser menu and select 'Add to Home Screen'");
            setIsVisible(false);
            return;
        }
        
        // Show the native browser install prompt
        deferredPrompt.prompt();
        
        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`PWA Install Choice: ${outcome}`);
        
        // We've used the prompt, and can't use it again, discard it
        setDeferredPrompt(null);
        (window as any).deferredPrompt = null;
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-20 left-0 right-0 z-[100] px-4 md:hidden animate-smart-slide-up keep-animating">
            <div className="bg-white dark:bg-dark-card rounded-2xl shadow-[0_10px_50px_rgba(0,0,0,0.3)] border border-gray-100 dark:border-gray-800 p-4 flex items-center justify-between gap-3 overflow-hidden relative group">
                {/* Premium Glow Decor */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -mr-12 -mt-12 blur-3xl opacity-60"></div>

                <div className="flex items-center gap-3 relative z-10">
                    <div className="w-12 h-12 rounded-xl overflow-hidden shadow-md border border-gray-100 dark:border-gray-700 flex-shrink-0">
                        <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex flex-col">
                        <h4 className="font-extrabold text-sm text-gray-900 dark:text-white truncate max-w-[110px]">
                            {appName}
                        </h4>
                        <p className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tighter">
                            Install Mobile App
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 relative z-10">
                    <button 
                        onClick={handleInstallClick}
                        className="bg-primary text-white text-[11px] font-black px-5 py-2.5 rounded-xl shadow-lg shadow-primary/40 active:scale-95 transition-all flex items-center gap-1.5 uppercase tracking-wide"
                    >
                        <DownloadIcon className="w-3.5 h-3.5" />
                        Install
                    </button>
                    <button 
                        onClick={() => setIsVisible(false)}
                        className="p-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors rounded-full bg-gray-50 dark:bg-gray-800 active:scale-90"
                    >
                        <XIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PwaInstallPrompt;
