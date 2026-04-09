import React, { useState, useRef, useEffect } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { Send, Paperclip, Search, MoreVertical, X, Image as ImageIcon, MapPin, Calendar, CheckCircle2 } from 'lucide-react';

const Chat = ({ darkMode }) => {
  const [messages, setMessages] = useState([
    { id: 1, sender: 'System', text: 'Welcome to the React Summit 2024 chat! Say hello.', isSystem: true },
    { id: 2, sender: 'Sarah K.', avatar: 'SK', text: 'So excited for this event! Anyone else flying in from NYC?', isOwn: false, time: '10:42 AM' },
    { id: 3, sender: 'James T.', avatar: 'JT', text: 'Already here in SF! The venue looks amazing', isOwn: false, time: '10:45 AM' },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const chatEndRef = useRef(null);

  const glassStyle = darkMode 
    ? 'bg-slate-800/40 border-slate-700/50 backdrop-blur-2xl shadow-xl' 
    : 'bg-white/50 border-white/50 backdrop-blur-2xl shadow-[0_8px_32px_rgba(10,31,110,0.1)]';

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    setMessages([...messages, {
      id: Date.now(),
      sender: 'You',
      text: inputValue,
      isOwn: true,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
    setInputValue('');
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <Motion.main 
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="pt-32 pb-6 px-4 md:px-8 max-w-7xl mx-auto min-h-screen flex flex-col gap-6"
    >
      {}
      <div className={`flex items-center justify-between p-5 rounded-3xl border ${glassStyle} flex-shrink-0`}>
        <div>
          <span className="text-xs font-black uppercase tracking-widest text-blue-500 mb-1 block">Technology</span>
          <h1 className={`text-2xl font-black mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>React Summit 2024</h1>
          <div className={`flex gap-4 text-sm font-medium opacity-100 ${darkMode ? 'text-white' : 'text-slate-600'}`}>
            <span className="flex items-center gap-1.5"><Calendar size={16} /> Jun 15, 2024</span>
            <span className="flex items-center gap-1.5"><MapPin size={16} /> San Francisco, CA</span>
          </div>
        </div>
      </div>

      {/* Chat Interface */}
      <div className={`flex-1 flex flex-col border rounded-[3rem] overflow-hidden shadow-2xl ${glassStyle}`}>
        {}
        <div className="px-8 py-5 border-b border-black/10 dark:border-white/10 flex justify-between items-center bg-white/40 dark:bg-slate-950/60 backdrop-blur-lg">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm">
              <CheckCircle2 size={22} />
            </div>
            <div>
              <h2 className={`font-black text-xl md:text-2xl leading-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>Event Chat</h2>
              <span className={`text-sm font-semibold opacity-100 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-600'}`}>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> 24 online
              </span>
            </div>
          </div>
          <button 
            onClick={() => setIsSearching(!isSearching)}
            className={`p-3 rounded-2xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}
          >
            <Search size={22} />
          </button>
        </div>

        {}
        <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-white/10 dark:bg-slate-950/40">
          <AnimatePresence>
            {messages.map((msg) => (
              msg.isSystem ? (
                <Motion.div key={msg.id} initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} className="flex justify-center">
                  <span className={`px-5 py-2 bg-black/10 dark:bg-white/10 rounded-full text-sm font-semibold opacity-100 ${darkMode ? 'text-white' : 'text-slate-700'}`}>
                    {msg.text}
                  </span>
                </Motion.div>
              ) : (
                <Motion.div 
                  key={msg.id} 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className={`flex items-end gap-4 ${msg.isOwn ? 'flex-row-reverse' : ''}`}
                >
                  {!msg.isOwn && (
                    <div className="w-11 h-11 rounded-2xl bg-blue-500 flex items-center justify-center text-white text-sm font-black shadow-lg flex-shrink-0">
                      {msg.avatar}
                    </div>
                  )}
                  <div className={`flex flex-col ${msg.isOwn ? 'items-end' : 'items-start'} max-w-[80%]`}> 
                    {!msg.isOwn && <span className={`text-sm font-semibold opacity-100 mb-1 ml-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{msg.sender}</span>}
                    <div className={`px-6 py-4 shadow-xl ${
                      msg.isOwn 
                        ? 'bg-blue-600 text-white rounded-[24px_24px_8px_24px]' 
                        : `bg-slate-100 dark:bg-slate-900 rounded-[24px_24px_24px_8px] border border-black/5 dark:border-white/10 ${darkMode ? 'text-white' : 'text-slate-900'}`
                    }`}>
                      <p className="text-base font-medium leading-relaxed tracking-wide">{msg.text}</p>
                    </div>
                    <span className={`text-xs font-semibold opacity-70 mt-1 ${darkMode ? 'text-white' : 'text-slate-600'}`}>{msg.time}</span>
                  </div>
                </Motion.div>
              )
            ))}
          </AnimatePresence>
          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <form onSubmit={handleSend} className="p-5 bg-white/40 dark:bg-slate-950/70 border-t border-black/10 dark:border-white/10 flex items-center gap-3">
          <button type="button" className="p-3.5 rounded-2xl text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 transition-colors">
            <Paperclip size={20} />
          </button>
          <input 
            type="text" 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your message here..." 
            className={`flex-1 bg-white/70 dark:bg-slate-900/80 border border-black/10 dark:border-white/10 rounded-full px-6 py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:opacity-100 ${darkMode ? 'text-white placeholder-white' : 'text-slate-900'}`}
          />
          <button 
            type="submit"
            disabled={!inputValue.trim()}
            className="p-4 rounded-2xl bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 hover:scale-105 transition-all shadow-lg shadow-blue-600/30"
          >
            <Send size={20} className="translate-x-0.5 -translate-y-0.5" />
          </button>
        </form>
      </div>
    </Motion.main>
  );
};

export default Chat;
