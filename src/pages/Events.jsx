import React, { useState } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, Calendar, Tag, Filter, Heart, Lock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { mockEvents } from '../utils/mockData';

const DiscoverEvents = ({ darkMode, isAuthenticated = true }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const categories = ['All', 'Technology', 'Music', 'Business', 'Networking', 'Startups'];

  const glassStyle = darkMode 
    ? 'bg-slate-800/40 border-slate-700/50 backdrop-blur-2xl shadow-xl' 
    : 'bg-white/60 border-white/50 backdrop-blur-2xl shadow-[0_8px_32px_rgba(10,31,110,0.08)]';

  const filteredEvents = mockEvents.filter(ev => 
    (activeCategory === 'All' || ev.category === activeCategory) &&
    ev.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Motion.main 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="pt-28 pb-20 px-4 md:px-8 max-w-7xl mx-auto"
    >
      <div className="text-center mb-12">
        <h1 className={`text-4xl md:text-5xl font-black mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Discover Events</h1>
        <p className={`text-sm font-semibold opacity-100 max-w-xl mx-auto ${darkMode ? 'text-white' : 'text-slate-600'}`}>Find your next experience and connect with like-minded people in your city.</p>
      </div>

      {}
      <div className={`sticky top-24 z-30 max-w-4xl mx-auto p-2 rounded-full border mb-10 flex flex-col md:flex-row gap-2 ${glassStyle}`}>
        <div className="relative flex-1">
          <Search size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 ${darkMode ? 'text-white opacity-100' : 'text-slate-900 opacity-40'}`} />
          <input 
            type="text" 
            placeholder="Search events, meetups..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full bg-transparent border-none focus:outline-none pl-12 pr-4 py-3 text-sm font-bold placeholder:opacity-100 ${darkMode ? 'text-white placeholder-white' : 'text-slate-900'}`}
          />
        </div>
        
        <div className="w-px bg-black/10 dark:bg-white/10 hidden md:block my-2" />
        
        <div className="flex overflow-x-auto no-scrollbar px-2 items-center gap-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                activeCategory === cat 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' 
                  : `bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 opacity-100 hover:opacity-100 ${darkMode ? 'text-white' : 'text-slate-700'}`
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {}
      <div className="relative">
        {!isAuthenticated && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/30 dark:bg-slate-900/30 backdrop-blur-md rounded-[2.5rem]">
            <Motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className={`p-8 rounded-[2rem] border text-center max-w-sm w-full mx-4 shadow-2xl ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-blue-50'}`}
            >
              <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Lock size={28} />
              </div>
              <h3 className={`text-xl font-black mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Unlock Experiences</h3>
              <p className={`text-sm font-medium opacity-100 mb-8 ${darkMode ? 'text-white' : 'text-slate-600'}`}>Sign in to discover personalized events, see who's attending, and reserve your tickets.</p>
              <Link to="/register" className="block w-full">
                <button className="w-full py-4 rounded-2xl bg-blue-600 text-white font-bold shadow-lg hover:bg-blue-700 transition-colors">
                  Sign In to Continue
                </button>
              </Link>
            </Motion.div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence>
            {filteredEvents.map((event, i) => (
              <Motion.div
                key={event.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className={`group flex flex-col rounded-[2rem] border overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl ${glassStyle}`}
              >
                <div className="h-48 bg-blue-500 relative overflow-hidden">
                  <div className="absolute top-4 left-4 px-3 py-1.5 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-wider text-white border border-white/20">
                    {event.category}
                  </div>
                  <button className="absolute top-4 right-4 p-2.5 bg-white/20 backdrop-blur-md rounded-full text-white border border-white/20 hover:bg-red-500 hover:border-red-500 transition-colors" onClick={() => console.log('Heart clicked for', event.title)}>
                    <Heart size={16} />
                  </button>
                </div>
                
                <div className="p-6 flex-1 flex flex-col">
                  <h3 className={`text-lg font-black leading-tight mb-3 group-hover:text-blue-500 transition-colors line-clamp-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    {event.title}
                  </h3>
                  
                  <div className="space-y-2 mt-auto">
                    <div className={`flex items-center gap-2 text-xs font-bold opacity-100 ${darkMode ? 'text-white' : 'text-slate-600'}`}>
                      <Calendar size={14} className="text-blue-500" />
                      {event.date}
                    </div>
                    <div className={`flex items-center gap-2 text-xs font-bold opacity-100 ${darkMode ? 'text-white' : 'text-slate-600'}`}>
                      <MapPin size={14} className="text-blue-500" />
                      <span className="truncate">{event.location}</span>
                    </div>
                  </div>

                  <div className="mt-6 pt-5 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
                    <div className="flex -space-x-2">
                      {[1,2,3].map(n => (
                        <div key={n} className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-800 bg-slate-200 dark:bg-slate-700" />
                      ))}
                      <div className={`w-8 h-8 rounded-full border-2 border-white dark:border-slate-800 bg-black/5 dark:bg-white/10 flex items-center justify-center text-[10px] font-bold ${darkMode ? 'text-white' : 'text-slate-700'}`}>
                        +{event.attendees - 3}
                      </div>
                    </div>
                    <Link to="/event-details">
                      <button className={`w-10 h-10 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                        <ArrowRight size={18} />
                      </button>
                    </Link>
                  </div>
                </div>
              </Motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </Motion.main>
  );
};

export default DiscoverEvents;
