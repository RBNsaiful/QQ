import React, { FC, useEffect, useState } from 'react';
import { Notification } from '../types';
import { db } from '../firebase';
import { ref, remove } from 'firebase/database';

interface NotificationScreenProps {
  texts: any;
  notifications: Notification[];
  onRead: () => void;
}

const BellIcon: FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className={className}>
        <defs>
            <filter id="iconShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="1.2" />
                <feOffset dx="0" dy="1.2" result="offsetblur" />
                <feComponentTransfer>
                    <feFuncA type="linear" slope="0.4" />
                </feComponentTransfer>
                <feMerge>
                    <feMergeNode />
                    <feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>
        </defs>
        <path filter="url(#iconShadow)" d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
    </svg>
);

const TrashIcon: FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1-2-2h4a2 2 0 0 1 2 2v2"/></svg>
);

const ConfirmationDialog: FC<{ title: string; message: string; onConfirm: () => void; onCancel: () => void; confirmText: string; cancelText: string; }> = ({ title, message, onConfirm, onCancel, confirmText, cancelText }) => (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-smart-fade-in">
        <div className="bg-light-card dark:bg-dark-card rounded-2xl p-6 w-full max-w-xs animate-smart-pop-in shadow-2xl border border-gray-100 dark:border-gray-800">
            <h3 className="text-xl font-bold text-center mb-2">{title}</h3>
            <p className="text-center text-gray-500 dark:text-gray-400 mb-6 text-sm">{message}</p>
            <div className="flex space-x-3">
                <button
                    onClick={onCancel}
                    className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold py-3 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                    {cancelText}
                </button>
                <button
                    onClick={onConfirm}
                    className="flex-1 bg-red-500 text-white font-bold py-3 rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-red-500/30"
                >
                    {confirmText}
                </button>
            </div>
        </div>
    </div>
);

const NotificationCard: FC<{ 
    n: Notification, 
    texts: any, 
    isUnread: boolean, 
    onDeleteRequest: (n: Notification) => void,
    isRemoving: boolean
}> = ({ n, texts, isUnread, onDeleteRequest, isRemoving }) => {
    const isGlobalBn = texts.cancel !== 'Cancel';
    const [localIsBn, setLocalIsBn] = useState(isGlobalBn);
    const [isFocused, setIsFocused] = useState(false);
    const [showStatusDot, setShowStatusDot] = useState(true);

    useEffect(() => {
        setLocalIsBn(isGlobalBn);
    }, [isGlobalBn]);

    useEffect(() => {
        const timer = setTimeout(() => setShowStatusDot(false), 5000);
        return () => clearTimeout(timer);
    }, []);

    const formatDateTime = (timestamp: number) => {
        const date = new Date(timestamp);
        const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
        const day = date.getDate();
        const monthIndex = date.getMonth();

        if (localIsBn) {
            const bnMonths = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];
            // Convert day to Bengali digits
            const bnDigits: {[key: string]: string} = { '0':'০','1':'১','2':'২','3':'৩','4':'৪','5':'৫','6':'৬','7':'৭','8':'৮','9':'৯' };
            const bnDay = String(day).split('').map(d => bnDigits[d] || d).join('');
            return { time, date: `${bnDay} ${bnMonths[monthIndex]}` };
        } else {
            const enMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            return { time, date: `${day} ${enMonths[monthIndex]}` };
        }
    };

    const dateTime = formatDateTime(n.timestamp);

    const displayTitle = localIsBn 
        ? (n.title_bn || "নোটিফিকেশন") 
        : (n.title || "Notification");
    const displayMessage = localIsBn 
        ? (n.message_bn || "কোনো বার্তা নেই।") 
        : (n.message || "No message content available.");

    const typeColors = {
        success: 'bg-green-500',
        failed: 'bg-red-500',
        admin: 'bg-gradient-to-r from-primary to-secondary',
        bonus: 'bg-orange-500',
        offer: 'bg-purple-500'
    };

    return (
        <div 
            onClick={() => setIsFocused(!isFocused)}
            className={`
                keep-animating relative flex items-stretch gap-3 p-4 rounded-[1.4rem] cursor-pointer
                bg-white dark:bg-[#1E293B]
                shadow-sm border border-gray-100 dark:border-gray-800
                transition-all duration-500 ease-in-out origin-right transform
                ${isUnread ? 'ring-1 ring-primary/20 bg-primary/5' : ''}
                ${isRemoving ? 'translate-x-full opacity-0 pointer-events-none max-h-0 py-0 my-0 overflow-hidden' : 'opacity-100 max-h-[500px] mb-4'}
                scale-[1.02] transform-none h-auto
            `}
        >
            <style>{`
                @keyframes bell-wiggle {
                    0% { transform: rotate(0); }
                    10% { transform: rotate(15deg); }
                    20% { transform: rotate(-15deg); }
                    30% { transform: rotate(10deg); }
                    40% { transform: rotate(-10deg); }
                    50% { transform: rotate(0); }
                    100% { transform: rotate(0); }
                }
                .app-theme-bell-white {
                    animation: bell-wiggle 4.5s infinite;
                    transform-origin: top center;
                }
            `}</style>

            {/* Left Section: Icon & Time/Date Info */}
            <div className="flex flex-col items-center flex-shrink-0 w-[52px] no-shrink">
                <div className="relative mb-1">
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-gradient-to-br from-primary to-secondary shadow-lg shadow-primary/20">
                        <BellIcon className="w-6 h-6 app-theme-bell-white" />
                    </div>
                    {showStatusDot && (
                        <div className={`absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-[#1E293B] ${typeColors[n.type] || typeColors.admin} shadow-sm`}></div>
                    )}
                </div>
                
                <div className="flex flex-col items-center mt-1.5 space-y-0.5">
                    <span className="text-[7.5px] text-gray-500 dark:text-gray-300 font-black uppercase tracking-tighter">
                        {dateTime.time}
                    </span>
                    <span className="text-[6.8px] text-primary dark:text-secondary font-black uppercase whitespace-nowrap bg-primary/5 dark:bg-white/5 px-1.5 py-0.5 rounded-full border border-primary/10">
                        {dateTime.date}
                    </span>
                </div>
            </div>

            {/* Middle Section: Message Content */}
            <div className="flex-1 min-w-0 flex flex-col justify-center pb-1">
                <h3 className={`text-[12.5px] font-black leading-tight mb-1 text-gray-900 dark:text-white break-words`}>
                    {displayTitle}
                </h3>
                <p className={`text-[11.5px] leading-relaxed font-medium text-gray-700 dark:text-gray-300 break-words ${isUnread ? '' : 'opacity-80'}`}>
                    {displayMessage}
                </p>
            </div>

            {/* Right Section: Actions */}
            <div className="w-[38px] flex flex-col items-end justify-between flex-shrink-0 py-0.5 no-shrink">
                <div className="h-6 flex items-start justify-end w-full">
                    {isFocused && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onDeleteRequest(n); }}
                            className="p-1.5 bg-red-600 text-white rounded-lg shadow-md animate-smart-pop-in hover:bg-red-700 active:scale-90 transition-all"
                            title="Delete"
                        >
                            <TrashIcon className="w-2.5 h-2.5" />
                        </button>
                    )}
                </div>

                <button 
                    onClick={(e) => { e.stopPropagation(); setLocalIsBn(!localIsBn); }}
                    className="px-2 py-0.5 rounded-md bg-primary/15 dark:bg-primary/25 text-[7.5px] font-black text-primary border border-primary/30 shadow-sm hover:bg-primary hover:text-white transition-all uppercase tracking-tighter"
                >
                    {localIsBn ? 'EN' : 'BN'}
                </button>
            </div>
        </div>
    );
};

const NotificationScreen: FC<NotificationScreenProps> = ({ texts, notifications, onRead }) => {
    const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
    const [notifToDelete, setNotifToDelete] = useState<Notification | null>(null);

    useEffect(() => {
        const timer = setTimeout(() => { onRead(); }, 3000);
        return () => clearTimeout(timer);
    }, [onRead]);

    const handleDeleteClick = (n: Notification) => {
        setNotifToDelete(n);
    };

    const handleConfirmDelete = () => {
        if (!notifToDelete) return;
        const id = notifToDelete.id;
        
        setNotifToDelete(null);
        setRemovingIds(prev => new Set(prev).add(id));
        
        setTimeout(async () => {
            try {
                await remove(ref(db, `notifications/${id}`));
            } catch (e) {
                console.error("Delete failed", e);
            } finally {
                setRemovingIds(prev => {
                    const next = new Set(prev);
                    next.delete(id);
                    return next;
                });
            }
        }, 450);
    };

    const deleteMessage = texts.cancel === 'Cancel' 
        ? "Delete this notification permanently?" 
        : "এই নোটিফিকেশনটি কি স্থায়ীভাবে মুছে ফেলতে চান?";

    return (
        <div className="min-h-full bg-[#F8FAFC] dark:bg-[#0F172A] animate-smart-fade-in pb-24">
             <div className="max-w-xl mx-auto p-4">
                {notifications.length > 0 ? (
                    notifications.map((n) => {
                        const lastReadTime = Number(localStorage.getItem('lastReadTimestamp') || 0);
                        const isUnread = n.timestamp > lastReadTime;
                        return (
                            <NotificationCard 
                                key={n.id} 
                                n={n} 
                                texts={texts} 
                                isUnread={isUnread} 
                                onDeleteRequest={handleDeleteClick} 
                                isRemoving={removingIds.has(n.id)}
                            />
                        );
                    })
                ) : (
                    <div className="flex flex-col items-center justify-center py-40 text-center opacity-30 animate-smart-fade-in">
                        <div className="w-16 h-16 bg-primary/5 dark:bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                            <BellIcon className="w-7 h-7 grayscale opacity-50" />
                        </div>
                        <h3 className="text-gray-600 dark:text-gray-300 font-bold mb-1 text-sm">{texts.noNotificationsTitle}</h3>
                        <p className="text-gray-400 dark:text-gray-500 text-[10px] uppercase tracking-widest">{texts.noNotifications}</p>
                    </div>
                )}
             </div>

             {notifToDelete && (
                <ConfirmationDialog
                    title={texts.deleteConfirmTitle}
                    message={deleteMessage}
                    onConfirm={handleConfirmDelete}
                    onCancel={() => setNotifToDelete(null)}
                    confirmText={texts.deleteConfirmButton}
                    cancelText={texts.cancel}
                />
            )}
        </div>
    );
};

export default NotificationScreen;