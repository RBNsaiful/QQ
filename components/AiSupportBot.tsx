import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GoogleGenAI } from "@google/genai";
import { User, AppSettings, DiamondOffer, PaymentMethod, SupportContact, LevelUpPackage, Membership, PremiumApp, SpecialOffer, Screen } from '../types';
import { DEFAULT_AI_KEY } from '../constants';
import { db } from '../firebase';
import { ref, get, update, runTransaction } from 'firebase/database';

// --- SOUND ASSETS ---
const SEND_SOUND = "data:audio/mp3;base64,SUQzBAAAAAAAI1RTSVMAAAAPAAADTGF2ZjU4LjI5LjEwMAAAAAAAAAAAAAAA//uQZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWgAAAA0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uQZAAABzgM0AAAAAAOAAAAAAAAAAAA0gAAAAAOA4AAAD///7kmQAAAA3AA0AAAAAAA4AAAAAAAALQAAAAADgOAAA///+5JkAAANwANAAAAAAAOAAAAAAAAC0AAAAAA4DgAAAP///uSZAAAALQAAAAADgOAAA///+5JkAAAAAAAOA4AAAD///7kmQAAAAAADgOAAAA//uQZAAAAAAA0gAAAAOA4AAAD///7kmQAAAAAADgOAAAA//uQZAAAAAAA0gAAAAOA4AAAD//+5JkAAANwANAAAAAAAOAAAAAAAAC0AAAAAA4DgAAAP///uSZAAAADcADQAAAAADgAAAAAAAAAtAAAAAAOA4AAAD///7kmQAAAA3AA0AAAAAAA4AAAAAAAALQAAAAADgOAAA///+5JkAAAAAAANIAAAAAOA4AAAD///7kmQAAAAAADgOAAAA//uQZAAAAAAA0gAAAAOA4AAAD///7kmQAAAAAADgOAAAA//uQZAAAAAAA0gAAAAOA4AAAD///7kmQAAAAAADgOAAAA//uQZAAAAAAA0gAAAAOA4AAAD///7kmQAAAAAADgOAAAA"; 
const RECEIVE_SOUND = "data:audio/mp3;base64,//uQZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWgAAAA0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uQZAAABzgM0AAAAAAOAAAAAAAAAAAA0gAAAAAOA4AAAD///7kmQAAAA3AA0AAAAAAA4AAAAAAAALQAAAAADgOAAA///+5JkAAANwANAAAAAAAOAAAAAAAAC0AAAAAA4DgAAAP///uSZAAAALQAAAAADgOAAA///+5JkAAAAAAAOA4AAAD///7kmQAAAAAADgOAAAA//uQZAAAAAAA0gAAAAOA4AAAD///7kmQAAAAAADgOAAAA//uQZAAAAAAA0gAAAAOA4AAAD//+5JkAAANwANAAAAAAAOAAAAAAAAC0AAAAAA4DgAAAP///uSZAAAALQAAAAADgOAAA///+5JkAAAAAAAOA4AAAD///7kmQAAAAAADgOAAAA//uQZAAAAAAA0gAAAAOA4AAAD///7kmQAAAAAADgOAAAA//uQZAAAAAAA0gAAAAOA4AAAD///7kmQAAAAAADgOAAAA";

// --- ANIMATED ICONS ---
const LiveRobotIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <style>
      {`
        @keyframes blink { 0%, 90%, 100% { transform: scaleY(1); } 95% { transform: scaleY(0.1); } }
        @keyframes scan { 0% { transform: translateX(-2px); } 50% { transform: translateX(2px); } 100% { transform: translateX(-2px); } }
        .bot-eyes { animation: blink 4s infinite; transform-origin: center; }
        .bot-antenna { animation: scan 3s ease-in-out infinite; }
      `}
    </style>
    <path d="M12 8V4H8" className="bot-antenna" />
    <rect x="4" y="8" width="16" height="12" rx="2" />
    <path d="M2 14h2" />
    <path d="M20 14h2" />
    <path d="M15 13v2" />
    <path d="M9 13v2" />
    <g className="bot-eyes">
        <circle cx="9" cy="12" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="15" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </g>
  </svg>
);

const SendIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
);

const ArrowLeftIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>
    </svg>
);

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
}

interface AiSupportBotProps {
  user: User;
  appSettings: AppSettings;
  diamondOffers: DiamondOffer[];
  paymentMethods: PaymentMethod[];
  supportContacts: SupportContact[];
  levelUpPackages: LevelUpPackage[];
  memberships: Membership[];
  premiumApps: PremiumApp[];
  specialOffers: SpecialOffer[];
  activeScreen: Screen;
  setActiveScreen: (screen: Screen) => void;
  texts: any;
}

const AiSupportBot: React.FC<AiSupportBotProps> = ({
  user,
  appSettings,
  activeScreen,
  setActiveScreen,
  texts
}) => {
  const botName = appSettings.aiName || "Support"; 
  const appName = appSettings.appName || "FF SHOP";
  const DAILY_LIMIT = 30; 
  
  const [messages, setMessages] = useState<Message[]>([]);
  
  useEffect(() => {
      if (messages.length === 0) {
          setMessages([{ 
              id: 'init', 
              role: 'model', 
              text: texts.aiBotInitialMsg.replace('{name}', user.name).replace('{appName}', appName)
          }]);
      }
  }, [appName, user.name, texts.aiBotInitialMsg]);
  
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const playSound = (type: 'send' | 'receive') => {
      try {
          const audio = new Audio(type === 'send' ? SEND_SOUND : RECEIVE_SOUND);
          audio.volume = 0.5;
          audio.play().catch(e => {}); 
      } catch (e) {}
  };

  const [position, setPosition] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const buttonStartPos = useRef({ ...position });
  const hasMoved = useRef(false);

  useEffect(() => {
      if (typeof window !== 'undefined') {
          setPosition({ x: window.innerWidth - 75, y: window.innerHeight - 140 });
      }
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, activeScreen]);
  useEffect(() => { if (textareaRef.current) { textareaRef.current.style.height = 'auto'; textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`; }}, [input]);

  const handlePointerDown = (e: any) => { isDragging.current = true; hasMoved.current = false; const clientX = e.touches ? e.touches[0].clientX : e.clientX; const clientY = e.touches ? e.touches[0].clientY : e.clientY; dragStartPos.current = { x: clientX, y: clientY }; buttonStartPos.current = { ...position }; };
  const handlePointerMove = (e: any) => { if (!isDragging.current) return; const clientX = e.touches ? e.touches[0].clientX : e.clientX; const clientY = e.touches ? e.touches[0].clientY : e.clientY; const deltaX = clientX - dragStartPos.current.x; const deltaY = clientY - dragStartPos.current.y; if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) hasMoved.current = true; let x = buttonStartPos.current.x + deltaX; let y = buttonStartPos.current.y + deltaY; const maxX = window.innerWidth - 60; const maxY = window.innerHeight - 130; if (x < 0) x = 0; if (x > maxX) x = maxX; if (y < 0) y = 0; if (y > maxY) y = maxY; setPosition({ x, y }); };
  const handlePointerUp = () => { isDragging.current = false; };
  const handleButtonClick = () => { if (!hasMoved.current) setActiveScreen('aiChat'); };

  const systemInstruction = useMemo(() => {
    const devInfo = appSettings.developerSettings || { title: "RBN Saiful", url: "http://rbm-saiful-contact.vercel.app" };
    return `You are the official Smart Assistant for "${appName}". developed by ${devInfo.title}. Use user's language (Bengali or English). Direct password reset to Support page.`;
  }, [appSettings, appName]);

  const checkDailyUsage = async (): Promise<boolean> => {
      const today = new Date().toISOString().split('T')[0];
      const usageRef = ref(db, `users/${user.uid}/aiDailyUsage`);
      try {
          const snapshot = await get(usageRef);
          let currentUsage = { date: today, count: 0 };
          if (snapshot.exists()) {
              const data = snapshot.val();
              if (data.date === today) currentUsage = data;
          }
          if (currentUsage.count >= DAILY_LIMIT) return false;
          await update(ref(db, `users/${user.uid}/aiDailyUsage`), { date: today, count: currentUsage.count + 1 });
          return true;
      } catch (error) { return true; }
  };

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;
    const userMessageText = input;
    setInput('');
    const userMessage: Message = { id: Date.now().toString(), role: 'user', text: userMessageText };
    setMessages(prev => [...prev, userMessage]);
    playSound('send');
    setIsTyping(true);

    const isAllowed = await checkDailyUsage();
    if (!isAllowed) {
        setIsTyping(false);
        setTimeout(() => {
            setMessages(prev => [...prev, { 
                id: Date.now().toString(), 
                role: 'model', 
                text: texts.aiLimitReached.replace('{name}', user.name)
            }]);
            playSound('receive');
        }, 500);
        return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const history = messages.map(m => ({ role: m.role, parts: [{ text: m.text }] }));
      const chat = ai.chats.create({ model: "gemini-3-flash-preview", config: { systemInstruction: systemInstruction }, history: history });
      const result = await chat.sendMessageStream({ message: userMessageText });
      const botMessageId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, { id: botMessageId, role: 'model', text: '' }]);
      let fullText = '';
      let soundPlayed = false;
      for await (const chunk of result) {
        const chunkText = chunk.text;
        if (chunkText) {
            if (!soundPlayed) { playSound('receive'); soundPlayed = true; }
            fullText += chunkText;
            setMessages(prev => prev.map(m => m.id === botMessageId ? { ...m, text: fullText } : m));
        }
      }
    } catch (error: any) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "Error connecting. Try again." }]);
    } finally { setIsTyping(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };

  if (!appSettings.aiSupportActive) return null;

  return (
    <>
      {activeScreen !== 'aiChat' && (
        <div
            onMouseDown={handlePointerDown} onMouseMove={handlePointerMove} onMouseUp={handlePointerUp} onMouseLeave={handlePointerUp}
            onTouchStart={handlePointerDown} onTouchMove={handlePointerMove} onTouchEnd={handlePointerUp}
            onClick={handleButtonClick}
            style={{ left: position.x, top: position.y, position: 'fixed', zIndex: 50, touchAction: 'none' }}
            className="cursor-move active:cursor-grabbing keep-animating"
        >
            <div className="bg-gradient-to-r from-primary to-secondary text-white p-2.5 rounded-full shadow-lg shadow-primary/40 hover:scale-110 active:scale-95 transition-transform duration-200 flex items-center justify-center">
                <LiveRobotIcon className="w-7 h-7" />
            </div>
        </div>
      )}

      {activeScreen === 'aiChat' && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-light-bg dark:bg-dark-bg animate-smart-slide-up w-full h-full">
          <div className="flex items-center justify-between py-3 px-4 bg-light-bg dark:bg-dark-bg border-b border-gray-200 dark:border-gray-800 shadow-sm h-16">
            <div className="flex items-center gap-3">
              <button onClick={() => setActiveScreen('home')} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-300"><ArrowLeftIcon className="w-6 h-6" /></button>
              <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-r from-primary to-secondary p-1.5 rounded-full text-white shadow-md keep-animating">
                      <LiveRobotIcon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white leading-none">{botName}</h3>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-[#0F172A] no-scrollbar">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'model' && (
                    <div className="w-8 h-8 mr-2 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center self-end mb-1 text-white shadow-sm flex-shrink-0">
                        <LiveRobotIcon className="w-4 h-4" />
                    </div>
                )}
                <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm relative break-words whitespace-pre-wrap ${msg.role === 'user' ? 'bg-primary text-white rounded-br-none' : 'bg-white dark:bg-dark-card text-gray-800 dark:text-gray-200 rounded-bl-none border border-gray-100 dark:border-gray-700'}`}>{msg.text}</div>
              </div>
            ))}
            {isTyping && (
                <div className="flex justify-start w-full items-end">
                    <div className="w-8 h-8 mr-2 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center text-white shadow-sm">
                        <LiveRobotIcon className="w-4 h-4" />
                    </div>
                    <div className="bg-white dark:bg-dark-card px-4 py-3 rounded-2xl rounded-bl-none border border-gray-100 dark:border-gray-700 flex gap-1.5">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 bg-white dark:bg-dark-card border-t border-gray-100 dark:border-gray-800 flex items-end gap-2 sticky bottom-0 w-full z-20">
            <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-2 border border-transparent focus-within:border-primary/50 transition-colors">
                <textarea ref={textareaRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder={texts.typeHere} rows={1} className="w-full bg-transparent text-gray-900 dark:text-white text-sm focus:outline-none resize-none max-h-32 leading-relaxed pt-1.5" />
            </div>
            <button onClick={handleSend} disabled={!input.trim() || isTyping} className={`p-3 rounded-full transition-all shadow-md flex items-center justify-center mb-0.5 ${!input.trim() || isTyping ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-primary text-white hover:bg-primary-dark active:scale-95'}`}><SendIcon className="w-5 h-5 ml-0.5" /></button>
          </div>
        </div>
      )}
    </>
  );
};

export default AiSupportBot;