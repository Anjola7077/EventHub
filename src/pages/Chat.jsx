import React, { useState, useRef, useEffect, useContext } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { Send, Paperclip, Mic, Image as ImageIcon, Smile, X, Check, CheckCheck, Reply, CornerDownRight, ArrowLeft, Square, FileText, Download, Loader2, Trash2, Play, Edit2, Pin, Ban, MessageSquare, Clock } from 'lucide-react';
import { useParams, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axios';
import { io } from 'socket.io-client';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

const getEventTimeIndicator = (event) => {
  if (!event) return null;
  const endTime = event.endDate ? new Date(event.endDate) : (event.date ? new Date(event.date) : null);
  if (!endTime) return null;
  const now = new Date();
  const diffMs = now - endTime;
  if (diffMs < 0) return { status: 'live', text: '🔴 Event is LIVE', color: 'text-green-500' };
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return { status: 'ended', text: '✓ Ended moments ago', color: 'text-gray-500' };
  if (diffMins < 60) return { status: 'ended', text: `✓ Ended ${diffMins}m ago`, color: 'text-gray-500' };
  if (diffHours < 24) return { status: 'ended', text: `✓ Ended ${diffHours}h ago`, color: 'text-gray-500' };
  return { status: 'ended', text: `✓ Ended ${diffDays}d ago`, color: 'text-gray-500' };
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

  useEffect(() => {
    const socketUrl = api.defaults.baseURL ? api.defaults.baseURL.replace('/api/v1', '') : 'http://localhost:5000';
    const token = localStorage.getItem('token') || document.cookie.split(';').find(c => c.trim().startsWith('token='))?.split('=')[1];
    
    socketRef.current = io(socketUrl, { withCredentials: true, auth: { token }, timeout: 5000, reconnection: true });
    socketRef.current.emit('join_event_chat', eventId);

    const fetchData = async () => {
      try {
        const [eventRes, msgRes] = await Promise.all([api.get(`/events/${eventId}`), api.get(`/events/${eventId}/messages`)]);
        setEvent(eventRes.data.data);
        setMessages(msgRes.data.data.map(m => ({ ...m, isOwn: m.senderId === user?._id })));
      } catch (err) {
        console.error('Fetch error:', err);
      } finally {
        setIsFetchingMessages(false);
      }
    };
    fetchData();

    socketRef.current.on('receive_message', (msg) => {
      setMessages(prev => [...prev, { ...msg, isOwn: msg.senderId === user?._id }]);
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
    });

    socketRef.current.on('messageDeleted', (messageId) => {
      setMessages(prev => prev.filter(msg => msg._id !== messageId));
    });

    return () => socketRef.current?.disconnect();
  }, [eventId, user]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() && !selectedImage && !audioBlob && !selectedDocument) return;
    
    setIsSending(true);
    try {
      const formData = new FormData();
      if (inputValue) formData.append('text', inputValue);
      if (selectedImage) formData.append('image', selectedImage);
      if (audioBlob) formData.append('audio', audioBlob);
      if (selectedDocument) formData.append('document', selectedDocument);
      
      await api.post(`/events/${eventId}/messages`, formData);
      setInputValue('');
      setSelectedImage(null);
      setAudioBlob(null);
      setSelectedDocument(null);
    } catch (err) {
      console.error('Send error:', err);
      setError('Failed to send message');
      setTimeout(() => setError(''), 3000);
    } finally {
      setIsSending(false);
    }
  };

  const handleReaction = async (messageId, emoji) => {
    try {
      await api.post(`/events/${eventId}/messages/${messageId}/reaction`, { emoji });
    } catch (err) {
      console.error('Reaction error:', err);
      setError('Failed to add reaction');
    }
  };

  const handlePin = async (messageId) => {
    try {
      await api.put(`/events/${eventId}/messages/${messageId}/pin`, {});
    } catch (err) {
      console.error('Pin error:', err);
      setError('Failed to pin message');
    }
  };

  const handleDelete = async (messageId) => {
    try {
      await api.delete(`/events/${eventId}/messages/${messageId}`);
    } catch (err) {
      console.error('Delete error:', err);
      setError('Failed to delete message');
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
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const eventTime = getEventTimeIndicator(event);
  const currentUserId = String(user?._id || user?.id);
  const isOrganizer = event && (String(event.organizer?._id || event.organizer) === currentUserId);

  return (
    <Motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`fixed inset-0 z-50 flex flex-col pt-20 ${darkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
      <div className={`px-4 py-3 border-b ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center justify-between">
          <h2 className={`text-sm font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>{event?.title}</h2>
          {eventTime && <span className={`text-xs font-bold ${eventTime.color}`}>{eventTime.text}</span>}
        </div>
      </div>

      {error && <div className="bg-red-500 text-white px-4 py-2">{error}</div>}

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
        {messages.map((msg) => (
          <div key={msg._id} className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs px-4 py-2 rounded-lg ${msg.isOwn ? 'bg-blue-600 text-white' : darkMode ? 'bg-slate-800 text-white' : 'bg-slate-100 text-black'}`}>
              {msg.image && <img src={msg.image} alt="" className="rounded mb-2 max-h-48" />}
              {msg.audio && <audio src={msg.audio} controls className="mb-2 w-full" />}
              {msg.document && <a href={msg.document} target="_blank" rel="noreferrer" className="text-blue-300 underline">📄 {msg.documentName || 'Document'}</a>}
              {msg.text && <p className="text-sm">{msg.text}</p>}
              {msg.isPinned && <p className="text-xs mt-1 text-yellow-300">📌 Pinned</p>}
              
              {msg.reactions?.length > 0 && (
                <div className="flex gap-1 mt-2 flex-wrap">
                  {msg.reactions.map((r, i) => (
                    <button key={i} onClick={() => handleReaction(msg._id, r.emoji)} className="text-lg hover:scale-125 transition">
                      {r.emoji} {r.users.length}
                    </button>
                  ))}
                </div>
              )}
              
              <div className="flex gap-1 mt-2">
                <button onClick={() => handleReaction(msg._id, '👍')} className="text-lg hover:scale-125">👍</button>
                <button onClick={() => handleReaction(msg._id, '❤️')} className="text-lg hover:scale-125">❤️</button>
                <button onClick={() => handleReaction(msg._id, '😂')} className="text-lg hover:scale-125">😂</button>
                {isOrganizer && <button onClick={() => handlePin(msg._id)} className="text-lg hover:scale-125">📌</button>}
                {msg.isOwn && <button onClick={() => handleDelete(msg._id)} className="text-lg hover:scale-125">🗑️</button>}
              </div>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSend} className={`fixed bottom-0 left-0 right-0 p-4 border-t ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="flex gap-2">
          <input type="file" className="hidden" ref={fileInputRef} onChange={(e) => setSelectedImage(e.target.files?.[0])} accept="image/*" />
          <input type="file" className="hidden" ref={documentInputRef} onChange={(e) => setSelectedDocument(e.target.files?.[0])} accept=".pdf,.doc,.docx" />
          
          <button type="button" onClick={() => fileInputRef.current?.click()} className="text-blue-500"><Paperclip size={20} /></button>
          <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="Message..." className={`flex-1 px-3 py-2 rounded ${darkMode ? 'bg-slate-800 text-white' : 'border'}`} />
          <button type="button" onClick={isRecording ? stopRecording : startRecording} className={`px-3 py-2 rounded text-white ${isRecording ? 'bg-red-500' : 'bg-gray-500'}`}><Mic size={20} /></button>
          <button type="submit" disabled={isSending} className="bg-blue-600 text-white px-4 py-2 rounded"><Send size={20} /></button>
        </div>
      </form>
    </Motion.div>
  );
};

export default Chat;