import React, { useState, useRef, useEffect, useContext, useCallback } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import {
  Send, Paperclip, Mic, Image as ImageIcon, Smile, X, CheckCheck,
  Reply, CornerDownRight, ArrowLeft, Square, Loader2, Trash2,
  Edit2, Pin, MessageSquare, Play, Pause, Volume2
} from 'lucide-react';
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
  if (endTime && now <= endTime) return { status: 'live', text: 'LIVE NOW', color: 'text-emerald-400' };
  if (!endTime || now > endTime) {
    const diffMs = now - (endTime || startTime);
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return { status: 'ended', text: 'Ended moments ago', color: 'text-slate-400' };
    if (diffMins < 60) return { status: 'ended', text: `Ended ${diffMins}m ago`, color: 'text-slate-400' };
    if (diffHours < 24) return { status: 'ended', text: `Ended ${diffHours}h ago`, color: 'text-slate-400' };
    return { status: 'ended', text: `Ended ${diffDays}d ago`, color: 'text-slate-400' };
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

const AudioPlayer = ({ src, isOwn, darkMode }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoaded = () => {
      setLoaded(true);
      setDuration(audio.duration || 0);
    };
    const onTimeUpdate = () => setCurrentTime(audio.currentTime || 0);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
    };
  }, [src]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(() => {});
    }
    setIsPlaying(!isPlaying);
  };

  const formatDuration = (s) => {
    if (!s || !isFinite(s)) return '0:00';
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`flex items-center gap-2 mb-2 p-2 rounded-xl ${
      isOwn ? 'bg-blue-500/30' : darkMode ? 'bg-slate-700/50' : 'bg-slate-100'
    }`}>
      <audio ref={audioRef} src={src} preload="metadata" />
      <button
        onClick={togglePlay}
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
          isOwn ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'
        }`}
      >
        {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className={`h-1 rounded-full overflow-hidden ${isOwn ? 'bg-white/20' : darkMode ? 'bg-slate-600' : 'bg-slate-200'}`}>
          <div
            className="h-full bg-blue-400 rounded-full transition-all duration-150"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className={`text-[10px] mt-1 ${isOwn ? 'text-blue-100' : darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          {formatDuration(currentTime)} / {loaded ? formatDuration(duration) : '--:--'}
        </div>
      </div>
      <Volume2 size={14} className={`flex-shrink-0 ${isOwn ? 'text-blue-200' : darkMode ? 'text-slate-400' : 'text-slate-400'}`} />
    </div>
  );
};

const Chat = ({ darkMode }) => {
  const { eventId } = useParams();
  const { user } = useContext(AuthContext);
  const [event, setEvent] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isFetchingMessages, setIsFetchingMessages] = useState(true);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyingToMessage, setReplyingToMessage] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [error, setError] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [contextMenuMessage, setContextMenuMessage] = useState(null);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [pinnedMessage, setPinnedMessage] = useState(null);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const inputRef = useRef(null);
  const recordingTimerRef = useRef(null);

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

  const canSend = inputValue.trim() || selectedImage || audioBlob;

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    const text = editingMessage ? editingMessage.text : inputValue;
    if (!text.trim() && !selectedImage && !audioBlob) return;

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
      if (replyingToMessage?._id) formData.append('replyTo', replyingToMessage._id);

      await api.post(`/events/${eventId}/messages`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setInputValue('');
      setSelectedImage(null);
      setAudioBlob(null);
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
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      setRecordingDuration(0);
      recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(t => t.stop());
        clearInterval(recordingTimerRef.current);
      };
      recorder.start();
      setIsRecording(true);
      const startTime = Date.now();
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
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
    const x = Math.min(e.clientX, window.innerWidth - 180);
    const y = Math.min(e.clientY, window.innerHeight - 250);
    setContextMenuMessage(msg);
    setContextMenuPos({ x, y });
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

  const formatRecDuration = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex flex-col"
    >
      {/* Header */}
      <div className={`flex-shrink-0 px-3 sm:px-5 py-3 border-b backdrop-blur-xl ${
        darkMode
          ? 'bg-slate-900/95 border-slate-800/80'
          : 'bg-white/95 border-slate-200/80'
      }`}>
        <div className="flex items-center gap-3 max-w-3xl mx-auto">
          <Link
            to={`/events/${eventId}`}
            className={`p-2 rounded-xl transition-colors ${
              darkMode ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-600'
            }`}
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1 min-w-0">
            <h2 className={`text-sm sm:text-base font-bold truncate ${
              darkMode ? 'text-white' : 'text-slate-900'
            }`}>
              {event?.title || 'Chat'}
            </h2>
            {eventTime && (
              <span className={`text-xs font-semibold inline-flex items-center gap-1 ${eventTime.color}`}>
                {eventTime.status === 'live' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                )}
                {eventTime.text}
              </span>
            )}
          </div>
          <div className={`text-xs px-2.5 py-1 rounded-full ${
            darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'
          }`}>
            {messages.length} msgs
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
            className={`flex-shrink-0 overflow-hidden border-b ${
              darkMode ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50 border-amber-200'
            }`}
          >
            <div className="px-3 sm:px-5 py-2 flex items-center gap-2 max-w-3xl mx-auto">
              <Pin size={13} className="text-amber-500 flex-shrink-0" />
              <span className={`text-xs font-semibold flex-shrink-0 ${
                darkMode ? 'text-amber-400' : 'text-amber-600'
              }`}>Pinned:</span>
              <span className={`text-xs truncate flex-1 min-w-0 ${
                darkMode ? 'text-slate-300' : 'text-slate-600'
              }`}>{pinnedMessage.text}</span>
              <button
                onClick={() => setPinnedMessage(null)}
                className={`flex-shrink-0 p-1 rounded-md transition-colors ${
                  darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-200 text-slate-400'
                }`}
              >
                <X size={14} />
              </button>
            </div>
          </Motion.div>
        )}
      </AnimatePresence>

      {/* Error Banner */}
      <AnimatePresence>
        {error && (
          <Motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex-shrink-0 overflow-hidden"
          >
            <div className="bg-red-500 text-white text-center text-xs sm:text-sm px-4 py-2.5 flex items-center justify-center gap-2">
              <span>{error}</span>
              <button onClick={() => setError('')} className="p-0.5 rounded hover:bg-red-600">
                <X size={14} />
              </button>
            </div>
          </Motion.div>
        )}
      </AnimatePresence>

      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        className={`flex-1 overflow-y-auto overflow-x-hidden ${
          darkMode ? 'bg-slate-950' : 'bg-slate-50'
        }`}
        onClick={() => setContextMenuMessage(null)}
      >
        <div className="max-w-3xl mx-auto px-3 sm:px-5 py-4 space-y-2">
          {isFetchingMessages ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-20">
              <Loader2 className="animate-spin text-blue-500" size={28} />
              <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-50">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${
                darkMode ? 'bg-slate-800' : 'bg-slate-200'
              }`}>
                <MessageSquare size={28} className={darkMode ? 'text-slate-600' : 'text-slate-400'} />
              </div>
              <p className={`text-sm font-medium ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                No messages yet
              </p>
              <p className={`text-xs mt-1 ${darkMode ? 'text-slate-600' : 'text-slate-300'}`}>
                Be the first to say something!
              </p>
            </div>
          ) : (
            <>
              {messages.map((msg, idx) => {
                const showSender = !msg.isOwn && (
                  idx === 0 || messages[idx - 1]?.senderId !== msg.senderId
                );
                const isConsecutive = idx > 0 && messages[idx - 1]?.senderId === msg.senderId;

                return (
                  <div
                    key={msg._id}
                    className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'} ${
                      isConsecutive ? 'mt-0.5' : 'mt-3'
                    }`}
                  >
                    <div
                      className={`group relative max-w-[85%] sm:max-w-[70%] min-w-0 ${
                        msg.isOwn ? 'items-end' : 'items-start'
                      }`}
                      onContextMenu={(e) => handleContextMenu(e, msg)}
                    >
                      {/* Sender name */}
                      {showSender && msg.senderName && (
                        <p className={`text-[11px] font-semibold mb-1 ml-3 ${
                          darkMode ? 'text-blue-400' : 'text-blue-600'
                        }`}>
                          {msg.senderName}
                        </p>
                      )}

                      {/* Message bubble */}
                      <div
                        className={`px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-2xl transition-colors ${
                          msg.isOwn
                            ? `bg-blue-600 text-white ${
                                isConsecutive ? 'rounded-br-md' : 'rounded-br-md'
                              }`
                            : darkMode
                              ? `bg-slate-800/80 text-slate-100 ${
                                  isConsecutive ? 'rounded-bl-md' : 'rounded-bl-md'
                                }`
                              : `bg-white text-slate-900 shadow-sm border border-slate-100/80 ${
                                  isConsecutive ? 'rounded-bl-md' : 'rounded-bl-md'
                                }`
                        }`}
                      >
                        {/* Reply reference */}
                        {msg.replyTo && (
                          <div className={`mb-1.5 px-2.5 py-1.5 rounded-lg text-xs border-l-2 ${
                            msg.isOwn
                              ? 'bg-blue-500/30 border-blue-300 text-blue-100'
                              : darkMode
                                ? 'bg-slate-700/50 border-slate-500 text-slate-300'
                                : 'bg-slate-50 border-slate-300 text-slate-500'
                          }`}>
                            <CornerDownRight size={10} className="inline mr-1 opacity-70" />
                            <span className="truncate inline-block max-w-[200px] align-bottom">
                              {msg.replyTo.text?.substring(0, 60)}{msg.replyTo.text?.length > 60 ? '...' : ''}
                            </span>
                          </div>
                        )}

                        {/* Image */}
                        {msg.image && (
                          <div className="mb-2 -mx-1 -mt-0.5">
                            <img
                              src={msg.image}
                              alt=""
                              className="rounded-xl w-full max-h-56 sm:max-h-72 object-cover cursor-pointer hover:brightness-95 transition-all"
                              onClick={() => setLightboxImage(msg.image)}
                            />
                          </div>
                        )}

                        {/* Audio / Voice Note */}
                        {msg.audio && (
                          <AudioPlayer src={msg.audio} isOwn={msg.isOwn} darkMode={darkMode} />
                        )}

                        {/* Text */}
                        {msg.text && (
                          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                            {msg.text}
                            {msg.edited && (
                              <span className="text-[10px] ml-1.5 opacity-40 italic">(edited)</span>
                            )}
                          </p>
                        )}

                        {/* Time + status */}
                        <div className={`flex items-center gap-1 mt-1 ${
                          msg.isOwn ? 'justify-end' : ''
                        }`}>
                          <span className={`text-[10px] ${
                            msg.isOwn ? 'text-blue-200/70' : darkMode ? 'text-slate-500' : 'text-slate-400'
                          }`}>
                            {formatTime(msg.createdAt)}
                          </span>
                          {msg.isOwn && <CheckCheck size={12} className="text-blue-200/70" />}
                        </div>

                        {/* Reactions */}
                        {msg.reactions?.length > 0 && (
                          <div className="flex gap-1 mt-1.5 flex-wrap">
                            {msg.reactions.map((r, i) => (
                              <button
                                key={i}
                                onClick={(e) => { e.stopPropagation(); handleReaction(msg._id, r.emoji); }}
                                className={`text-xs px-1.5 py-0.5 rounded-full border transition-all hover:scale-110 ${
                                  msg.isOwn
                                    ? 'bg-blue-500/20 border-blue-400/30 text-blue-100'
                                    : darkMode
                                      ? 'bg-slate-700/50 border-slate-600/50 text-slate-300'
                                      : 'bg-slate-50 border-slate-200 text-slate-600'
                                }`}
                              >
                                {r.emoji} {r.users?.length || 0}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Hover reactions */}
                      <div className={`absolute ${msg.isOwn ? '-left-8' : '-right-8'} top-0 opacity-0 group-hover:opacity-100 transition-opacity`}>
                        <div className={`flex flex-col gap-0.5 py-1 rounded-lg px-0.5 ${
                          darkMode ? 'bg-slate-800' : 'bg-white shadow-md border border-slate-100'
                        }`}>
                          {quickReactions.slice(0, 3).map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => handleReaction(msg._id, emoji)}
                              className="text-xs hover:scale-125 transition p-0.5"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Typing indicator */}
      <AnimatePresence>
        {typingUsers.length > 0 && (
          <Motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={`flex-shrink-0 px-3 sm:px-5 py-1.5 ${
              darkMode ? 'bg-slate-950' : 'bg-slate-50'
            }`}
          >
            <div className="max-w-3xl mx-auto">
              <div className={`inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-xl ${
                darkMode ? 'bg-slate-800/50 text-slate-400' : 'bg-white text-slate-500 shadow-sm border border-slate-100'
              }`}>
                <span className="flex gap-0.5">
                  <span className="w-1 h-1 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1 h-1 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1 h-1 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
                <span>{typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...</span>
              </div>
            </div>
          </Motion.div>
        )}
      </AnimatePresence>

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenuMessage && (
          <>
            <div className="fixed inset-0 z-[59]" onClick={() => setContextMenuMessage(null)} />
            <Motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`fixed z-[60] rounded-xl shadow-2xl border py-1.5 min-w-[160px] max-w-[200px] ${
                darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
              }`}
              style={{
                left: Math.min(contextMenuPos.x, window.innerWidth - 200),
                top: Math.min(contextMenuPos.y, window.innerHeight - 300)
              }}
            >
              <button
                onClick={() => startReply(contextMenuMessage)}
                className={`w-full text-left px-3 py-2.5 text-sm flex items-center gap-2.5 transition-colors ${
                  darkMode ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-slate-50 text-slate-900'
                }`}
              >
                <Reply size={14} className={darkMode ? 'text-slate-400' : 'text-slate-500'} /> Reply
              </button>
              {contextMenuMessage.isOwn && contextMenuMessage.text && (
                <button
                  onClick={() => startEdit(contextMenuMessage)}
                  className={`w-full text-left px-3 py-2.5 text-sm flex items-center gap-2.5 transition-colors ${
                    darkMode ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-slate-50 text-slate-900'
                  }`}
                >
                  <Edit2 size={14} className={darkMode ? 'text-slate-400' : 'text-slate-500'} /> Edit
                </button>
              )}
              <div className={`flex px-3 py-2 gap-1.5 border-t ${
                darkMode ? 'border-slate-700' : 'border-slate-100'
              }`}>
                {quickReactions.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => { handleReaction(contextMenuMessage._id, emoji); setContextMenuMessage(null); }}
                    className="text-base hover:scale-125 transition p-0.5"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              {isOrganizer && (
                <button
                  onClick={() => { handlePin(contextMenuMessage._id); setContextMenuMessage(null); }}
                  className={`w-full text-left px-3 py-2.5 text-sm flex items-center gap-2.5 border-t transition-colors ${
                    darkMode ? 'hover:bg-slate-700 text-slate-200 border-slate-700' : 'hover:bg-slate-50 text-slate-900 border-slate-100'
                  }`}
                >
                  <Pin size={14} className={darkMode ? 'text-slate-400' : 'text-slate-500'} />
                  {contextMenuMessage.isPinned ? 'Unpin' : 'Pin'}
                </button>
              )}
              {contextMenuMessage.isOwn && (
                <button
                  onClick={() => { handleDelete(contextMenuMessage._id); setContextMenuMessage(null); }}
                  className={`w-full text-left px-3 py-2.5 text-sm flex items-center gap-2.5 border-t transition-colors ${
                    darkMode ? 'hover:bg-red-900/30 text-red-400 border-slate-700' : 'hover:bg-red-50 text-red-500 border-slate-100'
                  }`}
                >
                  <Trash2 size={14} /> Delete
                </button>
              )}
            </Motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxImage && (
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/95 flex items-center justify-center p-4"
            onClick={() => setLightboxImage(null)}
          >
            <img
              src={lightboxImage}
              alt=""
              className="max-w-full max-h-full object-contain rounded-xl"
            />
            <button
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              onClick={() => setLightboxImage(null)}
            >
              <X size={20} />
            </button>
          </Motion.div>
        )}
      </AnimatePresence>

      {/* Emoji Picker */}
      <AnimatePresence>
        {showEmojiPicker && (
          <>
            <div className="fixed inset-0 z-[54]" onClick={() => setShowEmojiPicker(false)} />
            <Motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className={`fixed z-[55] rounded-xl overflow-hidden shadow-2xl ${
                darkMode ? 'bg-slate-800' : 'bg-white'
              }`}
              style={{ bottom: '80px', right: '16px', maxWidth: 'calc(100vw - 32px)' }}
            >
              <Picker
                data={data}
                onEmojiSelect={(emoji) => { setInputValue(prev => prev + emoji.native); setShowEmojiPicker(false); }}
                theme={darkMode ? 'dark' : 'light'}
                perLine={8}
              />
            </Motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Reply/Edit banner */}
      <AnimatePresence>
        {(replyingToMessage || editingMessage) && (
          <Motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={`flex-shrink-0 overflow-hidden border-t ${
              darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="px-3 sm:px-5 py-2.5 flex items-center gap-2.5 max-w-3xl mx-auto">
              <div className={`w-0.5 h-8 rounded-full ${editingMessage ? 'bg-amber-500' : 'bg-blue-500'}`} />
              <div className="flex-1 min-w-0">
                <p className={`text-[10px] font-semibold uppercase tracking-wider ${
                  darkMode ? 'text-slate-500' : 'text-slate-400'
                }`}>
                  {editingMessage ? 'Editing' : 'Replying to'}
                </p>
                <p className={`text-xs truncate ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  {(editingMessage || replyingToMessage)?.text?.substring(0, 50)}
                </p>
              </div>
              <button
                onClick={() => { setReplyingToMessage(null); setEditingMessage(null); setInputValue(''); }}
                className={`p-1.5 rounded-lg transition-colors ${
                  darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-400'
                }`}
              >
                <X size={14} />
              </button>
            </div>
          </Motion.div>
        )}
      </AnimatePresence>

      {/* Input area */}
      <div className={`flex-shrink-0 border-t ${
        darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <form onSubmit={handleSend} className="max-w-3xl mx-auto px-3 sm:px-5 py-2.5">
          {/* Attachment previews */}
          <AnimatePresence>
            {(selectedImage || audioBlob) && (
              <Motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mb-2"
              >
                <div className="flex gap-2 flex-wrap">
                  {selectedImage && (
                    <div className={`relative inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs ${
                      darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
                    }`}>
                      <img
                        src={URL.createObjectURL(selectedImage)}
                        alt=""
                        className="h-8 w-8 rounded-lg object-cover flex-shrink-0"
                      />
                      <span className="truncate max-w-[100px]">{selectedImage.name}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedImage(null)}
                        className="p-0.5 rounded-md hover:bg-red-500/20 text-red-400"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}
                  {audioBlob && (
                    <div className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs ${
                      darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
                    }`}>
                      <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
                        <Mic size={12} className="text-red-500" />
                      </div>
                      <span>Voice message</span>
                      <button
                        type="button"
                        onClick={() => setAudioBlob(null)}
                        className="p-0.5 rounded-md hover:bg-red-500/20 text-red-400"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}
                </div>
              </Motion.div>
            )}
          </AnimatePresence>

          {/* Input row */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <input
              type="file"
              className="hidden"
              ref={fileInputRef}
              onChange={(e) => setSelectedImage(e.target.files?.[0])}
              accept="image/*"
            />

            {/* Attach button */}
            <button
              type="button"
              onClick={() => { fileInputRef.current?.click(); setShowAttachMenu(false); }}
              className={`p-2 rounded-xl transition-colors flex-shrink-0 ${
                darkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
              }`}
              title="Attach photo"
            >
              <ImageIcon size={20} />
            </button>

            {/* Emoji */}
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={`p-2 rounded-xl transition-colors flex-shrink-0 ${
                darkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
              }`}
            >
              <Smile size={20} />
            </button>

            {/* Text input */}
            <div className="flex-1 min-w-0">
              {isRecording ? (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${
                  darkMode ? 'bg-red-900/30' : 'bg-red-50'
                }`}>
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className={`text-sm ${darkMode ? 'text-red-300' : 'text-red-600'}`}>
                    Recording... {formatRecDuration(recordingDuration)}
                  </span>
                </div>
              ) : (
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => { setInputValue(e.target.value); emitTyping(); }}
                  placeholder={editingMessage ? 'Edit message...' : 'Type a message...'}
                  className={`w-full px-3.5 py-2 rounded-xl text-sm outline-none transition-colors ${
                    darkMode
                      ? 'bg-slate-800 text-white placeholder-slate-500 focus:ring-1 focus:ring-blue-500/50'
                      : 'bg-slate-100 text-slate-900 placeholder-slate-400 border border-slate-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30'
                  }`}
                />
              )}
            </div>

            {/* Voice / Stop recording */}
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              className={`p-2.5 rounded-xl transition-all flex-shrink-0 ${
                isRecording
                  ? 'bg-red-500 text-white shadow-lg shadow-red-500/25'
                  : darkMode
                    ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
              }`}
              title={isRecording ? 'Stop recording' : 'Voice message'}
            >
              {isRecording ? <Square size={18} /> : <Mic size={20} />}
            </button>

            {/* Send button */}
            <button
              type="submit"
              disabled={isSending || !canSend}
              className={`p-2.5 rounded-xl transition-all flex-shrink-0 ${
                isSending || !canSend
                  ? darkMode ? 'bg-slate-800 text-slate-600' : 'bg-slate-200 text-slate-400'
                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/25 active:scale-95'
              }`}
              title="Send"
            >
              {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
        </form>
      </div>
    </Motion.div>
  );
};

export default Chat;
