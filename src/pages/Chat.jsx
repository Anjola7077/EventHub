import React, { useState, useRef, useEffect } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { Send, Paperclip, Search, MoreVertical, X, Image as ImageIcon, MapPin, Calendar, CheckCircle2, Mic, Square, Play, FileText, Pencil, Trash2, Reply } from 'lucide-react';

const Chat = ({ darkMode }) => {
  const [messages, setMessages] = useState([
    { id: 1, sender: 'System', text: 'Welcome to the React Summit 2024 chat! Say hello.', isSystem: true },
    { id: 2, sender: 'Sarah K.', avatar: 'SK', text: 'So excited for this event! Anyone else flying in from NYC?', isOwn: false, time: '10:42 AM' },
    { id: 3, sender: 'James T.', avatar: 'JT', text: 'Already here in SF! The venue looks amazing', isOwn: false, time: '10:45 AM' },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [selectedImage, setSelectedImage] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [replyingToMessage, setReplyingToMessage] = useState(null);
  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingDurationRef = useRef(0);
  const isCancelledRef = useRef(false);

  const glassStyle = darkMode 
    ? 'bg-slate-800/40 border-slate-700/50 backdrop-blur-2xl shadow-xl' 
    : 'bg-white/50 border-white/50 backdrop-blur-2xl shadow-[0_8px_32px_rgba(10,31,110,0.1)]';

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    if (editingMessageId) {
      setMessages(messages.map(msg => 
        msg.id === editingMessageId ? { ...msg, text: inputValue, isEdited: true } : msg
      ));
      setEditingMessageId(null);
    } else {
      setMessages([...messages, {
        id: Date.now(),
        sender: 'You',
        text: inputValue,
        isOwn: true,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        ...(replyingToMessage ? { replyTo: replyingToMessage } : {})
      }]);
      setReplyingToMessage(null);
    }
    setInputValue('');
  };

  const cancelEdit = () => {
    setEditingMessageId(null);
    setInputValue('');
  };

  const handleEdit = (msg) => {
    setReplyingToMessage(null);
    setEditingMessageId(msg.id);
    setInputValue(msg.text || '');
  };

  const handleReply = (msg) => {
    setEditingMessageId(null);
    setInputValue('');
    setReplyingToMessage(msg);
  };

  const cancelReply = () => setReplyingToMessage(null);

  const handleDelete = (id) => {
    setMessages(messages.filter(msg => msg.id !== id));
    if (editingMessageId === id) cancelEdit();
    if (replyingToMessage?.id === id) cancelReply();
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    let interval;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingDuration(prev => {
          recordingDurationRef.current = prev + 1;
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const isImage = file.type.startsWith('image/');
    setMessages([...messages, {
      id: Date.now(),
      sender: 'You',
      isOwn: true,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      ...(isImage ? { image: URL.createObjectURL(file) } : { file: { name: file.name, size: (file.size / 1024).toFixed(1) + ' KB' } })
    }]);
    e.target.value = null;
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const cancelRecording = () => {
    isCancelledRef.current = true;
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        mediaRecorder.onstop = () => {
          if (!isCancelledRef.current) {
            const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
            const audioUrl = URL.createObjectURL(audioBlob);
            
            setMessages(prev => [...prev, {
              id: Date.now(),
              sender: 'You',
              isOwn: true,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              audioUrl: audioUrl,
              duration: formatDuration(recordingDurationRef.current)
            }]);
          }
          
          stream.getTracks().forEach(track => track.stop());
          setIsRecording(false);
          setRecordingDuration(0);
          recordingDurationRef.current = 0;
          isCancelledRef.current = false;
        };

        mediaRecorder.start();
        setRecordingDuration(0);
        recordingDurationRef.current = 0;
        setIsRecording(true);
      } catch (err) {
        console.error("Error accessing microphone:", err);
        alert("Could not access microphone. Please check your browser permissions.");
      }
    }
  };

  const filteredMessages = messages.filter(msg => 
    (msg.text && msg.text.toLowerCase().includes(searchQuery.toLowerCase())) || 
    (msg.file && msg.file.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (msg.sender && msg.sender.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const highlightText = (text, query) => {
    if (!query || !query.trim() || !text) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === query.toLowerCase() ? 
        <mark key={index} className="bg-yellow-400 text-slate-900 rounded px-0.5 font-bold bg-opacity-90">{part}</mark> : part
    );
  };

  return (
    <Motion.main 
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="pt-32 pb-6 px-4 md:px-8 max-w-7xl mx-auto min-h-screen flex flex-col gap-6"
    >
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
        <div className="px-8 py-5 border-b border-black/10 dark:border-white/10 flex justify-between items-center bg-white/40 dark:bg-slate-950/60 backdrop-blur-lg">
          {isSearching ? (
            <div className="flex items-center gap-3 flex-1 h-12">
              <Search size={20} className={darkMode ? 'text-white' : 'text-slate-400'} />
              <input 
                autoFocus
                type="text" 
                placeholder="Search messages..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`flex-1 bg-transparent border-none outline-none text-sm font-medium ${darkMode ? 'text-white placeholder-slate-400' : 'text-slate-900 placeholder-slate-500'}`}
              />
              <button onClick={() => { setIsSearching(false); setSearchQuery(''); }} className={`p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                <X size={20} />
              </button>
            </div>
          ) : (
            <>
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
                onClick={() => setIsSearching(true)}
                className={`p-3 rounded-2xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}
              >
                <Search size={22} />
              </button>
            </>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-white/10 dark:bg-slate-950/40">
          <AnimatePresence>
            {filteredMessages.map((msg) => (
              msg.isSystem ? (
                <Motion.div key={msg.id} initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} className="flex justify-center">
                  <span className={`px-5 py-2 bg-black/10 dark:bg-white/10 rounded-full text-sm font-semibold opacity-100 ${darkMode ? 'text-white' : 'text-slate-700'}`}>
                    {highlightText(msg.text, searchQuery)}
                  </span>
                </Motion.div>
              ) : (
                <Motion.div 
                  key={msg.id} 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className={`flex items-end gap-4 group ${msg.isOwn ? 'flex-row-reverse' : ''}`}
                >
                  {!msg.isOwn && (
                    <div className="w-11 h-11 rounded-2xl bg-blue-500 flex items-center justify-center text-white text-sm font-black shadow-lg flex-shrink-0">
                      {msg.avatar}
                    </div>
                  )}
                  <div className={`flex flex-col ${msg.isOwn ? 'items-end' : 'items-start'} max-w-[80%]`}> 
                    {!msg.isOwn && <span className={`text-sm font-semibold opacity-100 mb-1 ml-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      {highlightText(msg.sender, searchQuery)}
                    </span>}
                    <div className={`px-6 py-4 shadow-xl ${
                      msg.isOwn 
                        ? 'bg-blue-600 text-white rounded-[24px_24px_8px_24px]' 
                        : `bg-slate-100 dark:bg-slate-900 rounded-[24px_24px_24px_8px] border border-black/5 dark:border-white/10 ${darkMode ? 'text-white' : 'text-slate-900'}`
                    }`}>
                      {msg.replyTo && (
                        <div className={`text-xs mb-2 p-2 rounded-lg border-l-2 ${msg.isOwn ? 'bg-blue-700/30 border-white/50 text-white' : 'bg-black/5 border-black/20 dark:bg-white/5 dark:border-white/20 text-inherit'}`}>
                          <span className="font-bold block text-[10px] uppercase opacity-70 mb-0.5">{msg.replyTo.sender}</span>
                          <span className="line-clamp-1">{msg.replyTo.text || 'Attachment'}</span>
                        </div>
                      )}
                      {msg.text && <p className="text-base font-medium leading-relaxed tracking-wide">{highlightText(msg.text, searchQuery)}</p>}
                      {msg.image && (
                        <div className={`overflow-hidden rounded-xl cursor-pointer ${msg.text ? 'mt-3' : ''}`} onClick={() => setSelectedImage(msg.image)}>
                          <img src={msg.image} alt="Attachment" className="max-w-[200px] sm:max-w-[250px] object-cover hover:opacity-90 transition-opacity" />
                        </div>
                      )}
                      {msg.file && (
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-white/20 dark:bg-black/20 rounded-xl"><FileText size={24} /></div>
                          <div>
                            <p className="text-sm font-bold line-clamp-1 max-w-[200px]">{highlightText(msg.file.name, searchQuery)}</p>
                            <p className="text-xs opacity-70 mt-0.5">{msg.file.size}</p>
                          </div>
                        </div>
                      )}
                      {msg.audioUrl && (
                        <div className={`mt-1 ${msg.text ? 'pt-2 border-t border-black/5 dark:border-white/10' : ''}`}>
                          <audio controls src={msg.audioUrl} className="h-10 w-48 sm:w-64 outline-none" />
                        </div>
                      )}
                    </div>
                    <div className={`flex items-center gap-2 mt-1 ${msg.isOwn ? '' : 'flex-row-reverse'}`}>
                      <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleReply(msg)} className="p-1 hover:text-blue-500 transition-colors" title="Reply"><Reply size={14} /></button>
                        {msg.isOwn && (
                          <>
                            <button onClick={() => handleEdit(msg)} className="p-1 hover:text-blue-500 transition-colors" title="Edit"><Pencil size={14} /></button>
                            <button onClick={() => handleDelete(msg.id)} className="p-1 hover:text-red-500 transition-colors" title="Delete"><Trash2 size={14} /></button>
                          </>
                        )}
                      </div>
                      <span className={`text-xs font-semibold opacity-70 ${darkMode ? 'text-white' : 'text-slate-600'}`}>{msg.time} {msg.isEdited && '(edited)'}</span>
                    </div>
                  </div>
                </Motion.div>
              )
            ))}
          </AnimatePresence>
          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        {editingMessageId && (
          <div className="px-6 py-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center justify-between border-t border-black/10 dark:border-white/10">
            <span>Editing message...</span>
            <button onClick={cancelEdit} className="p-1 hover:bg-blue-500/20 rounded-full transition-colors"><X size={14}/></button>
          </div>
        )}
        {replyingToMessage && (
          <div className="px-6 py-2 bg-slate-500/10 text-slate-600 dark:text-slate-300 text-xs font-bold flex items-center justify-between border-t border-black/10 dark:border-white/10">
            <span className="truncate pr-4">Replying to {replyingToMessage.sender}: <span className="font-medium opacity-80">{replyingToMessage.text || 'Attachment'}</span></span>
            <button onClick={cancelReply} className="p-1 hover:bg-slate-500/20 rounded-full transition-colors shrink-0"><X size={14}/></button>
          </div>
        )}
        <form onSubmit={handleSend} className={`p-3 sm:p-5 bg-white/40 dark:bg-slate-950/70 ${editingMessageId || replyingToMessage ? '' : 'border-t border-black/10 dark:border-white/10'} flex items-center gap-2 sm:gap-3`}>
          <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
          <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 sm:p-3.5 shrink-0 rounded-2xl text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 transition-colors">
            <Paperclip size={20} />
          </button>
          
          {isRecording ? (
            <div className="flex-1 min-w-0 bg-red-500/10 border border-red-500/20 rounded-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3 text-red-500 truncate">
                <span className="w-2 sm:w-2.5 h-2 sm:h-2.5 shrink-0 rounded-full bg-red-500 animate-pulse"></span>
                <span className="text-xs sm:text-sm font-bold animate-pulse truncate">Recording...</span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <span className="text-xs sm:text-sm font-bold text-red-500">{formatDuration(recordingDuration)}</span>
                <button type="button" onClick={cancelRecording} className="p-1 sm:p-1.5 hover:bg-red-500/20 rounded-full text-red-500 transition-colors" title="Cancel Recording">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ) : (
            <input 
              type="text" 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your message here..." 
              className={`flex-1 min-w-0 bg-white/70 dark:bg-slate-900/80 border border-black/10 dark:border-white/10 rounded-full px-4 sm:px-6 py-3 sm:py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:opacity-100 ${darkMode ? 'text-white placeholder-white' : 'text-slate-900'}`}
            />
          )}

          {inputValue.trim() && !isRecording ? (
            <button type="submit" className="p-3 sm:p-4 shrink-0 rounded-2xl bg-blue-600 text-white hover:bg-blue-700 hover:scale-105 transition-all shadow-lg shadow-blue-600/30">
              <Send size={20} className="translate-x-0.5 -translate-y-0.5" />
            </button>
          ) : (
            <button type="button" onClick={toggleRecording} className={`p-3 sm:p-4 shrink-0 rounded-2xl transition-all shadow-lg ${isRecording ? 'bg-red-500 text-white hover:bg-red-600 hover:scale-105 shadow-red-500/30' : 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105 shadow-blue-600/30'}`}>
              {isRecording ? <Square size={18} fill="currentColor" /> : <Mic size={20} />}
            </button>
          )}
        </form>
      </div>

     
      <AnimatePresence>
        {selectedImage && (
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedImage(null)}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 cursor-pointer"
          >
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
            >
              <X size={24} />
            </button>
            <Motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={selectedImage}
              alt="Fullscreen Attachment"
              className="max-w-full max-h-full rounded-2xl object-contain shadow-2xl cursor-default"
              onClick={(e) => e.stopPropagation()}
            />
          </Motion.div>
        )}
      </AnimatePresence>
    </Motion.main>
  );
};

export default Chat;
