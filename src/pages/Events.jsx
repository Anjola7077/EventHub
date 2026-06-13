import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, Calendar, ArrowRight, Heart, Navigation, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { EVENT_FILTER_CATEGORIES } from '../constants/categories';
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

  const baseClasses = "absolute bottom-2 right-2 sm:bottom-3 sm:right-3 px-2 py-1 sm:px-3 sm:py-1.5 backdrop-blur-md rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider border shadow-lg z-10 flex items-center gap-1.5 transition-colors";

  if (status.type === 'ended') return <div className={`${baseClasses} bg-slate-500/90 text-white border-slate-400`}>{status.text}</div>;
  if (status.type === 'ongoing') return <div className={`${baseClasses} bg-red-500/90 text-white border-red-400 animate-pulse`}>{status.text}</div>;
  if (status.type === 'urgent') return <div className={`${baseClasses} bg-amber-500/90 text-white border-amber-400`}>{status.text}</div>;
  return <div className={`${baseClasses} bg-emerald-500/90 text-white border-emerald-400`}>{status.text}</div>;
};

const Events = () => {
  const { user } = useContext(AuthContext);
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

  const categories = EVENT_FILTER_CATEGORIES;

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
        setEvents(res.data?.data || []);
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
        setEvents(eventsRes.data?.data || []);
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

  const isLiked = (event) =>
    Array.isArray(event.likes) && event.likes.some(id => String(id?._id || id) === String(user?._id || user?.id));

  return (
    <Motion.main
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="eh-page-bg min-h-screen pt-28 pb-24"
    >
      <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
        {/* ---- Header ---- */}
        <header className="mb-9 max-w-2xl text-left">
          <p className="eh-eyebrow flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
            Discover
          </p>
          <h1 className="eh-display mt-4 text-[clamp(2.2rem,6vw,3.6rem)] font-extrabold leading-[1]">
            What’s on <span className="eh-text-accent">near you</span>
          </h1>
          <p className="mt-4 max-w-[52ch] text-lg eh-text-soft">
            Find your next experience and meet people who are into the same things.
          </p>
        </header>

        {/* ---- City / map search ---- */}
        <form onSubmit={handleCitySearch} className="mb-5 flex flex-wrap gap-3">
          <div className="relative min-w-[240px] flex-1">
            <button type="button" onClick={handleGPSLocation} title="Use my current location" aria-label="Use my current location" className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-lg p-1.5 text-brand transition-colors hover:bg-surface-2">
              <Navigation size={18} className={isSearchingLocation ? "animate-pulse" : ""} />
            </button>
            <input
              type="text"
              value={searchCity}
              onChange={(e) => setSearchCity(e.target.value)}
              placeholder="Search by city (e.g. London, Lagos)"
              className="w-full rounded-2xl border border-line bg-surface px-5 py-3.5 pl-12 text-sm eh-text placeholder:text-ink-muted transition focus:border-brand focus:outline-none focus:[box-shadow:var(--eh-ring)]"
            />
          </div>
          <button type="submit" disabled={isSearchingLocation} className="eh-btn eh-btn-primary disabled:opacity-50">
            {isSearchingLocation ? 'Searching…' : 'Search map'}
          </button>
          {searchCity && (
            <button type="button" onClick={() => { setSearchCity(''); setPage(1); }} aria-label="Clear" className="eh-btn eh-btn-ghost px-4">
              <X size={18} />
            </button>
          )}
        </form>

        {/* ---- Sticky search + categories ---- */}
        <div className="eh-surface sticky top-24 z-20 mb-10 flex flex-col gap-2 rounded-3xl p-2 shadow-eh-sm md:flex-row md:items-center md:rounded-full">
          <div className="group relative flex-1">
            <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-ink-muted transition-colors group-focus-within:text-brand" />
            <input
              type="text"
              placeholder="Search events, meetups…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-full border-none bg-transparent py-3 pl-12 pr-5 text-sm font-semibold eh-text placeholder:text-ink-muted focus:outline-none"
            />
          </div>
          <div className="my-1 hidden w-px self-stretch bg-line md:block" />
          <div className="no-scrollbar flex items-center gap-2 overflow-x-auto px-1 pb-1 md:pb-0">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => handleCategoryChange(cat)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition-all ${
                  activeCategory === cat
                    ? 'bg-brand text-white shadow-eh-sm'
                    : 'bg-surface-2 text-ink-soft hover:text-brand'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          {/* Interactive Map View */}
          <div className="relative z-0 mb-12 h-80 w-full overflow-hidden rounded-[2rem] border border-line bg-surface shadow-eh-lg dark:[&_.leaflet-container]:invert dark:[&_.leaflet-container]:hue-rotate-180 dark:[&_.leaflet-container]:brightness-90">
            <MapContainer key={events.length + '-' + mapCenter.join(',')} center={mapCenter} zoom={12} scrollWheelZoom={true} style={{ height: '100%', width: '100%', zIndex: 1 }}>
              <TileLayer attribution={`&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors`} url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
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
                        <Popup>
                          <div className="min-w-[150px] p-1">
                            <img src={event.coverImage || '/placeholder.png'} alt={event.title} className="mb-2 h-20 w-full rounded-lg object-cover" />
                            <p className="mb-1 truncate text-[13px] font-bold leading-tight">{event.title}</p>
                            <p className="mb-3 text-[10px] text-slate-500">{new Date(event.date).toLocaleDateString()}</p>
                            <Link to={`/event-details/${event._id || event.id}`} className="block w-full rounded-lg bg-blue-600 px-3 py-2 text-center text-xs font-bold !text-white transition-colors hover:bg-blue-700" style={{ color: '#ffffff' }}>View event</Link>
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

          {loading && events.length === 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="animate-pulse overflow-hidden rounded-2xl border border-line bg-surface-2 sm:rounded-[1.75rem]">
                  <div className="aspect-[4/3] bg-line" />
                  <div className="space-y-3 p-3 sm:p-5">
                    <div className="h-4 w-3/4 rounded-md bg-line sm:h-5" />
                    <div className="h-3 w-1/2 rounded-md bg-line" />
                    <div className="h-3 w-full rounded-md bg-line" />
                  </div>
                </div>
              ))}
            </div>
          ) : events.length === 0 && !loading ? (
            <Motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-line bg-surface-2 px-6 py-16 text-center"
            >
              <div className="mb-6 grid h-20 w-20 place-items-center rounded-full bg-surface text-ink-muted shadow-eh-sm">
                <Search size={30} />
              </div>
              <h3 className="eh-display text-xl font-bold">No events found</h3>
              <p className="mb-8 mt-2 max-w-sm text-sm eh-text-soft">
                {searchQuery
                  ? `Nothing matches “${searchQuery}”. Try a different search or filter.`
                  : `No events in this category yet. Try adjusting your filters.`}
              </p>
              <button
                onClick={() => { setSearchQuery(''); setActiveCategory('All'); }}
                className="eh-btn eh-btn-primary"
              >
                Clear search
              </button>
            </Motion.div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                    className="eh-surface group flex flex-col overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-1.5 hover:shadow-eh-lg sm:rounded-[1.75rem]"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-brand">
                      <img
                        src={event.coverImage || '/placeholder.png'}
                        alt={event.title}
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={(e) => { e.target.src = '/placeholder.png'; }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                      <div className="absolute left-2 top-2 rounded-full border border-white/20 bg-black/30 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-white backdrop-blur-md sm:left-3 sm:top-3 sm:px-3 sm:py-1.5 sm:text-[10px]">
                        {event.category || 'General'}
                      </div>
                      <button
                        onClick={(e) => handleLikeEvent(e, event._id || event.id)}
                        aria-label="Save event"
                        className={`absolute right-2 top-2 z-10 grid h-9 w-9 place-items-center rounded-full border backdrop-blur-md transition-colors sm:right-3 sm:top-3 ${isLiked(event) ? 'border-red-500 bg-red-500 text-white' : 'border-white/20 bg-black/30 text-white hover:border-red-500 hover:bg-red-500'}`}
                      >
                        <Heart size={15} className={isLiked(event) ? 'fill-current' : ''} />
                      </button>
                      <LiveEventStatus event={event} />
                    </div>
                    <div className="flex flex-1 flex-col p-3 sm:p-5">
                      <Link to={`/event-details/${event._id}`} className="mb-2 sm:mb-3">
                        <h3 className="eh-display line-clamp-2 text-sm font-bold leading-snug transition-colors group-hover:text-brand sm:text-base md:text-lg">
                          {event.title}
                        </h3>
                      </Link>
                      <div className="mt-auto space-y-1.5">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold eh-text-soft sm:gap-2 sm:text-xs">
                          <Calendar size={13} className="shrink-0 text-brand" />
                          <span className="truncate">{new Date(event.date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold eh-text-soft sm:gap-2 sm:text-xs">
                          <MapPin size={13} className="shrink-0 text-brand" />
                          <span className="truncate">{event.location?.formattedAddress || 'Location TBA'}</span>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t border-line pt-3 sm:mt-5 sm:pt-4">
                        <div className={`eh-display text-sm font-extrabold sm:text-base ${event.price ? 'eh-text' : 'eh-text-accent'}`}>
                          {event.price ? `₦${Number(event.price).toLocaleString()}` : 'Free'}
                        </div>
                        <Link to={`/event-details/${event._id}`} aria-label={`View ${event.title}`}>
                          <span className="grid h-8 w-8 place-items-center rounded-full bg-surface-2 text-ink transition-colors hover:bg-brand hover:text-white sm:h-10 sm:w-10">
                            <ArrowRight size={17} />
                          </span>
                        </Link>
                      </div>
                    </div>
                  </Motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </Motion.main>
  );
};

export default Events;
