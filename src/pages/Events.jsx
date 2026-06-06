import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, Calendar, Lock, ArrowRight, Heart, Navigation, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';

const createCustomIcon = (imageUrl) => {
  return L.divIcon({
    className: 'bg-transparent border-none',
    html: `<div class="relative flex h-14 w-14 items-center justify-center -mt-7 -ml-7 group cursor-pointer">
        <span class="animate-ping absolute inline-flex h-10 w-10 rounded-full bg-blue-500 opacity-40 duration-1000"></span>
        <div class="relative h-12 w-12 rounded-full border-[3px] border-white shadow-lg overflow-hidden bg-slate-200 z-10 group-hover:scale-110 transition-transform">
          <img src="${imageUrl || '/placeholder.png'}" class="w-full h-full object-cover" onerror="this.src='/placeholder.png'" />
        </div>
      </div>`,
    iconSize: [56, 56], iconAnchor: [28, 28], popupAnchor: [0, -28]
  });
};

const createClusterCustomIcon = (cluster) => {
  const count = cluster.getChildCount();
  // Increase bubble size slightly for larger clusters
  let size = 40;
  if (count >= 10) size = 48;
  if (count >= 50) size = 56;
  
  return L.divIcon({
    className: 'bg-transparent border-none',
    html: `<div class="flex items-center justify-center rounded-full bg-blue-600 text-white font-bold border-4 border-blue-200/50 shadow-lg shadow-blue-600/40 hover:bg-blue-700 transition-colors" style="width: ${size}px; height: ${size}px;">
             <span>${count}</span>
           </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
  });
};

const LiveEventStatus = ({ event }) => {
  const [status, setStatus] = useState({ text: '', type: '' });

  useEffect(() => {
    const updateStatus = () => {
      const now = new Date().getTime();
      let startStr = event.date || new Date().toISOString();
      if (startStr.includes('T')) startStr = startStr.split('T')[0];
      const start = new Date(`${startStr}T${event.time || '00:00'}`).getTime();
      
      let endStr = event.endDate || startStr;
      if (endStr.includes('T')) endStr = endStr.split('T')[0];
      const end = new Date(`${endStr}T${event.endTime || '23:59'}`).getTime();

      if (now < start) {
        const diff = start - now;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);
        
        if (days > 0) setStatus({ text: `Starts in ${days}d ${hours}h`, type: 'upcoming' });
        else if (hours > 0) setStatus({ text: `Starts in ${hours}h ${mins}m`, type: 'upcoming' });
        else setStatus({ text: `Starts in ${mins}m ${secs}s`, type: 'urgent' });
        
        // 15 Minute Warning System Notification
        const fifteenKey = `notif_15m_${event._id || event.id}`;
        if (diff <= 15 * 60 * 1000 && diff > 0 && !localStorage.getItem(fifteenKey)) {
          if (window.Notification?.permission === 'granted') {
            new window.Notification("Event Starting Soon! ⏱️", { body: `${event.title} begins in 15 minutes!`, icon: event.coverImage || '/logo.png' });
          }
          localStorage.setItem(fifteenKey, 'true');
        }
      } else if (now >= start && now <= end) {
        setStatus({ text: 'LIVE 🔴', type: 'ongoing' });
        
        // Live System Notification
        const liveKey = `notif_live_${event._id || event.id}`;
        if (!localStorage.getItem(liveKey)) {
          if (now - start < 15 * 60 * 1000 && window.Notification?.permission === 'granted') {
            new window.Notification("Event is LIVE! 🔴", { body: `${event.title} has officially started!`, icon: event.coverImage || '/logo.png' });
          }
          localStorage.setItem(liveKey, 'true');
        }
      } else {
        setStatus({ text: 'ENDED', type: 'ended' });
      }
    };
    
    updateStatus();
    const interval = setInterval(updateStatus, 1000);
    return () => clearInterval(interval);
  }, [event]);

  if (!status.text) return null;

  const baseClasses = "absolute bottom-4 right-4 px-3 py-1.5 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-wider border shadow-lg z-10 flex items-center gap-1.5 transition-colors";
  
  if (status.type === 'ended') return <div className={`${baseClasses} bg-slate-800/80 text-slate-300 border-slate-600`}>{status.text}</div>;
  if (status.type === 'ongoing') return <div className={`${baseClasses} bg-red-500/90 text-white border-red-400 animate-pulse`}>{status.text}</div>;
  if (status.type === 'urgent') return <div className={`${baseClasses} bg-amber-500/90 text-white border-amber-400`}>{status.text}</div>;
  return <div className={`${baseClasses} bg-emerald-500/90 text-white border-emerald-400`}>{status.text}</div>;
};

const Events = ({ darkMode }) => {
  const { user } = useContext(AuthContext);
  const isAuthenticated = !!user;
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCity, setSearchCity] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [mapCenter, setMapCenter] = useState([6.5244, 3.3792]);
  
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const categories = ['All', 'Technology', 'Music', 'Business', 'Networking', 'Startups', 'Education', 'Design'];
  
  const glassStyle = darkMode 
    ? 'bg-slate-800/40 border-slate-700/50 backdrop-blur-2xl shadow-xl' 
    : 'bg-white/60 border-white/50 backdrop-blur-2xl shadow-[0_8px_32px_rgba(10,31,110,0.08)]';

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const observer = useRef();
  const lastEventElementRef = useCallback(node => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      // Only paginate if we're not doing a heavy geo-search right now
      if (entries[0].isIntersecting && hasMore && !searchCity) {
        setPage(prev => prev + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, hasMore, searchCity]);

  useEffect(() => {
    const fetchEvents = async () => {
      if (searchCity) return;
      try {
        setLoading(true);
        const query = `?page=${page}&limit=12${activeCategory !== 'All' ? `&category=${activeCategory}` : ''}`;
        const res = await api.get(`/events${query}`);

        const fetchedEvents = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : (res.data?.data || []));

        if (page === 1) {
          setEvents(fetchedEvents);
        } else {
          setEvents(prev => [...prev, ...fetchedEvents]);
        }

        setHasMore(fetchedEvents.length === 12);
      } catch (error) {
        console.error("Failed to fetch events:", error?.response?.status, error?.response?.data || error.message);
        if (page === 1) setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [page, activeCategory, searchCity]);

  const handleCitySearch = async (e) => {
    e?.preventDefault();
    if (!searchCity.trim()) return;
    setIsSearchingLocation(true);
    try {
      const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchCity)}`);
      const geoData = await geoRes.json();
      if (geoData && geoData.length > 0) {
        const lat = parseFloat(geoData[0].lat);
        const lng = parseFloat(geoData[0].lon);
        setMapCenter([lat, lng]);
        const res = await api.get(`/events?lat=${lat}&lng=${lng}&radius=50&limit=100`);
        setEvents(res.data.data);
        setHasMore(false); // Disable infinite scroll during map mode
      } else { alert("City not found."); }
    } catch (err) { console.error("Map search failed", err); } 
    finally { setIsSearchingLocation(false); }
  };

  const handleGPSLocation = () => {
    if (!navigator.geolocation) return alert("Geolocation is not supported by your browser");
    setIsSearchingLocation(true);
    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;
      setMapCenter([latitude, longitude]);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
        const data = await res.json();
        if (data?.address) setSearchCity(data.address.city || data.address.town || data.address.state || 'My Location');
        const eventsRes = await api.get(`/events?lat=${latitude}&lng=${longitude}&radius=50&limit=100`);
        setEvents(eventsRes.data.data);
        setHasMore(false);
      } catch (err) { console.error(err); } finally { setIsSearchingLocation(false); }
    }, () => { alert("Location access denied."); setIsSearchingLocation(false); });
  };

  const handleCategoryChange = (cat) => {
    setActiveCategory(cat);
    setPage(1);
  };

  const handleLikeEvent = async (e, eventId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return; // Optional: Add a login prompt here
    
    const currentUserId = String(user._id || user.id);
    // Optimistic UI Update
    setEvents(prev => prev.map(ev => {
      if ((ev._id || ev.id) === eventId) {
        const isLiked = Array.isArray(ev.likes) && ev.likes.some(id => String(id?._id || id) === currentUserId);
        return {
          ...ev,
          likes: isLiked ? (ev.likes || []).filter(id => String(id?._id || id) !== currentUserId) : [...(ev.likes || []), currentUserId]
        };
      }
      return ev;
    }));

    try {
      await api.post(`/events/${eventId}/like`);
    } catch (error) {
      console.error("Like failed", error);
    }
  };

  const filteredEvents = events.filter(ev => 
    ev.title.toLowerCase().includes(debouncedQuery.toLowerCase())
  );

  return (
    <Motion.main 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="pt-28 pb-20 px-4 md:px-8 max-w-7xl mx-auto"
    >
      <div className="text-center mb-12">
        <h1 className={`text-4xl md:text-5xl font-black mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Discover Events</h1>
        <p className={`text-sm font-semibold opacity-100 max-w-xl mx-auto ${darkMode ? 'text-white' : 'text-slate-600'}`}>Find your next experience and connect with like-minded people.</p>
      </div>

      <form onSubmit={handleCitySearch} className="mb-8 flex gap-3 max-w-2xl mx-auto">
        <div className="relative flex-1 group">
          <input type="text" value={searchCity} onChange={(e) => setSearchCity(e.target.value)} placeholder="Search by city (e.g., London, New York)" className={`w-full px-5 py-3.5 pl-12 rounded-2xl border transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-500/20 ${darkMode ? 'bg-slate-900/50 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'}`} />
          <button type="button" onClick={handleGPSLocation} title="Use my current location" className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors z-10">
            <Navigation size={18} className={isSearchingLocation ? "animate-pulse text-blue-400" : ""} />
          </button>
        </div>
        <button type="submit" disabled={isSearchingLocation} className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition disabled:opacity-50 shadow-lg shadow-blue-600/30">
          {isSearchingLocation ? '...' : 'Search Map'}
        </button>
        {searchCity && <button type="button" onClick={() => { setSearchCity(''); setPage(1); }} className={`px-4 py-3.5 rounded-2xl font-bold transition border ${darkMode ? 'border-slate-700 text-white hover:bg-slate-800' : 'border-slate-200 text-slate-700 hover:bg-slate-100'}`}><X size={18} /></button>}
      </form>
 
      <div className={`sticky top-24 z-20 max-w-4xl mx-auto p-2 rounded-full border mb-10 flex flex-col md:flex-row gap-2 ${glassStyle}`}>
        <div className="relative flex-1 group">
          <Search size={18} className={`absolute left-5 top-1/2 -translate-y-1/2 transition-colors ${darkMode ? 'text-slate-400 group-focus-within:text-blue-400' : 'text-slate-400 group-focus-within:text-blue-600'}`} />
          <input 
            type="text" 
            placeholder="Search events, meetups..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full bg-transparent border-none focus:outline-none pl-12 pr-5 py-3.5 text-sm font-bold transition-all rounded-full focus:ring-2 focus:ring-blue-500/20 ${darkMode ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'}`}
          />
        </div>
        <div className="w-px bg-black/10 dark:bg-white/10 hidden md:block my-2" />
        <div className="flex overflow-x-auto no-scrollbar px-2 items-center gap-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => handleCategoryChange(cat)}
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

      <div className="relative">
        {/* Interactive Map View */}
        <div className={`h-80 w-full rounded-[2.5rem] overflow-hidden border shadow-xl mb-12 z-0 relative ${darkMode ? 'border-slate-700 bg-slate-900 [&_.leaflet-container]:invert [&_.leaflet-container]:hue-rotate-180 [&_.leaflet-container]:brightness-90' : 'border-slate-200 bg-white'}`}>
          <MapContainer key={events.length + '-' + mapCenter.join(',')} center={mapCenter} zoom={12} scrollWheelZoom={true} style={{ height: '100%', width: '100%', zIndex: 1 }}>
            <TileLayer attribution={`&copy; <a href="https://www.openstreetmap.org/copyright" ${darkMode ? 'style="color: #94a3b8;"' : ''}>OpenStreetMap</a> contributors`} url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MarkerClusterGroup 
              chunkedLoading
              zoomToBoundsOnClick={false}
              iconCreateFunction={createClusterCustomIcon}
              polygonOptions={{
                fillColor: '#2563eb',
                color: '#2563eb',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.2
              }}
              eventHandlers={{
                clusterclick: (e) => {
                  const cluster = e.layer;
                  const map = cluster._map || e.target._map;
                  if (map) {
                    map.flyToBounds(cluster.getBounds(), { padding: [50, 50], duration: 1.5, easeLinearity: 0.25 });
                  }
                }
              }}
            >
            {events.map((event) => {
              if (event.location?.type === 'Point' && event.location.coordinates?.length === 2) {
                const lat = event.location.coordinates[1];
                const lng = event.location.coordinates[0];
                return (
                  <Marker key={event._id || event.id} position={[lat, lng]} icon={createCustomIcon(event.coverImage)}>
                    <Popup className={`rounded-xl shadow-lg ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
                      <div className="p-2 min-w-[150px]">
                        <img src={event.coverImage || '/placeholder.png'} alt={event.title} className="w-full h-20 object-cover rounded-lg mb-2" />
                        <p className="font-bold text-[13px] leading-tight mb-1 truncate">{event.title}</p>
                        <p className={`text-[10px] mb-3 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{new Date(event.date).toLocaleDateString()}</p>
                        <Link to={`/event-details/${event._id || event.id}`} className="block w-full text-center bg-blue-600 hover:bg-blue-700 !text-white text-xs font-bold py-2 px-3 rounded-lg transition-colors shadow-sm" style={{ color: '#ffffff' }}>View Event</Link>
                      </div>
                    </Popup>
                  </Marker>
                );
              }
              return null;
            })}
            </MarkerClusterGroup>
          </MapContainer>
        </div>

        {!isAuthenticated && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/30 dark:bg-slate-900/30 backdrop-blur-md rounded-[2.5rem]">
            <Motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className={`p-8 rounded-[2rem] border text-center max-w-sm w-full mx-4 shadow-2xl ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-blue-50'}`}
            >
              <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Lock size={28} />
              </div>
              <h3 className={`text-xl font-black mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Unlock Experiences</h3>
              <p className={`text-sm font-medium opacity-100 mb-8 ${darkMode ? 'text-white' : 'text-slate-600'}`}>Sign in to discover personalized events and reserve your tickets.</p>
              <Link to="/login" className="block w-full">
                <button className="w-full py-4 rounded-2xl bg-blue-600 text-white font-bold shadow-lg hover:bg-blue-700 transition-colors">
                  Sign In to Continue
                </button>
               </Link>
            </Motion.div>
          </div>
        )}

        {loading && events.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className={`rounded-[2rem] border overflow-hidden h-[360px] animate-pulse ${darkMode ? 'bg-slate-800/40 border-slate-700/50' : 'bg-slate-50 border-slate-200'}`}>
                <div className={`h-48 ${darkMode ? 'bg-slate-700/50' : 'bg-slate-200'}`} />
                <div className="p-6 space-y-4">
                  <div className={`h-6 rounded-md w-3/4 ${darkMode ? 'bg-slate-700/50' : 'bg-slate-200'}`} />
                  <div className={`h-4 rounded-md w-1/2 ${darkMode ? 'bg-slate-700/50' : 'bg-slate-200'}`} />
                  <div className={`h-4 rounded-md w-full ${darkMode ? 'bg-slate-700/50' : 'bg-slate-200'}`} />
                </div>
              </div>
            ))}
          </div>
        ) : events.length === 0 && !loading ? (
          <Motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`py-16 px-6 text-center rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center ${darkMode ? 'border-slate-700 bg-slate-800/20' : 'border-slate-200 bg-slate-50'}`}
          >
            <div className={`w-20 h-20 mb-6 rounded-full flex items-center justify-center ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-white shadow-sm text-slate-400'}`}>
              <Search size={32} />
            </div>
            <h3 className={`text-xl font-black mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>No events found</h3>
            <p className={`text-sm font-medium max-w-sm mb-8 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {searchQuery 
                ? `We couldn't find any events matching "${searchQuery}". Try adjusting your filters or search terms.` 
                : `We couldn't find any events in this category. Try adjusting your filters.`}
            </p>
            <button 
              onClick={() => { setSearchQuery(''); setActiveCategory('All'); }}
              className="px-8 py-3.5 rounded-2xl text-sm font-bold bg-blue-600 text-white shadow-lg shadow-blue-600/30 hover:bg-blue-700 hover:-translate-y-0.5 transition-all"
            >
              Clear Search
            </button>
          </Motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <AnimatePresence>
              {filteredEvents.map((event, i) => (
                <Motion.div
                  ref={filteredEvents.length === i + 1 ? lastEventElementRef : null}
                  key={event._id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className={`group flex flex-col rounded-[2rem] border overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl ${glassStyle}`}
                >
                  <div className="h-48 bg-blue-500 relative overflow-hidden">
                    <img
                      src={event.coverImage || '/placeholder.png'}
                      alt={event.title}
                      className="absolute inset-0 w-full h-full object-cover"
                      onError={(e) => { e.target.src = '/placeholder.png'; }}
                    />
                    <div className="absolute inset-0 bg-black/25" />
                    <div className="absolute top-4 left-4 px-3 py-1.5 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-wider text-white border border-white/20">
                      {event.category || 'General'}
                    </div>
                    <button 
                      onClick={(e) => handleLikeEvent(e, event._id || event.id)} 
                    className={`absolute top-4 right-4 p-2.5 backdrop-blur-md rounded-full border transition-colors z-10 ${Array.isArray(event.likes) && event.likes.some(id => String(id?._id || id) === String(user?._id || user?.id)) ? 'bg-red-500 border-red-500 text-white' : 'bg-white/20 border-white/20 text-white hover:bg-red-500 hover:border-red-500'}`}
                    >
                    <Heart size={16} className={Array.isArray(event.likes) && event.likes.some(id => String(id?._id || id) === String(user?._id || user?.id)) ? 'fill-current' : ''} />
                    </button>
                    <LiveEventStatus event={event} />
                  </div>
                  <div className="p-6 flex-1 flex flex-col">
                    <h3 className={`text-lg font-black leading-tight mb-3 group-hover:text-blue-500 transition-colors line-clamp-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      {event.title}
                    </h3>
                    <div className="space-y-2 mt-auto">
                      <div className={`flex items-center gap-2 text-xs font-bold opacity-100 ${darkMode ? 'text-white' : 'text-slate-600'}`}>
                        <Calendar size={14} className="text-blue-500" />
                        {new Date(event.date).toLocaleDateString()}
                      </div>
                      <div className={`flex items-center gap-2 text-xs font-bold opacity-100 ${darkMode ? 'text-white' : 'text-slate-600'}`}>
                        <MapPin size={14} className="text-blue-500" />
                        <span className="truncate">{event.location?.formattedAddress || 'Location TBA'}</span>
                      </div>
                    </div>
                    <div className="mt-6 pt-5 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
                      <div className="flex -space-x-2">
                        <div className={`text-sm font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                          {event.price === 0 ? 'FREE' : `₦${event.price.toLocaleString()}`}
                        </div>
                      </div>
                      <Link to={`/event-details/${event._id}`}>
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
        )}
      </div>
    </Motion.main>
  );
};

export default Events;
