import React, { useState, useContext, useEffect } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { MapPin, Globe, CalendarDays, Share2, Edit3, Heart, Plus, Camera, Ticket, CalendarCheck, Tag, LogOut, Trash2, X, AlertTriangle, Image as ImageIcon, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import sanitizeError from '../utils/errorMessages';
const LiveEventStatus = ({ event }) => {
  const [status, setStatus] = useState({ text: '', type: '' });

  useEffect(() => {
    const updateStatus = () => {
      const now = new Date().getTime();
      let startStr = event.date || new Date().toISOString();
      if (startStr.includes('T')) startStr = startStr.split('T')[0];
      const start = new Date(`${startStr}T${event.time || '00:00'}`).getTime();

      let endStr = event.endDate || startStr;
      if (endStr.includes('T')) endStr = endStr.split('T')[0];
      const end = new Date(`${endStr}T${event.endTime || '23:59'}`).getTime();

      if (now < start) {
        const diff = start - now;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);

        if (days > 0) setStatus({ text: `Starts in ${days}d ${hours}h`, type: 'upcoming' });
        else if (hours > 0) setStatus({ text: `Starts in ${hours}h ${mins}m`, type: 'upcoming' });
        else setStatus({ text: `Starts in ${mins}m ${secs}s`, type: 'urgent' });

        const fifteenKey = `notif_15m_${event._id || event.id}`;
        if (diff <= 15 * 60 * 1000 && diff > 0 && !localStorage.getItem(fifteenKey)) {
          if (window.Notification?.permission === 'granted') {
            new window.Notification("Event Starting Soon! ⏱️", { body: `${event.title} begins in 15 minutes!`, icon: event.coverImage || '/logo.png' });
          }
          localStorage.setItem(fifteenKey, 'true');
        }
      } else if (now >= start && now <= end) {
        setStatus({ text: 'LIVE 🔴', type: 'ongoing' });

        const liveKey = `notif_live_${event._id || event.id}`;
        if (!localStorage.getItem(liveKey)) {
          if (now - start < 15 * 60 * 1000 && window.Notification?.permission === 'granted') {
            new window.Notification("Event is LIVE! 🔴", { body: `${event.title} has officially started!`, icon: event.coverImage || '/logo.png' });
          }
          localStorage.setItem(liveKey, 'true');
        }
      } else {
        setStatus({ text: 'ENDED', type: 'ended' });
      }
    };

    updateStatus();
    const interval = setInterval(updateStatus, 1000);
    return () => clearInterval(interval);
  }, [event]);

  if (!status.text) return null;

  const baseClasses = "absolute bottom-3 right-3 px-3 py-1.5 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-wider border shadow-lg z-10 flex items-center gap-1.5 transition-colors";

  if (status.type === 'ended') return <div className={`${baseClasses} bg-slate-500/90 text-white border-slate-400`}>{status.text}</div>;
  if (status.type === 'ongoing') return <div className={`${baseClasses} bg-red-500/90 text-white border-red-400 animate-pulse`}>{status.text}</div>;
  if (status.type === 'urgent') return <div className={`${baseClasses} bg-amber-500/90 text-white border-amber-400`}>{status.text}</div>;
  return <div className={`${baseClasses} bg-emerald-500/90 text-white border-emerald-400`}>{status.text}</div>;
};

const Profile = () => {
  const navigate = useNavigate();
  const { user, setUser, logout, loading } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [page, setPage] = useState(1);
  const [interests, setInterests] = useState(user?.interests || []);
  const [newInterest, setNewInterest] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [events, setEvents] = useState([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [editingEvent, setEditingEvent] = useState(null);
  const [editingCoverImage, setEditingCoverImage] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showEventDeleteConfirm, setShowEventDeleteConfirm] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' });
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: '',
    username: '',
    phone: '',
    bio: '',
    location: '',
    website: ''
  });

  const glassStyle = darkMode
    ? 'bg-slate-800 border-slate-700'
    : 'bg-white border-gray-200';

  useEffect(() => {

    if (!loading && !user) {
      navigate('/login', { replace: true });
    }
  }, [user, loading, navigate]);

  useEffect(() => {

    if (user?.interests?.length) {
      setInterests(user.interests);
    }
  }, [user]);

  useEffect(() => {
    const fetchUserEvents = async () => {
      if (!user) return;
      try {
        let myEvents = [];
        try {
          const myRes = await api.get('/events/me');
          myEvents = myRes.data?.data || [];
        } catch (e) {
          console.warn("Failed to fetch /events/me, will use public events only:", e.message);
        }

        const seenIds = new Set(myEvents.map(e => String(e._id || e.id)));
        let allPublicEvents = [];
        try {
          const allRes = await api.get('/events?limit=1000');
          allPublicEvents = (allRes.data?.data || []).filter(e => !seenIds.has(String(e._id || e.id)));
        } catch (e) {
          console.warn("Failed to fetch public events:", e.message);
        }

        const combined = [...myEvents, ...allPublicEvents];
        const deduped = [];
        const dedupIds = new Set();
        combined.forEach(e => {
          const id = String(e._id || e.id);
          if (!dedupIds.has(id)) {
            dedupIds.add(id);
            deduped.push(e);
          }
        });

        setEvents(deduped);
      } catch (error) {
        console.error("Failed to fetch events:", error);
      } finally {
        setIsLoadingEvents(false);
      }
    };
    fetchUserEvents();
  }, [user]);

  const handleAddInterest = (e) => {
    if (e.key === 'Enter' || e.type === 'click') {
      if (newInterest.trim() && !interests.includes(newInterest.trim())) {
        setInterests([...interests, newInterest.trim()]);
        setNewInterest('');
      }
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'EventHub Profile', url });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      navigator.clipboard.writeText(url);
      alert('Profile link copied to clipboard!');
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Profile picture must be less than 5MB.");
      return;
    }

    setProfileImage(URL.createObjectURL(file));

    const formData = new FormData();
    formData.append('profilePicture', file);

    try {
      const res = await api.post('/users/profile-picture', formData);

      if (setUser) {
        setUser(prev => ({ ...prev, profilePicture: res.data?.profilePicture || res.data?.data?.profilePicture || URL.createObjectURL(file) }));
      }
    } catch (error) {
      console.error("Failed to upload image:", error);
      alert(sanitizeError(error, "Failed to permanently save the profile picture."));
    }
  };

  const handleCoverUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Cover photo must be less than 5MB.");
      return;
    }

    const formData = new FormData();
    formData.append('coverPhoto', file);

    try {
      const res = await api.post('/users/cover-photo', formData);

      if (setUser) {
        setUser(prev => ({ ...prev, coverPhoto: res.data?.coverPhoto || res.data?.data?.coverPhoto || URL.createObjectURL(file) }));
      }
    } catch (error) {
      console.error("Failed to upload cover photo:", error);
      alert(sanitizeError(error, "Failed to permanently save the cover photo."));
    }
  };

  const handleRemoveProfilePicture = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!window.confirm("Are you sure you want to remove your profile picture?")) return;
    try {
      await api.delete('/users/profile-picture');
      setProfileImage(null);
      if (setUser) setUser(prev => ({ ...prev, profilePicture: '' }));
    } catch (error) {
      console.error("Failed to remove profile picture:", error);
      alert("Failed to remove profile picture.");
    }
  };

  const handleRemoveCoverPhoto = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!window.confirm("Are you sure you want to remove your cover photo?")) return;
    try {
      await api.delete('/users/cover-photo');
      if (setUser) setUser(prev => ({ ...prev, coverPhoto: '' }));
    } catch (error) {
      console.error("Failed to remove cover photo:", error);
      alert("Failed to remove cover photo.");
    }
  };

  const handleEditProfile = () => {
    if (isEditingProfile) {

      handleSaveProfile();
    } else {

      setEditForm({
        fullName: user?.fullName || '',
        username: user?.username || '',
        phone: user?.phone || '',
        bio: user?.bio || '',
        location: user?.location || '',
        website: user?.website || ''
      });
      setIsEditingProfile(true);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setIsSaving(true);
      const res = await api.patch('/users/me', editForm);

      if (setUser) {
        setUser(prev => ({ ...prev, ...res.data.data }));
      }

      setIsEditingProfile(false);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error("Failed to update profile:", error);
      alert(sanitizeError(error, "Failed to update profile."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingProfile(false);
  };

  const handleLogout = async () => {
    try {
      if (logout) await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await api.delete('/users/me');
      if (logout) await logout();
      else {
        localStorage.removeItem('token');
        await api.get('/auth/logout');
      }
      setShowDeleteModal(false);
      setDeletePassword('');
      navigate('/login', { replace: true });
    } catch (error) {
      const message = error?.response?.data?.error || "Failed to deactivate account. Please check your connection.";
      alert(message);
    }
  };

  const handleUpdatePasswordSubmit = async (e) => {
    e.preventDefault();
    setIsUpdatingPassword(true);
    try {
      await api.put('/auth/updatepassword', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      alert('Password updated successfully!');
      setShowPasswordModal(false);
      setPasswordForm({ currentPassword: '', newPassword: '' });
    } catch (error) {
      console.error("Failed to update password:", error);
      alert(sanitizeError(error, "Failed to update password."));
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleEditEventSubmit = async (e) => {
    e.preventDefault();
    if (editingEvent.endDate && new Date(editingEvent.endDate) < new Date(editingEvent.date)) {
      alert("End Date cannot be before Start Date.");
      return;
    }
    setIsSaving(true);
    try {
      let payload;
      let config = {};

      const dataToSubmit = { ...editingEvent };
      delete dataToSubmit.coverImage;

      if (editingCoverImage) {
        const formData = new FormData();
        const safeKeys = ['title', 'description', 'date', 'time', 'endDate', 'endTime', 'price', 'capacity', 'category', 'status', 'isPublic', 'approvalRequired'];
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
        const safeKeys = ['title', 'description', 'date', 'time', 'endDate', 'endTime', 'price', 'capacity', 'category', 'status', 'isPublic', 'approvalRequired', 'ticketTiers'];
        safeKeys.forEach(key => {
          if (dataToSubmit[key] !== undefined && dataToSubmit[key] !== null) payload[key] = dataToSubmit[key];
        });
        if (dataToSubmit.location) {
          payload.location = typeof dataToSubmit.location === 'object' ? JSON.stringify(dataToSubmit.location) : dataToSubmit.location;
        }
      }

      const res = await api.put(`/events/${editingEvent._id || editingEvent.id}`, payload, config);

      setEvents(prev => prev.map(ev => (ev._id || ev.id) === (editingEvent._id || editingEvent.id) ? { ...ev, ...res.data.data } : ev));
      setEditingEvent(null);
      setEditingCoverImage(null);
    } catch (error) {
      console.error("Edit failed", error);
      alert("Failed to update event.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEvent = () => {
    setShowEventDeleteConfirm(true);
  };

  const confirmDeleteEvent = async () => {
    if (!editingEvent) return;
    setIsSaving(true);
    try {
      await api.delete(`/events/${editingEvent._id || editingEvent.id}`);
      setEvents(prev => prev.filter(ev => (ev._id || ev.id) !== (editingEvent._id || editingEvent.id)));
      setShowEventDeleteConfirm(false);
      setEditingEvent(null);
      setEditingCoverImage(null);
    } catch (error) {
      console.error("Delete failed", error);
      alert("Failed to delete event.");
    } finally {
      setIsSaving(false);
    }
  };

  const inputStyle = "w-full rounded-2xl border border-line bg-surface-2 px-4 py-3 text-sm font-medium eh-text placeholder:text-ink-muted transition focus:border-brand focus:outline-none focus:[box-shadow:var(--eh-ring)]";

  const currentUserId = String(user?._id || user?.id || '');
  const isAttendee = (e) => Array.isArray(e.attendees) && e.attendees.some(att => {
    const attId = String(att?.user?._id || att?.user || att?._id || att);
    return attId === currentUserId;
  });
  const createdEvents = events.filter(e => {
    const creatorId = String(e.creator?._id || e.creator?._id?.toString?.() || e.creator);
    const organizerId = String(e.organizer?._id || e.organizer?._id?.toString?.() || e.organizer);
    return creatorId === currentUserId || organizerId === currentUserId;
  });
  const upcomingEvents = events.filter(e => isAttendee(e) && new Date(e.date) >= new Date());
  const attendedEvents = events.filter(e => isAttendee(e) && new Date(e.date) < new Date());
  const likedEvents = events.filter(e => Array.isArray(e.likes) && e.likes.some(id => String(id?._id || id) === currentUserId));

  const tabs = [
    { id: 'upcoming', label: 'Upcoming', count: isLoadingEvents ? 3 : upcomingEvents.length, icon: CalendarCheck },
    { id: 'created', label: 'Created', count: isLoadingEvents ? 4 : createdEvents.length, icon: Ticket },
    { id: 'attended', label: 'Attended', count: isLoadingEvents ? 12 : attendedEvents.length, icon: MapPin },
    { id: 'liked', label: 'Liked', count: isLoadingEvents ? 7 : likedEvents.length, icon: Heart }
  ];

  const displayedEvents = activeTab === 'created' ? createdEvents
    : activeTab === 'upcoming' ? upcomingEvents
    : activeTab === 'attended' ? attendedEvents
    : likedEvents;

  const itemsPerPage = 6;
  const totalPages = Math.ceil(displayedEvents.length / itemsPerPage);
  const paginatedEvents = displayedEvents.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const hasHappened = (editingEvent?.endDate || editingEvent?.date) ? new Date(editingEvent.endDate || editingEvent.date) < new Date() : true;

  if (loading || !user) {
    return (
      <Motion.main
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
        className="eh-page-bg min-h-screen pt-24 pb-24"
      >
        <div className="mx-auto w-full max-w-5xl px-5 sm:px-8">
          <div className="eh-surface mb-8 animate-pulse overflow-hidden rounded-[2rem]">
            <div className="h-44 bg-surface-2 sm:h-56" />
            <div className="relative px-5 pb-8 sm:px-8">
              <div className="-mt-14 mb-6 h-28 w-28 rounded-[1.75rem] border-4 border-surface bg-line sm:h-32 sm:w-32" />
              <div className="mb-6 flex flex-wrap gap-2.5">
                <div className="h-11 w-32 rounded-2xl bg-surface-2" />
                <div className="h-11 w-24 rounded-2xl bg-surface-2" />
                <div className="hidden h-11 w-40 rounded-2xl bg-surface-2 sm:block" />
              </div>
              <div className="max-w-2xl space-y-4">
                <div className="h-8 w-48 rounded-lg bg-surface-2" />
                <div className="h-4 w-32 rounded-lg bg-surface-2" />
                <div className="mt-4 h-4 w-full rounded-lg bg-surface-2" />
                <div className="h-4 w-2/3 rounded-lg bg-surface-2" />
              </div>
            </div>
          </div>
          <div className="eh-surface h-[400px] animate-pulse rounded-[2rem]" />
        </div>
      </Motion.main>
    );
  }

  return (
    <Motion.main
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="eh-page-bg min-h-screen pt-24 pb-24"
    >
      <div className={`rounded-[2.5rem] overflow-hidden border mb-8 ${glassStyle}`}>
        <div className="h-48 bg-blue-600 relative group overflow-hidden transition-all duration-300">
          {user?.coverPhoto && <img src={user.coverPhoto} alt="Cover" className="absolute inset-0 w-full h-full object-cover" />}
          <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer backdrop-blur-sm z-10">
            <Camera className="text-white" size={32} />
            <input type="file" className="hidden" accept="image

}
      <AnimatePresence>
        {showPasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <Motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="eh-surface w-full max-w-md rounded-[2rem] p-6 shadow-eh-lg"
            >
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-brand-soft p-2 text-brand">
                    <Lock size={24} />
                  </div>
                  <h2 className="eh-display text-xl font-bold eh-text">Change password</h2>
                </div>
                <button onClick={() => setShowPasswordModal(false)} className="rounded-full p-2 eh-text-soft transition-colors hover:bg-surface-2">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleUpdatePasswordSubmit}>
                <div className="mb-8 space-y-4 text-left">
                  <div>
                    <label className="eh-eyebrow mb-2 block">Current password</label>
                    <input type="password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})} required className={inputStyle} />
                  </div>
                  <div>
                    <label className="eh-eyebrow mb-2 block">New password</label>
                    <input type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})} required minLength={8} className={inputStyle} />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowPasswordModal(false)} className="eh-btn eh-btn-ghost flex-1">
                    Cancel
                  </button>
                  <button
                    type="submit" disabled={isUpdatingPassword || !passwordForm.currentPassword || !passwordForm.newPassword}
                    className="eh-btn eh-btn-primary flex-1 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isUpdatingPassword ? 'Updating…' : 'Update password'}
                  </button>
                </div>
              </form>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>

      {}
      <AnimatePresence>
        {editingEvent && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <Motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="eh-surface max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[2rem] p-6 shadow-eh-lg"
            >
              <div className="mb-6 flex items-center justify-between">
                <h2 className="eh-display text-xl font-bold eh-text">Quick edit event</h2>
                <button onClick={() => { setEditingEvent(null); setEditingCoverImage(null); }} className="rounded-full p-2 eh-text-soft transition-colors hover:bg-surface-2">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleEditEventSubmit} className="space-y-4 text-left">
                <label className={`block border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors relative overflow-hidden group ${darkMode ? 'border-slate-600 hover:border-blue-500 bg-slate-900/30' : 'border-slate-300 hover:border-blue-500 bg-slate-50'}`}>
                  <input type="file" accept="image

}
      <AnimatePresence>
        {showEventDeleteConfirm && (
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <Motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="eh-surface w-full max-w-md rounded-[2rem] p-6 shadow-eh-lg"
            >
              <div className="mb-4 flex items-center gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-500">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h2 className="eh-display text-xl font-bold eh-text">Delete event</h2>
                  <p className="mt-1 text-sm eh-text-soft">Are you sure? This action is permanent.</p>
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button onClick={() => setShowEventDeleteConfirm(false)} className="eh-btn eh-btn-ghost flex-1">
                  Cancel
                </button>
                <button onClick={confirmDeleteEvent} disabled={isSaving} className="eh-btn flex-1 bg-red-600 font-bold text-white shadow-lg shadow-red-600/30 transition-colors hover:bg-red-700 disabled:opacity-50">
                  {isSaving ? 'Deleting…' : 'Confirm delete'}
                </button>
              </div>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>
    </Motion.main>
  );
};

export default Profile;
