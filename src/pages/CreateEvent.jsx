import React, { useState, useEffect } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { Calendar, MapPin, Image as ImageIcon, AlignLeft, Navigation, Loader2, Landmark, Ticket, Plus, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import sanitizeError from '../utils/errorMessages';
import { EVENT_CATEGORIES } from '../constants/categories';

const CreateEvent = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('Technology');
  const [publicEvent, setPublicEvent] = useState(true);
  const [approvalRequired, setApprovalRequired] = useState(false);
  const [coverImage, setCoverImage] = useState(null);
  const [coverImageFile, setCoverImageFile] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState(() => {
    const saved = localStorage.getItem('createEventDraft');
    return saved ? JSON.parse(saved) : {
      title: '', description: '', date: '', time: '', endDate: '', endTime: '',
      location: '', lat: '', lng: '', price: 0, capacity: '',
      bankName: '', accountNumber: '', accountName: '',
    };
  });

  useEffect(() => {
    localStorage.setItem('createEventDraft', JSON.stringify(formData));
  }, [formData]);

  const [ticketTiers, setTicketTiers] = useState(() => {
    const saved = localStorage.getItem('createEventTiers');
    return saved ? JSON.parse(saved) : [];
  });
  useEffect(() => {
    localStorage.setItem('createEventTiers', JSON.stringify(ticketTiers));
  }, [ticketTiers]);

  const TIER_COLORS = ['#d4a017', '#7c3aed', '#2563eb', '#0d9488', '#db2777', '#dc2626'];
  const addTier = () => setTicketTiers(prev => [...prev, { name: '', price: 0, capacity: '', color: TIER_COLORS[prev.length % TIER_COLORS.length], perks: '' }]);
  const updateTier = (idx, key, value) => setTicketTiers(prev => prev.map((t, i) => (i === idx ? { ...t, [key]: value } : t)));
  const removeTier = (idx) => setTicketTiers(prev => prev.filter((_, i) => i !== idx));

  const hasPaidTier = ticketTiers.some(t => Number(t.price) > 0);
  const isPaidEvent = Number(formData.price) > 0 || hasPaidTier;

  const categories = EVENT_CATEGORIES;

  const categories = ['Technology', 'Design', 'Business', 'Music', 'Networking', 'Education'];
  const glassStyle = darkMode
    ? 'bg-slate-800/40 border-slate-700/50 backdrop-blur-2xl shadow-xl'
    : 'bg-white/60 border-white/50 backdrop-blur-2xl shadow-[0_8px_32px_rgba(10,31,110,0.08)]';
  const getInputStyle = (field) => `w-full px-5 py-4 rounded-2xl text-sm font-medium border transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-500/20 ${
    errors[field] ? 'border-red-500 bg-red-50 dark:bg-red-500/10' : (darkMode ? 'bg-slate-900/50 border-slate-700 focus:border-blue-500 focus:bg-slate-900 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 focus:border-blue-500 focus:bg-white text-slate-900 placeholder-slate-400')
  }`;

  const labelStyle = 'mb-2 block text-xs font-bold uppercase tracking-wider eh-text-soft';

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file.');
      return;
    }

    setCoverImageFile(file);
    setCoverImage(URL.createObjectURL(file));
    setError('');
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setFormData(prev => ({ ...prev, lat: latitude, lng: longitude }));

        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          if (data && data.display_name) {
            setFormData(prev => ({ ...prev, location: data.display_name, lat: latitude, lng: longitude }));
          }
        } catch (e) {
          console.error("Reverse geocoding failed", e);
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        setError('Unable to retrieve your location. Please check your browser permissions.');
        setIsLocating(false);
      }
    );
  };

  const searchTimeoutRef = React.useRef(null);

  const handleLocationSearch = async (query) => {
    setFormData(prev => ({ ...prev, location: query }));
    setShowSuggestions(true);

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!query || query.length < 3) {
      setLocationSuggestions([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearchingAddress(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`);
        const data = await res.json();
        setLocationSuggestions(data || []);
      } catch (e) {
        console.error('Address search failed', e);
        setLocationSuggestions([]);
      } finally {
        setIsSearchingAddress(false);
      }
    }, 400);
  };

  const handleSelectSuggestion = (suggestion) => {
    setFormData(prev => ({
      ...prev,
      location: suggestion.display_name,
      lat: parseFloat(suggestion.lat),
      lng: parseFloat(suggestion.lon),
    }));
    setLocationSuggestions([]);
    setShowSuggestions(false);
  };

  const submitEvent = async (status) => {
    const newErrors = {};
    if (!formData.title) newErrors.title = true;
    if (!formData.description) newErrors.description = true;
    if (!formData.date) newErrors.date = true;
    if (!formData.location) newErrors.location = true;

    if (isPaidEvent) {
      if (!formData.bankName) newErrors.bankName = true;
      if (!formData.accountNumber) newErrors.accountNumber = true;
      if (!formData.accountName) newErrors.accountName = true;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setError('Please fill in all required fields highlighted in red.');
      return;
    }
    if (formData.endDate && new Date(formData.endDate) < new Date(formData.date)) {
      setErrors({ ...newErrors, endDate: true });
      setError('End Date cannot be set before the Start Date.');
      return;
    }
    setErrors({});
    setError('');
    setSuccess('');
    setUploadProgress(0);
    setIsLoading(true);
    try {
      let payload;
      let config = {
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
          }
        }
      };

      const locationData = formData.lat && formData.lng ? JSON.stringify({ type: 'Point', coordinates: [parseFloat(formData.lng), parseFloat(formData.lat)], formattedAddress: formData.location || 'Unknown Location' }) : formData.location;

      const cleanTiers = ticketTiers
        .filter(t => t.name && t.name.trim())
        .map(t => ({ name: t.name.trim(), price: Number(t.price) || 0, capacity: t.capacity ? parseInt(t.capacity) : undefined, color: t.color, perks: (t.perks || '').trim() }));

      if (coverImageFile) {
        payload = new FormData();
        Object.keys(formData).forEach(key => {
          if (!['location', 'lat', 'lng', 'capacity'].includes(key) && formData[key] !== undefined && formData[key] !== '') {
            payload.append(key, formData[key]);
          }
        });
        if (formData.capacity) payload.append('capacity', parseInt(formData.capacity));
        if (locationData) payload.append('location', locationData);
        payload.append('category', activeCategory);
        payload.append('isPublic', publicEvent);
        payload.append('approvalRequired', approvalRequired);
        payload.append('status', status);
        if (cleanTiers.length) payload.append('ticketTiers', JSON.stringify(cleanTiers));
        payload.append('coverImage', coverImageFile);
      } else {
        payload = {
          ...formData,
          capacity: formData.capacity ? parseInt(formData.capacity) : undefined,
          location: formData.lat && formData.lng ? { type: 'Point', coordinates: [parseFloat(formData.lng), parseFloat(formData.lat)], formattedAddress: formData.location || 'Unknown Location' } : formData.location,
          category: activeCategory,
          isPublic: publicEvent,
          approvalRequired,
          status: status,
          ticketTiers: cleanTiers
        };
      }

      await api.post('/events', payload, config);
      localStorage.removeItem('createEventDraft');
      localStorage.removeItem('createEventTiers');
      setSuccess(`Event successfully saved as ${status}!`);
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (error) {
      setError(sanitizeError(error, 'Failed to save event. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Motion.main
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="eh-page-bg min-h-screen px-5 pb-24 pt-28 sm:px-8 md:pt-32"
    >
      <AnimatePresence>
        {isLoading && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <Motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="eh-surface flex w-full max-w-sm flex-col items-center justify-center rounded-[1.75rem] p-8 text-center shadow-eh-lg"
            >
              <Loader2 size={44} className="mb-4 animate-spin text-brand" />
              <h2 className="eh-display text-xl font-bold">{uploadProgress === 100 ? 'Processing…' : 'Saving event…'}</h2>
              <p className="mb-4 mt-2 max-w-xs text-sm eh-text-soft">Hang tight while we upload your cover image and save the details.</p>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full bg-brand transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
              </div>
              <p className="mt-2 text-xs font-bold eh-text-soft">{uploadProgress}% uploaded</p>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-9">
          <p className="eh-eyebrow flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
            Organize
          </p>
          <h1 className="eh-display mt-4 text-[clamp(2rem,5vw,3rem)] font-extrabold leading-[1]">Create an event</h1>
          <p className="mt-3 max-w-[52ch] text-lg eh-text-soft">Set the details, drop a cover image, and get your crowd together.</p>
        </header>

      {error && <div className="mb-8 p-4 rounded-xl bg-red-500/10 text-red-500 text-sm font-bold border border-red-500/20">{error}</div>}
      {success && <div className="mb-8 p-4 rounded-xl bg-emerald-500/10 text-emerald-500 text-sm font-bold border border-emerald-500/20">{success}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">

          <Motion.section whileHover={{ scale: 1.01 }} className={`p-8 rounded-[2rem] border ${glassStyle}`}>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-500"><AlignLeft size={20} /></div>
              <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Basic Information</h2>
            </div>
            <div className="space-y-5">
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider opacity-100 mb-2 ${darkMode ? 'text-white' : 'text-slate-600'}`}>Event Title</label>
                <input type="text" name="title" value={formData.title} onChange={handleInputChange} placeholder="e.g., Summer Networking Mixer" className={getInputStyle('title')} />
              </div>
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider opacity-100 mb-3 ${darkMode ? 'text-white' : 'text-slate-600'}`}>Category</label>
                <div className="flex flex-wrap gap-3">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${
                        activeCategory === cat
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 scale-105'
                          : `border ${darkMode ? 'border-slate-700 hover:bg-slate-800 text-white' : 'border-blue-200 hover:bg-blue-50 text-slate-700'} opacity-100 hover:opacity-100`
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </section>

          <Motion.section whileHover={{ scale: 1.01 }} className={`p-8 rounded-[2rem] border ${glassStyle}`}>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-500"><Calendar size={20} /></div>
              <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Date & Location</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider opacity-100 mb-2 ${darkMode ? 'text-white' : 'text-slate-600'}`}>Start Date</label>
                <input type="date" name="date" value={formData.date} onChange={handleInputChange} className={getInputStyle('date')} />
              </div>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label className={labelStyle}>Start date</label>
                  <input type="date" name="date" value={formData.date} onChange={handleInputChange} className={getInputStyle('date')} />
                </div>
                <div>
                  <label className={labelStyle}>Start time</label>
                  <input type="time" name="time" value={formData.time} onChange={handleInputChange} className={getInputStyle('time')} />
                </div>
                <div>
                  <label className={labelStyle}>End date</label>
                  <input type="date" name="endDate" value={formData.endDate || ''} onChange={handleInputChange} className={getInputStyle('endDate')} />
                </div>
                <div>
                  <label className={labelStyle}>End time</label>
                  <input type="time" name="endTime" value={formData.endTime || ''} onChange={handleInputChange} className={getInputStyle('endTime')} />
                </div>
                <div className="md:col-span-2">
                  <div className="mb-2 flex items-end justify-between">
                    <label className={`${labelStyle} mb-0`}>Venue address</label>
                    <button type="button" onClick={handleGetLocation} disabled={isLocating} className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-brand transition hover:opacity-80">
                      <Navigation size={12} className={isLocating ? "animate-spin" : ""} /> {isLocating ? 'Locating…' : 'Use GPS'}
                    </button>
                  </div>
                  <div className="relative mb-3">
                    <MapPin size={18} className="absolute left-4 top-1/2 z-10 -translate-y-1/2 text-ink-muted" />
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={(e) => handleLocationSearch(e.target.value)}
                      onFocus={() => locationSuggestions.length > 0 && setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                      placeholder="Search for an address or venue…"
                      className={`${getInputStyle('location')} pl-12`}
                    />
                    {isSearchingAddress && (
                      <Loader2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-brand" />
                    )}
                    {showSuggestions && locationSuggestions.length > 0 && (
                      <div className="eh-surface absolute left-0 right-0 top-full z-20 mt-2 max-h-48 overflow-y-auto rounded-2xl shadow-eh-lg">
                        {locationSuggestions.map((s, i) => (
                          <button
                            key={i}
                            type="button"
                            onMouseDown={() => handleSelectSuggestion(s)}
                            className="w-full border-b border-line px-4 py-2.5 text-left text-xs transition-colors last:border-b-0 hover:bg-surface-2"
                          >
                            <span className="font-semibold eh-text">{s.display_name?.split(',')[0]}</span>
                            <span className="mt-0.5 block truncate text-[10px] eh-text-muted">{s.display_name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider eh-text-muted">Latitude</label>
                      <input type="number" step="any" name="lat" value={formData.lat} onChange={handleInputChange} placeholder="e.g. 6.5244" className={getInputStyle('lat')} />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider eh-text-muted">Longitude</label>
                      <input type="number" step="any" name="lng" value={formData.lng} onChange={handleInputChange} placeholder="e.g. 3.3792" className={getInputStyle('lng')} />
                    </div>
                  </div>
                  <p className="mt-1.5 text-[11px] eh-text-muted">Search an address above to auto-fill coordinates, or use GPS / enter manually.</p>
                </div>
                <div className="grid grid-cols-2 gap-3 md:col-span-2">
                  <div>
                    <label className={labelStyle}>Ticket price (₦)</label>
                    <input type="number" name="price" value={formData.price} onChange={handleInputChange} placeholder="0 for free events" className={getInputStyle('price')} />
                  </div>
                  <div>
                    <label className={labelStyle}>Capacity</label>
                    <input type="number" name="capacity" value={formData.capacity} onChange={handleInputChange} placeholder="Leave empty for unlimited" className={getInputStyle('capacity')} />
                  </div>
                </div>

                {isPaidEvent && (
                  <div className="rounded-2xl border border-line bg-surface-2 p-5 md:col-span-2">
                    <div className="mb-5 flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500/15 text-emerald-500"><Landmark size={17} /></span>
                      <div>
                        <h4 className="eh-display text-sm font-bold">Payment details</h4>
                        <p className="mt-0.5 text-xs eh-text-muted">Where should attendees send payment?</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className={labelStyle}>Bank name</label>
                        <input type="text" name="bankName" value={formData.bankName} onChange={handleInputChange} placeholder="e.g. GTBank, Access Bank" className={getInputStyle('bankName')} />
                      </div>
                      <div>
                        <label className={labelStyle}>Account number</label>
                        <input type="text" name="accountNumber" value={formData.accountNumber} onChange={handleInputChange} placeholder="e.g. 0123456789" className={getInputStyle('accountNumber')} />
                      </div>
                      <div>
                        <label className={labelStyle}>Account name</label>
                        <input type="text" name="accountName" value={formData.accountName} onChange={handleInputChange} placeholder="e.g. John Doe" className={getInputStyle('accountName')} />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-surface-2 p-5 md:col-span-2">
                  <div>
                    <h4 className="eh-display text-sm font-bold">Public event</h4>
                    <p className="mt-1 text-xs eh-text-muted">Turn off to make this event invite-only (hidden from discovery).</p>
                  </div>
                  <button type="button" onClick={() => setPublicEvent(!publicEvent)} aria-pressed={publicEvent} aria-label="Toggle public event" className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${publicEvent ? 'bg-brand' : 'bg-ink-muted'}`}>
                    <div className={`absolute top-1 h-6 w-6 rounded-full bg-white transition-transform ${publicEvent ? 'translate-x-7' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
            </div>
          </Motion.section>
        </div>

        <div className="space-y-6">
          <Motion.div whileHover={{ scale: 1.02 }} className={`p-6 rounded-[2rem] border ${glassStyle}`}>
            <h3 className={`text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              <ImageIcon size={16} /> Cover Image
            </h3>
            <label className={`block border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 relative overflow-hidden group ${darkMode ? 'border-slate-600 hover:border-blue-500 hover:bg-slate-800/50 bg-slate-900/30' : 'border-slate-300 hover:border-blue-500 hover:bg-blue-50/50 bg-slate-50'}`}>
              <input type="file" accept="image

