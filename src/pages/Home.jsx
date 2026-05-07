import React, { useState, useEffect, useRef, useContext } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { CalendarPlus, Compass, Users, Ticket, ArrowRight, Bell, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';

const Home = ({ darkMode }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);
  const { user, setUnreadCount } = useContext(AuthContext);
  const [activities, setActivities] = useState([]);
  const [pushPermission, setPushPermission] = useState(window.Notification?.permission || 'default');
  const unreadCount = activities.filter(activity => !activity.read).length;
  const isAuthenticated = Boolean(user);

  useEffect(() => {
    // Safely suppress benign ResizeObserver errors that trigger Vercel's crash overlay on window resize
    const handleResizeError = (e) => {
      if (e.message === 'ResizeObserver loop limit exceeded' || e.message === 'ResizeObserver loop completed with undelivered notifications.') {
        e.stopImmediatePropagation();
      }
    };
    window.addEventListener('error', handleResizeError);
    return () => window.removeEventListener('error', handleResizeError);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications]);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user) return;
      try {
        // Fetch real notifications from your backend
        const res = await api.get('/users/notifications');
        if (res.data?.data && res.data.data.length > 0) {
          setActivities(res.data.data);
        }
      } catch (error) {
        console.warn("Notifications API not ready or failed.");
      }
    };
    fetchNotifications();
  }, [user]);

  const enablePushNotifications = async () => {
    if (!('Notification' in window)) return;
    
    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);
      
      if (permission === 'granted') {
        new Notification("Notifications Enabled!", {
          body: "You'll be alerted when your events start.",
          icon: "/logo.png"
        });
      }
    } catch (error) {
      console.error("Failed to enable push notifications:", error);
    }
  };

  // Function to format time into "X ago"
  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
    const minutes = Math.round(seconds / 60);
    const hours = Math.round(minutes / 60);
    const days = Math.round(hours / 24);
    const weeks = Math.round(days / 7);
    const months = Math.round(days / 30);
    const years = Math.round(days / 365);

    if (seconds < 60) return `${seconds} seconds ago`;
    if (minutes < 60) return `${minutes} minutes ago`;
    if (hours < 24) return `${hours} hours ago`;
    if (days < 7) return `${days} days ago`;
    if (weeks < 4) return `${weeks} weeks ago`;
    if (months < 12) return `${months} months ago`;
    return `${years} years ago`;
  };

  const handleIndividualNotificationClick = async (notificationId, url) => {
    try {
      await api.put(`/notifications/${notificationId}/read`);
      setActivities(prevActivities => prevActivities.map(notif => 
        notif.id === notificationId ? { ...notif, read: true } : notif
      ));
      if (setUnreadCount) setUnreadCount(prev => Math.max(0, prev - 1));
      if (url) window.location.href = url;
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };
  const handleMarkAllAsRead = async () => {
    try {
      await api.put('/notifications/mark-all-read');
      // Update local state to reflect changes without refetching
      setActivities(prevActivities =>
        prevActivities.map(activity => ({ ...activity, read: true }))
      );
      if (setUnreadCount) setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const cards = [
    { id: 'create', title: 'Create', description: 'Build new events and grow your audience.', icon: CalendarPlus, path: '/create-event' },
    { id: 'discover', title: 'Discover', description: 'Find curated events near you.', icon: Compass, path: '/events' },
    { id: 'connect', title: isAuthenticated ? 'Profile' : 'Connect', description: isAuthenticated ? 'Manage your profile and events.' : 'Meet people at events and network.', icon: Users, path: isAuthenticated ? '/profile' : '/register' },
    { id: 'attend', title: isAuthenticated ? 'Events' : 'Attend', description: isAuthenticated ? 'Browse upcoming events and join chats.' : 'Reserve tickets and join the chat.', icon: Ticket, path: isAuthenticated ? '/events' : '/login' }
  ];

  return (
    <Motion.main
      initial={{ opacity: 0, y: 15, filter: 'blur(8px)' }} 
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} 
      exit={{ opacity: 0, y: -15, filter: 'blur(8px)' }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
      className={`pt-32 pb-20 px-4 md:px-8 min-h-screen ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}
    >
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Floating Notification Button */}
        <div className="fixed bottom-6 right-6 z-50" ref={notificationRef}>
          <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-4 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-colors">
            <Bell size={24} />
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notification Popup */}
          <AnimatePresence>
            {showNotifications && (
              <Motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                className={`absolute bottom-full right-0 mb-4 w-80 rounded-2xl shadow-xl overflow-hidden z-50 
                            ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
              >
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
                  <h3 className="text-lg font-bold">Notifications</h3>
                  <div className="flex items-center gap-3">
                    {unreadCount > 0 && ( // Only show if there are unread notifications
                      <button 
                        onClick={handleMarkAllAsRead} 
                        className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                      >
                        Mark All Read
                      </button>
                    )}
                    <button 
                      onClick={() => setShowNotifications(false)} 
                      className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700">
                      <X size={20} />
                    </button>
                  </div>
                </div>
                {pushPermission !== 'granted' && (
                  <div className="bg-blue-50 dark:bg-slate-700/50 p-4 border-b border-blue-100 dark:border-slate-700 text-center">
                    <button onClick={enablePushNotifications} className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
                      Turn on push notifications
                    </button>
                  </div>
                )}
                <div className="p-4 max-h-80 overflow-y-auto">
                  {activities.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">No new notifications.</p>
                  ) : (
                    <ul className="space-y-3">
                      {activities.map(activity => (
                        <li
                          key={activity.id}
                          className={`flex gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                            activity.read ? 'opacity-60' : 'hover:bg-blue-50 dark:hover:bg-slate-700'
                          }`}
                          onClick={() => handleIndividualNotificationClick(activity.id, activity.url)}
                        >
                          <div className="flex-shrink-0">
                            {activity.type === 'event_update' && <CalendarPlus size={18} className={`${activity.read ? 'text-blue-300' : 'text-blue-500'}`} />}
                            {activity.type === 'new_message' && <Users size={18} className={`${activity.read ? 'text-emerald-300' : 'text-emerald-500'}`} />}
                            {activity.type === 'rsvp_alert' && <Ticket size={18} className={`${activity.read ? 'text-purple-300' : 'text-purple-500'}`} />}
                            {activity.type === 'event_reminder' && <Bell size={18} className={`${activity.read ? 'text-amber-300' : 'text-amber-500'}`} />}
                            {activity.type === 'system' && <Users size={18} className={`${activity.read ? 'text-gray-300' : 'text-gray-500'}`} />} {/* Generic icon for system, adjust as needed */}
                          </div>
                          <div>
                            <p className={`text-sm font-medium leading-tight ${activity.read ? 'line-through text-gray-500 dark:text-gray-400' : ''}`}>{activity.message}</p>
                            <span className="text-xs text-gray-500 dark:text-gray-400">{formatTimeAgo(activity.time)}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </Motion.div>
            )}
          </AnimatePresence>
        </div>

        <header className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between mb-12">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-3xl bg-blue-600 text-white flex items-center justify-center text-xl font-black shadow-lg overflow-hidden">
              <img src="/logo.png" alt="EventHub Logo" className="w-full h-full object-contain p-2" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-blue-600 font-black ">EventHub</p>
              <h1 className={`text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mt-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Event Networking Platform</h1>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {!isAuthenticated ? (
              <>
                <Link to="/login" className={`rounded-full px-5 py-3 text-sm font-semibold shadow-sm transition ${darkMode ? 'border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800' : 'border-slate-300 bg-white text-slate-900 hover:bg-slate-100'}`}>
                  Login
                </Link>
                <Link to="/register" className="rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-700">
                  Register
                </Link>
              </>
            ) : (
              <Link to="/events" className="rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-700">
                Explore Events
              </Link>
            )}
          </div>
        </header>

        <div className="space-y-8">
          <section className="grid gap-8 lg:grid-cols-[1.4fr_1fr] items-start">
            <div className={`rounded-[2.5rem] p-10 shadow-2xl ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}>
              <span className="inline-flex items-center rounded-full bg-blue-600/10 px-4 py-2 text-xs font-black uppercase tracking-[0.3em] text-blue-600">
                Welcome
              </span>
              <h2 className={`mt-6 text-4xl sm:text-5xl md:text-6xl font-black leading-tight tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Launch your next event. <span className="text-blue-600 dark:text-blue-400">Discover new experiences.</span> Connect instantly.
              </h2>
              <p className={`mt-6 max-w-xl text-sm font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                EventHub brings creators, attendees, and organizers together with a seamless experience for building events, collecting RSVPs, and staying connected.
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <Link to={isAuthenticated ? '/events' : '/login'} className="inline-flex items-center gap-3 rounded-2xl bg-blue-600 px-8 py-4 text-sm font-black text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition">
                  {isAuthenticated ? 'Explore Events' : 'Get Started'} <ArrowRight size={18} />
                </Link>
              </div>
            </div>

            <div className="grid gap-6">
              {cards.slice(0, 2).map((card, index) => {
                const Icon = card.icon;
                return (
                  <Motion.div
                    key={card.id}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.08, duration: 0.4 }}
                    className={`rounded-[2rem] p-8 border hover:-translate-y-2 hover:shadow-2xl transition-all duration-300 ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-100 hover:shadow-blue-900/20' : 'bg-white border-slate-100 text-slate-900 hover:shadow-blue-500/10 hover:border-blue-100'}`}
                  >
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-3xl bg-blue-600/10 text-blue-600 mb-6">
                      <Icon size={22} />
                    </div>
                    <h3 className={`text-xl font-black mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{card.title}</h3>
                    <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>{card.description}</p>
                    <Link to={card.path} className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700 transition">
                      {card.title} <ArrowRight size={16} />
                    </Link>
                  </Motion.div>
                );
              })}
            </div>
          </section>

          <section className="grid gap-6 md:grid-cols-2">
            {cards.slice(2, 4).map((card, index) => {
              const Icon = card.icon;
              return (
                <Motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (index + 2) * 0.08, duration: 0.4 }}
                  className={`rounded-[2rem] p-8 border hover:-translate-y-2 hover:shadow-2xl transition-all duration-300 ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-100 hover:shadow-blue-900/20' : 'bg-white border-slate-100 text-slate-900 hover:shadow-blue-500/10 hover:border-blue-100'}`}
                >
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-3xl bg-blue-600/10 text-blue-600 mb-6">
                    <Icon size={22} />
                  </div>
                  <h3 className={`text-xl font-black mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{card.title}</h3>
                  <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>{card.description}</p>
                  <Link to={card.path} className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700 transition">
                    {card.title} <ArrowRight size={16} />
                  </Link>
                </Motion.div>
              );
            })}
          </section>
        </div>
      </div>
    </Motion.main>
  );
};

export default Home;
