import React, { useRef, useState, useEffect, FC } from 'react';

interface VideoAdPlayerProps {
    videoUrl: string;
    onComplete: () => void;
    onClose: () => void;
    duration?: number;
    texts: any;
}

const XIcon: FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
);

const VideoAdPlayer: FC<VideoAdPlayerProps> = ({ videoUrl, onComplete, onClose, duration = 15, texts }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [timeLeft, setTimeLeft] = useState<number>(duration);
    const [canClose, setCanClose] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isContentReady, setIsContentReady] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [isPausedByVisibility, setIsPausedByVisibility] = useState(false);
    
    const timerRef = useRef<number | null>(null);
    const isVideoFile = videoUrl.match(/\.(mp4|webm|ogg|mov)$/i);

    const getEmbedUrl = (url: string) => {
        const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:.*v=|.*\/|embed\/)([^&?]*))/);
        if (ytMatch) {
            const videoId = ytMatch[1];
            const origin = window.location.origin;
            const params = new URLSearchParams({
                'autoplay': '1',
                'mute': '1',
                'controls': '0',
                'rel': '0',
                'playsinline': '1',
                'modestbranding': '1',
                'enablejsapi': '1',
                'origin': origin,
                'widget_referrer': origin
            });
            return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
        }
        return url;
    };

    const embedSrc = !isVideoFile ? getEmbedUrl(videoUrl) : '';

    useEffect(() => {
        const handleVisibilityChange = () => {
            const isHidden = document.hidden;
            setIsPausedByVisibility(isHidden);
            if (videoRef.current) {
                if (isHidden) videoRef.current.pause();
                else if (isContentReady) videoRef.current.play().catch(() => {});
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [isContentReady]);

    useEffect(() => {
        if (!isContentReady || isPausedByVisibility || canClose || hasError) {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
            return;
        }

        if (!timerRef.current) {
            timerRef.current = window.setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current!);
                        timerRef.current = null;
                        setCanClose(true);
                        onComplete();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [isContentReady, isPausedByVisibility, canClose, hasError, onComplete]);

    const handleLoadSuccess = () => {
        setIsLoading(false);
        setIsContentReady(true);
        setHasError(false);
    };

    const handleLoadError = () => {
        setIsLoading(false);
        setIsContentReady(false);
        setHasError(true);
    };

    const radius = 20;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (timeLeft / duration) * circumference;

    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center animate-smart-fade-in overflow-hidden">
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-50">
                <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border backdrop-blur-md shadow-2xl transition-all duration-300 ${isPausedByVisibility ? 'bg-orange-500 border-orange-400 animate-pulse' : 'bg-black/40 border-white/10 text-white/70'}`}>
                    {isPausedByVisibility ? texts.adPaused : isLoading ? texts.verifying : texts.adInProgress}
                </div>

                <div className="relative w-14 h-14 flex items-center justify-center">
                    {!canClose ? (
                        <div className="relative w-full h-full flex items-center justify-center">
                            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 50 50">
                                <circle
                                    cx="25" cy="25" r={radius}
                                    fill="rgba(0,0,0,0.3)"
                                    stroke="rgba(255,255,255,0.1)"
                                    strokeWidth="4"
                                />
                                <circle
                                    cx="25" cy="25" r={radius}
                                    fill="transparent"
                                    stroke="white"
                                    strokeWidth="4"
                                    strokeDasharray={circumference}
                                    strokeDashoffset={offset}
                                    strokeLinecap="round"
                                    className="transition-all duration-1000 linear"
                                />
                            </svg>
                            <span className="text-white font-black text-base font-mono relative z-10 leading-none">{timeLeft}</span>
                        </div>
                    ) : (
                        <button onClick={onClose} className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center shadow-xl hover:bg-gray-200 active:scale-90 transition-all animate-smart-pop-in">
                            <XIcon className="w-6 h-6" />
                        </button>
                    )}
                </div>
            </div>

            <div className="relative w-full h-full flex items-center justify-center bg-black">
                {isLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-black z-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary/20 border-t-primary mb-3"></div>
                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{texts.loadingAd}</p>
                    </div>
                )}

                {hasError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-black/95 z-40 p-6 text-center animate-smart-pop-in">
                        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                            <XIcon className="w-10 h-10 text-red-500" />
                        </div>
                        <h3 className="font-bold text-xl mb-2">{texts.adFailed}</h3>
                        <p className="text-sm text-white/50 mb-8 max-w-[250px]">{texts.adFailedDesc}</p>
                        <button onClick={onClose} className="px-10 py-3.5 bg-white text-black rounded-2xl font-bold active:scale-95 transition-transform uppercase text-xs">{texts.returnToEarn}</button>
                    </div>
                )}

                {isPausedByVisibility && isContentReady && !canClose && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-30 backdrop-blur-sm animate-fade-in">
                        <div className="p-8 bg-white rounded-[40px] text-black text-center max-w-[280px] shadow-2xl">
                             <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-orange-500"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                             </div>
                             <p className="font-black text-xl mb-1">{texts.adPaused}</p>
                             <p className="text-sm text-gray-500">{texts.stayOnScreen}</p>
                        </div>
                    </div>
                )}

                {isVideoFile ? (
                    <video 
                        ref={videoRef} 
                        src={videoUrl} 
                        className={`w-full h-full object-contain transition-opacity duration-700 ${isContentReady ? 'opacity-100' : 'opacity-0'}`} 
                        playsInline autoPlay muted 
                        onCanPlay={handleLoadSuccess} onError={handleLoadError} 
                    />
                ) : (
                    <iframe 
                        src={embedSrc} 
                        className={`w-full h-full border-none transition-opacity duration-700 ${isContentReady ? 'opacity-100' : 'opacity-0'}`} 
                        onLoad={handleLoadSuccess} onError={handleLoadError} 
                        allow="autoplay; encrypted-media; gyroscope; picture-in-picture; web-share" 
                        sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-forms"
                    />
                )}
            </div>
        </div>
    );
};

export default VideoAdPlayer;