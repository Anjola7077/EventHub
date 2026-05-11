import React, { createContext, useState, useEffect } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { Bell, X } from 'lucide-react';
import { io } from 'socket.io-client';
import api from '../api/axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Instantly apply the theme to prevent a white flash during the loading state
    try {
      const isDark = localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (isDark) {
        document.documentElement.classList.add('dark');
        document.body.classList.add('bg-slate-900', 'text-slate-100');
        document.body.style.backgroundColor = '#0f172a';
      }
    } catch (error) {
      console.warn('Failed to apply theme:', error.message);
    }

    // Check if user is already logged in on load
    const checkAuth = async () => {
      try {
        const res = await api.get('/auth/me'); // Adjust to match your backend endpoint
        setUser(res.data?.data || res.data?.user || res.data);
      } catch (error) {
        console.warn('Auth check failed (this is normal if backend is not running):', error.message);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    // Fetch initial unread notification count
    if (user && !loading) {
      api.get('/users/notifications')
        .then(res => {
          if (res.data?.data) {
            setUnreadCount(res.data.data.filter(n => !n.read).length);
          }
        })
        .catch(() => {});
    }

    // Add a small delay to prevent rapid re-renders
    const timeoutId = setTimeout(checkAuth, 100);

    return () => clearTimeout(timeoutId);
  }, [user, loading]);

  // Global Socket.io listener for real-time personal notifications
  useEffect(() => {
    let socket;
    if (user && !loading) {
      const socketUrl = api.defaults.baseURL ? api.defaults.baseURL.replace('/api/v1', '') : 'http://localhost:5000';

      // Get the token from localStorage or fallback to cookies
      const getToken = () => {
        const localToken = localStorage.getItem('token');
        if (localToken) return localToken;
        
        const cookies = document.cookie.split(';');
        const tokenCookie = cookies.find(c => c.trim().startsWith('token='));
        return tokenCookie ? tokenCookie.split('=')[1] : null;
      };

      const token = getToken();

      try {
        socket = io(socketUrl, {
          withCredentials: true,
          auth: {
            token: token
          },
          timeout: 5000, // 5 second connection timeout
          reconnection: true,
          reconnectionAttempts: 3,
          reconnectionDelay: 1000
        });

        socket.on('connect', () => {
          console.log('Socket.IO connected successfully');
        });

        socket.on('notification', (data) => {
          // Don't pop a toast if the user is currently actively viewing the page the notification links to
          if (data.url && window.location.pathname === data.url) return;
          // Show the incoming notification as a toast and hide after 5s
          setToast({ message: data.message, url: data.url });
          setUnreadCount(prev => prev + 1);
          setTimeout(() => setToast(null), 5000);
        });

        socket.on('connect_error', (error) => {
          console.warn('Socket.IO connection failed (this is normal if backend is not running):', error.message);
        });

        socket.on('disconnect', (reason) => {
          console.log('Socket.IO disconnected:', reason);
        });
      } catch (error) {
        console.warn('Failed to initialize Socket.IO connection:', error.message);
      }
    }
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [user, loading]);
  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
        if (res.data?.token) {
      localStorage.setItem('token', res.data.token);
    }
    setUser(res.data?.data || res.data?.user || res.data);
    return res;
  };

  const logout = async () => {
     localStorage.removeItem('token');
    try {
      await api.get('/auth/logout');
    } catch (err) {}
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, setUser, unreadCount, setUnreadCount }}>
      {!loading ? (
        <>
          {children}
          {/* Global Real-Time Notification Toast */}
          <AnimatePresence>
            {toast && (
              <Motion.div
                initial={{ opacity: 0, y: -50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.9 }}
                className="fixed top-24 right-4 md:right-8 z-[100] flex items-start gap-3 p-4 bg-white dark:bg-slate-800 shadow-2xl rounded-2xl border border-slate-200 dark:border-slate-700 max-w-sm"
              >
                <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex flex-shrink-0 items-center justify-center">
                  <Bell size={20} />
                </div>
                <div className="flex-1 pt-1 cursor-pointer" onClick={() => toast.url && (window.location.href = toast.url)}>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{toast.message}</p>
                </div>
                <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"><X size={16} /></button>
              </Motion.div>
            )}
          </AnimatePresence>
        </>
      ) : (
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950 text-[#0a1f6e] dark:text-white">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
            <div className="font-bold text-sm">Loading EventHub...</div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
};