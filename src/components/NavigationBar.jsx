import React, { useState, useEffect, useRef } from 'react';
import { motion as Motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { Home, CalendarPlus, Compass, User, Moon, Sun, UserPlus, Menu } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const NavigationBar = ({ darkMode, setDarkMode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredTab, setHoveredTab] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const navRef = useRef(null);
  const location = useLocation();

  const { scrollY } = useScroll();
  const navScale = useTransform(scrollY, [0, 100], [1, 0.95]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (navRef.current && !navRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isExpanded = !isMobile || isOpen;

  const navItems = [
    { id: 'home', label: 'Home', icon: Home, path: '/' },
    { id: 'discover', label: 'Discover', icon: Compass, path: '/events' },
    { id: 'create', label: 'Create', icon: CalendarPlus, path: '/create-event' },
    { id: 'register', label: 'Register', icon: UserPlus, path: '/register' },
    { id: 'profile', label: 'Profile', icon: User, path: '/profile' }
  ];

  return (
    <div className="fixed top-6 left-0 right-0 z-50 flex justify-center pointer-events-none px-4">
      <Motion.nav
        style={{ scale: navScale }}
        ref={navRef}
        layout
        onClick={() => isMobile && !isOpen && setIsOpen(true)}
        className={`pointer-events-auto flex items-center justify-between gap-2 md:gap-4 px-4 md:px-6 py-3 shadow-2xl border cursor-pointer ${
          darkMode
            ? 'bg-slate-800/60 border-slate-700/50 shadow-black/40'
            : 'bg-white/60 border-white/40 shadow-[#0a1f6e]/20'
        } backdrop-blur-xl overflow-hidden`}
        initial={{ width: isMobile ? 200 : 220, borderRadius: 40 }}
        animate={{
          width: isExpanded ? (isMobile ? 'max-content' : 'min(92vw, 820px)') : (isMobile ? 200 : 220),
          borderRadius: isExpanded ? 32 : 40
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      >
        <div
          className="flex items-center gap-3"
          onClick={(e) => { e.stopPropagation(); if (isMobile) setIsOpen(!isOpen); }}
        >
          <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-black shadow-inner overflow-hidden">
            <img src="/logo.png" alt="EventHub Logo" className="w-full h-full object-cover" />
          </div>
          <AnimatePresence>
            {!isExpanded && (
              <Motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className={`font-extrabold tracking-tight ${darkMode ? 'text-white' : 'text-[#0a1f6e]'} whitespace-nowrap`}
              >
                EventHub
              </Motion.span>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {!isExpanded && (
            <Motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="ml-auto"
            >
              <div className={`p-2 rounded-full animate-pulse ${darkMode ? 'bg-slate-700 text-white' : 'bg-blue-100 text-blue-600'}`}>
                <Menu size={18} />
              </div>
            </Motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isExpanded && (
            <Motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex items-center gap-1 md:gap-2 flex-1 min-w-0 justify-center px-2 md:px-4"
            >
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.id}
                    to={item.path}
                    onClick={(e) => e.stopPropagation()}
                    onMouseEnter={() => setHoveredTab(item.id)}
                    onMouseLeave={() => setHoveredTab(null)}
                    className="relative flex items-center gap-2 px-3 md:px-4 py-2.5 rounded-full text-sm font-semibold transition-colors z-10 whitespace-nowrap"
                  >
                    {hoveredTab === item.id && (
                      <Motion.div
                        layoutId="navHover"
                        className={`absolute inset-0 rounded-full ${darkMode ? 'bg-white/10' : 'bg-[#1a47c8]/10'}`}
                        initial={false}
                        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                      />
                    )}
                    <Icon size={18} className={isActive ? 'text-blue-500' : (darkMode ? 'text-white' : 'text-[#0a1f6e]')} />
                    <span className={`hidden sm:block ${isActive ? 'text-blue-500' : (darkMode ? 'text-white' : 'text-[#0a1f6e]')}`}>
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </Motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isExpanded && (
            <Motion.button
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              whileTap={{ scale: 0.85, rotate: 180 }}
              onClick={(e) => { e.stopPropagation(); setDarkMode(!darkMode); }}
              className={`p-2.5 rounded-full ${darkMode ? 'bg-amber-400/20 text-amber-400' : 'bg-indigo-900/10 text-indigo-900'} transition-colors`}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </Motion.button>
          )}
        </AnimatePresence>

      </Motion.nav>
    </div>
  );
};

export default NavigationBar;
