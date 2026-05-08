import React, { useState, useContext, useEffect } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { MapPin, Globe, CalendarDays, Share2, Edit3, Heart, Plus, Camera, Ticket, CalendarCheck, Tag, LogOut, Trash2, X, AlertTriangle, Image as ImageIcon, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';

const Profile = ({ darkMode }) => {
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
      try {
        const [allRes, myRes] = await Promise.all([
          api.get('/events?limit=1000'),
          api.get('/events/my-events').catch(() => ({ data: { data: [] } }))
        ]);
        
        const allEvents = allRes.data?.data || [];
        const myEvents = myRes.data?.data || [];
        const merged = [...allEvents];
        
        myEvents.forEach(myEv => {
          if (!merged.find(e => (e._id || e.id) === (myEv._id || myEv.id))) {
            merged.push(myEv);
          }
        });
        
        setEvents(merged);
      } catch (error) {
        console.error("Failed to fetch events:", error);
      } finally {
        setIsLoadingEvents(false);
      }
    };
    fetchUserEvents();
  }, []);

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
      alert(error.response?.data?.error || "Failed to permanently save the profile picture.");
    }
  };

  const handleCoverUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

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
      alert(error.response?.data?.error || "Failed to permanently save the cover photo.");
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
      alert(error.response?.data?.error || "Failed to update profile.");
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
      else await api.get('/auth/logout'); 
      setShowDeleteModal(false);
      setDeletePassword('');
      navigate('/login', { replace: true });
    } catch (error) {
      alert("Failed to deactivate account. Please check your connection.");
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
      alert(error.response?.data?.error || "Failed to update password.");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleEditEventSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      let payload;
      let config = {};

      const dataToSubmit = { ...editingEvent };
      delete dataToSubmit.coverImage;

      if (editingCoverImage) {
        const formData = new FormData();
        const safeKeys = ['title', 'description', 'date', 'time', 'price', 'capacity', 'category', 'status', 'isPublic', 'approvalRequired'];
        safeKeys.forEach(key => {
          if (dataToSubmit[key] !== undefined && dataToSubmit[key] !== null) formData.append(key, dataToSubmit[key]);
        });
        if (dataToSubmit.location) {
          formData.append('location', typeof dataToSubmit.location === 'object' ? JSON.stringify(dataToSubmit.location) : dataToSubmit.location);
        }
        formData.append('coverImage', editingCoverImage);
        payload = formData;
      } else {
        payload = {};
        const safeKeys = ['title', 'description', 'date', 'time', 'price', 'capacity', 'category', 'status', 'isPublic', 'approvalRequired'];
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

  const inputStyle = `w-full px-5 py-3.5 rounded-2xl text-sm font-medium border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${darkMode ? 'bg-slate-950/50 border-slate-700 focus:border-blue-500 focus:bg-slate-900 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 focus:border-blue-500 focus:bg-white text-slate-900 placeholder-slate-400'}`;

  const currentUserId = String(user?._id || user?.id || '');
  const isAttendee = (e) => Array.isArray(e.attendees) && e.attendees.some(att => String(att?.user?._id || att?.user || att?._id || att) === currentUserId);
  const createdEvents = events.filter(e => String(e.creator?._id || e.creator) === currentUserId || String(e.organizer?._id || e.organizer) === currentUserId);
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

  const hasHappened = editingEvent?.date ? new Date(editingEvent.date) < new Date() : true;

  if (loading || !user) {
    return (
      <Motion.main 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
        className="pt-24 pb-20 px-4 md:px-8 max-w-5xl mx-auto"
      >
        <div className={`rounded-[2.5rem] overflow-hidden border mb-8 animate-pulse ${glassStyle}`}>
          <div className={`h-48 ${darkMode ? 'bg-slate-700/50' : 'bg-slate-200/50'}`} />
          <div className="px-8 pb-8 relative">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 -mt-16 mb-6">
              <div className={`w-32 h-32 rounded-[2rem] border-4 ring-4 ring-white dark:ring-slate-900 shadow-xl ${darkMode ? 'border-slate-800 bg-slate-700' : 'border-white bg-slate-200'}`} />
              <div className="flex flex-wrap gap-3 w-full md:w-auto">
                <div className={`h-12 w-24 rounded-2xl ${darkMode ? 'bg-slate-700/50' : 'bg-slate-200/50'}`} />
                <div className={`h-12 w-32 rounded-2xl ${darkMode ? 'bg-slate-700/50' : 'bg-slate-200/50'}`} />
                <div className={`h-12 w-40 rounded-2xl hidden sm:block ${darkMode ? 'bg-slate-700/50' : 'bg-slate-200/50'}`} />
              </div>
            </div>
            <div className="space-y-4 max-w-2xl">
              <div className={`h-8 w-48 rounded-lg ${darkMode ? 'bg-slate-700/50' : 'bg-slate-200/50'}`} />
              <div className={`h-4 w-32 rounded-lg ${darkMode ? 'bg-slate-700/50' : 'bg-slate-200/50'}`} />
              <div className={`h-4 w-full rounded-lg mt-4 ${darkMode ? 'bg-slate-700/50' : 'bg-slate-200/50'}`} />
              <div className={`h-4 w-2/3 rounded-lg ${darkMode ? 'bg-slate-700/50' : 'bg-slate-200/50'}`} />
            </div>
          </div>
        </div>
        <div className={`rounded-[2.5rem] h-[400px] border animate-pulse ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-100 border-slate-200'}`} />
      </Motion.main>
    );
  }

  return (
    <Motion.main 
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="pt-24 pb-20 px-4 md:px-8 max-w-5xl mx-auto"
    >
      <div className={`rounded-[2.5rem] overflow-hidden border mb-8 ${glassStyle}`}>
        <div className="h-48 bg-blue-600 relative group overflow-hidden transition-all duration-300">
          {user?.coverPhoto && <img src={user.coverPhoto} alt="Cover" className="absolute inset-0 w-full h-full object-cover" />}
          <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer backdrop-blur-sm z-10">
            <Camera className="text-white" size={32} />
            <input type="file" className="hidden" accept="image/*" onChange={handleCoverUpload} />
          </label>
          {user?.coverPhoto && (
            <button
              onClick={handleRemoveCoverPhoto}
              className="absolute top-4 right-4 p-2 bg-red-500/90 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-md"
              title="Remove Cover Photo"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
        <div className="px-8 pb-8 relative">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 -mt-16 mb-6">
            <div className="relative group block ring-4 ring-white dark:ring-slate-900 rounded-[2rem] shadow-xl">
              <div className="w-32 h-32 rounded-[2rem] border-4 border-white dark:border-slate-800 overflow-hidden shadow-2xl bg-slate-200 dark:bg-slate-700">
            <img src={profileImage || user?.profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.fullName || 'EventHub'}`} alt="Profile" className="w-full h-full object-cover" />
              </div>
              <label className="absolute inset-0 bg-black/40 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm cursor-pointer z-10">
                <Camera className="text-white" size={28} />
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
              </label>
              {(profileImage || user?.profilePicture) && (
                <button
                  onClick={handleRemoveProfilePicture}
                  className="absolute -top-2 -right-2 p-2 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-20"
                  title="Remove Profile Picture"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 w-full justify-center md:justify-start mb-6">
            <button className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold transition-colors shadow-sm ${darkMode ? 'bg-slate-700/50 hover:bg-slate-600/70 text-white border border-slate-600' : 'bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-200'}`} onClick={handleShare}>
              <Share2 size={18} /> Share
            </button>
            <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30 transition-all border border-blue-600" onClick={handleEditProfile}>
              <Edit3 size={18} /> {isEditingProfile ? 'Save Profile' : 'Edit Profile'}
            </button>
            <button className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold transition-colors shadow-sm ${darkMode ? 'bg-slate-700/50 hover:bg-slate-600/70 text-white border border-slate-600' : 'bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-200'}`} onClick={() => setShowPasswordModal(true)}>
              <Lock size={18} /> Change Password
            </button>
            <button className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold transition-colors shadow-sm ${darkMode ? 'bg-slate-700/50 hover:bg-slate-600/70 text-white border border-slate-600' : 'bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-200'}`} onClick={handleLogout}>
              <LogOut size={18} /> Logout
            </button>
            <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30 transition-all border border-red-500" onClick={() => setShowDeleteModal(true)}>
              <Trash2 size={18} /> Delete Account
            </button>
          </div>

          <div className="max-w-2xl">
            {isEditingProfile ? (
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Full Name</label>
                  <input
                    type="text"
                    value={editForm.fullName}
                    onChange={(e) => setEditForm(prev => ({ ...prev, fullName: e.target.value }))}
                    className={`w-full rounded-2xl border px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${darkMode ? 'bg-slate-900/60 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Username</label>
                  <input
                    type="text"
                    value={editForm.username}
                    onChange={(e) => setEditForm(prev => ({ ...prev, username: e.target.value }))}
                    className={`w-full rounded-2xl border px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${darkMode ? 'bg-slate-900/60 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Phone</label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                    className={`w-full rounded-2xl border px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${darkMode ? 'bg-slate-900/60 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Bio</label>
                  <textarea
                    value={editForm.bio}
                    onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                    rows={3}
                    className={`w-full rounded-2xl border px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${darkMode ? 'bg-slate-900/60 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Location</label>
                  <input
                    type="text"
                    value={editForm.location}
                    onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                    className={`w-full rounded-2xl border px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${darkMode ? 'bg-slate-900/60 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Website</label>
                  <input
                    type="url"
                    value={editForm.website}
                    onChange={(e) => setEditForm(prev => ({ ...prev, website: e.target.value }))}
                    className={`w-full rounded-2xl border px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${darkMode ? 'bg-slate-900/60 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="flex-1 py-3 rounded-2xl font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className={`flex-1 py-3 rounded-2xl font-bold transition-colors border ${darkMode ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-100'}`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h1 className={`text-3xl font-black mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{user?.fullName}</h1>
                <p className="text-sm font-bold text-blue-600 dark:text-blue-400 mb-4">@{user?.username || user?.fullName?.split(' ')[0]?.toLowerCase()}</p>
                <p className={`text-sm font-medium leading-relaxed opacity-100 mb-6 ${darkMode ? 'text-white' : 'text-slate-600'}`}>
                  {user?.bio || 'No bio provided yet.'}
                </p>
                <div className={`flex flex-wrap gap-6 text-sm font-semibold opacity-100 ${darkMode ? 'text-white' : 'text-slate-600'}`}>
                  {user?.location && <span className="flex items-center gap-2"><MapPin size={16} /> {user.location}</span>}
                  {user?.website && <span className="flex items-center gap-2"><Globe size={16} /> {user.website}</span>}
                  <span className="flex items-center gap-2"><CalendarDays size={16} /> Joined {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="px-8 pb-8 pt-6 border-t border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5">
          <h3 className={`text-xs font-black uppercase tracking-widest opacity-100 mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Interests</h3>
          <div className="flex flex-wrap items-center gap-3">
            {interests.map(interest => (
              <span key={interest} className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 shadow-sm text-sm font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2">
                <Tag size={14} /> {interest}
              </span>
            ))}
            <div className="flex items-center gap-2 bg-white/50 dark:bg-slate-800/50 rounded-xl px-2 py-1 shadow-sm border border-transparent focus-within:border-blue-500 transition-colors">
              <input 
                type="text" 
                value={newInterest}
                onChange={(e) => setNewInterest(e.target.value)}
                onKeyDown={handleAddInterest}
                placeholder="Add interest..." 
                className={`bg-transparent border-none focus:outline-none text-sm font-bold px-2 py-1 w-32 placeholder:opacity-100 ${darkMode ? 'text-white placeholder-white' : 'text-slate-900'}`}
              />
              <button onClick={handleAddInterest} className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20">
                <Plus size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className={`rounded-[2.5rem] border overflow-hidden ${glassStyle}`}>
        <div className="flex p-2 bg-black/5 dark:bg-white/5 mx-6 mt-6 rounded-[2rem] overflow-x-auto no-scrollbar relative">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setPage(1); }}
                className={`relative flex-1 min-w-[120px] flex items-center justify-center gap-2 py-3.5 px-4 rounded-[1.5rem] text-sm font-bold transition-colors z-10 ${
                  isActive ? 'text-white' : `opacity-100 hover:opacity-100 ${darkMode ? 'text-white' : 'text-slate-600'}`
                }`}
              >
                {isActive && (
                  <Motion.div
                    layoutId="profileTabBubble"
                    className="absolute inset-0 bg-blue-600 rounded-[1.5rem] -z-10 shadow-lg shadow-blue-600/30"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <Icon size={16} />
                <span>{tab.label}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs ${isActive ? 'bg-white/20' : 'bg-black/10 dark:bg-white/10'}`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
        {isLoadingEvents ? (
          <div className="col-span-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, idx) => (
              <div key={idx} className={`p-4 rounded-[2rem] border animate-pulse ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <div className={`h-40 rounded-[1.5rem] mb-4 ${darkMode ? 'bg-slate-700/50' : 'bg-slate-200'}`} />
                <div className={`h-5 w-3/4 rounded mb-2 ${darkMode ? 'bg-slate-700/50' : 'bg-slate-200'}`} />
                <div className={`h-4 w-1/2 rounded ${darkMode ? 'bg-slate-700/50' : 'bg-slate-200'}`} />
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
                className="group cursor-pointer"
            onClick={() => navigate(`/event-details/${event._id || event.id}`)}
              >
                <div className={`p-4 rounded-[2rem] border transition-all duration-300 hover:-translate-y-2 hover:shadow-xl ${darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white/80 border-blue-50'}`}>
                  <div className="h-40 rounded-[1.5rem] bg-blue-100 dark:bg-slate-700 mb-4 overflow-hidden relative">
                {event.coverImage && <img src={event.coverImage} alt={event.title} className="w-full h-full object-cover" />}
                    <div className="absolute top-3 left-3 px-3 py-1.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-wider">
                  {event.category || 'Event'}
                    </div>
                {activeTab === 'created' && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); setEditingEvent(event); }}
                    className="absolute top-3 right-3 p-2.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-full text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors z-10 shadow-sm"
                  >
                    <Edit3 size={16} />
                  </button>
                )}
                  </div>
              <h3 className={`font-bold text-lg mb-1 truncate leading-tight group-hover:text-blue-500 transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}>{event.title}</h3>
                  <div className={`text-xs font-semibold opacity-100 flex flex-col gap-1 ${darkMode ? 'text-white' : 'text-slate-600'}`}>
                <span className="flex items-center gap-1.5"><CalendarDays size={14} /> {event.date ? new Date(event.date).toLocaleDateString() : 'TBA'}</span>
                <span className="flex items-center gap-1.5"><MapPin size={14} /> {event.location?.formattedAddress || event.location || 'Location TBA'}</span>
                  </div>
                </div>
              </Motion.div>
          ))
        ) : (
          <Motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`col-span-full py-16 px-6 text-center rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center ${darkMode ? 'border-slate-700 bg-slate-800/20' : 'border-slate-200 bg-slate-50'}`}
          >
            <div className={`w-20 h-20 mb-6 rounded-full flex items-center justify-center ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-white shadow-sm text-slate-400'}`}>
              <CalendarDays size={32} />
            </div>
            <h3 className={`text-xl font-black mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Nothing to see here</h3>
            <p className={`text-sm font-medium max-w-sm mb-8 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {activeTab === 'created' ? "You haven't created any events yet. Host your first experience today!"
                : activeTab === 'upcoming' ? "You don't have any upcoming events. Discover what's happening near you."
                : activeTab === 'attended' ? "You haven't attended any past events yet."
                : "You haven't liked any events yet."}
            </p>
            <button 
              onClick={() => navigate(activeTab === 'created' ? '/create-event' : '/events')}
              className="px-8 py-3.5 rounded-2xl text-sm font-bold bg-blue-600 text-white shadow-lg shadow-blue-600/30 hover:bg-blue-700 hover:-translate-y-0.5 transition-all"
            >
              {activeTab === 'created' ? 'Create Event' : 'Discover Events'}
            </button>
          </Motion.div>
        )}
          </AnimatePresence>
          
          {totalPages > 1 && (
            <div className="col-span-full flex justify-center items-center gap-4 mt-6">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${darkMode ? 'bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed' : 'bg-slate-100 text-slate-900 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed'}`}
              >
                Previous
              </button>
              <span className={`text-sm font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Page {page} of {totalPages}
              </span>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${darkMode ? 'bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed' : 'bg-slate-100 text-slate-900 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed'}`}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <Motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-md p-6 rounded-[2rem] shadow-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}
            >
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3 text-red-500">
                  <div className="p-2 bg-red-500/10 rounded-xl">
                    <AlertTriangle size={24} />
                  </div>
                  <h2 className={`text-xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>Delete Account</h2>
                </div>
                <button onClick={() => setShowDeleteModal(false)} className={`p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  <X size={20} />
                </button>
              </div>
              <p className={`text-sm mb-6 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                Are you sure you want to delete your account? This action is permanent and cannot be undone. All your created events and tickets will be lost.
              </p>
              <div className="space-y-2 mb-8 text-left">
                <label className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Confirm Password</label>
                <input 
                  type="password" 
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Enter your password to confirm" 
                  className={`w-full rounded-2xl border px-4 py-3.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500 transition ${darkMode ? 'bg-slate-950/50 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900'}`} 
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteModal(false)} className={`flex-1 py-3.5 rounded-2xl font-bold transition-colors border ${darkMode ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-100'}`}>
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
              className={`w-full max-w-md p-6 rounded-[2rem] shadow-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}
            >
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl">
                    <Lock size={24} />
                  </div>
                  <h2 className={`text-xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>Change Password</h2>
                </div>
                <button onClick={() => setShowPasswordModal(false)} className={`p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleUpdatePasswordSubmit}>
                <div className="space-y-4 mb-8 text-left">
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${darkMode ? 'text-white' : 'text-slate-600'}`}>Current Password</label>
                    <input type="password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})} required className={inputStyle} />
                  </div>
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${darkMode ? 'text-white' : 'text-slate-600'}`}>New Password</label>
                    <input type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})} required minLength={8} className={inputStyle} />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowPasswordModal(false)} className={`flex-1 py-3.5 rounded-2xl font-bold transition-colors border ${darkMode ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-100'}`}>
                    Cancel
                  </button>
                  <button 
                    type="submit" disabled={isUpdatingPassword || !passwordForm.currentPassword || !passwordForm.newPassword}
                    className="flex-1 py-3.5 rounded-2xl font-bold transition-colors bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed"
                  >
                    {isUpdatingPassword ? 'Updating...' : 'Update Password'}
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
              className={`w-full max-w-lg p-6 rounded-[2rem] shadow-2xl border max-h-[90vh] overflow-y-auto ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className={`text-xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>Quick Edit Event</h2>
                <button onClick={() => { setEditingEvent(null); setEditingCoverImage(null); }} className={`p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleEditEventSubmit} className="space-y-4 text-left">
                <label className={`block border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors relative overflow-hidden group ${darkMode ? 'border-slate-600 hover:border-blue-500 bg-slate-900/30' : 'border-slate-300 hover:border-blue-500 bg-slate-50'}`}>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => setEditingCoverImage(e.target.files[0])} />
                  <img src={editingCoverImage ? URL.createObjectURL(editingCoverImage) : (editingEvent.coverImage || '/placeholder.png')} alt="Cover Preview" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="relative z-10 bg-black/40 backdrop-blur-sm p-2 rounded-lg inline-block">
                    <ImageIcon size={24} className="text-white mx-auto mb-2" />
                    <p className="text-xs font-bold text-white">Click to change cover image</p>
                  </div>
                </label>
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${darkMode ? 'text-white' : 'text-slate-600'}`}>Event Title</label>
                  <input type="text" value={editingEvent.title || ''} onChange={e => setEditingEvent({...editingEvent, title: e.target.value})} className={inputStyle} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${darkMode ? 'text-white' : 'text-slate-600'}`}>Date</label>
                    <input type="date" value={editingEvent.date ? editingEvent.date.substring(0, 10) : ''} onChange={e => setEditingEvent({...editingEvent, date: e.target.value})} className={inputStyle} required />
                  </div>
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${darkMode ? 'text-white' : 'text-slate-600'}`}>Time</label>
                    <input type="time" value={editingEvent.time || ''} onChange={e => setEditingEvent({...editingEvent, time: e.target.value})} className={inputStyle} />
                  </div>
                </div>
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${darkMode ? 'text-white' : 'text-slate-600'}`}>Location</label>
                  <input type="text" value={typeof editingEvent.location === 'object' ? editingEvent.location?.formattedAddress : (editingEvent.location || '')} onChange={e => setEditingEvent({...editingEvent, location: e.target.value})} className={inputStyle} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${darkMode ? 'text-white' : 'text-slate-600'}`}>Price (₦)</label>
                    <input type="number" value={editingEvent.price || 0} onChange={e => setEditingEvent({...editingEvent, price: e.target.value})} className={inputStyle} />
                  </div>
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${darkMode ? 'text-white' : 'text-slate-600'}`}>Capacity</label>
                    <input type="number" value={editingEvent.capacity || ''} onChange={e => setEditingEvent({...editingEvent, capacity: e.target.value})} className={inputStyle} placeholder="Unlimited" />
                  </div>
                </div>
                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => { setEditingEvent(null); setEditingCoverImage(null); }} className={`flex-1 py-3.5 rounded-2xl font-bold transition-colors border ${darkMode ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-100'}`}>
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    onClick={handleDeleteEvent} 
                    disabled={isSaving || !hasHappened} 
                    title={!hasHappened ? "Events can only be deleted after they have happened" : "Delete Event"}
                    className={`px-6 py-3.5 rounded-2xl font-bold transition-colors bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    Delete
                  </button>
                  <button type="submit" disabled={isSaving} className="flex-1 py-3.5 rounded-2xl font-bold transition-colors bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30 disabled:opacity-50">
                    {isSaving ? 'Saving...' : 'Save Changes'}
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
              className={`w-full max-w-md p-6 rounded-[2rem] shadow-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 flex-shrink-0 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h2 className={`text-xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>Delete Event</h2>
                  <p className={`text-sm mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Are you sure? This action is permanent.</p>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowEventDeleteConfirm(false)} className={`flex-1 py-3.5 rounded-2xl font-bold transition-colors border ${darkMode ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-100'}`}>
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

export default Profile;
