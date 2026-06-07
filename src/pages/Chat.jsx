import React, { useState, useRef, useEffect, useContext } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { Send, Paperclip, Mic, Image as ImageIcon, Smile, X, Check, CheckCheck, Reply, CornerDownRight, ArrowLeft, Square, FileText, Download, Loader2, Trash2, Play, Edit2, Pin, Ban, MessageSquare, Clock } from 'lucide-react';
import { useParams, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axios';
import { io } from 'socket.io-client';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import sanitizeError from '../utils/errorMessages';

const getEventTimeIndicator = (event) => {
  if (!event) return null;
  const startTime = event.date ? new Date(event.date) : null;
  const endTime = event.endDate ? new Date(event.endDate) : (startTime ? new Date(startTime.getTime() + 3600000) : null);
  if (!startTime) return null;
  const now = new Date();
  if (now < startTime) {
    const diffMs = startTime - now;
    const diffDays = Math.floor(diffMs / 86400000);
    const diffHours = Math.floor((diffMs % 86400000) / 3600000);
    const diffMins = Math.floor((diffMs % 3600000) / 60000);
    return { status: 'upcoming', text: `Starts in ${diffDays > 0 ? diffDays + 'd ' : ''}${diffHours > 0 ? diffHours + 'h ' : ''}${diffMins}m`, color: 'text-blue-400' };
  }
  if (endTime && now <= endTime) return { status: 'live', text: 'LIVE NOW', color: 'text-green-500' };
  if (!endTime || now > endTime) {
    const diffMs = now - (endTime || startTime);
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return { status: 'ended', text: 'Ended moments ago', color: 'text-gray-400' };
    if (diffMins < 60) return { status: 'ended', text: `Ended ${diffMins}m ago`, color: 'text-gray-400' };
    if (diffHours < 24) return { status: 'ended', text: `Ended ${diffHours}h ago`, color: 'text-gray-400' };
    return { status: 'ended', text: `Ended ${diffDays}d ago`, color: 'text-gray-400' };
  }
  return null;
};

const formatTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMs / 3600000);
  if (diffHours < 24) return `${diffHours}h ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
};

const Chat = ({ darkMode }) => {
  const { eventId } = useParams();
  const { user } = useContext(AuthContext);
  const [event, setEvent] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isFetchingMessages, setIsFetchingMessages] = useState(true);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyingToMessage, setReplyingToMessage] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [error, setError] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [contextMenuMessage, setContextMenuMessage] = useState(null);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [pinnedMessage, setPinnedMessage] = useState(null);

  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const documentInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const inputRef = useRef(null);

  useEffect(() => {
    const socketUrl = api.defaults.baseURL ? api.defaults.baseURL.replace('/api/v1', '') : 'http://localhost:5000';
    const token = localStorage.getItem('token') || document.cookie.split(';').find(c => c.trim().startsWith('token='))?.split('=')[1];

    socketRef.current = io(socketUrl, { withCredentials: true, auth: { token }, timeout: 5000, reconnection: true });
    socketRef.current.emit('join_event_chat', eventId);

    const fetchData = async () => {
      try {
        const [eventRes, msgRes] = await Promise.all([api.get(`/events/${eventId}`), api.get(`/events/${eventId}/messages`)]);
        setEvent(eventRes.data.data);
        const msgs = msgRes.data.data.map(m => ({ ...m, isOwn: m.senderId === user?._id }));
        setMessages(msgs);
        const pinned = msgs.find(m => m.isPinned);
        if (pinned) setPinnedMessage(pinned);
      } catch (err) {
        console.error('Fetch error:', err);
      } finally {
        setIsFetchingMessages(false);
      }
    };
    fetchData();

    socketRef.current.on('receive_message', (msg) => {
      const enriched = { ...msg, isOwn: msg.senderId === user?._id };
      setMessages(prev => [...prev, enriched]);
    });

    socketRef.current.on('messageReaction', ({ messageId, emoji, users }) => {
      setMessages(prev => prev.map(msg =>
        msg._id === messageId
          ? { ...msg, reactions: msg.reactions?.filter(r => r.emoji !== emoji).concat([{ emoji, users }]) || [{ emoji, users }] }
          : msg
      ));
    });

    socketRef.current.on('messagePinned', ({ messageId, isPinned }) => {
      setMessages(prev => prev.map(msg => msg._id === messageId ? { ...msg, isPinned } : msg));
      if (isPinned) {
        setMessages(prev => {
          const pinned = prev.find(m => m._id === messageId);
          if (pinned) setPinnedMessage(pinned);
          return prev;
        });
      } else {
        setPinnedMessage(null);
      }
    });

    socketRef.current.on('messageDeleted', (messageId) => {
      setMessages(prev => prev.filter(msg => msg._id !== messageId));
      setPinnedMessage(prev => prev && prev._id === messageId ? null : prev);
    });

    socketRef.current.on('messageEdited', ({ messageId, text }) => {
      setMessages(prev => prev.map(msg => msg._id === messageId ? { ...msg, text, edited: true } : msg));
    });

    socketRef.current.on('typing', ({ userName }) => {
      setTypingUsers(prev => prev.includes(userName) ? prev : [...prev, userName]);
    });

    socketRef.current.on('stopTyping', ({ userName }) => {
      setTypingUsers(prev => prev.filter(u => u !== userName));
    });

    return () => socketRef.current?.disconnect();
  }, [eventId, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const emitTyping = () => {
    if (!socketRef.current) return;
    socketRef.current.emit('typing', { eventId, userName: user?.name || user?.email || 'Someone' });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit('stopTyping', { eventId, userName: user?.name || user?.email || 'Someone' });
    }, 2000);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const text = editingMessage ? editingMessage.text : inputValue;
    if (!text.trim() && !selectedImage && !audioBlob && !selectedDocument) return;

    if (editingMessage) {
      socketRef.current?.emit('editMessage', { messageId: editingMessage._id, eventId, text: text.trim() });
      setEditingMessage(null);
      setInputValue('');
      return;
    }

    setIsSending(true);
    try {
      const formData = new FormData();
      if (inputValue.trim()) formData.append('text', inputValue.trim());
      if (selectedImage) formData.append('image', selectedImage);
      if (audioBlob) {
        const audioFile = new File([audioBlob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
        formData.append('audio', audioFile);
      }
      if (selectedDocument) formData.append('document', selectedDocument);
      if (replyingToMessage?._id) formData.append('replyTo', replyingToMessage._id);

      await api.post(`/events/${eventId}/messages`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setInputValue('');
      setSelectedImage(null);
      setAudioBlob(null);
      setSelectedDocument(null);
      setReplyingToMessage(null);
      socketRef.current?.emit('stopTyping', { eventId, userName: user?.name || user?.email || 'Someone' });
    } catch (err) {
      console.error('Send error:', err);
      setError(sanitizeError(err, 'Failed to send message.'));
      setTimeout(() => setError(''), 3000);
    } finally {
      setIsSending(false);
    }
  };

  const handleReaction = (messageId, emoji) => {
    socketRef.current?.emit('toggleReaction', { messageId, eventId, emoji });
  };

  const handlePin = (messageId) => {
    socketRef.current?.emit('pinMessage', { messageId, eventId });
  };

  const handleDelete = async (messageId) => {
    try {
      await api.delete(`/events/${eventId}/messages/${messageId}`);
    } catch (err) {
      setError(sanitizeError(err, 'Failed to delete message.'));
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      recorder.onstop = () => {
        setAudioBlob(new Blob(audioChunksRef.current, { type: 'audio/webm' }));
        stream.getTracks().forEach(t => t.stop());
      };
      recorder.start();
      setIsRecording(true);
    } catch (err) {
      setError('Microphone access denied');
      setTimeout(() => setError(''), 3000);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const handleContextMenu = (e, msg) => {
    e.preventDefault();
    setContextMenuMessage(msg);
    setContextMenuPos({ x: e.clientX, y: e.clientY });
  };

  const startEdit = (msg) => {
    setEditingMessage(msg);
    setInputValue(msg.text || '');
    setContextMenuMessage(null);
    inputRef.current?.focus();
  };

  const startReply = (msg) => {
    setReplyingToMessage(msg);
    setContextMenuMessage(null);
    inputRef.current?.focus();
  };

  const eventTime = getEventTimeIndicator(event);
  const currentUserId = String(user?._id || user?.id);
  const isOrganizer = event && (String(event.organizer?._id || event.organizer) === currentUserId);

  const quickReactions = ['👍', '❤️', '😂', '😮', '😢', '🎉'];

  return (
    <Motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`fixed inset-0 z-50 flex flex-col pt-20 ${darkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
      {/* Header */}
      <div className={`px-4 py-3 border-b ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to={`/events/${eventId}`} className={`p-1 rounded-lg ${darkMode ? 'hover:bg-slate-800 text-white' : 'hover:bg-slate-100 text-slate-600'}`}>
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h2 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{event?.title || 'Chat'}</h2>
              {eventTime && (
                <span className={`text-xs font-semibold flex items-center gap-1 ${eventTime.color}`}>
                  {eventTime.status === 'live' && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
                  {eventTime.text}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Pinned Message Banner */}
      <AnimatePresence>
        {pinnedMessage && (
          <Motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={`overflow-hidden border-b ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-amber-50 border-amber-200'}`}
          >
            <div className="px-4 py-2 flex items-center gap-2">
              <Pin size={14} className="text-amber-500" />
              <span className={`text-xs font-semibold ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>Pinned:</span>
              <span className={`text-xs truncate ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{pinnedMessage.text}</span>
              <button onClick={() => setPinnedMessage(null)} className={`ml-auto ${darkMode ? 'text-white hover:text-slate-300' : 'text-slate-400 hover:text-slate-500'}`}><X size={14} /></button>
            </div>
          </Motion.div>
        )}
      </AnimatePresence>

      {error && <div className="bg-red-500 text-white text-center text-sm px-4 py-2">{error}</div>}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-40" onClick={() => setContextMenuMessage(null)}>
        {isFetchingMessages ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="animate-spin text-blue-500" size={32} />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full opacity-60">
            <MessageSquare size={48} className={darkMode ? 'text-slate-600' : 'text-slate-300'} />
            <p className={`mt-3 text-sm ${darkMode ? 'text-white' : 'text-slate-400'}`}>No messages yet. Say hi!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg._id} className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`relative max-w-[80%] px-3.5 py-2.5 rounded-2xl ${
                  msg.isOwn
                    ? 'bg-blue-600 text-white rounded-br-md'
                    : darkMode
                      ? 'bg-slate-800 text-white rounded-bl-md'
                      : 'bg-white text-slate-900 shadow-sm border border-slate-100 rounded-bl-md'
                }`}
                onContextMenu={(e) => handleContextMenu(e, msg)}
              >
                {/* Reply reference */}
                {msg.replyTo && (
                  <div className={`mb-1.5 px-2 py-1 rounded-md text-xs border-l-2 ${
                    msg.isOwn ? 'bg-blue-500/40 border-blue-300 text-blue-100' : darkMode ? 'bg-slate-700 border-slate-500 text-white' : 'bg-slate-50 border-slate-300 text-slate-500'
                  }`}>
                    <CornerDownRight size={10} className="inline mr-1" />
                    {msg.replyTo.text?.substring(0, 60)}{msg.replyTo.text?.length > 60 ? '...' : ''}
                  </div>
                )}

                {/* Sender name (for others' messages) */}
                {!msg.isOwn && msg.senderName && (
                  <p className={`text-xs font-semibold mb-0.5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>{msg.senderName}</p>
                )}

                {/* Image */}
                {msg.image && (
                  <img
                    src={msg.image}
                    alt=""
                    className="rounded-lg mb-2 max-h-64 cursor-pointer hover:opacity-90 transition"
                    onClick={() => setLightboxImage(msg.image)}
                  />
                )}

                {/* Audio */}
                {msg.audio && (
                  <div className="mb-2">
                    <audio src={msg.audio} controls className="w-full h-8" />
                  </div>
                )}

                {/* Document */}
                {msg.document && (
                  <a href={msg.document} target="_blank" rel="noreferrer" className={`flex items-center gap-1.5 mb-2 text-xs underline ${msg.isOwn ? 'text-blue-200' : 'text-blue-500'}`}>
                    <FileText size={14} />
                    {msg.documentName || 'Document'}
                    <Download size={12} />
                  </a>
                )}

                {/* Text */}
                {msg.text && (
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {msg.text}
                    {msg.edited && <span className="text-[10px] ml-1 opacity-50">(edited)</span>}
                  </p>
                )}

                {/* Time + status */}
                <div className={`flex items-center gap-1 mt-1 ${msg.isOwn ? 'justify-end' : ''}`}>
                  <span className="text-[10px] opacity-60">{formatTime(msg.createdAt)}</span>
                  {msg.isOwn && <CheckCheck size={12} className="opacity-60" />}
                </div>

                {/* Reactions */}
                {msg.reactions?.length > 0 && (
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {msg.reactions.map((r, i) => (
                      <button
                        key={i}
                        onClick={() => handleReaction(msg._id, r.emoji)}
                        className={`text-sm px-1.5 py-0.5 rounded-full border transition hover:scale-110 ${
                          msg.isOwn ? 'bg-blue-500/30 border-blue-400/50' : darkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-100 border-slate-200'
                        }`}
                      >
                        {r.emoji} {r.users?.length || 0}
                      </button>
                    ))}
                  </div>
                )}

                {/* Quick reaction bar (own messages) */}
                {msg.isOwn && (
                  <div className="flex gap-0.5 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {quickReactions.slice(0, 3).map((emoji) => (
                      <button key={emoji} onClick={() => handleReaction(msg._id, emoji)} className="text-sm hover:scale-125 transition p-0.5">{emoji}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing indicator */}
      <AnimatePresence>
        {typingUsers.length > 0 && (
          <Motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={`px-4 pb-1 text-xs ${darkMode ? 'text-white' : 'text-slate-500'}`}
          >
            {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
          </Motion.div>
        )}
      </AnimatePresence>

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenuMessage && (
          <Motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`fixed z-[60] rounded-lg shadow-xl border py-1 min-w-[160px] ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
            style={{ left: contextMenuPos.x, top: contextMenuPos.y }}
          >
            <button onClick={() => startReply(contextMenuMessage)} className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 ${darkMode ? 'hover:bg-slate-700 text-white' : 'hover:bg-slate-50 text-slate-900'}`}>
              <Reply size={14} /> Reply
            </button>
            {contextMenuMessage.isOwn && contextMenuMessage.text && (
              <button onClick={() => startEdit(contextMenuMessage)} className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 ${darkMode ? 'hover:bg-slate-700 text-white' : 'hover:bg-slate-50 text-slate-900'}`}>
                <Edit2 size={14} /> Edit
              </button>
            )}
            <div className={`flex px-3 py-1.5 gap-1 border-t ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
              {quickReactions.map((emoji) => (
                <button key={emoji} onClick={() => { handleReaction(contextMenuMessage._id, emoji); setContextMenuMessage(null); }} className="text-lg hover:scale-125 transition">{emoji}</button>
              ))}
            </div>
            {isOrganizer && (
              <button onClick={() => { handlePin(contextMenuMessage._id); setContextMenuMessage(null); }} className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 border-t ${darkMode ? 'hover:bg-slate-700 text-white border-slate-700' : 'hover:bg-slate-50 text-slate-900 border-slate-100'}`}>
                <Pin size={14} /> {contextMenuMessage.isPinned ? 'Unpin' : 'Pin'}
              </button>
            )}
            {contextMenuMessage.isOwn && (
              <button onClick={() => { handleDelete(contextMenuMessage._id); setContextMenuMessage(null); }} className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 border-t ${darkMode ? 'hover:bg-red-900/30 text-red-400 border-slate-700' : 'hover:bg-red-50 text-red-500 border-slate-100'}`}>
                <Trash2 size={14} /> Delete
              </button>
            )}
          </Motion.div>
        )}
      </AnimatePresence>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxImage && (
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center"
            onClick={() => setLightboxImage(null)}
          >
            <img src={lightboxImage} alt="" className="max-w-[90vw] max-h-[90vh] rounded-lg" />
            <button className="absolute top-6 right-6 text-white" onClick={() => setLightboxImage(null)}><X size={28} /></button>
          </Motion.div>
        )}
      </AnimatePresence>

      {/* Emoji Picker */}
      <AnimatePresence>
        {showEmojiPicker && (
          <Motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-24 right-4 z-[55] ${darkMode ? 'bg-slate-800' : ''}`}
          >
            <Picker data={data} onEmojiSelect={(emoji) => { setInputValue(prev => prev + emoji.native); setShowEmojiPicker(false); }} theme={darkMode ? 'dark' : 'light'} />
          </Motion.div>
        )}
      </AnimatePresence>

      {/* Reply/Edit banner */}
      <AnimatePresence>
        {(replyingToMessage || editingMessage) && (
          <Motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={`overflow-hidden border-t ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
          >
            <div className="px-4 py-2 flex items-center gap-2">
              {editingMessage ? <Edit2 size={14} className="text-blue-500" /> : <Reply size={14} className="text-blue-500" />}
              <span className={`text-xs ${darkMode ? 'text-white' : 'text-slate-500'}`}>
                {editingMessage ? 'Editing:' : 'Replying to:'} {(editingMessage || replyingToMessage)?.text?.substring(0, 40)}
              </span>
              <button onClick={() => { setReplyingToMessage(null); setEditingMessage(null); setInputValue(''); }} className="ml-auto"><X size={14} className={darkMode ? 'text-white' : 'text-slate-400'} /></button>
            </div>
          </Motion.div>
        )}
      </AnimatePresence>

      {/* Input area */}
      <form onSubmit={handleSend} className={`fixed bottom-0 left-0 right-0 p-3 border-t ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        {/* Attachment previews */}
        <div className="flex gap-2 mb-2 flex-wrap">
          {selectedImage && (
            <div className="relative inline-block">
              <img src={URL.createObjectURL(selectedImage)} alt="" className="h-12 w-12 object-cover rounded-lg" />
              <button type="button" onClick={() => setSelectedImage(null)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]"><X size={8} /></button>
            </div>
          )}
          {selectedDocument && (
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
              <FileText size={14} /> {selectedDocument.name}
              <button type="button" onClick={() => setSelectedDocument(null)}><X size={12} /></button>
            </div>
          )}
          {audioBlob && (
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
              <Mic size={14} /> Voice message
              <button type="button" onClick={() => setAudioBlob(null)}><X size={12} /></button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <input type="file" className="hidden" ref={fileInputRef} onChange={(e) => setSelectedImage(e.target.files?.[0])} accept="image/*" />
          <input type="file" className="hidden" ref={documentInputRef} onChange={(e) => setSelectedDocument(e.target.files?.[0])} accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx" />

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowAttachMenu(!showAttachMenu)}
              className={`p-2 rounded-lg ${darkMode ? 'text-white hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              <Paperclip size={20} />
            </button>
            <AnimatePresence>
              {showAttachMenu && (
                <Motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className={`absolute bottom-10 left-0 rounded-lg shadow-lg border py-1 min-w-[140px] z-10 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
                >
                  <button type="button" onClick={() => { fileInputRef.current?.click(); setShowAttachMenu(false); }} className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}`}>
                    <ImageIcon size={14} /> Photo
                  </button>
                  <button type="button" onClick={() => { documentInputRef.current?.click(); setShowAttachMenu(false); }} className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}`}>
                    <FileText size={14} /> Document
                  </button>
                </Motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={`p-2 rounded-lg ${darkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            <Smile size={20} />
          </button>

          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => { setInputValue(e.target.value); emitTyping(); }}
            placeholder={editingMessage ? 'Edit message...' : 'Message...'}
            className={`flex-1 px-3 py-2 rounded-xl text-sm ${darkMode ? 'bg-slate-800 text-white placeholder-slate-500' : 'bg-slate-100 text-slate-900 placeholder-slate-400 border border-slate-200 focus:border-blue-400'}`}
          />

          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            className={`p-2 rounded-lg ${isRecording ? 'bg-red-500 text-white animate-pulse' : darkMode ? 'text-white hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            {isRecording ? <Square size={18} /> : <Mic size={20} />}
          </button>

          <button
            type="submit"
            disabled={isSending || (!inputValue.trim() && !selectedImage && !audioBlob && !selectedDocument)}
            className={`p-2 rounded-lg transition ${
              isSending || (!inputValue.trim() && !selectedImage && !audioBlob && !selectedDocument)
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isSending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
          </button>
        </div>
      </form>
    </Motion.div>
  );
};

export default Chat;
