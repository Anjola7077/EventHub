import React, { useState, useEffect, useRef, useContext } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { CalendarPlus, Compass, Users, Ticket, ArrowRight, ArrowUpRight, Bell, X, MapPin, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { EVENT_CATEGORIES } from '../constants/categories';

const Home = () => {
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
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('Push notifications are not supported by your browser.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);

      if (permission === 'granted') {
        // 1. Register the Service Worker
        const registration = await navigator.serviceWorker.register('/sw.js');

        // 2. Convert VAPID key for the PushManager
        const publicVapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
        const urlBase64ToUint8Array = (base64String) => {
          const padding = '='.repeat((4 - base64String.length % 4) % 4);
          const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
          const rawData = window.atob(base64);
          const outputArray = new Uint8Array(rawData.length);
          for (let i = 0; i < rawData.length; ++i) { outputArray[i] = rawData.charCodeAt(i); }
          return outputArray;
        };

        // 3. Subscribe the user's browser
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
        });

        // 4. Send the subscription to your backend to save to the user's database document
        await api.post('/notifications/subscribe', subscription);

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

  const categories = EVENT_CATEGORIES.slice(0, 8);

  // "Ways in" — varied, not an identical icon-card grid.
  const featured = {
    title: isAuthenticated ? 'Discover events' : 'Discover events near you',
    description: 'Browse what’s happening this week. Concerts, workshops, meetups and more, mapped around the city.',
    icon: Compass,
    path: '/events',
    cta: 'Browse events',
  };
  const ways = [
    { n: '01', title: 'Create', description: 'Spin up an event and grow your crowd.', path: '/create-event' },
    { n: '02', title: isAuthenticated ? 'Profile' : 'Connect', description: isAuthenticated ? 'Manage your profile and events.' : 'Meet people and grow your circle.', path: isAuthenticated ? '/profile' : '/register' },
    { n: '03', title: isAuthenticated ? 'My events' : 'Attend', description: isAuthenticated ? 'Your upcoming events and chats.' : 'Reserve a spot and join the chat.', path: isAuthenticated ? '/dashboard' : '/login' },
  ];

  const ease = [0.22, 1, 0.36, 1];

  return (
    <Motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="eh-page-bg min-h-screen pt-28 pb-24 md:pt-36"
    >
      {/* Floating Notification Button */}
      <div className="fixed bottom-6 right-6 z-50" ref={notificationRef}>
        <button
          onClick={() => setShowNotifications(!showNotifications)}
          aria-label="Notifications"
          className="relative grid h-14 w-14 place-items-center rounded-2xl bg-brand text-white shadow-eh-lg transition-transform hover:-translate-y-0.5 active:scale-95"
        >
          <Bell size={22} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 grid h-6 min-w-6 place-items-center rounded-full bg-accent px-1.5 text-xs font-bold text-[oklch(0.2_0.03_40)]">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Notification Popup */}
        <AnimatePresence>
          {showNotifications && (
            <Motion.div
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ duration: 0.22, ease }}
              className="eh-surface absolute bottom-full right-0 mb-4 w-[min(20rem,calc(100vw-3rem))] overflow-hidden rounded-3xl shadow-eh-lg"
            >
              <div className="flex items-center justify-between border-b border-line px-5 py-4">
                <h3 className="eh-display text-lg">Notifications</h3>
                <div className="flex items-center gap-3">
                  {unreadCount > 0 && (
                    <button onClick={handleMarkAllAsRead} className="text-xs font-bold eh-text-brand hover:opacity-80 transition">
                      Mark all read
                    </button>
                  )}
                  <button onClick={() => setShowNotifications(false)} aria-label="Close" className="grid h-7 w-7 place-items-center rounded-full hover:bg-surface-2 transition">
                    <X size={18} />
                  </button>
                </div>
              </div>
              {pushPermission !== 'granted' && (
                <button onClick={enablePushNotifications} className="block w-full border-b border-line px-5 py-3 text-center text-xs font-bold eh-text-brand hover:bg-surface-2 transition">
                  Turn on push notifications
                </button>
              )}
              <div className="max-h-80 overflow-y-auto p-3">
                {activities.length === 0 ? (
                  <p className="px-2 py-6 text-center text-sm eh-text-muted">You’re all caught up.</p>
                ) : (
                  <ul className="space-y-1">
                    {activities.map(activity => (
                      <li
                        key={activity.id}
                        className={`flex gap-3 rounded-2xl p-3 cursor-pointer transition-colors ${activity.read ? 'opacity-60' : 'hover:bg-surface-2'}`}
                        onClick={() => handleIndividualNotificationClick(activity.id, activity.url)}
                      >
                        <div className="mt-0.5 shrink-0">
                          {activity.type === 'event_update' && <CalendarPlus size={18} className="eh-text-brand" />}
                          {activity.type === 'new_message' && <Users size={18} className="eh-text-accent" />}
                          {activity.type === 'rsvp_alert' && <Ticket size={18} className="eh-text-brand" />}
                          {activity.type === 'event_reminder' && <Bell size={18} className="eh-text-accent" />}
                          {activity.type === 'system' && <Users size={18} className="eh-text-muted" />}
                        </div>
                        <div>
                          <p className={`text-sm font-medium leading-snug ${activity.read ? 'eh-text-muted line-through' : 'eh-text'}`}>{activity.message}</p>
                          <span className="text-xs eh-text-muted">{formatTimeAgo(activity.time)}</span>
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

      <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
        {/* ---- Hero ---- */}
        <section className="grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
          <Motion.div
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } } }}
            className="text-left"
          >
            <Motion.p
              variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.5, ease }}
              className="eh-eyebrow flex items-center gap-2"
            >
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
              A city full of things to do
            </Motion.p>

            <Motion.h1
              variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.6, ease }}
              className="eh-display mt-5 text-[clamp(2.6rem,7vw,4.5rem)] font-extrabold leading-[0.98]"
            >
              Find your next
              <br className="hidden sm:block" /> <span className="eh-text-accent">experience.</span>
            </Motion.h1>

            <Motion.p
              variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.6, ease }}
              className="mt-6 max-w-[46ch] text-lg eh-text-soft"
            >
              EventHub gathers the concerts, workshops and meetups happening around you.
              One place to discover them, save your spot, and actually show up.
            </Motion.p>

            <Motion.div
              variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.6, ease }}
              className="mt-9 flex flex-wrap items-center gap-3"
            >
              <Link to="/events" className="eh-btn eh-btn-primary">
                Explore events <ArrowRight size={18} />
              </Link>
              <Link to={isAuthenticated ? '/dashboard' : '/register'} className="eh-btn eh-btn-ghost">
                {isAuthenticated ? 'Go to dashboard' : 'Create an event'}
              </Link>
            </Motion.div>

            <Motion.div
              variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.6, ease }}
              className="mt-10 flex flex-wrap gap-2"
            >
              {categories.map((c) => (
                <Link
                  key={c}
                  to="/events"
                  className="rounded-full border border-line px-3.5 py-1.5 text-sm font-medium eh-text-soft transition hover:border-brand hover:text-brand"
                >
                  {c}
                </Link>
              ))}
            </Motion.div>
          </Motion.div>

          {/* Hero visual — a tilted event preview card (the product, not decoration) */}
          <Motion.div
            initial={{ opacity: 0, y: 30, rotate: 3 }}
            animate={{ opacity: 1, y: 0, rotate: 2 }}
            transition={{ duration: 0.8, ease, delay: 0.2 }}
            className="relative mx-auto w-full max-w-sm"
          >
            <div className="absolute -inset-6 -z-10 rounded-[2.75rem] bg-brand-soft blur-2xl" aria-hidden />
            <div className="eh-surface rounded-[2rem] p-5 shadow-eh-lg">
              <div className="flex items-center justify-between">
                <span className="grid h-16 w-16 place-content-center rounded-2xl bg-brand text-center leading-none text-white">
                  <span className="text-xs font-semibold tracking-widest">SAT</span>
                  <span className="eh-display text-2xl font-extrabold">14</span>
                </span>
                <span className="eh-chip eh-chip-accent">Live soon</span>
              </div>
              <h3 className="eh-display mt-5 text-2xl font-bold leading-tight">Sunset Rooftop Sessions</h3>
              <div className="mt-3 space-y-1.5 text-sm eh-text-soft">
                <p className="flex items-center gap-2"><Calendar size={15} className="eh-text-brand" /> Saturday · 8:00 PM</p>
                <p className="flex items-center gap-2"><MapPin size={15} className="eh-text-brand" /> Downtown · City Center</p>
              </div>
              <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
                <div className="flex items-center">
                  {['A', 'M', 'K', 'T'].map((i, idx) => (
                    <span
                      key={i}
                      className="grid h-8 w-8 -ml-2 first:ml-0 place-items-center rounded-full border-2 text-xs font-bold text-white"
                      style={{ background: 'var(--eh-brand)', borderColor: 'var(--eh-surface)', zIndex: 10 - idx }}
                    >
                      {i}
                    </span>
                  ))}
                  <span className="ml-3 text-sm font-semibold eh-text-soft">+128 going</span>
                </div>
                <ArrowUpRight size={20} className="eh-text-brand" />
              </div>
            </div>
          </Motion.div>
        </section>

        {/* ---- Ways in ---- */}
        <section className="mt-24 md:mt-32">
          <div className="flex items-end justify-between gap-4">
            <h2 className="eh-display text-3xl font-bold sm:text-4xl">Everything in one place</h2>
            <Link to="/events" className="hidden shrink-0 items-center gap-1.5 text-sm font-semibold eh-text-brand hover:opacity-80 sm:flex">
              See all <ArrowRight size={16} />
            </Link>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            {/* Featured tile */}
            <Link
              to={featured.path}
              className="group relative flex flex-col justify-between overflow-hidden rounded-[1.75rem] bg-brand p-8 text-white shadow-eh-lg transition-transform hover:-translate-y-1"
            >
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" aria-hidden />
              <featured.icon size={30} className="text-white/90" />
              <div className="mt-16">
                <h3 className="eh-display text-2xl font-bold sm:text-3xl">{featured.title}</h3>
                <p className="mt-2 max-w-sm text-white/80">{featured.description}</p>
                <span className="mt-6 inline-flex items-center gap-2 font-semibold">
                  {featured.cta} <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </Link>

            {/* Compact list — numbered, no icon-above-heading template */}
            <div className="grid gap-4">
              {ways.map((w) => (
                <Link
                  key={w.n}
                  to={w.path}
                  className="eh-surface group flex items-center gap-5 rounded-[1.5rem] p-6 transition-transform hover:-translate-y-1"
                >
                  <span className="eh-display text-2xl font-extrabold text-ink-muted transition-colors group-hover:text-brand">{w.n}</span>
                  <div className="min-w-0 flex-1">
                    <h3 className="eh-display text-lg font-bold">{w.title}</h3>
                    <p className="text-sm eh-text-soft">{w.description}</p>
                  </div>
                  <ArrowUpRight size={20} className="shrink-0 text-ink-muted transition-all group-hover:text-brand group-hover:-translate-y-0.5" />
                </Link>
              ))}
            </div>
          </div>
        </section>
      </div>
    </Motion.main>
  );
};

export default Home;
