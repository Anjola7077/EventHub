import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import NavigationBar from './components/NavigationBar';
import BackgroundParticles from './components/BackgroundParticles';
import EventDashboard from './pages/EventDashboard';
import CreateEvent from './pages/CreateEvent';
import Chat from './pages/Chat';
import Profile from './pages/Profile';
import Home from './pages/Home';
import FlyerDesigner from './pages/FlyerDesigner';
import EventDetails from './pages/EventDetails';
import Register from './pages/Register';
import Events from './pages/Events';
import Login from './pages/Login';
import EventRegistration from './pages/EventRegistration';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ProtectedRoute from './components/ProtectedRoute';
import OfflineBanner from './components/OfflineBanner';

const AppContent = () => {
  const [darkMode, setDarkMode] = useState(false);
  const location = useLocation();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    document.body.classList.toggle('bg-slate-900', darkMode);
    document.body.classList.toggle('text-slate-100', darkMode);
    document.body.classList.toggle('bg-white', !darkMode);
    document.body.classList.toggle('text-[#0a1f6e]', !darkMode);
    document.body.style.backgroundColor = darkMode ? '#0f172a' : '#ffffff';
    document.body.style.color = darkMode ? '#f8fafc' : '#0a1f6e';
  }, [darkMode]);

  const isResetRoute = location.pathname.startsWith('/reset-password');

  return (
    <div className={`min-h-screen w-full transition-colors duration-700 relative overflow-x-hidden ${
      darkMode 
        ? 'dark bg-slate-900 text-slate-100' 
        : 'bg-white text-[#0a1f6e]'
    }`}>
      {!isResetRoute && <BackgroundParticles darkMode={darkMode} />}
      {!isResetRoute && <OfflineBanner />}
      {!isResetRoute && <NavigationBar darkMode={darkMode} setDarkMode={setDarkMode} />}
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Home darkMode={darkMode} />} />
          <Route path="/home" element={<Home darkMode={darkMode} />} />
          <Route path="/events" element={<Events darkMode={darkMode} />} />
          <Route path="/event-details/:eventId" element={<EventDetails darkMode={darkMode} />} />
          <Route path="/login" element={<Login darkMode={darkMode} />} />
          <Route path="/register" element={<Register darkMode={darkMode} />} />
          <Route path="/flyer-designer" element={<FlyerDesigner darkMode={darkMode} />} />

          <Route path="/forgot-password" element={<ForgotPassword darkMode={darkMode} />} />
          <Route path="/reset-password/:token" element={<ResetPassword darkMode={darkMode} />} />

          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <EventDashboard darkMode={darkMode} />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dashboard/:eventId" 
            element={
              <ProtectedRoute>
                <EventDashboard darkMode={darkMode} />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/create-event" 
            element={
              <ProtectedRoute>
                <CreateEvent darkMode={darkMode} />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/event-registration/:eventId" 
            element={
              <ProtectedRoute>
                <EventRegistration darkMode={darkMode} />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/chat/:eventId" 
            element={
              <ProtectedRoute>
                <Chat darkMode={darkMode} />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <Profile darkMode={darkMode} />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </AnimatePresence>
    </div>
  );
};

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
