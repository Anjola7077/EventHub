import React, { useState, useEffect } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { Calendar, MapPin, Image as ImageIcon, Tag, Users, AlignLeft, ShieldCheck, Navigation, Loader2, Landmark } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import sanitizeError from '../utils/errorMessages';

const CreateEvent = ({ darkMode }) => {
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

  const isPaidEvent = Number(formData.price) > 0;

  const categories = ['Technology', 'Design', 'Business', 'Music', 'Networking', 'Education'];
  const glassStyle = darkMode 
    ? 'bg-slate-800/40 border-slate-700/50 backdrop-blur-2xl shadow-xl' 
    : 'bg-white/60 border-white/50 backdrop-blur-2xl shadow-[0_8px_32px_rgba(10,31,110,0.08)]';
  const getInputStyle = (field) => `w-full px-5 py-4 rounded-2xl text-sm font-medium border transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-500/20 ${
    errors[field] ? 'border-red-500 bg-red-50 dark:bg-red-500/10' : (darkMode ? 'bg-slate-900/50 border-slate-700 focus:border-blue-500 focus:bg-slate-900 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 focus:border-blue-500 focus:bg-white text-slate-900 placeholder-slate-400')
  }`;

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
        payload.append('coverImage', coverImageFile);
      } else {
        payload = {
          ...formData,
          capacity: formData.capacity ? parseInt(formData.capacity) : undefined,
          location: formData.lat && formData.lng ? { type: 'Point', coordinates: [parseFloat(formData.lng), parseFloat(formData.lat)], formattedAddress: formData.location || 'Unknown Location' } : formData.location,
          category: activeCategory,
          isPublic: publicEvent,
          approvalRequired,
          status: status
        };
      }

      await api.post('/events', payload, config);
      localStorage.removeItem('createEventDraft');
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
      className="pt-32 pb-20 px-4 md:px-8 max-w-6xl mx-auto"
    >
      <AnimatePresence>
        {isLoading && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <Motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`flex flex-col items-center justify-center p-8 rounded-[2rem] shadow-2xl border ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
            >
              <Loader2 size={48} className="animate-spin text-blue-600 mb-4" />
            <h2 className="text-xl font-black mb-2">{uploadProgress === 100 ? 'Processing...' : 'Saving Event...'}</h2>
            <p className="text-sm font-medium opacity-70 text-center max-w-xs mb-4">Please wait while we upload your cover image and save the event details.</p>
            <div className={`w-full rounded-full h-3 overflow-hidden shadow-inner ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
              <div className="bg-blue-600 h-full rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
            </div>
            <p className="text-xs font-bold mt-2">{uploadProgress}% Uploaded</p>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="mb-10 text-center md:text-left">
        <h1 className={`text-3xl md:text-4xl font-black mb-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Create New Event</h1>
        <p className={`text-sm font-semibold opacity-100 ${darkMode ? 'text-white' : 'text-slate-600'}`}>Design and launch your next unforgettable experience.</p>
      </div>

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
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider opacity-100 mb-2 ${darkMode ? 'text-white' : 'text-slate-600'}`}>Description</label>
                <textarea name="description" value={formData.description} onChange={handleInputChange} rows="4" placeholder="What can attendees expect?" className={`${getInputStyle('description')} resize-none`}></textarea>
              </div>
            </div>
          </Motion.section>

       
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
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider opacity-100 mb-2 ${darkMode ? 'text-white' : 'text-slate-600'}`}>Start Time</label>
                <input type="time" name="time" value={formData.time} onChange={handleInputChange} className={getInputStyle('time')} />
              </div>
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider opacity-100 mb-2 ${darkMode ? 'text-white' : 'text-slate-600'}`}>End Date</label>
                <input type="date" name="endDate" value={formData.endDate || ''} onChange={handleInputChange} className={getInputStyle('endDate')} />
              </div>
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider opacity-100 mb-2 ${darkMode ? 'text-white' : 'text-slate-600'}`}>End Time</label>
                <input type="time" name="endTime" value={formData.endTime || ''} onChange={handleInputChange} className={getInputStyle('endTime')} />
              </div>
              <div className="md:col-span-2">
                <div className="flex justify-between items-end mb-2">
                  <label className={`block text-xs font-bold uppercase tracking-wider opacity-100 ${darkMode ? 'text-white' : 'text-slate-600'}`}>Venue Address</label>
                  <button type="button" onClick={handleGetLocation} disabled={isLocating} className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors uppercase tracking-wider bg-blue-500/10 px-3 py-1.5 rounded-full">
                    <Navigation size={12} className={isLocating ? "animate-spin" : ""} /> {isLocating ? 'Locating...' : 'Use GPS'}
                  </button>
                </div>
                <div className="relative mb-3">
                  <MapPin size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 z-10 ${darkMode ? 'text-white opacity-100' : 'text-slate-900 opacity-40'}`} />
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={(e) => handleLocationSearch(e.target.value)}
                    onFocus={() => locationSuggestions.length > 0 && setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    placeholder="Search for an address or venue..."
                    className={`${getInputStyle('location')} pl-12`}
                  />
                  {isSearchingAddress && (
                    <Loader2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-blue-500" />
                  )}
                  {showSuggestions && locationSuggestions.length > 0 && (
                    <div className={`absolute left-0 right-0 top-full mt-1 rounded-xl border shadow-lg z-20 max-h-48 overflow-y-auto ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                      {locationSuggestions.map((s, i) => (
                        <button
                          key={i}
                          type="button"
                          onMouseDown={() => handleSelectSuggestion(s)}
                          className={`w-full text-left px-4 py-2.5 text-xs transition-colors border-b last:border-b-0 ${darkMode ? 'hover:bg-slate-700 text-slate-300 border-slate-700' : 'hover:bg-slate-50 text-slate-700 border-slate-100'}`}
                        >
                          <span className="font-semibold">{s.display_name?.split(',')[0]}</span>
                          <span className="block text-[10px] opacity-60 mt-0.5 truncate">{s.display_name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-[10px] font-bold uppercase tracking-wider opacity-100 mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Latitude</label>
                    <input type="number" step="any" name="lat" value={formData.lat} onChange={handleInputChange} placeholder="e.g. 6.5244" className={getInputStyle('lat')} />
                  </div>
                  <div>
                    <label className={`block text-[10px] font-bold uppercase tracking-wider opacity-100 mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Longitude</label>
                    <input type="number" step="any" name="lng" value={formData.lng} onChange={handleInputChange} placeholder="e.g. 3.3792" className={getInputStyle('lng')} />
                  </div>
                </div>
                <p className={`text-[10px] mt-1.5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Search an address above to auto-fill coordinates, or use GPS / enter manually.</p>
              </div>
              <div className="md:col-span-2 grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider opacity-100 mb-2 ${darkMode ? 'text-white' : 'text-slate-600'}`}>Ticket Price (₦)</label>
                  <input type="number" name="price" value={formData.price} onChange={handleInputChange} placeholder="0 for free events" className={getInputStyle('price')} />
                </div>
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider opacity-100 mb-2 ${darkMode ? 'text-white' : 'text-slate-600'}`}>Capacity</label>
                  <input type="number" name="capacity" value={formData.capacity} onChange={handleInputChange} placeholder="Leave empty for unlimited" className={getInputStyle('capacity')} />
                </div>
              </div>

              {isPaidEvent && (
                <div className="md:col-span-2">
                  <div className={`p-6 rounded-2xl border ${darkMode ? 'border-slate-700 bg-slate-900/40' : 'border-slate-200 bg-white/40'}`}>
                    <div className="flex items-center gap-3 mb-5">
                      <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-500"><Landmark size={18} /></div>
                      <div>
                        <h4 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Payment Details</h4>
                        <p className={`text-xs mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Where should attendees send payment?</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className={`block text-xs font-bold uppercase tracking-wider opacity-100 mb-2 ${darkMode ? 'text-white' : 'text-slate-600'}`}>Bank Name</label>
                        <input type="text" name="bankName" value={formData.bankName} onChange={handleInputChange} placeholder="e.g., GTBank, Access Bank" className={getInputStyle('bankName')} />
                      </div>
                      <div>
                        <label className={`block text-xs font-bold uppercase tracking-wider opacity-100 mb-2 ${darkMode ? 'text-white' : 'text-slate-600'}`}>Account Number</label>
                        <input type="text" name="accountNumber" value={formData.accountNumber} onChange={handleInputChange} placeholder="e.g., 0123456789" className={getInputStyle('accountNumber')} />
                      </div>
                      <div>
                        <label className={`block text-xs font-bold uppercase tracking-wider opacity-100 mb-2 ${darkMode ? 'text-white' : 'text-slate-600'}`}>Account Name</label>
                        <input type="text" name="accountName" value={formData.accountName} onChange={handleInputChange} placeholder="e.g., John Doe" className={getInputStyle('accountName')} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className={`md:col-span-2 flex items-center justify-between p-5 rounded-2xl border ${darkMode ? 'border-slate-700 bg-slate-900/50' : 'border-slate-200 bg-white/50'}`}>
                <div>
                  <h4 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Public Event</h4>
                  <p className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Turn off to make this event invite-only (hidden from discovery)</p>
                </div>
                <button type="button" onClick={() => setPublicEvent(!publicEvent)} className={`w-14 h-8 rounded-full transition-colors relative flex-shrink-0 ${publicEvent ? 'bg-blue-600' : 'bg-slate-400 dark:bg-slate-600'}`}>
                  <div className={`w-6 h-6 bg-white rounded-full absolute top-1 transition-transform ${publicEvent ? 'translate-x-7' : 'translate-x-1'}`} />
                </button>
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
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              {coverImage ? (
                <img src={coverImage} alt="Cover Preview" className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-blue-500/10 group-hover:bg-blue-500/20 text-blue-500 flex items-center justify-center mx-auto mb-3 transition-colors">
                    <ImageIcon size={24} />
                  </div>
                  <p className={`text-sm font-bold mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Click to upload</p>
                  <p className={`text-xs opacity-100 font-medium ${darkMode ? 'text-white' : 'text-slate-600'}`}>PNG, JPG up to 5MB</p>
                </>
              )}
            </label>
          </Motion.div>
          
          <button className={`w-full py-4 rounded-2xl font-bold tracking-wide border transition-colors ${darkMode ? 'border-slate-700 hover:bg-slate-800 text-white' : 'border-blue-200 hover:bg-blue-50 text-slate-900'}`}>
            <Link to="/flyer-designer" className="block w-full h-full flex items-center justify-center">
              Design Flyer
            </Link>
          </button>
          
          
          <button 
            className="w-full py-4 rounded-2xl bg-blue-600 text-white font-black tracking-wide shadow-xl shadow-blue-600/30 hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:cursor-not-allowed" 
            onClick={() => submitEvent('published')}
            disabled={isLoading}
          >
            Publish Event
          </button>
          <button 
            className={`w-full py-4 rounded-2xl font-bold tracking-wide border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${darkMode ? 'border-slate-700 hover:bg-slate-800 text-white' : 'border-blue-200 hover:bg-blue-50 text-slate-900'}`} 
            onClick={() => submitEvent('draft')}
            disabled={isLoading}
          >
            Save as Draft
          </button>
        </div>
      </div>
    </Motion.main>
  );
};

export default CreateEvent;
