import React, { useState, useEffect, useRef, useContext } from 'react';
import { motion as Motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { Home, CalendarPlus, Compass, User, Moon, Sun, UserPlus, Menu, LogIn, LayoutDashboard, X, Bell } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import InstallAppButton from './InstallAppButton';

const NavigationBar = ({ darkMode, setDarkMode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredTab, setHoveredTab] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const navRef = useRef(null);
  const location = useLocation();
  const { scrollY } = useScroll();
  const navScale = useTransform(scrollY, [0, 100], [1, 0.95]);

  const { user, unreadCount } = useContext(AuthContext);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {

      if (isMobile && isOpen) return;

      if (navRef.current && !navRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobile, isOpen]);

  const isExpanded = !isMobile || isOpen;

  const navItems = [
    { id: 'home', label: 'Home', icon: Home, path: '/' },
    { id: 'discover', label: 'Discover', icon: Compass, path: '/events' },
  ];

  if (user) {
    navItems.push({ id: 'create', label: 'Create', icon: CalendarPlus, path: '/create-event' });
    navItems.push({ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' });
    navItems.push({ id: 'profile', label: 'Profile', icon: User, path: '/profile' });
  } else {
    navItems.push({ id: 'login', label: 'Sign In', icon: LogIn, path: '/login' });
    navItems.push({ id: 'register', label: 'Register', icon: UserPlus, path: '/register' });
  }

  return (
    <>
      <div className="fixed top-6 left-0 right-0 z-50 flex justify-center pointer-events-none px-4">
        <Motion.nav
          style={{ scale: navScale }}
          ref={navRef}
          layout
          onClick={() => isMobile && !isOpen && setIsOpen(true)}
          className={`pointer-events-auto flex items-center justify-between gap-2 md:gap-4 px-4 md:px-6 py-3 shadow-2xl border ${isMobile && !isOpen ? 'cursor-pointer' : ''} ${
            darkMode ? 'bg-slate-800/60 border-slate-700/50 shadow-black/40' : 'bg-white/60 border-white/40 shadow-[#0a1f6e]/20'
          } backdrop-blur-xl overflow-hidden`}
          initial={{ width: isMobile ? 'max-content' : 220, borderRadius: 40 }}
          animate={{
            width: isMobile ? 'max-content' : 'min(92vw, 820px)',
            borderRadius: !isMobile ? 32 : 40
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        >
          <div className="flex items-center gap-3 shrink-0" onClick={(e) => { e.stopPropagation(); if (isMobile) setIsOpen(true); }}>
            <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-black shadow-inner overflow-hidden">
              <img src="/logo.png" alt="EventHub Logo" className="w-full h-full object-contain p-1" />
            </div>
            <AnimatePresence>
              {isMobile && (
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
            {!isMobile && (
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
                      className={`relative flex items-center gap-2 px-3 md:px-4 py-2.5 rounded-full text-sm transition-colors z-10 whitespace-nowrap ${isActive ? (darkMode ? 'bg-blue-500/20 font-bold' : 'bg-blue-50 font-bold') : 'font-semibold'}`}
                    >
                      {hoveredTab === item.id && (
                        <Motion.div
                          layoutId="navHover"
                          className={`absolute inset-0 rounded-full ${darkMode ? 'bg-white/10' : 'bg-[#1a47c8]/10'}`}
                          initial={false}
                          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                        />
                      )}
                      <div className="relative flex items-center justify-center">
                        <Icon size={18} className={isActive ? (darkMode ? 'text-blue-400' : 'text-blue-600') : (darkMode ? 'text-white' : 'text-[#0a1f6e]')} />
                        {item.badge > 0 && (
                          <span className="absolute -top-1.5 -right-2 flex items-center justify-center min-w-[16px] h-4 px-1 bg-red-500 text-white text-[9px] font-black rounded-full border border-white dark:border-slate-800">
                            {item.badge > 99 ? '99+' : item.badge}
                          </span>
                        )}
                      </div>
                      <span className={`hidden sm:block ${isActive ? (darkMode ? 'text-blue-400' : 'text-blue-600') : (darkMode ? 'text-white' : 'text-[#0a1f6e]')}`}>
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </Motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center gap-2 md:gap-3 shrink-0 ml-auto">
            {!isMobile && <InstallAppButton darkMode={darkMode} />}

            <AnimatePresence mode="popLayout">
              {!isMobile ? (
                <Motion.button
                  key="theme-toggle"
                  initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                  whileTap={{ scale: 0.85, rotate: 180 }}
                  onClick={(e) => { e.stopPropagation(); setDarkMode(!darkMode); }}
                  className={`p-2.5 rounded-full ${darkMode ? 'bg-amber-400/20 text-amber-400' : 'bg-indigo-900/10 text-indigo-900'} transition-colors shrink-0`}
                >
                  {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                </Motion.button>
              ) : (
                <Motion.div
                  key="menu-toggle"
                  onClick={(e) => { e.stopPropagation(); setIsOpen(true); }}
                  initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                  className={`p-2 rounded-full cursor-pointer shrink-0 ${darkMode ? 'bg-slate-700 text-white' : 'bg-blue-100 text-blue-600'}`}
                >
                  <Menu size={18} />
                </Motion.div>
              )}
            </AnimatePresence>
          </div>
        </Motion.nav>
      </div>

      {}
      <AnimatePresence>
        {isMobile && isOpen && (
          <>
            <Motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] pointer-events-auto"
            />
            <Motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className={`fixed top-0 right-0 bottom-0 w-[80vw] max-w-sm z-[70] shadow-2xl flex flex-col pointer-events-auto ${
                darkMode ? 'bg-slate-900 border-l border-slate-800' : 'bg-white border-l border-slate-200'
              }`}
            >
              <div className={`p-6 flex items-center justify-between border-b ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                <Motion.button
                  whileTap={{ scale: 0.85, rotate: 180 }}
                  onClick={(e) => { e.stopPropagation(); setDarkMode(!darkMode); }}
                  className={`p-2.5 rounded-full ${darkMode ? 'bg-amber-400/20 text-amber-400' : 'bg-indigo-900/10 text-indigo-900'} transition-colors shrink-0`}
                >
                  {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                </Motion.button>
                <button onClick={() => setIsOpen(false)} className={`p-2.5 rounded-full ${darkMode ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-slate-100 text-slate-900 hover:bg-slate-200'}`}>
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-2">
                {navItems.map((item) => {
                   const Icon = item.icon;
                   const isActive = location.pathname === item.path;
                   return (
                     <Link
                       key={item.id}
                       to={item.path}
                       onClick={() => setIsOpen(false)}
                       onMouseEnter={() => setHoveredTab(`mobile-${item.id}`)}
                       onMouseLeave={() => setHoveredTab(null)}
                       className={`relative flex items-center gap-4 px-4 py-4 rounded-2xl text-base font-bold transition-colors z-10 ${
                         isActive
                           ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                           : darkMode ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                       }`}
                     >
                       {hoveredTab === `mobile-${item.id}` && !isActive && (
                         <Motion.div
                           layoutId="mobileNavHover"
                           className={`absolute inset-0 rounded-2xl -z-10 ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}
                           initial={false}
                           transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                         />
                       )}
                       <div className="relative flex items-center justify-center flex-shrink-0">
                         <Icon size={20} className={isActive ? 'text-white' : (darkMode ? 'text-slate-400' : 'text-slate-500')} />
                         {item.badge > 0 && (
                           <span className="absolute -top-1.5 -right-2 flex items-center justify-center min-w-[16px] h-4 px-1 bg-red-500 text-white text-[9px] font-black rounded-full border border-white dark:border-slate-900">
                             {item.badge > 99 ? '99+' : item.badge}
                           </span>
                         )}
                       </div>
                       <span>{item.label}</span>
                     </Link>
                   );
                })}
              </div>

              <div className={`p-6 border-t flex justify-center ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                <InstallAppButton darkMode={darkMode} />
              </div>
            </Motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default NavigationBar;
