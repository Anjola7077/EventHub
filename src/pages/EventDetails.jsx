import React, { useState, useEffect, useContext } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { MapPin, Calendar, Share2, Heart, Users, ArrowRight, CalendarPlus, User, MessageSquare, Clock, Edit3, X, Image as ImageIcon, AlertTriangle, Landmark, Ticket, Plus, Trash2 } from 'lucide-react';

const TIER_COLORS = ['#d4a017', '#7c3aed', '#2563eb', '#0d9488', '#db2777', '#dc2626'];
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const animatedMarkerIcon = L.divIcon({
  className: 'bg-transparent border-none',
  html: `<div class="relative flex h-8 w-8 items-center justify-center -mt-4 -ml-4">
      <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-60"></span>
      <span class="relative inline-flex rounded-full h-5 w-5 bg-blue-600 border-2 border-white shadow-md"></span>
    </div>`,
  iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -16]
});

const formatTime12h = (timeStr) => {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':');
  const h = parseInt(hours, 10);
  return `${h % 12 || 12}:${minutes || '00'} ${h >= 12 ? 'PM' : 'AM'}`;
};

const formatEventDateTime = (startDate, startTime, endDate, endTime) => {
  if (!startDate) return 'Date TBA';
  
  const start = new Date(startDate).toLocaleDateString('en-US', { 
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' 
  });
  const startT = formatTime12h(startTime);
  const endT = formatTime12h(endTime);
  const startFormatted = startT ? `${start} • ${startT}` : start;

  if (!endDate) return startFormatted;

  const end = new Date(endDate).toLocaleDateString('en-US', { 
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' 
  });
  
  if (start === end && !endT) {
    return startFormatted;
  } else if (start === end) {
    return `${start} • ${startT || 'TBA'} - ${endT || 'TBA'}`;
  } else {
    const endFormatted = endT ? `${end} • ${endT}` : end;
    return `${startFormatted}  –  ${endFormatted}`;
  }
};

const EventDetails = ({ darkMode }) => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useContext(AuthContext);
  const [event, setEvent] = useState(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  const [unreadCount, setUnreadCount] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editingCoverImage, setEditingCoverImage] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showEventDeleteConfirm, setShowEventDeleteConfirm] = useState(false);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, status: 'upcoming' });
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
  };

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setError(null);
        const res = await api.get(`/events/${eventId}`);
        setEvent(res.data.data);
        
        // Safely check if the user's ID is in the event's likes array (even if populated)
        const currentUserId = String(user?._id || user?.id || '');
        if (user && Array.isArray(res.data.data.likes) && res.data.data.likes.some(like => String(like?._id || like) === currentUserId)) {
          setIsLiked(true);
        }
      } catch (error) {
        console.error("Failed to fetch event details:", error);
        setError("Could not load event. It might not exist or there was a network issue.");
      }
    };

    const fetchUnreadCount = async () => {
      if (!user) return;
      try {
        const res = await api.get(`/events/${eventId}/messages/unread`);
        setUnreadCount(res.data?.count || res.data?.data?.count || 0);
      } catch (error) {
        // Silently fail if endpoint isn't set up yet
      }
    };

    if (eventId) {
      fetchEvent();
      fetchUnreadCount();
    }
  }, [eventId, user]);

  // Countdown timer for registered users
  useEffect(() => {
    if (!event?.date) return;

    const updateCountdown = () => {
      const now = new Date().getTime();
      const startTime = new Date(event.date).getTime();
      const endTime = event.endDate ? new Date(event.endDate).getTime() : (startTime + 3600000);
      const distance = startTime - now;

      if (distance > 0) {
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        setCountdown({ days, hours, minutes, seconds, status: 'upcoming' });
      } else if (now <= endTime) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0, status: 'live' });

        const liveKey = `notif_live_${event._id || event.id}`;
        if (!localStorage.getItem(liveKey)) {
          if (window.Notification?.permission === 'granted') {
            new window.Notification("Event is LIVE!", { body: `${event.title} has officially started!`, icon: event.coverImage || '/logo.png' });
          }
          localStorage.setItem(liveKey, 'true');
        }
      } else {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0, status: 'ended' });
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [event?.date, event?.endDate]);

  const glassStyle = 'bg-surface border-line';

  const inputStyle = "w-full rounded-2xl border border-line bg-surface-2 px-4 py-3.5 text-sm font-medium eh-text placeholder:text-ink-muted transition focus:border-brand focus:outline-none focus:[box-shadow:var(--eh-ring)]";

  const addEditTier = () => setEditForm(f => ({ ...f, ticketTiers: [...(f.ticketTiers || []), { name: '', price: 0, capacity: '', color: TIER_COLORS[(f.ticketTiers?.length || 0) % TIER_COLORS.length], perks: '' }] }));
  const updateEditTier = (idx, key, value) => setEditForm(f => ({ ...f, ticketTiers: (f.ticketTiers || []).map((t, i) => (i === idx ? { ...t, [key]: value } : t)) }));
  const removeEditTier = (idx) => setEditForm(f => ({ ...f, ticketTiers: (f.ticketTiers || []).filter((_, i) => i !== idx) }));

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (editForm.endDate && new Date(editForm.endDate) < new Date(editForm.date)) {
      showToast("End Date cannot be before Start Date.", "error");
      return;
    }
    setIsSaving(true);
    try {
      let payload;
      let config = {};

      const dataToSubmit = { ...editForm };
      delete dataToSubmit.coverImage; // Avoid sending old URL

      if (editingCoverImage) {
        const formData = new FormData();
        const safeKeys = ['title', 'description', 'date', 'time', 'endDate', 'endTime', 'price', 'capacity', 'category', 'status', 'isPublic', 'approvalRequired', 'bankName', 'accountNumber', 'accountName'];
        safeKeys.forEach(key => {
          if (dataToSubmit[key] !== undefined && dataToSubmit[key] !== null) formData.append(key, dataToSubmit[key]);
        });
        if (dataToSubmit.location) {
          formData.append('location', typeof dataToSubmit.location === 'object' ? JSON.stringify(dataToSubmit.location) : dataToSubmit.location);
        }
        if (dataToSubmit.ticketTiers) {
          formData.append('ticketTiers', JSON.stringify(dataToSubmit.ticketTiers));
        }
        formData.append('coverImage', editingCoverImage);
        payload = formData;
      } else {
        payload = {};
        const safeKeys = ['title', 'description', 'date', 'time', 'endDate', 'endTime', 'price', 'capacity', 'category', 'status', 'isPublic', 'approvalRequired', 'ticketTiers', 'bankName', 'accountNumber', 'accountName'];
        safeKeys.forEach(key => {
          if (dataToSubmit[key] !== undefined && dataToSubmit[key] !== null) payload[key] = dataToSubmit[key];
        });
        if (dataToSubmit.location) {
          payload.location = typeof dataToSubmit.location === 'object' ? JSON.stringify(dataToSubmit.location) : dataToSubmit.location;
        }
      }

      const res = await api.put(`/events/${event._id || event.id}`, payload, config);
      
      setEvent(prev => ({ ...prev, ...res.data.data }));
      setIsEditing(false);
      setEditingCoverImage(null);
      showToast('Event updated successfully!');
    } catch (error) {
      showToast("Failed to update event.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEvent = async () => {
    setShowEventDeleteConfirm(true);
  };

  const confirmDeleteEvent = async () => {
    if (!event) return;
    setIsSaving(true);
    try {
      await api.delete(`/events/${event._id || event.id}`);
      setShowEventDeleteConfirm(false);
      setIsEditing(false);
      showToast('Event deleted successfully!');
      setTimeout(() => navigate('/profile'), 1500);
    } catch (error) {
      console.error("Delete failed", error);
      showToast("Failed to delete event.", "error");
    }
    // No finally block for isSaving, as we navigate away on success.
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: event?.title || 'EventHub Event',
          text: `Check out ${event?.title} on EventHub!`,
          url: window.location.href,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      showToast('Event link copied to clipboard!', 'success');
    }
  };

  const handleLike = async () => {
    if (!user) {
      showToast("Please log in to like this event.", "error");
      return;
    }
    
    // Optimistic UI update: Toggle instantly so it feels fast!
    setIsLiked(prev => !prev);
    
    try {
      // Assuming your backend has an endpoint to toggle the like status
      await api.post(`/events/${eventId}/like`);
    } catch (error) {
      // Revert the toggle if the API request fails
      setIsLiked(prev => !prev);
      showToast("Failed to update like status.", "error");
      console.error("Failed to toggle like:", error);
    }
  };


  const handleAddToCalendar = () => {
    if (!event) return;
    const startDate = new Date(event.date);
    const startString = startDate.toISOString().replace(/-|:|\.\d\d\d/g, '');
    const endDate = event.endDate ? new Date(event.endDate) : startDate;
    const endString = endDate.toISOString().replace(/-|:|\.\d\d\d/g, '');
    const googleCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${startString}/${endString}&details=${encodeURIComponent(event.description || '')}&location=${encodeURIComponent(event.location?.formattedAddress || event.location || '')}`;
    window.open(googleCalUrl, '_blank');
  };

  const handleDownloadICS = () => {
    if (!event) return;
    const startDate = new Date(event.date);
    const formatICSDate = (date) => date.toISOString().replace(/-|:|\.\d\d\d/g, '');
    const startString = formatICSDate(startDate);
    
    // Use end date or default to a 1 hour duration if no end time is specified
    const endDate = event.endDate ? new Date(event.endDate) : new Date(startDate.getTime() + 60 * 60 * 1000);
    const endString = formatICSDate(endDate);

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//EventHub//EN',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `UID:${event._id || event.id}@eventhub.com`,
      `DTSTAMP:${startString}`,
      `DTSTART:${startString}`,
      `DTEND:${endString}`,
      `SUMMARY:${event.title}`,
      `DESCRIPTION:${(event.description || '').replace(/\n/g, '\\n')}`,
      `LOCATION:${event.location?.formattedAddress || event.location || ''}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n'); // iCalendar specification requires CRLF line endings

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${event.title.replace(/\s+/g, '_')}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (error) {
    return (
      <Motion.main
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="pt-32 pb-20 px-4 md:px-8 max-w-7xl mx-auto text-center"
      >
        <div className={`p-12 rounded-[2.5rem] border ${glassStyle}`}>
          <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center bg-red-500/10 text-red-500">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-2xl font-black mb-4 text-red-500">An Error Occurred</h2>
          <p className={`text-sm font-medium mb-8 eh-text-soft`}>{error}</p>
          <Link to="/events" className="eh-btn eh-btn-primary">
            Back to Events
          </Link>
        </div>
      </Motion.main>
    );
  }
  if (!event) {
    return (
      <Motion.main
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="pt-24 pb-20 px-4 md:px-8 max-w-7xl mx-auto"
      >
        <div className="space-y-8 animate-pulse">
          <div className={`rounded-[2.5rem] h-[42vh] min-h-[320px] bg-surface-2`} />
          <div className="grid grid-cols-1 lg:grid-cols-[2fr_0.95fr] gap-8">
            <div className="space-y-8">
              <div className={`rounded-[2rem] h-64 border border-line bg-surface-2`} />
              <div className={`rounded-[2rem] h-32 border border-line bg-surface-2`} />
            </div>
            <div className="space-y-6">
              <div className={`rounded-[2rem] h-[340px] border border-line bg-surface-2`} />
              <div className={`rounded-[2rem] h-48 border border-line bg-surface-2`} />
            </div>
          </div>
        </div>
      </Motion.main>
    );
  }

  const isSoldOut = event.capacity && (event.ticketsSold || 0) >= event.capacity;

  // Check if user has access to chat
  const currentUserId = String(user?._id || user?.id || '');
  const isOrganizer = event && (String(event.organizer?._id || event.organizer || '') === currentUserId || String(event.creator?._id || event.creator || '') === currentUserId);
  const isApprovedAttendee = event?.attendees?.some(attendee => {
    const attendeeId = String(attendee?.user?._id || attendee?.user || attendee?._id || attendee);
    return attendeeId === currentUserId && attendee?.isVerified !== false;
  });
  const isRegisteredAttendee = event?.attendees?.some(attendee => {
    const attendeeId = String(attendee?.user?._id || attendee?.user || attendee?._id || attendee);
    return attendeeId === currentUserId;
  });
  const isRegisteredOrOrganizer = isRegisteredAttendee || isOrganizer;
  const hasChatAccess = isOrganizer || isApprovedAttendee;

  const hasHappened = (event?.endDate || event?.date) ? new Date(event.endDate || event.date) < new Date() : true;

  return (
    <Motion.main
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="pt-24 pb-20 px-4 md:px-8 max-w-7xl mx-auto"
    >
      <div className="space-y-8">
        <div className="relative overflow-hidden rounded-[2.5rem] shadow-2xl h-[42vh] min-h-[320px] bg-slate-900">
          <img
            src={event.coverImage || '/placeholder.png'}
            alt={event.title}
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => { e.target.src = '/placeholder.png'; }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.18),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(7,89,234,0.55),_transparent_30%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.15),rgba(15,23,42,0.75))]" />
          <div className="relative z-10 h-full p-8 md:p-12 flex flex-col justify-between">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="inline-flex items-center rounded-full bg-white/15 px-4 py-2 text-xs font-black uppercase tracking-[0.35em] text-white">
                  {event.category}
                </span>
                {!event.isPublic && (
                  <span className="inline-flex items-center rounded-full bg-red-500/20 border border-red-500/50 px-4 py-2 text-xs font-black uppercase tracking-[0.35em] text-white ml-2">
                    Invite-Only
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Motion.button 
                  whileTap={{ scale: 0.85 }}
                  onClick={handleLike} 
                  className="rounded-full border border-white/20 bg-white/10 p-3 text-white transition hover:bg-white/20"
                >
                  <Motion.div animate={isLiked ? { scale: [1, 1.3, 1] } : { scale: 1 }} transition={{ duration: 0.3 }}>
                    <Heart size={18} className={isLiked ? 'text-red-500 fill-red-500' : 'text-white'} />
                  </Motion.div>
                </Motion.button>
                <button onClick={handleShare} className="rounded-full border border-white/20 bg-white/10 p-3 text-white transition hover:bg-white/20">
                  <Share2 size={18} />
                </button>
                {user && (event.creator?._id === user._id || event.organizer?._id === user._id) && (
                  <button 
                    onClick={() => { setEditForm(event); setIsEditing(true); }}
                    className="rounded-full border border-white/20 bg-white/10 p-3 text-white transition hover:bg-white/20"
                  >
                    <Edit3 size={18} />
                  </button>
                )}
              </div>
            </div>
            <div className="max-w-3xl">
              <h1 className="text-4xl sm:text-5xl font-black text-white leading-tight">{event.title}</h1>
              {countdown.status === 'ended' && (
                <span className="inline-flex items-center gap-1.5 mt-3 rounded-full bg-slate-500/30 border border-slate-400/40 px-4 py-1.5 text-xs font-bold text-slate-200">
                  <Clock size={12} /> Ended
                </span>
              )}
              {countdown.status === 'live' && (
                <span className="inline-flex items-center gap-1.5 mt-3 rounded-full bg-green-500/30 border border-green-400/40 px-4 py-1.5 text-xs font-bold text-green-200">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> LIVE
                </span>
              )}
              <div className="mt-6 flex flex-col sm:flex-row sm:flex-wrap gap-5 text-sm font-semibold text-white/90">
              <span className="inline-flex items-center gap-2"><Calendar size={16} className="text-white/70" /> {formatEventDateTime(event.date, event.time, event.endDate, event.endTime)}</span>
                <span className="inline-flex items-center gap-2"><MapPin size={16} className="text-white/70" /> {event.location?.formattedAddress || event.location}</span>
                <span className="inline-flex items-center gap-2"><Users size={16} className="text-white/70" /> {event.ticketsSold || 0}{event.capacity ? ` / ${event.capacity}` : ''} Attending</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[2fr_0.95fr] gap-8">
          <div className="space-y-8">
            <section className={`rounded-[2rem] border ${glassStyle} p-8`}> 
              <h2 className={`text-2xl font-black mb-4 eh-text`}>About this event</h2>
              <p className={`text-sm font-medium leading-relaxed mb-6 eh-text-soft`}>
                {event.description}
              </p>
            </section>
            
            {(() => {
              const organizer = event.organizer || event.creator;
              if (!organizer) return null;
              return (
                <section className={`rounded-[2rem] border ${glassStyle} p-8 flex items-center gap-5`}>
                  <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0 shadow-inner">
                    <img src={organizer.profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${organizer.fullName || 'Organizer'}`} alt="Organizer" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className={`text-xs font-black uppercase tracking-widest mb-1 eh-text-soft`}>Hosted By</p>
                    <h3 className={`text-xl font-black eh-text`}>{organizer.fullName || 'Event Organizer'}</h3>
                  </div>
                </section>
              );
            })()}
          </div>
          
          <div className="space-y-6">
            <div className={`rounded-[2rem] border ${glassStyle} p-6`}>
              {event.ticketTiers?.length > 0 ? (
                <div className="mb-5">
                  <h3 className={`text-2xl font-black eh-text`}>
                    {(() => {
                      const min = Math.min(...event.ticketTiers.map(t => Number(t.price) || 0));
                      return min === 0 ? 'Free' : `From ₦${min.toLocaleString()}`;
                    })()}
                  </h3>
                  <p className={`mb-4 mt-0.5 text-xs font-semibold eh-text-muted`}>
                    {event.ticketTiers.length} ticket {event.ticketTiers.length === 1 ? 'tier' : 'tiers'}
                  </p>
                  <div className="space-y-2">
                    {event.ticketTiers.map((tier, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface-2 p-3">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: tier.color || '#2563eb' }} />
                          <div className="min-w-0">
                            <p className="truncate font-bold eh-text">{tier.name}</p>
                            {tier.perks && <p className="truncate text-xs eh-text-muted">{tier.perks}</p>}
                          </div>
                        </div>
                        <span className="shrink-0 font-bold eh-text-brand">{tier.price ? `₦${Number(tier.price).toLocaleString()}` : 'Free'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <h3 className={`text-2xl font-black mb-4 eh-text`}>
                  {event.price === 0 ? 'Free' : `₦${event.price}`}
                </h3>
              )}

              {event.price > 0 && (event.bankName || event.accountNumber || event.accountName) && (
                <div className={`mb-4 p-4 rounded-2xl border border-line bg-surface-2`}>
                  <div className="flex items-center gap-2 mb-3">
                    <Landmark size={16} className="text-emerald-500" />
                    <h4 className={`text-xs font-bold uppercase tracking-wider eh-text`}>Payment Details</h4>
                  </div>
                  <div className={`space-y-2 text-sm eh-text-soft`}>
                    {event.bankName && (
                      <div className="flex justify-between">
                        <span className="font-semibold">Bank</span>
                        <span>{event.bankName}</span>
                      </div>
                    )}
                    {event.accountNumber && (
                      <div className="flex justify-between">
                        <span className="font-semibold">Account No.</span>
                        <span className="font-mono">{event.accountNumber}</span>
                      </div>
                    )}
                    {event.accountName && (
                      <div className="flex justify-between">
                        <span className="font-semibold">Account Name</span>
                        <span>{event.accountName}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {isRegisteredOrOrganizer ? (
                <div className={`w-full p-4 rounded-2xl border-2 border-dashed text-center border-line bg-surface-2`}>
                  <div className={`text-sm font-bold mb-2 eh-text-soft`}>
                    {isOrganizer ? 'You’re the organizer of this event!' : isApprovedAttendee ? 'You\'re registered for this event!' : 'Registration pending approval'}
                  </div>
                  {countdown.status === 'ended' ? (
                    <div>
                      <div className={`text-lg font-black flex items-center justify-center gap-2 eh-text-muted`}>
                        <span className="w-2 h-2 rounded-full bg-slate-400" />
                        Event has ended
                      </div>
                      <div className={`text-xs font-semibold mt-1 text-center eh-text-soft`}>
                        {(() => {
                          const endTime = event.endDate ? new Date(event.endDate) : new Date(event.date);
                          const diffMs = new Date() - endTime;
                          const diffMins = Math.floor(diffMs / 60000);
                          const diffHours = Math.floor(diffMs / 3600000);
                          const diffDays = Math.floor(diffMs / 86400000);
                          if (diffMins < 1) return 'Ended moments ago';
                          if (diffMins < 60) return `Ended ${diffMins}m ago`;
                          if (diffHours < 24) return `Ended ${diffHours}h ago`;
                          return `Ended ${diffDays}d ago`;
                        })()}
                      </div>
                    </div>
                  ) : countdown.status === 'live' ? (
                    <div className="text-lg font-black text-green-500 flex items-center justify-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                      LIVE NOW
                    </div>
                  ) : (
                    <div className="flex justify-center gap-4 text-lg font-black">
                      <div className={`text-center eh-text`}>
                        <div className="text-2xl font-black text-brand">{countdown.days}</div>
                        <div className={`text-xs font-bold uppercase tracking-wider eh-text-soft`}>Days</div>
                      </div>
                      <div className={`text-center eh-text`}>
                        <div className="text-2xl font-black text-brand">{countdown.hours}</div>
                        <div className={`text-xs font-bold uppercase tracking-wider eh-text-soft`}>Hours</div>
                      </div>
                      <div className={`text-center eh-text`}>
                        <div className="text-2xl font-black text-brand">{countdown.minutes}</div>
                        <div className={`text-xs font-bold uppercase tracking-wider eh-text-soft`}>Min</div>
                      </div>
                      <div className={`text-center eh-text`}>
                        <div className="text-2xl font-black text-brand">{countdown.seconds}</div>
                        <div className={`text-xs font-bold uppercase tracking-wider eh-text-soft`}>Sec</div>
                      </div>
                    </div>
                  )}
                </div>
              ) : isSoldOut ? (
                <button disabled className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-2xl bg-slate-500 px-5 py-4 text-sm font-black text-white">
                  Sold Out
                </button>
              ) : user ? (
                <Link
                  to={`/event-registration/${eventId}`}
                  className="eh-btn eh-btn-primary w-full py-4 text-sm font-black"
                >
                  Register & Upload Receipt
                </Link>
              ) : (
                <button
                  onClick={() => setShowAuthPrompt(true)}
                  className="eh-btn eh-btn-primary w-full py-4 text-sm font-black"
                >
                  Register & Upload Receipt
                </button>
              )}

              <div className="grid grid-cols-2 gap-3 mt-3">
                <button 
                  onClick={handleAddToCalendar}
                  className={`w-full inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-4 text-xs sm:text-sm font-black transition-colors border-line bg-surface-2 eh-text hover:bg-line`}
                >
                  <CalendarPlus size={18} /> Google Cal
                </button>
                <button 
                  onClick={handleDownloadICS}
                  className={`w-full inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-4 text-xs sm:text-sm font-black transition-colors border-line bg-surface-2 eh-text hover:bg-line`}
                >
                  <CalendarPlus size={18} /> Apple/Outlook
                </button>
              </div>
              
              {hasChatAccess && (
                <Link 
                  to={`/chat/${eventId}`}
                  className={`mt-3 w-full inline-flex items-center justify-center gap-2 rounded-2xl border px-5 py-4 text-sm font-black transition-colors border-line bg-surface-2 eh-text hover:bg-line`}
                >
                  <div className="relative">
                    <MessageSquare size={18} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border border-white dark:border-slate-800"></span>
                      </span>
                    )}
                  </div>
                  Join Event Chat
                </Link>
              )}
            </div>

            {event.location?.coordinates && (
              <div className={`rounded-[2rem] border ${glassStyle} p-6`}> 
                <h3 className={`text-lg font-black mb-4 eh-text`}>Event Location</h3>
              <div className={`w-full h-64 rounded-xl overflow-hidden relative shadow-inner border-line bg-surface-2`}>
                <MapContainer 
                  center={[event.location.coordinates[1], event.location.coordinates[0]]} 
                  zoom={14} 
                  scrollWheelZoom={false} 
                  style={{ height: '100%', width: '100%', zIndex: 1 }}
                >
                  <TileLayer 
                    attribution='&copy; OpenStreetMap' 
                    url={darkMode ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'} 
                  />
                  <Marker position={[event.location.coordinates[1], event.location.coordinates[0]]} icon={animatedMarkerIcon}>
                    <Popup className="rounded-xl">
                      <div className="p-1">
                        <p className="font-bold text-[13px] mb-1">{event.title}</p>
                        <p className={`text-[10px] leading-tight eh-text-soft`}>{event.location.formattedAddress}</p>
                      </div>
                    </Popup>
                  </Marker>
                </MapContainer>
                </div>
                <a 
                  href={`https://www.google.com/maps/dir/?api=1&destination=${event.location.coordinates[1]},${event.location.coordinates[0]}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`mt-4 w-full inline-flex items-center justify-center gap-2 rounded-2xl border px-5 py-3 text-sm font-bold transition-colors border-line bg-surface-2 eh-text hover:bg-line`}
                >
                  <MapPin size={16} /> Get Directions
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {toast.show && (
          <Motion.div
            initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -50 }}
            className={`fixed top-24 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-2xl z-[100] font-bold text-sm text-white ${toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'}`}
          >
            {toast.message}
          </Motion.div>
        )}
      </AnimatePresence>

      {/* Quick Edit Modal */}
      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <Motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-lg p-6 rounded-[2rem] shadow-2xl border max-h-[90vh] overflow-y-auto border-line bg-surface`}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className={`text-xl font-black eh-text`}>Quick Edit Event</h2>
                <button onClick={() => { setIsEditing(false); setEditingCoverImage(null); }} className={`p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors eh-text`}>
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleEditSubmit} className="space-y-4 text-left">
                <label className={`block border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors relative overflow-hidden group border-line bg-surface-2 hover:border-brand`}>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => setEditingCoverImage(e.target.files[0])} />
                  <img src={editingCoverImage ? URL.createObjectURL(editingCoverImage) : (editForm.coverImage || '/placeholder.png')} alt="Cover Preview" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="relative z-10 bg-black/40 backdrop-blur-sm p-2 rounded-lg inline-block">
                    <ImageIcon size={24} className="text-white mx-auto mb-2" />
                    <p className="text-xs font-bold text-white">Click to change cover image</p>
                  </div>
                </label>
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-2 eh-text-soft`}>Event Title</label>
                  <input type="text" value={editForm.title || ''} onChange={e => setEditForm({...editForm, title: e.target.value})} className={inputStyle} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-2 eh-text-soft`}>Date</label>
                    <input type="date" value={editForm.date ? editForm.date.substring(0, 10) : ''} onChange={e => setEditForm({...editForm, date: e.target.value})} className={inputStyle} required />
                  </div>
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-2 eh-text-soft`}>Time</label>
                    <input type="time" value={editForm.time || ''} onChange={e => setEditForm({...editForm, time: e.target.value})} className={inputStyle} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-2 eh-text-soft`}>End Date</label>
                    <input type="date" value={editForm.endDate ? editForm.endDate.substring(0, 10) : ''} onChange={e => setEditForm({...editForm, endDate: e.target.value})} className={inputStyle} />
                  </div>
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-2 eh-text-soft`}>End Time</label>
                    <input type="time" value={editForm.endTime || ''} onChange={e => setEditForm({...editForm, endTime: e.target.value})} className={inputStyle} />
                  </div>
                </div>
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-2 eh-text-soft`}>Location</label>
                  <input type="text" value={typeof editForm.location === 'object' ? editForm.location?.formattedAddress : (editForm.location || '')} onChange={e => setEditForm({...editForm, location: e.target.value})} className={inputStyle} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-2 eh-text-soft`}>Price (₦)</label>
                    <input type="number" value={editForm.price || 0} onChange={e => setEditForm({...editForm, price: e.target.value})} className={inputStyle} />
                  </div>
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-2 eh-text-soft`}>Capacity</label>
                    <input type="number" value={editForm.capacity || ''} onChange={e => setEditForm({...editForm, capacity: e.target.value})} className={inputStyle} placeholder="Unlimited" />
                  </div>
                </div>
                {Number(editForm.price) > 0 && (
                  <div className={`mt-4 p-4 rounded-2xl border border-line bg-surface-2`}>
                    <div className="flex items-center gap-2 mb-3">
                      <Landmark size={16} className="text-emerald-500" />
                      <h4 className={`text-xs font-bold uppercase tracking-wider eh-text`}>Payment Details</h4>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 eh-text-soft`}>Bank Name</label>
                        <input type="text" value={editForm.bankName || ''} onChange={e => setEditForm({...editForm, bankName: e.target.value})} className={inputStyle} placeholder="e.g., GTBank" />
                      </div>
                      <div>
                        <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 eh-text-soft`}>Account Number</label>
                        <input type="text" value={editForm.accountNumber || ''} onChange={e => setEditForm({...editForm, accountNumber: e.target.value})} className={inputStyle} placeholder="e.g., 0123456789" />
                      </div>
                      <div>
                        <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 eh-text-soft`}>Account Name</label>
                        <input type="text" value={editForm.accountName || ''} onChange={e => setEditForm({...editForm, accountName: e.target.value})} className={inputStyle} placeholder="e.g., John Doe" />
                      </div>
                    </div>
                  </div>
                )}

                <div className={`mt-4 rounded-2xl border p-4 border-line bg-surface-2`}>
                  <div className="mb-1 flex items-center gap-2">
                    <Ticket size={16} className="text-blue-500" />
                    <h4 className={`text-xs font-bold uppercase tracking-wider eh-text`}>Ticket Tiers</h4>
                  </div>
                  <p className={`mb-4 text-xs eh-text-muted`}>Optional. VIP/VVIP levels, each with its own price and colour.</p>

                  {(editForm.ticketTiers || []).length > 0 && (
                    <div className="space-y-3">
                      {(editForm.ticketTiers || []).map((tier, idx) => (
                        <div key={idx} className={`rounded-xl border p-3 border-line bg-surface`}>
                          <div className="mb-2 flex items-center gap-2">
                            {TIER_COLORS.map((c) => (
                              <button key={c} type="button" aria-label={`Set tier colour ${c}`} onClick={() => updateEditTier(idx, 'color', c)} style={{ background: c }} className={`h-5 w-5 rounded-full transition ${tier.color === c ? `ring-2 ring-blue-500 ring-offset-2 ring-offset-surface` : 'opacity-60 hover:opacity-100'}`} />
                            ))}
                            <button type="button" onClick={() => removeEditTier(idx)} aria-label="Remove tier" className="ml-auto grid h-7 w-7 place-items-center rounded-full text-slate-400 transition hover:bg-red-500/10 hover:text-red-500"><Trash2 size={14} /></button>
                          </div>
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                            <input value={tier.name || ''} onChange={(e) => updateEditTier(idx, 'name', e.target.value)} placeholder="Name (e.g. VIP)" className={inputStyle} />
                            <input type="number" value={tier.price ?? 0} onChange={(e) => updateEditTier(idx, 'price', e.target.value)} placeholder="Price (₦)" className={inputStyle} />
                            <input type="number" value={tier.capacity || ''} onChange={(e) => updateEditTier(idx, 'capacity', e.target.value)} placeholder="Capacity" className={inputStyle} />
                          </div>
                          <input value={tier.perks || ''} onChange={(e) => updateEditTier(idx, 'perks', e.target.value)} placeholder="Perks (optional)" className={`${inputStyle} mt-2`} />
                        </div>
                      ))}
                    </div>
                  )}

                  <button type="button" onClick={addEditTier} className={`mt-3 inline-flex items-center gap-2 rounded-xl border border-dashed px-3 py-2 text-xs font-bold transition border-line eh-text hover:border-brand`}>
                    <Plus size={14} /> Add tier
                  </button>
                </div>

                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => { setIsEditing(false); setEditingCoverImage(null); }} className={`flex-1 py-3.5 rounded-2xl font-bold transition-colors border border-line bg-surface-2 eh-text hover:bg-line`}>Cancel</button>
                  <button type="button" onClick={handleDeleteEvent} disabled={isSaving || !hasHappened} title={!hasHappened ? "Events can only be deleted after they have happened" : "Delete Event"} className={`px-6 py-3.5 rounded-2xl font-bold transition-colors bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed`}>Delete</button>
                  <button type="submit" disabled={isSaving} className="eh-btn eh-btn-primary flex-1 disabled:opacity-50">{isSaving ? 'Saving…' : 'Save'}</button>
                </div>
              </form>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Auth prompt for guests trying to register */}
      <AnimatePresence>
        {showAuthPrompt && (
          <div className="fixed inset-0 z-[102] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setShowAuthPrompt(false)}>
            <Motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="eh-surface w-full max-w-sm rounded-[1.75rem] p-8 text-center shadow-eh-lg"
            >
              <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft text-brand">
                <Users size={24} />
              </div>
              <h3 className="eh-display text-xl font-bold">Join to reserve your spot</h3>
              <p className="mt-2 text-sm eh-text-soft">Create a free account or sign in to register for this event. It only takes a minute.</p>
              <div className="mt-6 space-y-3">
                <button
                  onClick={() => navigate('/register', { state: { from: { pathname: location.pathname } } })}
                  className="eh-btn eh-btn-primary w-full"
                >
                  Create account
                </button>
                <button
                  onClick={() => navigate('/login', { state: { from: { pathname: location.pathname } } })}
                  className="eh-btn eh-btn-ghost w-full"
                >
                  I already have an account
                </button>
              </div>
              <button onClick={() => setShowAuthPrompt(false)} className="mt-4 text-xs font-semibold text-ink-muted transition-colors hover:text-ink-soft">
                Maybe later
              </button>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showEventDeleteConfirm && (
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <Motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-md p-6 rounded-[2rem] shadow-2xl border border-line bg-surface`}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 flex-shrink-0 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h2 className={`text-xl font-black eh-text`}>Delete Event</h2>
                  <p className={`text-sm mt-1 eh-text-soft`}>Are you sure? This action is permanent.</p>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowEventDeleteConfirm(false)} className={`flex-1 py-3.5 rounded-2xl font-bold transition-colors border border-line bg-surface-2 eh-text hover:bg-line`}>
                  Cancel
                </button>
                <button onClick={confirmDeleteEvent} disabled={isSaving} className="flex-1 py-3.5 rounded-2xl font-bold transition-colors bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/30 disabled:opacity-50">
                  {isSaving ? 'Deleting...' : 'Confirm Delete'}
                </button>
              </div>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>
    </Motion.main>
  );
};

export default EventDetails;
