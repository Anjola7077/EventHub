import React, { useState } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { MapPin, Globe, CalendarDays, Share2, Edit3, Heart, Plus, Camera, Ticket, CalendarCheck, Tag, LogOut, Trash2, X, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { mockEvents } from '../utils/mockData';

const Profile = ({ darkMode }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('upcoming');
  const [interests, setInterests] = useState(['Tech', 'Networking', 'Startups', 'Design']);
  const [newInterest, setNewInterest] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [profileImage, setProfileImage] = useState(null);

  const glassStyle = darkMode 
    ? 'bg-slate-800 border-slate-700' 
    : 'bg-white border-gray-200';

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
        await navigator.share({ title: 'Anjola Odukale - EventHub Profile', url });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      navigator.clipboard.writeText(url);
      alert('Profile link copied to clipboard!');
    }
  };

  const handleEditProfile = () => {
    navigate('/register', {
      state: {
        name: 'Anjola Odukale',
        username: 'anjola_dev',
        bio: 'Software Developer & Event Enthusiast. Building the next generation of social networking experiences. Always down for a good hackathon or tech meetup.',
        location: 'Osogbo, Nigeria',
        website: 'portfolio.dev'
      }
    });
  };

  const handleDeleteAccount = () => {
    // Perform actual deletion logic here
    console.log('Account deleted with password:', deletePassword);
    setShowDeleteModal(false);
    setDeletePassword('');
    navigate('/login');
  };

  const tabs = [
    { id: 'upcoming', label: 'Upcoming', count: 3, icon: CalendarCheck },
    { id: 'created', label: 'Created', count: 4, icon: Ticket },
    { id: 'attended', label: 'Attended', count: 12, icon: MapPin },
    { id: 'liked', label: 'Liked', count: 7, icon: Heart }
  ];

  return (
    <Motion.main 
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="pt-24 pb-20 px-4 md:px-8 max-w-5xl mx-auto"
    >
      {}
      <div className={`rounded-[2.5rem] overflow-hidden border mb-8 ${glassStyle}`}>
        <div className="h-48 bg-blue-600 relative">
        </div>
        
        <div className="px-8 pb-8 relative">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 -mt-16 mb-6">
            <label className="relative group cursor-pointer block">
              <div className="w-32 h-32 rounded-[2rem] border-4 border-white dark:border-slate-800 overflow-hidden shadow-2xl bg-slate-200 dark:bg-slate-700">
                
                <img src={profileImage || "https://api.dicebear.com/7.x/avataaars/svg?seed=Anjola&backgroundColor=c0aede"} alt="Profile" className="w-full h-full object-cover" />
              </div>
              <div className="absolute inset-0 bg-black/40 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                <Camera className="text-white" size={28} />
              </div>
              <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                if (e.target.files[0]) {
                  setProfileImage(URL.createObjectURL(e.target.files[0]));
                }
              }} />
            </label>
            
            <div className="flex flex-wrap gap-3 w-full md:w-auto justify-start md:justify-end">
              <button className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`} onClick={() => console.log('Share clicked')}>
                <Share2 size={18} /> Share
              </button>
              <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30 transition-all" onClick={() => console.log('Edit Profile clicked')}>
                <Edit3 size={18} /> Edit Profile
              </button>
              <button className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`} onClick={() => navigate('/login')}>
                <LogOut size={18} /> Logout
              </button>
              <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 transition-colors" onClick={() => setShowDeleteModal(true)}>
                <Trash2 size={18} /> Delete Account
              </button>
            </div>
          </div>

          <div className="max-w-2xl">
            <h1 className={`text-3xl font-black mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Anjola Odukale</h1>
            <p className="text-sm font-bold text-blue-600 dark:text-blue-400 mb-4">@anjola_dev</p>
            <p className={`text-sm font-medium leading-relaxed opacity-100 mb-6 ${darkMode ? 'text-white' : 'text-slate-600'}`}>
              Software Developer & Event Enthusiast. Building the next generation of social networking experiences. Always down for a good hackathon or tech meetup.
            </p>
            
            <div className={`flex flex-wrap gap-6 text-sm font-semibold opacity-100 ${darkMode ? 'text-white' : 'text-slate-600'}`}>
              <span className="flex items-center gap-2"><MapPin size={16} /> Osogbo, Nigeria</span>
              <span className="flex items-center gap-2"><Globe size={16} /> portfolio.dev</span>
              <span className="flex items-center gap-2"><CalendarDays size={16} /> Joined March 2024</span>
            </div>
          </div>
        </div>

        {}
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

      {}
      <div className={`rounded-[2.5rem] border overflow-hidden ${glassStyle}`}>
        {}
        <div className="flex p-2 bg-black/5 dark:bg-white/5 mx-6 mt-6 rounded-[2rem] overflow-x-auto no-scrollbar relative">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
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
            {mockEvents.slice(0, 3).map((event, idx) => (
              <Motion.div
                key={`${activeTab}-${event.id}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2, delay: idx * 0.05 }}
                className="group cursor-pointer"
              >
                <div className={`p-4 rounded-[2rem] border transition-all duration-300 hover:-translate-y-2 hover:shadow-xl ${darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white/80 border-blue-50'}`}>
                  <div className="h-40 rounded-[1.5rem] bg-blue-100 dark:bg-slate-700 mb-4 overflow-hidden relative">
                     {}
                    <div className="absolute top-3 left-3 px-3 py-1.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-wider">
                      {event.category}
                    </div>
                  </div>
                  <h3 className={`font-bold text-lg mb-1 leading-tight group-hover:text-blue-500 transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}>{event.title}</h3>
                  <div className={`text-xs font-semibold opacity-100 flex flex-col gap-1 ${darkMode ? 'text-white' : 'text-slate-600'}`}>
                    <span className="flex items-center gap-1.5"><CalendarDays size={14} /> {event.date}</span>
                    <span className="flex items-center gap-1.5"><MapPin size={14} /> {event.location}</span>
                  </div>
                </div>
              </Motion.div>
            ))}
          </AnimatePresence>
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
    </Motion.main>
  );
};

export default Profile;
