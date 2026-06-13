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
        
        // 15 Minute Warning System Notification
        const fifteenKey = `notif_15m_${event._id || event.id}`;
        if (diff <= 15 * 60 * 1000 && diff > 0 && !localStorage.getItem(fifteenKey)) {
          if (window.Notification?.permission === 'granted') {
            new window.Notification("Event Starting Soon! ⏱️", { body: `${event.title} begins in 15 minutes!`, icon: event.coverImage || '/logo.png' });
          }
          localStorage.setItem(fifteenKey, 'true');
        }
      } else if (now >= start && now <= end) {
        setStatus({ text: 'LIVE 🔴', type: 'ongoing' });
        
        // Live System Notification
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

  useEffect(() => {
    // Redirect to login if user visits this page (e.g. via back button) while logged out
    if (!loading && !user) {
      navigate('/login', { replace: true });
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    // Sync interests if the user data loads in dynamically
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

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      alert("Profile picture must be less than 5MB.");
      return;
    }

    // Keep the immediate local preview
    setProfileImage(URL.createObjectURL(file));

    const formData = new FormData();
    formData.append('profilePicture', file);

    try {
      const res = await api.post('/users/profile-picture', formData);
      
      // Update AuthContext user object with the new data from the backend
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

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      alert("Cover photo must be less than 5MB.");
      return;
    }

    const formData = new FormData();
    formData.append('coverPhoto', file);

    try {
      const res = await api.post('/users/cover-photo', formData);
      
      // Update AuthContext user object with the new cover photo
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
      // Save changes
      handleSaveProfile();
    } else {
      // Enter edit mode
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
      <div className="mx-auto w-full max-w-5xl px-5 sm:px-8">
        <section className="eh-surface mb-8 overflow-hidden rounded-[2rem]">
          <div className="group relative h-44 overflow-hidden bg-brand sm:h-56">
            {user?.coverPhoto && <img src={user.coverPhoto} alt="Cover" className="absolute inset-0 h-full w-full object-cover" />}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_color-mix(in_oklch,_var(--eh-accent)_45%,_transparent),_transparent_45%)]" />
            <label className="absolute inset-0 z-10 flex cursor-pointer items-center justify-center bg-black/40 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
              <Camera className="text-white" size={30} />
              <input type="file" className="hidden" accept="image/*" onChange={handleCoverUpload} />
            </label>
            {user?.coverPhoto && (
              <button
                onClick={handleRemoveCoverPhoto}
                className="absolute right-4 top-4 z-20 rounded-full bg-red-500/90 p-2 text-white opacity-0 shadow-md transition-opacity hover:bg-red-600 group-hover:opacity-100"
                title="Remove cover photo"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>

          <div className="relative px-5 pb-8 sm:px-8">
            <div className="-mt-14 mb-6 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between sm:-mt-16">
              <div className="group relative w-28 shrink-0 rounded-[1.75rem] shadow-eh-lg ring-4 ring-surface sm:w-32">
                <div className="aspect-square w-full overflow-hidden rounded-[1.75rem] border-4 border-surface bg-surface-2">
                  <img src={profileImage || user?.profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.fullName || 'EventHub'}`} alt="Profile" className="h-full w-full object-cover" />
                </div>
                <label className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-[1.75rem] bg-black/40 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                  <Camera className="text-white" size={26} />
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                </label>
                {(profileImage || user?.profilePicture) && (
                  <button
                    onClick={handleRemoveProfilePicture}
                    className="absolute -right-2 -top-2 z-20 rounded-full bg-red-500 p-2 text-white opacity-0 shadow-md transition-opacity hover:bg-red-600 group-hover:opacity-100"
                    title="Remove profile picture"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-2.5 sm:justify-end">
                <button className="eh-btn eh-btn-primary" onClick={handleEditProfile}>
                  <Edit3 size={17} /> {isEditingProfile ? 'Save profile' : 'Edit profile'}
                </button>
                <button className="eh-btn eh-btn-ghost" onClick={handleShare}>
                  <Share2 size={17} /> Share
                </button>
                <button className="eh-btn eh-btn-ghost" onClick={() => setShowPasswordModal(true)}>
                  <Lock size={17} /> Password
                </button>
                <button className="eh-btn eh-btn-ghost" onClick={handleLogout}>
                  <LogOut size={17} /> Logout
                </button>
              </div>
            </div>

            <div className="max-w-2xl">
              {isEditingProfile ? (
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-bold eh-text">Full name</label>
                    <input type="text" value={editForm.fullName} onChange={(e) => setEditForm(prev => ({ ...prev, fullName: e.target.value }))} className={inputStyle} />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-bold eh-text">Username</label>
                    <input type="text" value={editForm.username} onChange={(e) => setEditForm(prev => ({ ...prev, username: e.target.value }))} className={inputStyle} />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-bold eh-text">Phone</label>
                    <input type="tel" value={editForm.phone} onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))} className={inputStyle} />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-bold eh-text">Bio</label>
                    <textarea value={editForm.bio} onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))} rows={3} className={inputStyle} />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-bold eh-text">Location</label>
                    <input type="text" value={editForm.location} onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))} className={inputStyle} />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-bold eh-text">Website</label>
                    <input type="url" value={editForm.website} onChange={(e) => setEditForm(prev => ({ ...prev, website: e.target.value }))} className={inputStyle} />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button onClick={handleSaveProfile} disabled={isSaving} className="eh-btn eh-btn-primary flex-1 disabled:opacity-50">
                      {isSaving ? 'Saving…' : 'Save changes'}
                    </button>
                    <button onClick={handleCancelEdit} className="eh-btn eh-btn-ghost flex-1">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="eh-display text-[clamp(1.9rem,5vw,2.6rem)] font-extrabold leading-[1.05]">{user?.fullName}</h1>
                  <p className="mt-1 text-sm font-bold eh-text-brand">@{user?.username || user?.fullName?.split(' ')[0]?.toLowerCase()}</p>
                  <p className="mt-4 max-w-[60ch] text-sm font-medium leading-relaxed eh-text-soft">
                    {user?.bio || 'No bio provided yet.'}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold eh-text-soft">
                    {user?.location && <span className="flex items-center gap-2"><MapPin size={16} className="text-brand" /> {user.location}</span>}
                    {user?.website && <span className="flex items-center gap-2"><Globe size={16} className="text-brand" /> {user.website}</span>}
                    <span className="flex items-center gap-2"><CalendarDays size={16} className="text-brand" /> Joined {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="border-t border-line bg-surface-2/60 px-5 pb-7 pt-6 sm:px-8">
            <h3 className="eh-eyebrow mb-4">Interests</h3>
            <div className="flex flex-wrap items-center gap-2.5">
              {interests.map(interest => (
                <span key={interest} className="eh-chip">
                  <Tag size={13} /> {interest}
                </span>
              ))}
              <div className="flex items-center gap-1 rounded-full border border-line bg-surface px-2 py-1 transition-colors focus-within:border-brand">
                <input
                  type="text"
                  value={newInterest}
                  onChange={(e) => setNewInterest(e.target.value)}
                  onKeyDown={handleAddInterest}
                  placeholder="Add interest…"
                  className="w-28 border-none bg-transparent px-2 py-1 text-sm font-semibold eh-text placeholder:text-ink-muted focus:outline-none"
                />
                <button onClick={handleAddInterest} aria-label="Add interest" className="grid h-7 w-7 place-items-center rounded-full bg-brand-soft text-brand transition-colors hover:bg-brand hover:text-white">
                  <Plus size={15} />
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="eh-surface overflow-hidden rounded-[2rem]">
          <div className="no-scrollbar relative mx-4 mt-4 flex gap-1 overflow-x-auto rounded-[1.5rem] bg-surface-2 p-1.5 sm:mx-6 sm:mt-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setPage(1); }}
                  className={`relative z-10 flex min-w-[112px] flex-1 items-center justify-center gap-2 rounded-[1.1rem] px-3 py-3 text-sm font-bold transition-colors ${
                    isActive ? 'text-white' : 'eh-text-soft hover:text-brand'
                  }`}
                >
                  {isActive && (
                    <Motion.div
                      layoutId="profileTabBubble"
                      className="absolute inset-0 -z-10 rounded-[1.1rem] bg-brand shadow-eh-sm"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <Icon size={16} />
                  <span>{tab.label}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${isActive ? 'bg-white/20' : 'bg-line'}`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-3 lg:p-8">
            <AnimatePresence mode="popLayout">
              {isLoadingEvents ? (
                <div className="col-span-full grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {[...Array(3)].map((_, idx) => (
                    <div key={idx} className="animate-pulse overflow-hidden rounded-[1.75rem] border border-line bg-surface-2">
                      <div className="aspect-[4/3] bg-line" />
                      <div className="space-y-3 p-4">
                        <div className="h-5 w-3/4 rounded bg-line" />
                        <div className="h-4 w-1/2 rounded bg-line" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : displayedEvents.length > 0 ? (
                paginatedEvents.map((event, idx) => (
                  <Motion.div
                    key={`${activeTab}-${event._id || event.id}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2, delay: idx * 0.05 }}
                    onClick={() => navigate(`/event-details/${event._id || event.id}`)}
                    className="eh-surface group flex cursor-pointer flex-col overflow-hidden rounded-[1.75rem] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-eh-lg"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-brand">
                      {event.coverImage && <img src={event.coverImage} alt={event.title} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                      <div className="absolute left-3 top-3 rounded-full border border-white/20 bg-black/30 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md">
                        {event.category || 'Event'}
                      </div>
                      <LiveEventStatus event={event} />
                      {activeTab === 'created' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingEvent(event); }}
                          aria-label="Edit event"
                          className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full border border-white/20 bg-black/30 text-white backdrop-blur-md transition-colors hover:bg-brand"
                        >
                          <Edit3 size={15} />
                        </button>
                      )}
                      {event.status === 'draft' && (
                        <div className="absolute left-3 top-12 rounded-full bg-accent px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[oklch(0.2_0.03_40)] shadow-sm">
                          Draft
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col p-4">
                      <h3 className="eh-display mb-2 truncate text-base font-bold leading-tight transition-colors group-hover:text-brand">{event.title}</h3>
                      <div className="mt-auto flex flex-col gap-1.5 text-xs font-semibold eh-text-soft">
                        <span className="flex items-center gap-1.5"><CalendarDays size={14} className="shrink-0 text-brand" /> {event.date ? new Date(event.date).toLocaleDateString() : 'TBA'}</span>
                        <span className="flex items-center gap-1.5"><MapPin size={14} className="shrink-0 text-brand" /> <span className="truncate">{event.location?.formattedAddress || event.location || 'Location TBA'}</span></span>
                      </div>
                    </div>
                  </Motion.div>
                ))
              ) : (
                <Motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="col-span-full flex flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-line bg-surface-2 px-6 py-16 text-center"
                >
                  <div className="mb-6 grid h-20 w-20 place-items-center rounded-full bg-surface text-ink-muted shadow-eh-sm">
                    <CalendarDays size={32} />
                  </div>
                  <h3 className="eh-display text-xl font-bold">Nothing to see here</h3>
                  <p className="mb-8 mt-2 max-w-sm text-sm eh-text-soft">
                    {activeTab === 'created' ? "You haven't created any events yet. Host your first experience today!"
                      : activeTab === 'upcoming' ? "You don't have any upcoming events. Discover what's happening near you."
                      : activeTab === 'attended' ? "You haven't attended any past events yet."
                      : "You haven't liked any events yet."}
                  </p>
                  <button
                    onClick={() => navigate(activeTab === 'created' ? '/create-event' : '/events')}
                    className="eh-btn eh-btn-primary"
                  >
                    {activeTab === 'created' ? 'Create event' : 'Discover events'}
                  </button>
                </Motion.div>
              )}
            </AnimatePresence>

            {totalPages > 1 && (
              <div className="col-span-full mt-4 flex items-center justify-center gap-4">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="eh-btn eh-btn-ghost px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm font-bold eh-text-soft">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="eh-btn eh-btn-ghost px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </section>

        <div className="mt-6 flex justify-center">
          <button
            onClick={() => setShowDeleteModal(true)}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-red-500 transition-colors hover:bg-red-500/10"
          >
            <Trash2 size={15} /> Delete account
          </button>
        </div>
      </div>
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <Motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="eh-surface w-full max-w-md rounded-[2rem] p-6 shadow-eh-lg"
            >
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3 text-red-500">
                  <div className="rounded-xl bg-red-500/10 p-2">
                    <AlertTriangle size={24} />
                  </div>
                  <h2 className="eh-display text-xl font-bold eh-text">Delete account</h2>
                </div>
                <button onClick={() => setShowDeleteModal(false)} className="rounded-full p-2 eh-text-soft transition-colors hover:bg-surface-2">
                  <X size={20} />
                </button>
              </div>
              <p className="mb-6 text-sm eh-text-soft">
                Are you sure you want to delete your account? This action is permanent and cannot be undone. All your created events and tickets will be lost.
              </p>
              <div className="mb-8 space-y-2 text-left">
                <label className="text-sm font-bold eh-text">Confirm password</label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Enter your password to confirm"
                  className="w-full rounded-2xl border border-line bg-surface-2 px-4 py-3.5 text-sm font-medium eh-text placeholder:text-ink-muted transition focus:border-red-500 focus:outline-none focus:[box-shadow:0_0_0_3px_color-mix(in_oklch,red_25%,transparent)]"
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteModal(false)} className="eh-btn eh-btn-ghost flex-1">
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteAccount} 
                  disabled={!deletePassword}
                  className="flex-1 py-3.5 rounded-2xl font-bold transition-colors bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/30 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed"
                >
                  Delete Account
                </button>
              </div>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Change Password Modal */}
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
      
      {/* Quick Edit Modal */}
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
                <label className="group relative block cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed border-line bg-surface-2 p-6 text-center transition-colors hover:border-brand">
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                    const file = e.target.files[0];
                    if (file && file.size > 5 * 1024 * 1024) {
                      alert("Cover image must be less than 5MB.");
                      return;
                    }
                    setEditingCoverImage(file);
                  }} />
                  <img src={editingCoverImage ? URL.createObjectURL(editingCoverImage) : (editingEvent.coverImage || '/placeholder.png')} alt="Cover Preview" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="relative z-10 bg-black/40 backdrop-blur-sm p-2 rounded-lg inline-block">
                    <ImageIcon size={24} className="text-white mx-auto mb-2" />
                    <p className="text-xs font-bold text-white">Click to change cover image</p>
                  </div>
                </label>
                <div>
                  <label className="eh-eyebrow mb-2 block">Event Title</label>
                  <input type="text" value={editingEvent.title || ''} onChange={e => setEditingEvent({...editingEvent, title: e.target.value})} className={inputStyle} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="eh-eyebrow mb-2 block">Start Date</label>
                    <input type="date" value={editingEvent.date ? editingEvent.date.substring(0, 10) : ''} onChange={e => setEditingEvent({...editingEvent, date: e.target.value})} className={inputStyle} required />
                  </div>
                  <div>
                    <label className="eh-eyebrow mb-2 block">Start Time</label>
                    <input type="time" value={editingEvent.time || ''} onChange={e => setEditingEvent({...editingEvent, time: e.target.value})} className={inputStyle} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="eh-eyebrow mb-2 block">End Date</label>
                    <input type="date" value={editingEvent.endDate ? editingEvent.endDate.substring(0, 10) : ''} onChange={e => setEditingEvent({...editingEvent, endDate: e.target.value})} className={inputStyle} />
                  </div>
                  <div>
                    <label className="eh-eyebrow mb-2 block">End Time</label>
                    <input type="time" value={editingEvent.endTime || ''} onChange={e => setEditingEvent({...editingEvent, endTime: e.target.value})} className={inputStyle} />
                  </div>
                </div>
                <div>
                  <label className="eh-eyebrow mb-2 block">Location</label>
                  <input type="text" value={typeof editingEvent.location === 'object' ? editingEvent.location?.formattedAddress : (editingEvent.location || '')} onChange={e => setEditingEvent({...editingEvent, location: e.target.value})} className={inputStyle} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="eh-eyebrow mb-2 block">Price (₦)</label>
                    <input type="number" value={editingEvent.price || 0} onChange={e => setEditingEvent({...editingEvent, price: e.target.value})} className={inputStyle} />
                  </div>
                  <div>
                    <label className="eh-eyebrow mb-2 block">Capacity</label>
                    <input type="number" value={editingEvent.capacity || ''} onChange={e => setEditingEvent({...editingEvent, capacity: e.target.value})} className={inputStyle} placeholder="Unlimited" />
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => { setEditingEvent(null); setEditingCoverImage(null); }} className="eh-btn eh-btn-ghost flex-1">
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteEvent}
                    disabled={isSaving || (!hasHappened && editingEvent?.status !== 'draft')}
                    title={(!hasHappened && editingEvent?.status !== 'draft') ? "Published events can only be deleted after they have happened" : "Delete event"}
                    className="eh-btn bg-red-500/10 px-6 font-bold text-red-500 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Delete
                  </button>
                  {editingEvent?.status === 'draft' && (
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={(e) => { editingEvent.status = 'published'; handleEditEventSubmit(e); }}
                      className="eh-btn flex-1 bg-emerald-600 font-bold text-white shadow-lg shadow-emerald-600/30 transition-colors hover:bg-emerald-700 disabled:opacity-50"
                    >
                      Publish
                    </button>
                  )}
                  <button type="submit" disabled={isSaving} className="eh-btn eh-btn-primary flex-1 disabled:opacity-50">
                    {isSaving ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
              </form>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Event Confirmation Modal */}
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
