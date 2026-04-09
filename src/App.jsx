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

  return (
    <div className={`min-h-screen w-full transition-colors duration-700 relative overflow-x-hidden ${
      darkMode 
        ? 'dark bg-slate-900 text-slate-100' 
        : 'bg-white text-[#0a1f6e]'
    }`}>
      <BackgroundParticles darkMode={darkMode} />
      <NavigationBar darkMode={darkMode} setDarkMode={setDarkMode} />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Home darkMode={darkMode} />} />
          <Route path="/home" element={<Home darkMode={darkMode} />} />
          <Route path="/dashboard" element={<EventDashboard darkMode={darkMode} />} />
          <Route path="/events" element={<Events darkMode={darkMode} />} />
          <Route path="/create-event" element={<CreateEvent darkMode={darkMode} />} />
          <Route path="/flyer-designer" element={<FlyerDesigner darkMode={darkMode} />} />
          <Route path="/event-details" element={<EventDetails darkMode={darkMode} />} />
          <Route path="/event-registration" element={<EventRegistration darkMode={darkMode} />} />
          <Route path="/login" element={<Login darkMode={darkMode} />} />
          <Route path="/register" element={<Register darkMode={darkMode} />} />
          <Route path="/chat/:eventId" element={<Chat darkMode={darkMode} />} />
          <Route path="/profile" element={<Profile darkMode={darkMode} />} />
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
