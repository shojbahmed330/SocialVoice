

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, Message, RecordingState, ScrollState, ChatTheme } from '../types';
import { geminiService } from '../services/geminiService';
import Icon from './Icon';
import Waveform from './Waveform';
import { TTS_PROMPTS, CHAT_THEMES } from '../constants';

interface MessageScreenProps {
  currentUser: User;
  recipientUser: User;
  onSetTtsMessage: (message: string) => void;
  lastCommand: string | null;
  scrollState: ScrollState;
  onBlockUser: (user: User) => void;
  onGoBack: () => void;
}

const DateSeparator = ({ date, className }: { date: string, className?: string }) => {
    const formattedDate = new Date(date).toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric'
    });
    return (
        <div className={`text-center text-xs py-4 ${className}`}>
            {formattedDate}
        </div>
    );
};

// Helper to find last index, useful for "seen" indicator logic
function findLastIndex<T>(array: T[], predicate: (value: T, index: number, obj: T[]) => boolean): number {
    let l = array.length;
    while (l--) {
        if (predicate(array[l], l, array)) return l;
    }
    return -1;
}

const useOnClickOutside = (ref: React.RefObject<HTMLElement>, handler: (event: MouseEvent | TouchEvent) => void) => {
    useEffect(() => {
        const listener = (event: MouseEvent | TouchEvent) => {
            if (!ref.current || ref.current.contains(event.target as Node)) {
                return;
            }
            handler(event);
        };
        document.addEventListener("mousedown", listener);
        document.addEventListener("touchstart", listener);
        return () => {
            document.removeEventListener("mousedown", listener);
            document.removeEventListener("touchstart", listener);
        };
    }, [ref, handler]);
};

const MessageScreen: React.FC<MessageScreenProps> = ({ currentUser, recipientUser, onSetTtsMessage, lastCommand, scrollState, onBlockUser, onGoBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [recordingState, setRecordingState] = useState<RecordingState>(RecordingState.IDLE);
  const [duration, setDuration] = useState(0);
  const [currentTheme, setCurrentTheme] = useState<ChatTheme>('default');
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [isThemePickerOpen, setThemePickerOpen] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const playbackTimeoutRef = useRef<number | null>(null);

  useOnClickOutside(menuRef, () => {
    setMenuOpen(false);
    setThemePickerOpen(false);
  });

  useEffect(() => {
    const fetchChatData = async () => {
      setIsLoading(true);
      const [fetchedMessages, chatSettings] = await Promise.all([
          geminiService.getMessages(currentUser.id, recipientUser.id),
          geminiService.getChatSettings(currentUser.id, recipientUser.id)
      ]);
      setMessages(fetchedMessages);
      setCurrentTheme(chatSettings.theme || 'default');
      setIsLoading(false);
    };
    fetchChatData();
  }, [currentUser.id, recipientUser.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  useEffect(() => {
    const scrollContainer = messageContainerRef.current;
    if (!scrollContainer || scrollState === 'none') return;
    let animationFrameId: number;
    const animateScroll = () => {
        scrollContainer.scrollTop += (scrollState === 'down' ? 2 : -2);
        animationFrameId = requestAnimationFrame(animateScroll);
    };
    animationFrameId = requestAnimationFrame(animateScroll);
    return () => cancelAnimationFrame(animationFrameId);
  }, [scrollState]);

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const startTimer = () => {
    stopTimer();
    setDuration(0);
    timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
  };
  
  const handlePlayMessage = (msg: Message) => {
    if (playbackTimeoutRef.current) clearTimeout(playbackTimeoutRef.current);
    if (playingMessageId === msg.id) {
      setPlayingMessageId(null);
    } else {
      setPlayingMessageId(msg.id);
      playbackTimeoutRef.current = setTimeout(() => setPlayingMessageId(null), msg.duration * 1000) as any;
    }
  };

  const startRecording = useCallback(() => {
    setRecordingState(RecordingState.RECORDING);
    onSetTtsMessage(TTS_PROMPTS.message_record_start);
    startTimer();
  }, [onSetTtsMessage]);
  
  const stopRecording = useCallback(() => {
    stopTimer();
    setRecordingState(RecordingState.PREVIEW);
    onSetTtsMessage(TTS_PROMPTS.message_record_stopped(duration));
  }, [duration, onSetTtsMessage]);

  const sendMessage = async () => {
    setRecordingState(RecordingState.UPLOADING);
    onSetTtsMessage("Sending...");
    const newMessage = await geminiService.sendMessage(currentUser.id, recipientUser.id, duration);
    setMessages(m => [...m, newMessage]);
    onSetTtsMessage(TTS_PROMPTS.message_sent);
    setRecordingState(RecordingState.IDLE);
    setDuration(0);
    setTimeout(() => handlePlayMessage(newMessage), 300);
  }

  const handleDeleteChat = async () => {
    if (window.confirm("Are you sure you want to permanently delete this chat history?")) {
        await geminiService.deleteChatHistory(currentUser.id, recipientUser.id);
        onSetTtsMessage(TTS_PROMPTS.chat_deleted);
        onGoBack();
    }
  };

  const handleBlock = () => {
     if (window.confirm(`Are you sure you want to block ${recipientUser.name}?`)) {
        onBlockUser(recipientUser);
    }
  }

  const handleThemeChange = async (theme: ChatTheme) => {
    setCurrentTheme(theme);
    await geminiService.updateChatSettings(currentUser.id, recipientUser.id, { theme });
    setThemePickerOpen(false);
    setMenuOpen(false);
    onSetTtsMessage(TTS_PROMPTS.chat_theme_changed(CHAT_THEMES[theme].name));
  }

  const handleCommand = useCallback(async (command: string) => {
    const intentResponse = await geminiService.processIntent(command);
    
    switch(intentResponse.intent) {
        case 'intent_record_message': if (recordingState === RecordingState.IDLE) startRecording(); break;
        case 'intent_stop_recording': if (recordingState === RecordingState.RECORDING) stopRecording(); break;
        case 'intent_send_chat_message': if (recordingState === RecordingState.PREVIEW) sendMessage(); break;
        case 'intent_re_record': if (recordingState === RecordingState.PREVIEW) startRecording(); break;
        case 'intent_delete_chat': handleDeleteChat(); break;
        case 'intent_change_chat_theme':
            const themeName = (intentResponse.slots?.theme_name as string)?.toLowerCase();
            if (themeName && themeName in CHAT_THEMES) {
                handleThemeChange(themeName as ChatTheme);
            }
            break;
    }
  }, [recordingState, startRecording, stopRecording, sendMessage, handleDeleteChat, handleThemeChange]);

  useEffect(() => { if(lastCommand) handleCommand(lastCommand); }, [lastCommand, handleCommand]);
  useEffect(() => () => { stopTimer(); if (playbackTimeoutRef.current) clearTimeout(playbackTimeoutRef.current); }, []);

  const renderFooter = () => {
    const theme = CHAT_THEMES[currentTheme] || CHAT_THEMES.default;
    switch (recordingState) {
      case RecordingState.RECORDING:
        return (
          <div className="flex items-center gap-4">
            <div className="w-full h-14 bg-black/20 rounded-lg overflow-hidden"><Waveform isPlaying={true} isRecording={true} /></div>
            <div className={`text-lg font-mono ${theme.text}`}>0:{duration.toString().padStart(2, '0')}</div>
            <button onClick={stopRecording} className="p-4 rounded-full bg-rose-600 hover:bg-rose-500 text-white transition-colors"><Icon name="pause" className="w-6 h-6" /></button>
          </div>
        );
      case RecordingState.PREVIEW:
        return (
            <div className="flex items-center justify-between gap-4">
                <p className={`font-medium ${theme.text}`}>Recorded {duration}s</p>
                <div className="flex items-center gap-3">
                    <button onClick={startRecording} className="px-4 py-2 rounded-lg bg-black/20 hover:bg-black/30 text-white font-semibold transition-colors">Re-record</button>
                    <button onClick={sendMessage} className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold transition-colors">Send</button>
                </div>
            </div>
        );
      case RecordingState.UPLOADING: return <p className={`text-center ${theme.text}`}>Sending...</p>
      default:
        return (
          <button onClick={startRecording} className="w-full flex items-center justify-center gap-3 bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 px-4 rounded-lg transition-colors">
            <Icon name="mic" className="w-6 h-6" /><span>Record Voice Message</span>
          </button>
        );
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-full bg-slate-900"><p className="text-slate-300 text-xl">Loading messages...</p></div>;
  }
  
  const myLastMessageIndex = findLastIndex(messages, m => m.senderId === currentUser.id);
  const theirLastMessageIndex = findLastIndex(messages, m => m.senderId === recipientUser.id);
  const showSeenIndicator = myLastMessageIndex !== -1 && theirLastMessageIndex > myLastMessageIndex;
  const theme = CHAT_THEMES[currentTheme] || CHAT_THEMES.default;

  return (
    <div className={`h-full w-full flex flex-col bg-gradient-to-b ${theme.bgGradient} transition-all duration-500`}>
       <div className={`flex-shrink-0 p-3 flex items-center gap-3 border-b border-white/10 relative ${theme.headerText}`}>
            <button onClick={onGoBack} aria-label="Go back" className="p-2 rounded-full hover:bg-black/20 transition-colors"><Icon name="back" className="w-6 h-6"/></button>
            <img src={recipientUser.avatarUrl} alt={recipientUser.name} className="w-10 h-10 rounded-full" />
            <span className="font-bold text-lg">{recipientUser.name}</span>
            <div ref={menuRef} className="ml-auto relative">
                <button onClick={() => setMenuOpen(o => !o)} className="p-2 rounded-full hover:bg-black/20 transition-colors"><Icon name="ellipsis-vertical" className="w-6 h-6" /></button>
                {isMenuOpen && (
                    <div className="absolute top-full right-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl z-50 text-white overflow-hidden animate-fade-in-fast">
                       {isThemePickerOpen ? (
                           <div>
                                <button onClick={() => setThemePickerOpen(false)} className="flex items-center gap-2 p-2 text-sm text-slate-400 hover:text-white w-full hover:bg-slate-700/50">
                                   <Icon name="back" className="w-4 h-4"/> Back to menu
                                </button>
                               <h4 className="px-3 py-1 font-semibold text-slate-300">Change Theme</h4>
                               <div className="p-3 grid grid-cols-5 gap-3">
                                   {Object.keys(CHAT_THEMES).map(key => (
                                       <button key={key} onClick={() => handleThemeChange(key as ChatTheme)} title={CHAT_THEMES[key as ChatTheme].name} className={`w-10 h-10 rounded-full bg-gradient-to-br ${CHAT_THEMES[key as ChatTheme].bgGradient} border-2 ${currentTheme === key ? 'border-rose-500' : 'border-transparent'} transition-all`}></button>
                                   ))}
                               </div>
                           </div>
                       ) : (
                        <ul className="py-1">
                            <li onClick={() => setThemePickerOpen(true)} className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-700/50 cursor-pointer"><Icon name="swatch" className="w-5 h-5 text-slate-400" /><span>Theme</span></li>
                            <li className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-700/50 cursor-pointer opacity-50"><Icon name="bell" className="w-5 h-5 text-slate-400" /><span>Notifications</span></li>
                            <li className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-700/50 cursor-pointer opacity-50"><Icon name="speaker-wave" className="w-5 h-5 text-slate-400" /><span>Sound</span></li>
                            <div className="my-1 h-px bg-slate-700"></div>
                            <li onClick={handleBlock} className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-700/50 cursor-pointer"><Icon name="user-slash" className="w-5 h-5 text-slate-400" /><span>Block</span></li>
                            <li onClick={handleDeleteChat} className="flex items-center gap-3 px-3 py-2.5 text-red-400 hover:bg-red-500/20 cursor-pointer"><Icon name="trash" className="w-5 h-5" /><span>Delete Chat</span></li>
                        </ul>
                       )}
                    </div>
                )}
            </div>
       </div>
      <div ref={messageContainerRef} className="flex-grow overflow-y-auto p-4">
        <div className="flex flex-col gap-1">
            {messages.map((msg, index) => {
               const isSender = msg.senderId === currentUser.id;
               const sentAt = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
               const showDateSeparator = index === 0 || new Date(messages[index - 1].createdAt).toDateString() !== new Date(msg.createdAt).toDateString();
               const bubbleClass = isSender ? theme.myBubble : theme.theirBubble;

               return (
                 <React.Fragment key={msg.id}>
                    {showDateSeparator && <DateSeparator date={msg.createdAt} className={theme.text === 'text-black' ? 'text-gray-500' : 'text-slate-400'} />}
                    <div className={`flex items-end gap-2 ${isSender ? 'justify-end' : 'justify-start'}`}>
                        {!isSender && <img src={recipientUser.avatarUrl} alt={recipientUser.name} className="w-8 h-8 rounded-full self-end mb-2" />}
                        <div className={`flex flex-col ${isSender ? 'items-end' : 'items-start'}`}>
                            <button onClick={() => handlePlayMessage(msg)} className={`max-w-xs lg:max-w-md p-3 rounded-2xl flex items-center gap-3 transition-colors ${theme.text} ${bubbleClass} ${isSender ? 'rounded-br-none' : 'rounded-bl-none'} `}>
                                <Icon name={playingMessageId === msg.id ? 'pause' : 'play'} className="w-6 h-6 flex-shrink-0" />
                                <div className="h-10 w-40"><Waveform isPlaying={playingMessageId === msg.id} isRecording={false} barCount={20} /></div>
                                <span className="text-sm font-mono self-end">{msg.duration}s</span>
                            </button>
                            <p className={`text-xs mt-1 px-2 ${theme.text === 'text-black' ? 'text-gray-600' : 'text-slate-400'}`}>{sentAt}</p>
                        </div>
                    </div>
                    {(index === myLastMessageIndex && showSeenIndicator) && (
                        <div className={`text-right text-xs mt-1 pr-2 ${theme.text === 'text-black' ? 'text-gray-600' : 'text-slate-400'}`}>Seen</div>
                    )}
                 </React.Fragment>
               )
            })}
        </div>
        <div ref={chatEndRef} />
      </div>
      <div className="flex-shrink-0 p-4 bg-black/20 border-t border-white/10">
        {renderFooter()}
      </div>
    </div>
  );
};

export default MessageScreen;