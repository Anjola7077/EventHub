import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
 import { Users, CalendarCheck, CreditCard, TrendingUp, Download, Settings, Search, Copy, Check, Edit3, X, Image as ImageIcon, AlertTriangle, Megaphone, Landmark } from 'lucide-react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import sanitizeError from '../utils/errorMessages';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const EventDashboard = ({ darkMode }) => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [eventData, setEventData] = useState(null);
  const [userEvents, setUserEvents] = useState([]);
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7');
  const [visibleCount, setVisibleCount] = useState(10);
  const [attendeeSearch, setAttendeeSearch] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [startY, setStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editingCoverImage, setEditingCoverImage] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showEventDeleteConfirm, setShowEventDeleteConfirm] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState({ title: '', message: '' });
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  const filteredAttendees = attendees.filter(att => {
    if (!att) return false;
    const name = att.user?.fullName || att.fullName || '';
    const email = att.user?.email || att.email || '';
    const query = attendeeSearch.toLowerCase();
    return name.toLowerCase().includes(query) || email.toLowerCase().includes(query);
  });

  const observer = useRef();
  const lastAttendeeElementRef = useCallback(node => {
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && visibleCount < filteredAttendees.length) {
        setVisibleCount(prev => prev + 10);
      }
    });
    if (node) observer.current.observe(node);
  }, [visibleCount, filteredAttendees.length]);

  const glassStyle = darkMode 
    ? 'bg-slate-800/40 border-slate-700/50 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.3)]' 
    : 'bg-white/40 border-white/40 backdrop-blur-2xl shadow-[0_8px_32px_rgba(10,31,110,0.1)]';
    
  const inputStyle = `w-full px-5 py-3.5 rounded-2xl text-sm font-medium border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${darkMode ? 'bg-slate-900/50 border-slate-700 focus:border-blue-500 focus:bg-slate-900 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 focus:border-blue-500 focus:bg-white text-slate-900 placeholder-slate-400'}`;

  const fetchEventStats = async () => {
    if (!isRefreshing) setLoading(true);
      try {
        let targetEventId = eventId || 'overview';

        let fetchedUserEvents = [];
        try {
          const myRes = await api.get('/events/me');
          fetchedUserEvents = (myRes.data?.data || []).sort((a, b) => {
            const dateA = new Date(a.createdAt || a.date || 0).getTime();
            const dateB = new Date(b.createdAt || b.date || 0).getTime();
            return dateB - dateA;
          });
        } catch (e) {
          console.warn("Failed to fetch /events/me:", e.message);
        }

        setUserEvents(fetchedUserEvents);

        if (fetchedUserEvents.length === 0) {
          setEventData(null);
          setAttendees([]);
          setLoading(false);
          return;
        }

        if (!targetEventId && fetchedUserEvents.length > 0) {
          targetEventId = fetchedUserEvents[0]?._id || fetchedUserEvents[0]?.id;
        }

        if (targetEventId) {
          try {
            const res = await api.get(`/events/${targetEventId}/stats`);
            setEventData(res.data?.data?.event || res.data?.event || fetchedUserEvents.find(e => (e._id || e.id) === targetEventId));
            setAttendees(res.data?.data?.attendees || res.data?.attendees || []);
          } catch (statsErr) {
            console.warn("Stats API unavailable for this event, using fallback data.");
            const fallbackEvent = fetchedUserEvents.find(e => (e._id || e.id) === targetEventId);
            if (fallbackEvent) {
              setEventData(fallbackEvent);
              setAttendees([]);
            }
          }
        }
      } catch (error) {
        console.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
  };

  useEffect(() => {
    if (user) fetchEventStats();
  }, [eventId, user]);

  useEffect(() => {
    setVisibleCount(10); // Reset to 10 whenever the user switches events
  }, [eventId]);

  useEffect(() => {
    setVisibleCount(10); // Reset to 10 when search query changes
  }, [attendeeSearch]);

  const handleEventChange = (e) => {
    navigate(`/dashboard/${e.target.value}`);
  };

  const handleExportCSV = () => {
    if (!attendees.length) return alert("No attendees to export");
    
    let csvContent = "data:text/csv;charset=utf-8,Name,Email,Ticket,Status\n";
    attendees.forEach(row => {
      const name = row.user?.fullName || row.fullName || 'Unknown';
      const email = row.user?.email || row.email || 'Unknown';
      csvContent += `${name},${email},${row.type || row.ticketType || 'Standard'},${row.isVerified !== false ? 'Paid' : 'Pending'}\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${eventData?.title || 'event'}_attendees.csv`);
    document.body.appendChild(link);
    link.click();
  };

  const handleCopyLink = () => {
    if (!eventData) return;
    const url = `${window.location.origin}/event-details/${eventData._id || eventData.id}`;
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleTouchStart = (e) => {
    if (window.scrollY === 0) setStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e) => {
    if (startY > 0 && window.scrollY === 0) {
      const currentY = e.touches[0].clientY;
      const distance = currentY - startY;
      if (distance > 0) setPullDistance(Math.min(distance * 0.4, 80)); // Adds natural drag resistance
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance > 60) {
      setIsRefreshing(true);
      setPullDistance(60); // Hold open during loading
      await fetchEventStats();
      setIsRefreshing(false);
    }
    setStartY(0);
    setPullDistance(0);
  };

  const handleApproveAttendee = async (userId, targetEventId) => {
    const effectiveEventId = targetEventId || eventId;
    if (!effectiveEventId || effectiveEventId === 'overview') {
      alert("Cannot approve from overview. Select a specific event first.");
      return;
    }
    try {
      await api.put(`/events/${effectiveEventId}/attendees/${userId}/approve`);
      setAttendees(prev => prev.map(a => {
        const aUserId = a.user?._id || a.user?.id || a.user;
        return aUserId === userId ? { ...a, isVerified: true } : a;
      }));
    } catch (error) {
      alert("Failed to approve attendee.");
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (editForm.endDate && new Date(editForm.endDate) < new Date(editForm.date)) {
      alert("End Date cannot be before Start Date.");
      return;
    }
    setIsSaving(true);
    try {
      let payload;
      let config = {};

      const dataToSubmit = { ...editForm };
      delete dataToSubmit.coverImage;

      if (editingCoverImage) {
        const formData = new FormData();
        const safeKeys = ['title', 'description', 'date', 'time', 'endDate', 'endTime', 'price', 'capacity', 'category', 'status', 'isPublic', 'approvalRequired', 'bankName', 'accountNumber', 'accountName'];
        safeKeys.forEach(key => {
          if (dataToSubmit[key] !== undefined && dataToSubmit[key] !== null) formData.append(key, dataToSubmit[key]);
        });
        if (dataToSubmit.location) {
          formData.append('location', typeof dataToSubmit.location === 'object' ? JSON.stringify(dataToSubmit.location) : dataToSubmit.location);
        }
        if (dataToSubmit.ticketTiers) {
          formData.append('ticketTiers', JSON.stringify(dataToSubmit.ticketTiers));
        }
        formData.append('coverImage', editingCoverImage);
        payload = formData;
      } else {
        payload = {};
        const safeKeys = ['title', 'description', 'date', 'time', 'endDate', 'endTime', 'price', 'capacity', 'category', 'status', 'isPublic', 'approvalRequired', 'ticketTiers', 'bankName', 'accountNumber', 'accountName'];
        safeKeys.forEach(key => {
          if (dataToSubmit[key] !== undefined && dataToSubmit[key] !== null) payload[key] = dataToSubmit[key];
        });
        if (dataToSubmit.location) {
          payload.location = typeof dataToSubmit.location === 'object' ? JSON.stringify(dataToSubmit.location) : dataToSubmit.location;
        }
      }

      const res = await api.put(`/events/${eventData._id || eventData.id}`, payload, config);
      
      setEventData(prev => ({ ...prev, ...res.data.data }));
      setIsEditing(false);
      setEditingCoverImage(null);
      fetchEventStats(); // refresh full stats just in case
    } catch (error) {
      console.error("Edit failed", error);
      alert("Failed to update event.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setShowEventDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!eventData) return;
    setIsSaving(true);
    try {
      await api.delete(`/events/${eventData._id || eventData.id}`);
      setShowEventDeleteConfirm(false);
      setIsEditing(false);
      navigate('/profile');
    } catch (error) {
      console.error("Delete failed", error);
      alert("Failed to delete event.");
    }
    // No finally block for isSaving, as we navigate away on success.
  };

  const handleBroadcastSubmit = async (e) => {
    e.preventDefault();
    if (!broadcastForm.message.trim()) return;
    setIsBroadcasting(true);
    try {
      const res = await api.post(`/events/${eventData._id || eventData.id}/broadcast`, broadcastForm);
      alert(res.data.message || "Broadcast sent successfully!");
      setShowBroadcastModal(false);
      setBroadcastForm({ title: '', message: '' });
    } catch (error) {
      alert(sanitizeError(error, "Failed to send broadcast."));
    } finally {
      setIsBroadcasting(false);
    }
  };

  if (loading) return <div className="pt-32 text-center font-bold dark:text-white">Loading Stats...</div>;
  if (!eventData) {
    return (
      <Motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-40 pb-20 px-6 max-w-xl mx-auto text-center">
        <div className={`p-12 rounded-[2.5rem] border ${glassStyle}`}>
          <h2 className={`text-2xl font-black mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>No events found</h2>
          <p className={`text-sm font-medium mb-8 ${darkMode ? 'text-white' : 'text-slate-600'}`}>You haven't created any events yet, or the event you're looking for doesn't exist.</p>
          <Link to="/create-event" className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-colors">
            Create your first event
          </Link>
        </div>
      </Motion.main>
    );
  }

  const stats = [
    { title: 'Total Attendees', value: eventData.ticketsSold || 0, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/20' },
    { title: 'Tickets Available', value: eventData.capacity ? (eventData.capacity - (eventData.ticketsSold || 0)) : 'Unlimited', icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/20' },
    { title: 'Page Views', value: eventData.views || 0, icon: CalendarCheck, color: 'text-amber-500', bg: 'bg-amber-500/20' },
    { title: 'Revenue', value: `₦${(eventData.isOverview ? (eventData.totalRevenue || 0) : ((eventData.ticketsSold || 0) * (eventData.price || 0))).toLocaleString()}`, icon: CreditCard, color: 'text-purple-500', bg: 'bg-purple-500/20' },
  ];

  // Group attendees by ticket type for the Doughnut chart
  const ticketTypes = attendees.reduce((acc, curr) => {
    if (!curr) return acc;
    const type = curr.type || curr.ticketType || 'Standard';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const doughnutData = {
    labels: Object.keys(ticketTypes).length ? Object.keys(ticketTypes) : ['No Data'],
    datasets: [{
      data: Object.keys(ticketTypes).length ? Object.values(ticketTypes) : [1],
      backgroundColor: ['rgba(59, 130, 246, 0.8)', 'rgba(16, 185, 129, 0.8)', 'rgba(139, 92, 246, 0.8)', 'rgba(245, 158, 11, 0.8)'],
      borderColor: darkMode ? '#1e293b' : '#ffffff',
      borderWidth: 4,
    }],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { color: darkMode ? '#cbd5e1' : '#475569', padding: 20, font: { family: 'Inter', weight: 'bold' } } }
    },
    cutout: '75%',
  };

  // Determine days to show based on selected timeRange
  let daysToShow = parseInt(timeRange, 10) || 7;
  if (timeRange === 'all') {
    let earliestTime = Date.now();
    if (eventData?.createdAt) {
      earliestTime = new Date(eventData.createdAt).getTime();
    } else if (attendees.length > 0) {
      const times = attendees.map(a => {
        const d = new Date(a.createdAt || a.date);
        return isNaN(d.getTime()) ? Date.now() : d.getTime();
      });
      earliestTime = Math.min(...times);
    }
    if (isNaN(earliestTime)) earliestTime = Date.now();
    const diffTime = Math.max(0, Date.now() - earliestTime);
    daysToShow = Math.max(7, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
  }
  if (isNaN(daysToShow) || daysToShow < 1) daysToShow = 7;
  daysToShow = Math.min(daysToShow, 365); // Cap to 1 year to prevent rendering loop crashes

  // Generate real day-by-day sales data from the attendees list
  const dateRangeArray = Array.from({ length: daysToShow }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (daysToShow - 1 - i));
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const lineLabels = dateRangeArray.map(d => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
  
  // Start the cumulative total with anyone who registered BEFORE the window
  let runningTotal = attendees.filter(att => {
    let d = new Date(att.createdAt || att.date || Date.now());
    if (isNaN(d.getTime())) d = new Date();
    return d.getTime() < dateRangeArray[0].getTime();
  }).length;

  const realSalesData = dateRangeArray.map((day) => {
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);
    
    // Count how many people registered on this specific day
    const salesToday = attendees.filter(att => {
      if (!att) return false;
      let date = new Date(att.createdAt || att.date || Date.now());
      if (isNaN(date.getTime())) date = new Date();
      return date.getTime() >= day.getTime() && date.getTime() < nextDay.getTime();
    }).length;

    runningTotal += salesToday;
    return runningTotal;
  });

  const total = eventData.ticketsSold || attendees.length || 0;
  const lineData = {
    labels: lineLabels,
    datasets: [{
      label: 'Cumulative Tickets Sold',
      data: realSalesData,
      borderColor: 'rgba(59, 130, 246, 1)',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      tension: 0.4,
      fill: true,
    }]
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: darkMode ? '#cbd5e1' : '#475569', font: { family: 'Inter', weight: 'bold' } } }
    },
    scales: {
      x: { ticks: { color: darkMode ? '#cbd5e1' : '#475569' }, grid: { color: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' } },
      y: { ticks: { color: darkMode ? '#cbd5e1' : '#475569', stepSize: Math.max(1, Math.ceil(total / 5)) }, grid: { color: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' } }
    }
  };

  const currentAttendees = filteredAttendees.slice(0, visibleCount);

  const hasHappened = (eventData?.endDate || eventData?.date) ? new Date(eventData.endDate || eventData.date) < new Date() : true;

  return (
    <Motion.main 
      initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
      className="pt-32 pb-20 px-4 sm:px-6 max-w-7xl mx-auto space-y-8 overflow-x-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull to refresh indicator UI */}
      <div 
        className="flex justify-center overflow-hidden transition-all duration-200"
        style={{ height: `${pullDistance}px`, opacity: pullDistance / 80 }}
      >
        <div className={`flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-500'}`}>
          <div className={`w-5 h-5 rounded-full border-2 border-t-transparent ${isRefreshing ? 'animate-spin' : ''} ${darkMode ? 'border-white' : 'border-blue-600'}`} 
               style={{ transform: `rotate(${pullDistance * 4}deg)` }}></div>
          <span className="text-xs font-bold">{isRefreshing ? 'Refreshing...' : 'Pull to refresh'}</span>
        </div>
      </div>

      <div className={`border rounded-[2rem] p-4 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 overflow-hidden ${glassStyle}`}>
        <div className="flex-1 w-full">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex gap-2">
              {eventData.category && (
                <span className="px-4 py-1.5 rounded-full text-xs font-extrabold tracking-widest uppercase bg-blue-500/20 text-blue-600 dark:text-blue-400 inline-block">
                  {eventData.category}
                </span>
              )}
              {eventData.status === 'draft' && (
                <span className="px-4 py-1.5 rounded-full text-xs font-extrabold tracking-widest uppercase bg-amber-500/20 text-amber-600 dark:text-amber-400 inline-block">
                  DRAFT
                </span>
              )}
            </div>
            {userEvents.length > 0 && (
              <select 
                value={eventId || 'overview'}
                onChange={handleEventChange}
                className={`max-w-[200px] text-sm font-bold rounded-xl px-3 py-2 border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
              >
                {userEvents.length > 1 && <option value="overview">All Events Overview</option>}
                {userEvents.map(evt => (
                  <option key={evt._id || evt.id} value={evt._id || evt.id}>
                    {evt.title}
                  </option>
                ))}
              </select>
            )}
          </div>
          <h1 className={`text-3xl md:text-4xl font-black mb-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{eventData.title}</h1>
          {eventData.date && !isNaN(new Date(eventData.date).getTime()) && <p className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-600'}`}>{new Date(eventData.date).toLocaleDateString()}</p>}
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3 w-full md:w-auto max-w-full">
          {!eventData.isOverview && (
            <>
              <button
                onClick={() => setShowBroadcastModal(true)}
                className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-full transition-all font-bold text-xs bg-blue-600/10 text-blue-600 hover:bg-blue-600/20 dark:bg-blue-500/20 dark:text-blue-400 dark:hover:bg-blue-500/30`}
                title="Broadcast"
              >
                <Megaphone size={14} /> <span className="hidden xs:inline sm:inline">Broadcast</span><span className="xs:hidden sm:hidden">Alert</span>
              </button>
              <button
                onClick={() => { setEditForm(eventData); setIsEditing(true); }}
                className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-full transition-all font-bold text-xs bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 ${darkMode ? 'text-white' : 'text-slate-900'}`}
                title="Edit Event"
              >
                <Edit3 size={14} /> <span>Edit</span>
              </button>
              <button
                className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-full transition-all font-bold text-xs min-w-0 ${isCopied ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : `bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 ${darkMode ? 'text-white' : 'text-slate-900'}`}`}
                onClick={handleCopyLink}
                title="Copy Event Link"
              >
                {isCopied ? <Check size={14} /> : <Copy size={14} />} <span>{isCopied ? 'Copied!' : 'Copy'}</span>
              </button>
            </>
          )}
          <button className="flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white transition-all font-bold text-xs shadow-lg shadow-blue-600/30" onClick={handleExportCSV} title="Export CSV">
            <Download size={14} /> <span>Export</span>
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <Motion.div key={idx} whileHover={{ y: -6, scale: 1.02 }} className={`rounded-[1.5rem] p-6 border flex items-center gap-5 ${glassStyle}`}>
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${stat.bg} ${stat.color} shadow-inner`}>
              <stat.icon size={24} strokeWidth={2.5} />
            </div>
            <div className={darkMode ? 'text-white' : 'text-slate-900'}>
              <div className="text-2xl font-black leading-tight mb-1">{stat.value}</div>
              <div className={`text-xs font-bold uppercase tracking-wider opacity-100 ${darkMode ? 'text-white' : 'text-slate-600'}`}>{stat.title}</div>
            </div>
          </Motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={`border rounded-[2rem] p-6 lg:col-span-2 ${glassStyle}`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className={`text-lg font-extrabold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Sales Trend</h2>
              <select 
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className={`text-xs font-bold rounded-xl px-3 py-2 border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
              >
                <option value="7">Last 7 Days</option>
                <option value="30">Last 30 Days</option>
                <option value="all">All Time</option>
              </select>
            </div>
            <div className="h-64 w-full">
              <Line data={lineData} options={lineOptions} />
            </div>
          </div>
          <div className={`border rounded-[2rem] p-6 ${glassStyle}`}>
            <h2 className={`text-lg font-extrabold mb-6 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Tickets by Type</h2>
            <div className="h-64 w-full">
              <Doughnut data={doughnutData} options={doughnutOptions} />
            </div>
          </div>
        </div>
        <div className={`border rounded-[2rem] overflow-hidden ${glassStyle}`}>
          <div className="p-6 border-b border-black/5 dark:border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className={`text-lg font-extrabold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Recent Registrations</h2>
            <div className="relative w-full sm:w-auto">
              <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${darkMode ? 'text-white' : 'text-slate-500'}`} />
              <input 
                type="text"
                placeholder="Search by name or email..."
                value={attendeeSearch}
                onChange={(e) => setAttendeeSearch(e.target.value)}
                className={`w-full sm:w-64 text-sm font-bold rounded-xl pl-9 pr-3 py-2 border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className={`w-full text-left ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              <thead>
                <tr className={`text-xs uppercase tracking-wider opacity-100 ${darkMode ? 'text-white' : 'text-slate-600'} bg-black/5 dark:bg-white/5`}>
                  <th className="px-6 py-4 font-extrabold">Attendee</th>
                  <th className="px-6 py-4 font-extrabold">Ticket</th>
                  <th className="px-6 py-4 font-extrabold">Status</th>
                  <th className="px-6 py-4 font-extrabold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm font-medium">
                {filteredAttendees.length === 0 ? (
                   <tr>
                     <td colSpan="3" className="text-center py-8 opacity-70">
                       {attendeeSearch ? 'No attendees match your search.' : 'No attendees yet. Share your event link!'}
                     </td>
                   </tr>
                ) : (
                  currentAttendees.map((att, i) => (
                    <tr 
                  key={att?.user?._id || i} 
                      ref={i === currentAttendees.length - 1 ? lastAttendeeElementRef : null}
                      className="border-t border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    >
                      <td className="px-6 py-4">
                    <div className="font-bold text-base">{att?.user?.fullName || att?.fullName || 'Anonymous'}</div>
                        <div className="opacity-70 text-xs">
                      {att?.user?.email || att?.email || 'N/A'}
                          {eventData.isOverview && <span className="block mt-0.5 text-blue-500 font-bold">{att.eventName}</span>}
                        </div>
                      </td>
                  <td className="px-6 py-4">{att?.type || att?.ticketType || 'Standard'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider ${
                      att?.isVerified !== false ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                        }`}>
                      {att?.isVerified !== false ? 'Paid' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 flex items-center justify-end gap-3">
                    {att?.receiptUrl && (
                      <a href={att?.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:text-blue-700 font-bold hover:underline">
                            View Receipt
                          </a>
                        )}
                    {att?.isVerified === false && (
                      <button onClick={() => handleApproveAttendee(att?.user?._id || att?.user?.id || att?.user, att?.eventId)} className="text-xs text-emerald-600 hover:text-emerald-700 font-bold hover:underline border border-emerald-500/30 px-3 py-1.5 rounded-full bg-emerald-500/10">
                            Approve
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {visibleCount < filteredAttendees.length && (
            <div className="p-6 text-center border-t border-black/5 dark:border-white/5">
              <div className="inline-block w-6 h-6 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Edit Modal */}
      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <Motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-lg p-6 rounded-[2rem] shadow-2xl border max-h-[90vh] overflow-y-auto ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className={`text-xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>Quick Edit Event</h2>
                <button onClick={() => { setIsEditing(false); setEditingCoverImage(null); }} className={`p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleEditSubmit} className="space-y-4 text-left">
                <label className={`block border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors relative overflow-hidden group ${darkMode ? 'border-slate-600 hover:border-blue-500 bg-slate-900/30' : 'border-slate-300 hover:border-blue-500 bg-slate-50'}`}>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                    const file = e.target.files[0];
                    if (file && file.size > 5 * 1024 * 1024) {
                      alert("Cover image must be less than 5MB.");
                      return;
                    }
                    setEditingCoverImage(file);
                  }} />
                  <img src={editingCoverImage ? URL.createObjectURL(editingCoverImage) : (editForm.coverImage || '/placeholder.png')} alt="Cover Preview" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="relative z-10 bg-black/40 backdrop-blur-sm p-2 rounded-lg inline-block">
                    <ImageIcon size={24} className="text-white mx-auto mb-2" />
                    <p className="text-xs font-bold text-white">Click to change cover image</p>
                  </div>
                </label>
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${darkMode ? 'text-white' : 'text-slate-600'}`}>Event Title</label>
                  <input type="text" value={editForm.title || ''} onChange={e => setEditForm({...editForm, title: e.target.value})} className={inputStyle} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${darkMode ? 'text-white' : 'text-slate-600'}`}>Start Date</label>
                    <input type="date" value={editForm.date ? editForm.date.substring(0, 10) : ''} onChange={e => setEditForm({...editForm, date: e.target.value})} className={inputStyle} required />
                  </div>
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${darkMode ? 'text-white' : 'text-slate-600'}`}>Start Time</label>
                    <input type="time" value={editForm.time || ''} onChange={e => setEditForm({...editForm, time: e.target.value})} className={inputStyle} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${darkMode ? 'text-white' : 'text-slate-600'}`}>End Date</label>
                    <input type="date" value={editForm.endDate ? editForm.endDate.substring(0, 10) : ''} onChange={e => setEditForm({...editForm, endDate: e.target.value})} className={inputStyle} />
                  </div>
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${darkMode ? 'text-white' : 'text-slate-600'}`}>End Time</label>
                    <input type="time" value={editForm.endTime || ''} onChange={e => setEditForm({...editForm, endTime: e.target.value})} className={inputStyle} />
                  </div>
                </div>
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${darkMode ? 'text-white' : 'text-slate-600'}`}>Location</label>
                  <input type="text" value={typeof editForm.location === 'object' ? editForm.location?.formattedAddress : (editForm.location || '')} onChange={e => setEditForm({...editForm, location: e.target.value})} className={inputStyle} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${darkMode ? 'text-white' : 'text-slate-600'}`}>Price (₦)</label>
                    <input type="number" value={editForm.price || 0} onChange={e => setEditForm({...editForm, price: e.target.value})} className={inputStyle} />
                  </div>
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${darkMode ? 'text-white' : 'text-slate-600'}`}>Capacity</label>
                    <input type="number" value={editForm.capacity || ''} onChange={e => setEditForm({...editForm, capacity: e.target.value})} className={inputStyle} placeholder="Unlimited" />
                  </div>
                </div>
                {Number(editForm.price) > 0 && (
                  <div className={`mt-4 p-4 rounded-2xl border ${darkMode ? 'border-slate-700 bg-slate-800/40' : 'border-slate-200 bg-slate-50/60'}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <Landmark size={16} className="text-emerald-500" />
                      <h4 className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-white' : 'text-slate-900'}`}>Payment Details</h4>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Bank Name</label>
                        <input type="text" value={editForm.bankName || ''} onChange={e => setEditForm({...editForm, bankName: e.target.value})} className={inputStyle} placeholder="e.g., GTBank" />
                      </div>
                      <div>
                        <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Account Number</label>
                        <input type="text" value={editForm.accountNumber || ''} onChange={e => setEditForm({...editForm, accountNumber: e.target.value})} className={inputStyle} placeholder="e.g., 0123456789" />
                      </div>
                      <div>
                        <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Account Name</label>
                        <input type="text" value={editForm.accountName || ''} onChange={e => setEditForm({...editForm, accountName: e.target.value})} className={inputStyle} placeholder="e.g., John Doe" />
                      </div>
                    </div>
                  </div>
                )}
                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => { setIsEditing(false); setEditingCoverImage(null); }} className={`flex-1 py-3.5 rounded-2xl font-bold transition-colors border ${darkMode ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-100'}`}>
                    Cancel
                  </button>
                  <button type="button" onClick={handleDelete} disabled={isSaving || (!hasHappened && editForm?.status !== 'draft')} title={(!hasHappened && editForm?.status !== 'draft') ? "Published events can only be deleted after they have happened" : "Delete Event"} className={`px-6 py-3.5 rounded-2xl font-bold transition-colors bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed`}>
                    Delete
                  </button>
                  {editForm?.status === 'draft' && (
                    <button 
                      type="button" 
                      disabled={isSaving} 
                      onClick={(e) => { editForm.status = 'published'; handleEditSubmit(e); }} 
                      className="flex-1 py-3.5 rounded-2xl font-bold transition-colors bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/30 disabled:opacity-50"
                    >
                      Publish
                    </button>
                  )}
                  <button type="submit" disabled={isSaving} className="flex-1 py-3.5 rounded-2xl font-bold transition-colors bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30 disabled:opacity-50">
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Event Confirmation Modal */}
      <AnimatePresence>
        {showEventDeleteConfirm && (
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <Motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-md p-6 rounded-[2rem] shadow-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 flex-shrink-0 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h2 className={`text-xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>Delete Event</h2>
                  <p className={`text-sm mt-1 ${darkMode ? 'text-white' : 'text-slate-600'}`}>Are you sure? This action is permanent.</p>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowEventDeleteConfirm(false)} className={`flex-1 py-3.5 rounded-2xl font-bold transition-colors border ${darkMode ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-100'}`}>
                  Cancel
                </button>
                <button onClick={confirmDelete} disabled={isSaving} className="flex-1 py-3.5 rounded-2xl font-bold transition-colors bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/30 disabled:opacity-50">
                  {isSaving ? 'Deleting...' : 'Confirm Delete'}
                </button>
              </div>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Broadcast Modal */}
      <AnimatePresence>
        {showBroadcastModal && (
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <Motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-lg p-6 rounded-[2rem] shadow-2xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}
            >
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3 text-blue-600 dark:text-blue-400">
                  <Megaphone size={24} />
                  <h2 className={`text-xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>Broadcast Announcement</h2>
                </div>
                <button onClick={() => setShowBroadcastModal(false)} className={`p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleBroadcastSubmit} className="space-y-4 text-left">
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${darkMode ? 'text-white' : 'text-slate-600'}`}>Subject (Optional)</label>
                  <input type="text" placeholder="e.g. Venue Change!" value={broadcastForm.title} onChange={e => setBroadcastForm({...broadcastForm, title: e.target.value})} className={inputStyle} />
                </div>
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${darkMode ? 'text-white' : 'text-slate-600'}`}>Message <span className="text-red-500">*</span></label>
                  <textarea rows="4" required placeholder="Type your announcement here..." value={broadcastForm.message} onChange={e => setBroadcastForm({...broadcastForm, message: e.target.value})} className={inputStyle}></textarea>
                </div>
                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setShowBroadcastModal(false)} className={`flex-1 py-3.5 rounded-2xl font-bold transition-colors border ${darkMode ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-100'}`}>Cancel</button>
                  <button type="submit" disabled={isBroadcasting || !broadcastForm.message.trim()} className="flex-[2] py-3.5 rounded-2xl font-bold transition-colors bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30 disabled:opacity-50 disabled:shadow-none">
                    {isBroadcasting ? 'Broadcasting...' : 'Send to Attendees'}
                  </button>
                </div>
              </form>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>
    </Motion.main>
  );
};

export default EventDashboard;
