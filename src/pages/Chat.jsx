import React, { useState, useRef, useEffect, useContext } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { Send, Paperclip, Mic, Image as ImageIcon, Smile, X, Check, CheckCheck, Reply, CornerDownRight, ArrowLeft, Square, FileText, Download, Loader2, Trash2, Play, Edit2, Pin, Ban, MessageSquare } from 'lucide-react';
import { useParams, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axios';
import { io } from 'socket.io-client';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

const getDateLabel = (dateInput) => {
  const date = dateInput ? new Date(dateInput) : new Date();
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
  });
};

const WaveformPlayer = ({ src, isOwn, darkMode }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef(null);

  const [bars] = useState(() => Array.from({ length: 30 }, () => Math.max(30, Math.random() * 100)));

  useEffect(() => {
    setIsPlaying(false);
    setProgress(0);
  }, [src]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play()
        .then(() => setIsPlaying(true))
        .catch(err => console.error('Audio play error:', err));
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio || !audio.duration || isNaN(audio.duration)) return;
    setProgress((audio.currentTime / audio.duration) * 100);
  };

  const handleLoadedMetadata = () => {
    const audio = audioRef.current;
    if (audio && !isNaN(audio.duration)) {
      // duration is now available
    }
  };

  const handleWaveformClick = (e) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration || isNaN(audio.duration)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration;
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(0);
  };

  return (
    <div className={`flex items-center gap-2 p-2 rounded-2xl mb-2 w-48 sm:w-64 border ${
      isOwn
        ? 'bg-blue-700/50 border-blue-500/50'
        : darkMode
          ? 'bg-slate-700 border-slate-600'
          : 'bg-slate-100 border-slate-200'
    }`}>
      <button
        type="button"
        onClick={togglePlay}
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
          isOwn
            ? 'bg-white text-blue-600 hover:bg-blue-50'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {isPlaying
          ? <Square size={12} fill="currentColor" />
          : <Play size={12} fill="currentColor" className="ml-0.5" />
        }
      </button>

      <div
        className="flex-1 h-6 flex items-center gap-[2px] cursor-pointer"
        onClick={handleWaveformClick}
      >
        {bars.map((height, i) => (
          <div
            key={i}
            className={`flex-1 rounded-full transition-all duration-75 ${
              (i / 30) * 100 <= progress
                ? (isOwn ? 'bg-white' : 'bg-blue-600')
                : (isOwn ? 'bg-white/30' : darkMode ? 'bg-slate-500' : 'bg-slate-300')
            }`}
            style={{ height: `${height}%` }}
          />
        ))}
      </div>

      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        preload="metadata"
        className="hidden"
      />
    </div>
  );
};

const AudioBlobPreview = ({ blob, darkMode }) => {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (!blob) return;
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [blob]);

  if (!url) return null;
  return <WaveformPlayer src={url} isOwn={false} darkMode={darkMode} />;
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
  const [activeReactionMessage, setActiveReactionMessage] = useState(null);
  const [mentionSearch, setMentionSearch] = useState(null);
  const [error, setError] = useState('');
  const [attendeesForMentions, setAttendeesForMentions] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const documentInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const currentUserId = String(user?._id || user?.id || '');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const socketUrl = api.defaults.baseURL
      ? api.defaults.baseURL.replace('/api/v1', '')
      : 'http://localhost:5000';

    socketRef.current = io(socketUrl, { withCredentials: true });
    socketRef.current.emit('join_event_chat', eventId);

    const fetchMessages = async () => {
      try {
        setIsFetchingMessages(true);
        const [eventRes, msgRes] = await Promise.all([
          api.get(`/events/${eventId}`),
          api.get(`/events/${eventId}/messages`)
        ]);
        setEvent(eventRes.data.data);

        if (eventRes.data.data?.attendees) {
          const uniqueAttendees = [];
          const seenIds = new Set();
          eventRes.data.data.attendees.forEach(att => {
            const u = att.user || att;
            if (u?._id && !seenIds.has(u._id)) {
              uniqueAttendees.push({
                _id: u._id,
                fullName: u.fullName,
                username: u.username || u.fullName.replace(/\s+/g, '').toLowerCase()
              });
              seenIds.add(u._id);
            }
          });
          setAttendeesForMentions(uniqueAttendees);
        }

        const fetchedMessages = msgRes.data.data.map(m => ({
          ...m,
          isOwn: String(m.senderId || m.sender?._id || m.sender || '') === currentUserId
        }));
        setMessages(fetchedMessages);

        const unreadMessages = msgRes.data.data.filter(
          m => String(m.senderId || m.sender?._id || m.sender || '') !== currentUserId && m.status !== 'read'
        );
        unreadMessages.forEach(m =>
          socketRef.current.emit('markAsRead', { messageId: m._id, eventId })
        );
      } catch (err) {
        console.error('Failed to fetch event or messages', err);
      } finally {
        setIsFetchingMessages(false);
      }
    };

    fetchMessages();

    socketRef.current.on('receive_message', (newMessage) => {
      const formattedMsg = {
        ...newMessage,
        isOwn: String(newMessage.senderId || '') === currentUserId
      };
      setMessages(prev =>
        prev.some(msg => msg._id === formattedMsg._id)
          ? prev
          : [...prev, formattedMsg]
      );
      if (String(newMessage.senderId || '') !== currentUserId) {
        socketRef.current.emit('markAsRead', { messageId: newMessage._id, eventId });
      }
    });

    socketRef.current.on('messageRead', (messageId) => {
      setMessages(prev =>
        prev.map(msg => msg._id === messageId ? { ...msg, status: 'read' } : msg)
      );
    });

    socketRef.current.on('typing', (userName) => {
      if (userName !== (user?.fullName || 'You')) {
        setTypingUsers(prev => prev.includes(userName) ? prev : [...prev, userName]);
      }
    });

    socketRef.current.on('stopTyping', (userName) => {
      setTypingUsers(prev => prev.filter(name => name !== userName));
    });

    socketRef.current.on('messageDeleted', (messageId) => {
      setMessages(prev => prev.filter(msg => msg._id !== messageId));
    });

    socketRef.current.on('messageEdited', ({ messageId, text }) => {
      setMessages(prev =>
        prev.map(msg => msg._id === messageId ? { ...msg, text, isEdited: true } : msg)
      );
    });

    socketRef.current.on('messagePinned', (payload) => {
      const messageId = payload.messageId || payload._id;
      const isPinned = typeof payload.isPinned === 'boolean' ? payload.isPinned : true;
      setMessages(prev =>
        prev.map(msg => msg._id === messageId ? { ...msg, isPinned } : msg)
      );
    });

    socketRef.current.on('userBanned', ({ userId }) => {
      if (String(userId) === currentUserId) {
        setEvent(prev => ({ ...prev, bannedUsers: [...(prev?.bannedUsers || []), userId] }));
      }
    });

    socketRef.current.on('messageReaction', ({ messageId, emoji, users }) => {
      const normalizedUsers = (users || []).map(u => String(u?._id || u));

      setMessages(prev => prev.map(msg => {
        if (msg._id !== messageId) return msg;

        let updatedReactions = [...(msg.reactions || [])];
        const existing = updatedReactions.find(r => r.emoji === emoji);
        if (existing) {
          existing.users = normalizedUsers;
        } else {
          updatedReactions.push({ emoji, users: normalizedUsers });
        }
        updatedReactions = updatedReactions.filter(r => r.users.length > 0);
        return { ...msg, reactions: updatedReactions };
      }));
    });

    return () => socketRef.current?.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() && !selectedImage && !audioBlob && !selectedDocument) return;
    setError('');
    setIsSending(true);

    clearTimeout(typingTimeoutRef.current);
    if (socketRef.current)
      socketRef.current.emit('stopTyping', { eventId, userName: user?.fullName || 'Anonymous' });

    if (editingMessage) {
      if (socketRef.current) {
        socketRef.current.emit('editMessage', { eventId, messageId: editingMessage._id, text: inputValue });
      }
      setMessages(prev =>
        prev.map(msg => msg._id === editingMessage._id ? { ...msg, text: inputValue, isEdited: true } : msg)
      );
      setEditingMessage(null);
      setInputValue('');
      setIsSending(false);
      return;
    }

    const blobToSend = audioBlob;

    try {
      const mentions = [];
      if (inputValue) {
        const mentionRegex = /@(\w+)/g;
        let match;
        while ((match = mentionRegex.exec(inputValue)) !== null) {
          const username = match[1];
          const mentionedUser = attendeesForMentions.find(u => u.username === username);
          if (mentionedUser && !mentions.includes(mentionedUser._id)) {
            mentions.push(mentionedUser._id);
          }
        }
      }

      let payload;
      if (selectedImage || blobToSend || selectedDocument) {
        payload = new FormData();
        if (inputValue) payload.append('text', inputValue);
        if (replyingToMessage) payload.append('replyTo', replyingToMessage._id);
        if (selectedImage) payload.append('image', selectedImage);
        if (blobToSend) {
          const ext = blobToSend.type.includes('mp4')
            ? 'mp4'
            : blobToSend.type.includes('mpeg') ? 'mp3' : 'webm';
          payload.append('audio', new File([blobToSend], `voicenote.${ext}`, { type: blobToSend.type }));
        }
        if (selectedDocument) payload.append('document', selectedDocument);
        if (mentions.length > 0) payload.append('mentions', JSON.stringify(mentions));
      } else {
        payload = {
          text: inputValue,
          replyTo: replyingToMessage ? replyingToMessage._id : null,
          mentions: mentions.length > 0 ? mentions : undefined
        };
      }

      const res = await api.post(`/events/${eventId}/messages`, payload);

      const newMsg = { ...res.data.data, isOwn: true };
      setMessages(prev => prev.some(msg => msg._id === newMsg._id) ? prev : [...prev, newMsg]);

      setInputValue('');
      setSelectedImage(null);
      setAudioBlob(null);
      setSelectedDocument(null);
      setShowEmojiPicker(false);
      setReplyingToMessage(null);
      setShowAttachMenu(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (documentInputRef.current) documentInputRef.current.value = '';
    } catch (err) {
      setError('Failed to send message.');
      setTimeout(() => setError(''), 3000);
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      await api.delete(`/events/${eventId}/messages/${messageId}`);
      setMessages(prev => prev.filter(msg => msg._id !== messageId));
    } catch (err) {
      setError('Failed to delete message.');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleReply = (msg) => setReplyingToMessage(msg);
  const cancelReply = () => setReplyingToMessage(null);

  const toggleReaction = async (messageId, emoji) => {
    setActiveReactionMessage(null);

    setMessages(prev => prev.map(msg => {
      if (msg._id !== messageId) return msg;

      let updatedReactions = [...(msg.reactions || [])];
      const existing = updatedReactions.find(r => r.emoji === emoji);
      if (existing) {
        const alreadyReacted = existing.users.map(u => String(u?._id || u)).includes(currentUserId);
        if (alreadyReacted) {
          existing.users = existing.users.filter(u => String(u?._id || u) !== currentUserId);
        } else {
          existing.users = [...existing.users, currentUserId];
        }
      } else {
        updatedReactions.push({ emoji, users: [currentUserId] });
      }
      updatedReactions = updatedReactions.filter(r => r.users.length > 0);
      return { ...msg, reactions: updatedReactions };
    }));

    try {
      await api.post(`/events/${eventId}/messages/${messageId}/reaction`, { emoji });
    } catch (err) {
      console.error('Failed to toggle reaction', err);
      setError('Failed to apply reaction');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) { setSelectedImage(file); setShowAttachMenu(false); }
  };

  const handleDocumentSelect = (e) => {
    const file = e.target.files[0];
    if (file) { setSelectedDocument(file); setShowAttachMenu(false); }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputValue(val);

    const lastAt = val.lastIndexOf('@');
    const lastSpace = val.lastIndexOf(' ');

    if (lastAt > lastSpace && lastAt === val.length - 1) {
      setMentionSearch('');
    } else if (lastAt > lastSpace) {
      const searchTerm = val.substring(lastAt + 1);
      if (!/\s/.test(searchTerm)) {
        setMentionSearch(searchTerm.toLowerCase());
      } else {
        setMentionSearch(null);
      }
    } else {
      setMentionSearch(null);
    }

    if (socketRef.current) {
      socketRef.current.emit('typing', { eventId, userName: user?.fullName || 'Anonymous' });
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current.emit('stopTyping', { eventId, userName: user?.fullName || 'Anonymous' });
      }, 2000);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      setError('Microphone access denied.');
      setTimeout(() => setError(''), 3000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const scrollToMessage = (msgId) => {
    const el = document.getElementById(`message-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.style.transition = 'background-color 0.5s ease';
      el.style.backgroundColor = darkMode ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.15)';
      el.style.borderRadius = '0.5rem';
      setTimeout(() => { el.style.backgroundColor = 'transparent'; }, 1500);
    }
  };

  const handlePinMessage = async (msg) => {
    try {
      const res = await api.put(`/events/${eventId}/messages/${msg._id}/pin`);
      const updatedMsg = res.data?.data;
      const newPinState = updatedMsg?.isPinned ?? !msg.isPinned;

      setMessages(prev =>
        prev.map(m => m._id === msg._id ? { ...m, isPinned: newPinState } : m)
      );

      if (socketRef.current) {
        socketRef.current.emit('pinMessage', {
          eventId,
          messageId: msg._id,
          isPinned: newPinState
        });
      }
    } catch (err) {
      setError('Failed to pin message');
      setTimeout(() => setError(''), 3000);
    }
  };

  const pinnedMessages = messages.filter(m => m.isPinned);
  const activePinnedMessage = pinnedMessages.length > 0 ? pinnedMessages[pinnedMessages.length - 1] : null;

  const isOrganizer = event && (
    String(event.organizer?._id || event.organizer || '') === currentUserId ||
    String(event.creator?._id || event.creator || '') === currentUserId ||
    String(event.host?._id || event.host || '') === currentUserId
  );

  const isBanned = event?.bannedUsers?.some(id => String(id?._id || id) === currentUserId);

  const filteredMentions = mentionSearch !== null
    ? attendeesForMentions.filter(
        att =>
          (att.username?.toLowerCase().includes(mentionSearch) ||
            att.fullName.toLowerCase().includes(mentionSearch)) &&
          String(att._id) !== currentUserId
      )
    : [];

  const isUserRegistered = event?.attendees?.some(attendee => {
    const attendeeId = String(attendee?.user?._id || attendee?.user || attendee?._id || attendee);
    return attendeeId === currentUserId;
  });

  const isUserApproved = event?.attendees?.some(attendee => {
    const attendeeId = String(attendee?.user?._id || attendee?.user || attendee?._id || attendee);
    return attendeeId === currentUserId && attendee?.isVerified !== false;
  });

  const hasAccess = isUserApproved || isOrganizer;

  if (!hasAccess) {
    return (
      <Motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className={`fixed inset-0 z-50 flex flex-col pt-20 ${darkMode ? 'bg-slate-950' : 'bg-slate-50'}`}
      >
        <div className={`px-4 py-3 border-b flex items-center justify-between shadow-sm z-10 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center gap-3">
            <Link to={`/event-details/${eventId}`} className={`p-2 rounded-full transition-colors ${darkMode ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}>
              <ArrowLeft size={20} />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-black overflow-hidden shadow-md">
                <img src={event?.coverImage || `https://api.dicebear.com/7.x/shapes/svg?seed=${eventId}`} alt="Group" className="w-full h-full object-cover" />
              </div>
              <div>
                <h2 className={`text-sm font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>{event?.title || 'Event Community'}</h2>
                <p className={`text-xs font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Access Restricted</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className={`max-w-md w-full text-center p-8 rounded-[2rem] border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-xl`}>
            <div className={`w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
              <MessageSquare size={32} className={darkMode ? 'text-slate-400' : 'text-slate-500'} />
            </div>
            <h3 className={`text-xl font-black mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Chat Access Restricted</h3>
            <p className={`text-sm font-medium mb-6 leading-relaxed ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              {isUserRegistered && !isUserApproved
                ? "Your registration is pending approval. You'll be able to join the chat once approved."
                : "You need to register and be approved for this event to access the chat."
              }
            </p>
            <Link
              to={`/event-details/${eventId}`}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-colors shadow-lg shadow-blue-600/30"
            >
              View Event Details
            </Link>
          </div>
        </div>
      </Motion.div>
    );
  }

  return (
    <Motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className={`fixed inset-0 z-50 flex flex-col pt-20 ${darkMode ? 'bg-slate-950' : 'bg-slate-50'}`}
    >
      {/* Header */}
      <div className={`px-4 py-3 border-b flex items-center justify-between shadow-sm z-10 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-3">
          <Link to={`/event-details/${eventId}`} className={`p-2 rounded-full transition-colors ${darkMode ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}>
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center gap-3 cursor-pointer">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-black overflow-hidden shadow-md">
                <img src={event?.coverImage || `https://api.dicebear.com/7.x/shapes/svg?seed=${eventId}`} alt="Group" className="w-full h-full object-cover" />
              </div>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full"></div>
            </div>
            <div>
              <h2 className={`text-sm font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>{event?.title || 'Event Community'}</h2>
              <p className={`text-xs font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{event?.attendees?.length || 0} members</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pinned message banner */}
      {activePinnedMessage && (
        <div
          className={`px-4 py-2 border-b flex items-center justify-between shadow-sm z-10 cursor-pointer transition-colors ${darkMode ? 'bg-blue-900/20 border-blue-900/50 hover:bg-blue-900/30' : 'bg-blue-50 border-blue-100 hover:bg-blue-100/70'} backdrop-blur-md`}
          onClick={() => scrollToMessage(activePinnedMessage._id)}
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <Pin size={16} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <div className="overflow-hidden">
              <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-0.5">Pinned Message</p>
              <p className={`text-xs truncate ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                {activePinnedMessage.text || 'Attachment'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error toast */}
      <AnimatePresence>
        {error && (
          <Motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="absolute top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-red-500 text-white text-xs font-bold rounded-full shadow-lg"
          >
            {error}
          </Motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      {isFetchingMessages ? (
        <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-32">
          {[...Array(6)].map((_, i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
              <div className={`h-12 w-48 sm:w-64 rounded-[1.5rem] animate-pulse ${darkMode ? 'bg-slate-800/50' : 'bg-slate-100'}`} />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar pb-32">
          {messages.map((msg, idx) => {
            const currentLabel = getDateLabel(msg.createdAt);
            const prevMsg = idx > 0 ? messages[idx - 1] : null;
            const prevLabel = prevMsg ? getDateLabel(prevMsg.createdAt) : null;
            const showDateBoundary = currentLabel !== prevLabel;

            return (
              <React.Fragment key={msg._id || idx}>
                {showDateBoundary && (
                  <div className="text-center my-6">
                    <span className={`px-3 py-1 text-xs font-bold rounded-full ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-500'}`}>
                      {currentLabel}
                    </span>
                  </div>
                )}
                <Motion.div
                  id={`message-${msg._id}`}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className={`flex flex-col ${msg.isOwn ? 'items-end' : 'items-start'}`}
                >
                  <span className={`text-xs font-bold mb-1 ${msg.isOwn ? 'mr-1' : 'ml-1'} ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {msg.isOwn ? 'You' : (msg.senderName || msg.sender)}
                  </span>
                  <div className={`group relative max-w-[75%] sm:max-w-[60%] flex flex-col ${msg.isOwn ? 'items-end' : 'items-start'}`}>
                    {/* Action buttons */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity px-2 flex gap-2"
                      style={{ [msg.isOwn ? 'right' : 'left']: '100%' }}
                    >
                      <button
                        onClick={() => handleReply(msg)}
                        className={`p-1.5 rounded-full ${darkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white text-slate-500 hover:bg-slate-100'} shadow-sm`}
                      >
                        <Reply size={14} />
                      </button>

                      {isOrganizer && !msg.isOwn && (
                        <button
                          onClick={() => {
                            if (window.confirm('Ban this user from the chat?')) {
                              socketRef.current?.emit('banUser', { eventId, userId: msg.senderId });
                            }
                          }}
                          className={`p-1.5 rounded-full ${darkMode ? 'bg-slate-800 text-red-400 hover:bg-red-500/20' : 'bg-white text-red-500 hover:bg-red-50'} shadow-sm transition-colors`}
                          title="Ban User"
                        >
                          <Ban size={14} />
                        </button>
                      )}

                      {isOrganizer && (
                        <button
                          onClick={() => handlePinMessage(msg)}
                          className={`p-1.5 rounded-full ${darkMode ? 'bg-slate-800 text-amber-400 hover:bg-amber-500/20' : 'bg-white text-amber-500 hover:bg-amber-50'} shadow-sm transition-colors`}
                          title={msg.isPinned ? 'Unpin' : 'Pin'}
                        >
                          <Pin size={14} className={msg.isPinned ? 'fill-current' : ''} />
                        </button>
                      )}

                      {msg.isOwn && (
                        <button
                          onClick={() => { setEditingMessage(msg); setInputValue(msg.text || ''); setReplyingToMessage(null); }}
                          className={`p-1.5 rounded-full ${darkMode ? 'bg-slate-800 text-blue-400 hover:bg-blue-500/20' : 'bg-white text-blue-500 hover:bg-blue-50'} shadow-sm transition-colors`}
                        >
                          <Edit2 size={14} />
                        </button>
                      )}

                      {msg.isOwn && (
                        <button
                          onClick={() => handleDeleteMessage(msg._id)}
                          className={`p-1.5 rounded-full ${darkMode ? 'bg-slate-800 text-red-400 hover:bg-red-500/20' : 'bg-white text-red-500 hover:bg-red-50'} shadow-sm transition-colors`}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}

                      <button
                        onClick={() => setActiveReactionMessage(activeReactionMessage === msg._id ? null : msg._id)}
                        className={`p-1.5 rounded-full ${darkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white text-slate-500 hover:bg-slate-100'} shadow-sm transition-colors`}
                        title="Add Reaction"
                      >
                        <Smile size={14} />
                      </button>
                    </div>

                    {/* Reaction picker */}
                    <AnimatePresence>
                      {activeReactionMessage === msg._id && (
                        <Motion.div
                          initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                          className={`absolute ${msg.isOwn ? 'right-full mr-2' : 'left-full ml-2'} top-0 flex gap-1 p-1.5 rounded-full shadow-lg z-20 ${darkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'}`}
                        >
                          {['👍', '❤️', '😂', '😮', '😢', '🔥'].map(emoji => (
                            <button
                              key={emoji}
                              onClick={() => toggleReaction(msg._id, emoji)}
                              className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors text-lg ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </Motion.div>
                      )}
                    </AnimatePresence>

                    {/* Bubble */}
                    <div className={`relative px-4 py-2.5 shadow-sm ${
                      msg.isOwn
                        ? 'bg-blue-600 text-white rounded-[1.5rem] rounded-tr-sm'
                        : `${darkMode ? 'bg-slate-800 text-white' : 'bg-white text-slate-900 border border-slate-100'} rounded-[1.5rem] rounded-tl-sm`
                    }`}>
                      {msg.isPinned && (
                        <div className="absolute -top-2 -right-2 w-5 h-5 bg-amber-500 text-white rounded-full flex items-center justify-center shadow-sm z-10">
                          <Pin size={10} className="fill-current" />
                        </div>
                      )}

                      {msg.replyTo && (
                        <div
                          onClick={() => scrollToMessage(msg.replyTo._id || msg.replyTo)}
                          className={`cursor-pointer hover:opacity-80 transition-opacity mb-2 pl-3 border-l-2 text-xs py-1 pr-2 rounded-r-lg ${
                            msg.isOwn
                              ? 'border-blue-300 bg-blue-700/50 text-blue-100'
                              : `${darkMode ? 'border-blue-500 bg-slate-700 text-slate-300' : 'border-blue-500 bg-slate-50 text-slate-600'}`
                          }`}
                        >
                          <div className="font-bold mb-0.5">{msg.replyTo.sender || msg.replyTo.senderName}</div>
                          <div className="truncate opacity-90">{msg.replyTo.text || 'Photo'}</div>
                        </div>
                      )}

                      {(msg.image || msg.imageUrl) && (
                        <img
                          src={msg.image || msg.imageUrl}
                          alt="Attached"
                          className="rounded-lg mb-2 max-w-full h-auto max-h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setLightboxImage(msg.image || msg.imageUrl)}
                        />
                      )}

                      {(msg.audio || msg.audioUrl) && (
                        <WaveformPlayer
                          src={msg.audioUrl || msg.audio}
                          isOwn={msg.isOwn}
                          darkMode={darkMode}
                        />
                      )}

                      {(msg.document || msg.documentUrl) && (
                        <a
                          href={msg.document || msg.documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center gap-3 p-3 mb-2 rounded-xl border ${
                            msg.isOwn
                              ? 'bg-blue-700/50 border-blue-500 text-white hover:bg-blue-800'
                              : darkMode
                                ? 'bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600'
                                : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                          } transition-colors cursor-pointer`}
                        >
                          <FileText size={24} className={msg.isOwn ? 'text-blue-200' : 'text-blue-500'} />
                          <span className="text-sm font-bold truncate max-w-[150px] sm:max-w-[200px]">
                            {msg.documentName || 'Document'}
                          </span>
                          <Download size={16} className={`ml-auto flex-shrink-0 ${msg.isOwn ? 'text-blue-200' : 'text-slate-400'}`} />
                        </a>
                      )}

                      {msg.text && (
                        <p className="text-sm font-medium leading-relaxed break-words">
                          {msg.text.split(/(@\w+)/g).map((part, i) => {
                            if (part.startsWith('@')) {
                              const username = part.substring(1);
                              const isCurrentUserMentioned = msg.mentions?.some(
                                m => m.username === username || String(m._id || m) === currentUserId
                              );
                              return (
                                <span
                                  key={i}
                                  className={`font-black px-1 rounded-md ${
                                    isCurrentUserMentioned
                                      ? 'bg-amber-500/30 text-amber-600 dark:text-amber-300'
                                      : 'text-blue-600 dark:text-blue-400 bg-blue-500/10'
                                  }`}
                                >
                                  {part}
                                </span>
                              );
                            }
                            return part;
                          })}
                        </p>
                      )}

                      <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${msg.isOwn ? 'text-blue-200' : `${darkMode ? 'text-slate-400' : 'text-slate-400'}`}`}>
                        {msg.isEdited && <span className="italic opacity-80 mr-1">(edited)</span>}
                        <span>{msg.time || new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {msg.isOwn && (msg.status === 'read' ? <CheckCheck size={12} /> : <Check size={12} />)}
                      </div>
                    </div>

                    {/* Reaction pills */}
                    {msg.reactions && msg.reactions.length > 0 && (
                      <div className={`flex flex-wrap gap-1 mt-1.5 ${msg.isOwn ? 'justify-end' : 'justify-start'}`}>
                        {msg.reactions.map((r, i) => {
                          const hasReacted = r.users
                            .map(u => String(u?._id || u))
                            .includes(currentUserId);
                          return (
                            <button
                              key={i}
                              onClick={() => toggleReaction(msg._id, r.emoji)}
                              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold border transition-colors ${
                                hasReacted
                                  ? darkMode
                                    ? 'bg-blue-900/40 border-blue-500/50 text-blue-300'
                                    : 'bg-blue-50 border-blue-300 text-blue-700'
                                  : darkMode
                                    ? 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'
                                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                              }`}
                            >
                              <span>{r.emoji}</span>
                              <span className={hasReacted ? (darkMode ? 'text-blue-300' : 'text-blue-700') : (darkMode ? 'text-slate-400' : 'text-slate-500')}>
                                {r.users.length}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </Motion.div>
              </React.Fragment>
            );
          })}

          <AnimatePresence>
            {typingUsers.length > 0 && (
              <Motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                className={`text-xs font-semibold italic flex items-center gap-2 mb-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}
              >
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
                {typingUsers.join(', ')} {typingUsers.length > 1 ? 'are' : 'is'} typing...
              </Motion.div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Input bar */}
      <div className={`fixed bottom-0 left-0 right-0 p-3 sm:p-4 border-t shadow-[0_-10px_40px_rgba(0,0,0,0.05)] ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} backdrop-blur-xl`}>
        <div className="max-w-4xl mx-auto">
          {isBanned ? (
            <div className={`p-4 text-center font-bold rounded-2xl border ${darkMode ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-red-50 text-red-600 border-red-200'}`}>
              You have been banned from this event chat room by the organizer.
            </div>
          ) : (
            <>
              <AnimatePresence>
                {editingMessage && (
                  <Motion.div
                    initial={{ opacity: 0, height: 0, y: 10 }} animate={{ opacity: 1, height: 'auto', y: 0 }} exit={{ opacity: 0, height: 0, y: 10 }}
                    className={`flex items-start justify-between p-3 mb-2 rounded-xl border-l-4 border-emerald-500 ${darkMode ? 'bg-slate-800 text-white' : 'bg-slate-50 text-slate-900'}`}
                  >
                    <div className="flex gap-2 overflow-hidden">
                      <Edit2 size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                      <div className="overflow-hidden">
                        <p className="text-xs font-black text-emerald-500 mb-0.5">Editing Message</p>
                        <p className="text-xs truncate opacity-80">{editingMessage.text || 'Photo'}</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => { setEditingMessage(null); setInputValue(''); }} className={`p-1 rounded-full ${darkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-200 text-slate-500'}`}>
                      <X size={16} />
                    </button>
                  </Motion.div>
                )}

                {replyingToMessage && (
                  <Motion.div
                    initial={{ opacity: 0, height: 0, y: 10 }} animate={{ opacity: 1, height: 'auto', y: 0 }} exit={{ opacity: 0, height: 0, y: 10 }}
                    className={`flex items-start justify-between p-3 mb-2 rounded-xl border-l-4 border-blue-500 ${darkMode ? 'bg-slate-800 text-white' : 'bg-slate-50 text-slate-900'}`}
                  >
                    <div className="flex gap-2 overflow-hidden">
                      <CornerDownRight size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
                      <div className="overflow-hidden">
                        <p className="text-xs font-black text-blue-500 mb-0.5">Replying to {replyingToMessage.senderName || replyingToMessage.sender}</p>
                        <p className="text-xs truncate opacity-80">{replyingToMessage.text || 'Photo'}</p>
                      </div>
                    </div>
                    <button onClick={cancelReply} className={`p-1 rounded-full ${darkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-200 text-slate-500'}`}>
                      <X size={16} />
                    </button>
                  </Motion.div>
                )}

                {selectedImage && (
                  <Motion.div
                    initial={{ opacity: 0, height: 0, y: 10 }} animate={{ opacity: 1, height: 'auto', y: 0 }} exit={{ opacity: 0, height: 0, y: 10 }}
                    className={`relative inline-block mb-2 p-2 rounded-xl border w-max ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                  >
                    <img src={URL.createObjectURL(selectedImage)} alt="Preview" className="h-20 w-auto rounded-lg object-cover shadow-sm" />
                    <button type="button" onClick={() => setSelectedImage(null)} className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-md transition-colors">
                      <X size={12} />
                    </button>
                  </Motion.div>
                )}

                {audioBlob && (
                  <Motion.div
                    initial={{ opacity: 0, height: 0, y: 10 }} animate={{ opacity: 1, height: 'auto', y: 0 }} exit={{ opacity: 0, height: 0, y: 10 }}
                    className={`relative inline-block mb-2 p-2 rounded-xl border w-max ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                  >
                    <AudioBlobPreview blob={audioBlob} darkMode={darkMode} />
                    <button type="button" onClick={() => setAudioBlob(null)} className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-md transition-colors z-10">
                      <X size={12} />
                    </button>
                  </Motion.div>
                )}

                {selectedDocument && (
                  <Motion.div
                    initial={{ opacity: 0, height: 0, y: 10 }} animate={{ opacity: 1, height: 'auto', y: 0 }} exit={{ opacity: 0, height: 0, y: 10 }}
                    className={`relative inline-block mb-2 p-3 rounded-xl border w-max ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                  >
                    <div className="flex items-center gap-3 pr-4">
                      <div className="w-10 h-10 bg-blue-500/10 text-blue-500 rounded-lg flex items-center justify-center"><FileText size={20} /></div>
                      <span className={`text-sm font-bold truncate max-w-[150px] ${darkMode ? 'text-white' : 'text-slate-900'}`}>{selectedDocument.name}</span>
                    </div>
                    <button type="button" onClick={() => setSelectedDocument(null)} className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-md transition-colors">
                      <X size={12} />
                    </button>
                  </Motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSend} className="flex items-end gap-2 relative">
                <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageSelect} />
                <input type="file" accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.csv" className="hidden" ref={documentInputRef} onChange={handleDocumentSelect} />

                <AnimatePresence>
                  {showAttachMenu && (
                    <Motion.div
                      initial={{ opacity: 0, scale: 0.9, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 10 }}
                      className={`absolute bottom-full left-0 mb-4 p-2 rounded-2xl shadow-xl flex gap-2 border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
                    >
                      <button type="button" onClick={() => fileInputRef.current?.click()} className={`p-3 rounded-xl flex flex-col items-center gap-1 ${darkMode ? 'hover:bg-slate-700 text-white' : 'hover:bg-slate-100 text-slate-700'}`}>
                        <div className="w-10 h-10 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center"><ImageIcon size={20} /></div>
                        <span className="text-[10px] font-bold">Photo</span>
                      </button>
                      <button type="button" onClick={() => documentInputRef.current?.click()} className={`p-3 rounded-xl flex flex-col items-center gap-1 ${darkMode ? 'hover:bg-slate-700 text-white' : 'hover:bg-slate-100 text-slate-700'}`}>
                        <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center"><Paperclip size={20} /></div>
                        <span className="text-[10px] font-bold">File</span>
                      </button>
                    </Motion.div>
                  )}

                  {mentionSearch !== null && filteredMentions.length > 0 && (
                    <Motion.div
                      initial={{ opacity: 0, scale: 0.9, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 10 }}
                      className={`absolute bottom-full left-12 mb-4 p-2 w-64 max-h-48 overflow-y-auto rounded-2xl shadow-2xl border z-50 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
                    >
                      {filteredMentions.map(name => (
                        <button
                          key={name._id} type="button"
                          className={`w-full text-left px-3 py-2 rounded-xl text-sm font-bold transition-colors ${darkMode ? 'hover:bg-slate-700 text-white' : 'hover:bg-slate-100 text-slate-900'}`}
                          onClick={() => {
                            const lastAt = inputValue.lastIndexOf('@');
                            const newVal = inputValue.substring(0, lastAt) + `@${name.username} `;
                            setInputValue(newVal);
                            setMentionSearch(null);
                          }}
                        >
                          @{name.username} <span className="opacity-50 font-normal ml-1">({name.fullName})</span>
                        </button>
                      ))}
                    </Motion.div>
                  )}

                  {showEmojiPicker && (
                    <Motion.div
                      initial={{ opacity: 0, scale: 0.9, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 10 }}
                      className="absolute bottom-full right-0 mb-4 z-50 shadow-2xl rounded-[2rem] overflow-hidden border border-slate-200 dark:border-slate-700"
                    >
                      <Picker
                        data={data}
                        onEmojiSelect={(emoji) => setInputValue(prev => prev + emoji.native)}
                        theme={darkMode ? 'dark' : 'light'}
                      />
                    </Motion.div>
                  )}
                </AnimatePresence>

                <div className={`flex-1 flex items-end rounded-[1.5rem] border overflow-hidden transition-colors ${darkMode ? 'bg-slate-800 border-slate-700 focus-within:border-slate-500' : 'bg-slate-50 border-slate-200 focus-within:border-blue-300'}`}>
                  <button type="button" onClick={() => setShowAttachMenu(!showAttachMenu)} className={`p-3.5 outline-none ${darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-700'}`}>
                    <Paperclip size={20} />
                  </button>
                  <textarea
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!isSending) handleSend(e); } }}
                    placeholder="Type a message..."
                    rows={1}
                    className={`flex-1 max-h-32 min-h-[48px] py-3.5 bg-transparent border-none focus:ring-0 resize-none text-sm font-medium outline-none ${darkMode ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className={`p-3.5 outline-none transition-colors ${showEmojiPicker ? 'text-blue-500' : darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-700'}`}
                  >
                    <Smile size={20} />
                  </button>
                </div>

                {(inputValue.trim() || selectedImage || audioBlob || selectedDocument || isSending) ? (
                  <Motion.button
                    initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    type="submit" disabled={isSending}
                    className="w-[48px] h-[48px] rounded-[1.2rem] bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/30 hover:bg-blue-700 flex-shrink-0 disabled:opacity-80 transition-all"
                  >
                    {isSending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} className="ml-1" />}
                  </Motion.button>
                ) : (
                  <Motion.button
                    initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    type="button"
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`w-[48px] h-[48px] rounded-[1.2rem] flex items-center justify-center shadow-sm flex-shrink-0 transition-colors ${
                      isRecording
                        ? 'bg-red-500 text-white shadow-red-500/30 animate-pulse'
                        : `${darkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`
                    }`}
                  >
                    {isRecording ? <Square size={16} fill="currentColor" /> : <Mic size={20} />}
                  </Motion.button>
                )}
              </form>
            </>
          )}
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxImage && (
          <Motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 sm:p-8 cursor-zoom-out"
            onClick={() => setLightboxImage(null)}
          >
            <button
              className="absolute top-6 right-6 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors z-[101]"
              onClick={() => setLightboxImage(null)}
            >
              <X size={24} />
            </button>
            <Motion.img
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              src={lightboxImage}
              alt="Fullscreen Preview"
              className="max-w-full max-h-full object-contain rounded-xl shadow-2xl cursor-default"
              onClick={(e) => e.stopPropagation()}
            />
          </Motion.div>
        )}
      </AnimatePresence>
    </Motion.div>
  );
};

export default Chat;