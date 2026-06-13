import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { Users, CalendarCheck, CreditCard, TrendingUp, Download, Search, Copy, Check, Edit3, X, Image as ImageIcon, AlertTriangle, Megaphone, Landmark, Ticket, Plus, Trash2 } from 'lucide-react';
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

const CHART_FONT = "'Hanken Grotesk Variable'";
const TIER_COLORS = ['#d4a017', '#7c3aed', '#2563eb', '#0d9488', '#db2777', '#dc2626'];

const DashboardSkeleton = () => (
  <main className="eh-page-bg min-h-screen px-4 pb-20 pt-28 sm:px-6 md:pt-32">
    <div className="mx-auto max-w-7xl animate-pulse space-y-5">
      <div className="h-28 rounded-[2rem] bg-surface-2" />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-3xl bg-surface-2 sm:h-32" />)}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="h-72 rounded-[2rem] bg-surface-2 lg:col-span-2" />
        <div className="h-72 rounded-[2rem] bg-surface-2" />
      </div>
      <div className="h-80 rounded-[2rem] bg-surface-2" />
    </div>
  </main>
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
  const [activeTab, setActiveTab] = useState('analytics');

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
    setVisibleCount(10);
  }, [eventId]);

  useEffect(() => {
    setVisibleCount(10);
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
      if (distance > 0) setPullDistance(Math.min(distance * 0.4, 80));
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance > 60) {
      setIsRefreshing(true);
      setPullDistance(60);
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
      fetchEventStats();
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
      const delId = editForm._id || editForm.id || eventData._id || eventData.id;
      await api.delete(`/events/${delId}`);
      setShowEventDeleteConfirm(false);
      setIsEditing(false);
      if (delId === eventId) {
        navigate('/dashboard');
      } else {
        fetchEventStats();
      }
    } catch (error) {
      console.error("Delete failed", error);
      alert("Failed to delete event.");
    }

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

  if (loading) return <DashboardSkeleton />;
  if (!eventData) {
    return (
      <Motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="eh-page-bg min-h-screen px-6 pb-20 pt-36 text-center">
        <div className="eh-surface mx-auto max-w-xl rounded-[2.5rem] p-12 shadow-eh-lg">
          <h2 className="eh-display text-2xl font-extrabold">No events found</h2>
          <p className="mx-auto mt-3 mb-8 max-w-sm text-sm eh-text-soft">You haven’t created any events yet, or the event you’re looking for doesn’t exist.</p>
          <Link to="/create-event" className="eh-btn eh-btn-primary">Create your first event</Link>
        </div>
      </Motion.main>
    );
  }

  const stats = [
    { title: 'Total Attendees', value: eventData.ticketsSold || 0, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/15' },
    { title: 'Tickets Available', value: eventData.capacity ? (eventData.capacity - (eventData.ticketsSold || 0)) : 'Unlimited', icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/15' },
    { title: 'Page Views', value: eventData.views || 0, icon: CalendarCheck, color: 'text-amber-500', bg: 'bg-amber-500/15' },
    { title: 'Revenue', value: `₦${(eventData.isOverview ? (eventData.totalRevenue || 0) : ((eventData.ticketsSold || 0) * (eventData.price || 0))).toLocaleString()}`, icon: CreditCard, color: 'text-purple-500', bg: 'bg-purple-500/15' },
  ];

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
      backgroundColor: ['rgba(37, 99, 235, 0.85)', 'rgba(16, 185, 129, 0.85)', 'rgba(124, 58, 237, 0.85)', 'rgba(245, 158, 11, 0.85)'],
      borderColor: darkMode ? '#1e293b' : '#ffffff',
      borderWidth: 4,
    }],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { color: darkMode ? '#cbd5e1' : '#475569', padding: 16, font: { family: CHART_FONT, weight: 'bold' } } }
    },
    cutout: '72%',
  };

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
  daysToShow = Math.min(daysToShow, 365);

  const dateRangeArray = Array.from({ length: daysToShow }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (daysToShow - 1 - i));
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const lineLabels = dateRangeArray.map(d => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));

  let runningTotal = attendees.filter(att => {
    let d = new Date(att.createdAt || att.date || Date.now());
    if (isNaN(d.getTime())) d = new Date();
    return d.getTime() < dateRangeArray[0].getTime();
  }).length;

  const realSalesData = dateRangeArray.map((day) => {
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);

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
      borderColor: 'rgba(37, 99, 235, 1)',
      backgroundColor: 'rgba(37, 99, 235, 0.12)',
      tension: 0.4,
      fill: true,
      pointRadius: 0,
      pointHoverRadius: 5,
    }]
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    scales: {
      x: { ticks: { color: darkMode ? '#94a3b8' : '#64748b', font: { family: CHART_FONT } }, grid: { display: false } },
      y: { ticks: { color: darkMode ? '#94a3b8' : '#64748b', font: { family: CHART_FONT }, stepSize: Math.max(1, Math.ceil(total / 5)) }, grid: { color: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' } }
    }
  };

  const currentAttendees = filteredAttendees.slice(0, visibleCount);

  const hasHappened = (eventData?.endDate || eventData?.date) ? new Date(eventData.endDate || eventData.date) < new Date() : true;

  const StatusBadge = ({ verified }) => (
    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${verified !== false ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'}`}>
      {verified !== false ? 'Paid' : 'Pending'}
    </span>
  );

  return (
    <Motion.main
      initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
      className="pt-32 pb-20 px-4 sm:px-6 max-w-7xl mx-auto space-y-8 overflow-x-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {}
      <div
        className="flex justify-center overflow-hidden transition-all duration-200"
        style={{ height: `${pullDistance}px`, opacity: pullDistance / 80 }}
      >
        <div className={`flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-500'}`}>
          <div className={`w-5 h-5 rounded-full border-2 border-t-transparent ${isRefreshing ? 'animate-spin' : ''} ${darkMode ? 'border-white' : 'border-blue-600'}`}
               style={{ transform: `rotate(${pullDistance * 4}deg)` }}></div>
          <span className="text-xs font-bold">{isRefreshing ? 'Refreshing...' : 'Pull to refresh'}</span>
        </div>

        {/* ---- Header ---- */}
        <div className="eh-surface flex flex-col gap-5 rounded-[2rem] p-5 sm:p-7 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {eventData.isOverview && (
                <span className="rounded-full bg-brand-soft px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-brand">Overview</span>
              )}
              {eventData.category && !eventData.isOverview && (
                <span className="rounded-full bg-brand-soft px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-brand">{eventData.category}</span>
              )}
              {eventData.status === 'draft' && (
                <span className="rounded-full bg-amber-500/15 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">Draft</span>
              )}
              {userEvents.length > 0 && (
                <select
                  value={eventId || 'overview'}
                  onChange={handleEventChange}
                  className="ml-auto max-w-[180px] rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-bold eh-text focus:border-brand focus:outline-none md:hidden"
                >
                  {userEvents.length > 1 && <option value="overview">All Events Overview</option>}
                  {userEvents.map(evt => (<option key={evt._id || evt.id} value={evt._id || evt.id}>{evt.title}</option>))}
                </select>
              )}
            </div>
            <h1 className="eh-display truncate text-2xl font-extrabold sm:text-3xl md:text-4xl">{eventData.isOverview ? 'All events' : eventData.title}</h1>
            {eventData.isOverview ? (
              <p className="mt-1.5 text-sm font-semibold eh-text-soft">Aggregate stats across {userEvents.length} {userEvents.length === 1 ? 'event' : 'events'}</p>
            ) : (eventData.date && !isNaN(new Date(eventData.date).getTime()) && (
              <p className="mt-1.5 text-sm font-semibold eh-text-soft">{new Date(eventData.date).toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}</p>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {userEvents.length > 0 && (
              <select
                value={eventId || 'overview'}
                onChange={handleEventChange}
                className="hidden max-w-[200px] rounded-xl border border-line bg-surface px-3 py-2 text-sm font-bold eh-text focus:border-brand focus:outline-none md:block"
              >
                {userEvents.length > 1 && <option value="overview">All Events Overview</option>}
                {userEvents.map(evt => (<option key={evt._id || evt.id} value={evt._id || evt.id}>{evt.title}</option>))}
              </select>
            )}
            {!eventData.isOverview && (
              <>
                <button onClick={() => setShowBroadcastModal(true)} title="Broadcast" className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-2 text-xs font-bold text-brand transition hover:opacity-80">
                  <Megaphone size={14} /> <span className="hidden sm:inline">Broadcast</span>
                </button>
                <button onClick={() => { setEditForm(eventData); setIsEditing(true); }} title="Edit event" className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-2 text-xs font-bold eh-text-soft transition hover:text-brand">
                  <Edit3 size={14} /> <span className="hidden sm:inline">Edit</span>
                </button>
                <button onClick={handleCopyLink} title="Copy event link" className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold transition ${isCopied ? 'bg-emerald-500 text-white' : 'bg-surface-2 eh-text-soft hover:text-brand'}`}>
                  {isCopied ? <Check size={14} /> : <Copy size={14} />} <span className="hidden sm:inline">{isCopied ? 'Copied!' : 'Copy'}</span>
                </button>
              </>
            )}
            <button onClick={handleExportCSV} title="Export CSV" className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-2 text-xs font-bold text-white transition hover:bg-brand-hover">
              <Download size={14} /> <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>

        {/* ---- Tabs ---- */}
        <div className="flex w-fit gap-1 rounded-full bg-surface-2 p-1">
          <button onClick={() => setActiveTab('analytics')} className={`rounded-full px-4 py-2 text-sm font-bold transition ${activeTab === 'analytics' ? 'bg-surface text-brand shadow-eh-sm' : 'eh-text-soft hover:text-brand'}`}>Analytics</button>
          <button onClick={() => setActiveTab('events')} className={`rounded-full px-4 py-2 text-sm font-bold transition ${activeTab === 'events' ? 'bg-surface text-brand shadow-eh-sm' : 'eh-text-soft hover:text-brand'}`}>My events</button>
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
            <div className="h-56 w-full sm:h-64"><Line data={lineData} options={lineOptions} /></div>
          </div>
          <div className="eh-surface rounded-[2rem] p-5 sm:p-6">
            <h2 className="eh-display mb-6 text-lg font-bold">Tickets by type</h2>
            <div className="h-56 w-full sm:h-64"><Doughnut data={doughnutData} options={doughnutOptions} /></div>
          </div>
        </div>
        <div className={`border rounded-[2rem] overflow-hidden ${glassStyle}`}>
          <div className="p-6 border-b border-black/5 dark:border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className={`text-lg font-extrabold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Recent Registrations</h2>
            <div className="relative w-full sm:w-auto">
              <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${darkMode ? 'text-white' : 'text-slate-500'}`} />
              <input
                type="text"
                placeholder="Search by name or email…"
                value={attendeeSearch}
                onChange={(e) => setAttendeeSearch(e.target.value)}
                className="w-full rounded-xl border border-line bg-surface py-2 pl-9 pr-3 text-sm font-semibold eh-text placeholder:text-ink-muted focus:border-brand focus:outline-none"
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
            <div ref={lastAttendeeElementRef} className="border-t border-line p-6 text-center">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
            </div>
          )}
        </div>
        </>
        )}

        {activeTab === 'events' && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {userEvents.length === 0 ? (
              <div className="eh-surface col-span-full rounded-[2rem] p-10 text-center">
                <p className="text-sm eh-text-soft">You haven’t created any events yet.</p>
                <Link to="/create-event" className="eh-btn eh-btn-primary mt-5">Create your first event</Link>
              </div>
            ) : (
              userEvents.map((evt) => (
                <div key={evt._id || evt.id} className="eh-surface overflow-hidden rounded-3xl">
                  <div className="relative h-32 bg-brand">
                    <img src={evt.coverImage || '/placeholder.png'} alt={evt.title} loading="lazy" className="absolute inset-0 h-full w-full object-cover" onError={(e) => { e.target.src = '/placeholder.png'; }} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
                    {evt.status === 'draft' && <span className="absolute left-3 top-3 rounded-full bg-amber-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">Draft</span>}
                    <h3 className="eh-display absolute inset-x-3 bottom-3 truncate text-lg font-bold text-white">{evt.title}</h3>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between text-xs eh-text-muted">
                      <span>{evt.date && !isNaN(new Date(evt.date).getTime()) ? new Date(evt.date).toLocaleDateString() : 'No date'}</span>
                      <span>{evt.ticketsSold || 0} going</span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button onClick={() => { setEditForm(evt); setIsEditing(true); }} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand px-3 py-2 text-xs font-bold text-white transition hover:bg-brand-hover">
                        <Edit3 size={14} /> Edit
                      </button>
                      <button onClick={() => { navigate(`/dashboard/${evt._id || evt.id}`); setActiveTab('analytics'); }} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-surface-2 px-3 py-2 text-xs font-bold eh-text-soft transition hover:text-brand">
                        <TrendingUp size={14} /> Stats
                      </button>
                      <Link to={`/event-details/${evt._id || evt.id}`} className="inline-flex items-center justify-center rounded-xl bg-surface-2 px-3 py-2 text-xs font-bold eh-text-soft transition hover:text-brand">
                        View
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {}
      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <Motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="eh-surface max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] p-6 shadow-eh-lg"
            >
              <div className="mb-6 flex items-center justify-between">
                <h2 className="eh-display text-xl font-bold">Quick edit event</h2>
                <button onClick={() => { setIsEditing(false); setEditingCoverImage(null); }} className="grid h-9 w-9 place-items-center rounded-full text-ink-muted transition hover:bg-surface-2">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleEditSubmit} className="space-y-4 text-left">
                <label className={`block border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors relative overflow-hidden group ${darkMode ? 'border-slate-600 hover:border-blue-500 bg-slate-900/30' : 'border-slate-300 hover:border-blue-500 bg-slate-50'}`}>
                  <input type="file" accept="image

}
      <AnimatePresence>
        {showEventDeleteConfirm && (
          <div className="fixed inset-0 z-[101] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <Motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="eh-surface w-full max-w-md rounded-[2rem] p-6 shadow-eh-lg"
            >
              <div className="mb-4 flex items-center gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-red-500/10 text-red-500">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h2 className="eh-display text-xl font-bold">Delete event</h2>
                  <p className="mt-1 text-sm eh-text-soft">Are you sure? This action is permanent.</p>
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button onClick={() => setShowEventDeleteConfirm(false)} className="eh-btn eh-btn-ghost flex-1">Cancel</button>
                <button onClick={confirmDelete} disabled={isSaving} className="flex-1 rounded-2xl bg-red-600 px-5 py-3 font-semibold text-white transition hover:bg-red-700 disabled:opacity-50">{isSaving ? 'Deleting…' : 'Confirm delete'}</button>
              </div>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>

      {}
      <AnimatePresence>
        {showBroadcastModal && (
          <div className="fixed inset-0 z-[101] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <Motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="eh-surface w-full max-w-lg rounded-[2rem] p-6 shadow-eh-lg"
            >
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3 text-brand">
                  <Megaphone size={22} />
                  <h2 className="eh-display text-xl font-bold">Broadcast announcement</h2>
                </div>
                <button onClick={() => setShowBroadcastModal(false)} className="grid h-9 w-9 place-items-center rounded-full text-ink-muted transition hover:bg-surface-2">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleBroadcastSubmit} className="space-y-4 text-left">
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider eh-text-soft">Subject (optional)</label>
                  <input type="text" placeholder="e.g. Venue change!" value={broadcastForm.title} onChange={e => setBroadcastForm({ ...broadcastForm, title: e.target.value })} className={inputStyle} />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider eh-text-soft">Message <span className="text-red-500">*</span></label>
                  <textarea rows="4" required placeholder="Type your announcement here…" value={broadcastForm.message} onChange={e => setBroadcastForm({ ...broadcastForm, message: e.target.value })} className={`${inputStyle} resize-none`} />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowBroadcastModal(false)} className="eh-btn eh-btn-ghost flex-1">Cancel</button>
                  <button type="submit" disabled={isBroadcasting || !broadcastForm.message.trim()} className="eh-btn eh-btn-primary flex-[2] disabled:opacity-50">{isBroadcasting ? 'Broadcasting…' : 'Send to attendees'}</button>
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
