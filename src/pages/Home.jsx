import React, { useState, useEffect, useRef } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { CalendarPlus, Compass, Users, Ticket, ArrowRight, Bell, X } from 'lucide-react';
import { Link } from 'react-router-dom';

const mockActivities = [
  { id: 1, type: 'event_update', message: 'React Summit 2024 has a new speaker!', time: '2 hours ago' },
  { id: 2, type: 'new_message', message: 'Sarah K. sent you a message.', time: '5 hours ago' },
  { id: 3, type: 'event_reminder', message: 'Your "Design Thinking Workshop" starts tomorrow!', time: 'Yesterday' },
  { id: 4, type: 'event_update', message: 'New details added to "AI in Business" event.', time: '2 days ago' },
];

const Home = ({ darkMode }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);
  const [activities, setActivities] = useState(mockActivities);

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

  const cards = [
    { id: 'create', title: 'Create', description: 'Build new events and grow your audience.', icon: CalendarPlus, path: '/create-event' },
    { id: 'discover', title: 'Discover', description: 'Find curated events near you.', icon: Compass, path: '/events' },
    { id: 'connect', title: 'Connect', description: 'Meet people at events and network.', icon: Users, path: '/register' },
    { id: 'attend', title: 'Attend', description: 'Reserve tickets and join the chat.', icon: Ticket, path: '/login' }
  ];

  return (
    <Motion.main
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className={`pt-32 pb-20 px-4 md:px-8 min-h-screen ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}
    >
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Floating Notification Button */}
        <div className="fixed bottom-6 right-6 z-50" ref={notificationRef}>
          <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-4 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-colors">
            <Bell size={24} />
            {activities.length > 0 && (
              <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
                {activities.length}
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
                    {activities.length > 0 && (
                      <button onClick={() => setActivities([])} className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
                        Clear All
                      </button>
                    )}
                    <button onClick={() => setShowNotifications(false)} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700">
                      <X size={20} />
                    </button>
                  </div>
                </div>
                <div className="p-4 max-h-80 overflow-y-auto">
                  {activities.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">No new notifications.</p>
                  ) : (
                    <ul className="space-y-3">
                      {activities.map(activity => (
                        <li key={activity.id} className="flex gap-3">
                          <div className="flex-shrink-0">
                            {activity.type === 'event_update' && <CalendarPlus size={18} className="text-blue-500" />}
                            {activity.type === 'new_message' && <Users size={18} className="text-emerald-500" />}
                            {activity.type === 'event_reminder' && <Bell size={18} className="text-amber-500" />}
                          </div>
                          <div>
                            <p className="text-sm font-medium leading-tight">{activity.message}</p>
                            <span className="text-xs text-gray-500 dark:text-gray-400">{activity.time}</span>
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
              <img src="/logo.png" alt="EventHub Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-blue-600 font-black ">EventHub</p>
              <h1 className={`text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mt-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Event Networking Platform</h1>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link to="/login" className={`rounded-full px-5 py-3 text-sm font-semibold shadow-sm transition ${darkMode ? 'border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800' : 'border-slate-300 bg-white text-slate-900 hover:bg-slate-100'}`}>
              Login
            </Link>
            <Link to="/register" className="rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-700">
              Register
            </Link>
          </div>
        </header>

        <div className="space-y-8">
          <section className="grid gap-8 lg:grid-cols-[1.4fr_1fr] items-start">
            <div className={`rounded-[2.5rem] p-10 shadow-2xl ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}>
              <span className="inline-flex items-center rounded-full bg-blue-600/10 px-4 py-2 text-xs font-black uppercase tracking-[0.3em] text-blue-600">
                Welcome
              </span>
              <h2 className={`mt-6 text-4xl sm:text-5xl font-black leading-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Launch your next event. Discover new experiences. Connect instantly.
              </h2>
              <p className={`mt-6 max-w-xl text-sm font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                EventHub brings creators, attendees, and organizers together with a seamless experience for building events, collecting RSVPs, and staying connected.
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <Link to="/login" className="inline-flex items-center gap-3 rounded-2xl bg-blue-600 px-8 py-4 text-sm font-black text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition">
                  Get Started <ArrowRight size={18} />
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
                    className={`rounded-[2rem] p-8 shadow-xl hover:-translate-y-1 transition-transform ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
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
                  className={`rounded-[2rem] p-8 shadow-xl hover:-translate-y-1 transition-transform ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
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
