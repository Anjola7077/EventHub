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

  const inputStyle = 'w-full rounded-2xl border border-line bg-surface px-4 py-3 text-sm font-medium eh-text placeholder:text-ink-muted transition focus:border-brand focus:outline-none focus:[box-shadow:var(--eh-ring)]';

  const addEditTier = () => setEditForm(f => ({ ...f, ticketTiers: [...(f.ticketTiers || []), { name: '', price: 0, capacity: '', color: TIER_COLORS[(f.ticketTiers?.length || 0) % TIER_COLORS.length], perks: '' }] }));
  const updateEditTier = (idx, key, value) => setEditForm(f => ({ ...f, ticketTiers: (f.ticketTiers || []).map((t, i) => (i === idx ? { ...t, [key]: value } : t)) }));
  const removeEditTier = (idx) => setEditForm(f => ({ ...f, ticketTiers: (f.ticketTiers || []).filter((_, i) => i !== idx) }));

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

      const editedId = editForm._id || editForm.id || eventData._id || eventData.id;
      const res = await api.put(`/events/${editedId}`, payload, config);

      if (editedId === (eventData._id || eventData.id)) {
        setEventData(prev => ({ ...prev, ...res.data.data }));
      }
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
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="eh-page-bg min-h-screen overflow-x-hidden px-4 pb-20 pt-28 sm:px-6 md:pt-32"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="mx-auto max-w-7xl space-y-5">
        {/* Pull to refresh indicator */}
        <div className="flex justify-center overflow-hidden transition-all duration-200" style={{ height: `${pullDistance}px`, opacity: pullDistance / 80 }}>
          <div className="flex items-center gap-2 eh-text-soft">
            <div className={`h-5 w-5 rounded-full border-2 border-brand border-t-transparent ${isRefreshing ? 'animate-spin' : ''}`} style={{ transform: `rotate(${pullDistance * 4}deg)` }} />
            <span className="text-xs font-bold">{isRefreshing ? 'Refreshing…' : 'Pull to refresh'}</span>
          </div>
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

        {activeTab === 'analytics' && (
        <>
        {/* ---- Stats bento ---- */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {stats.map((stat, idx) => (
            <Motion.div key={idx} whileHover={{ y: -4 }} className="eh-surface rounded-3xl p-4 sm:p-5">
              <span className={`grid h-11 w-11 place-items-center rounded-2xl ${stat.bg} ${stat.color}`}>
                <stat.icon size={20} strokeWidth={2.5} />
              </span>
              <div className="eh-display mt-3 text-2xl font-extrabold leading-tight sm:mt-4 sm:text-3xl">{stat.value}</div>
              <div className="mt-0.5 text-[11px] font-bold uppercase tracking-wider eh-text-muted">{stat.title}</div>
            </Motion.div>
          ))}
        </div>

        {/* ---- Charts ---- */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="eh-surface rounded-[2rem] p-5 sm:p-6 lg:col-span-2">
            <div className="mb-6 flex items-center justify-between gap-3">
              <h2 className="eh-display text-lg font-bold">Sales trend</h2>
              <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} className="rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-bold eh-text focus:border-brand focus:outline-none">
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="all">All time</option>
              </select>
            </div>
            <div className="h-56 w-full sm:h-64"><Line data={lineData} options={lineOptions} /></div>
          </div>
          <div className="eh-surface rounded-[2rem] p-5 sm:p-6">
            <h2 className="eh-display mb-6 text-lg font-bold">Tickets by type</h2>
            <div className="h-56 w-full sm:h-64"><Doughnut data={doughnutData} options={doughnutOptions} /></div>
          </div>
        </div>

        {/* ---- Attendees ---- */}
        <div className="eh-surface overflow-hidden rounded-[2rem]">
          <div className="flex flex-col gap-4 border-b border-line p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <h2 className="eh-display text-lg font-bold">Recent registrations</h2>
            <div className="relative w-full sm:w-64">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                type="text"
                placeholder="Search by name or email…"
                value={attendeeSearch}
                onChange={(e) => setAttendeeSearch(e.target.value)}
                className="w-full rounded-xl border border-line bg-surface py-2 pl-9 pr-3 text-sm font-semibold eh-text placeholder:text-ink-muted focus:border-brand focus:outline-none"
              />
            </div>
          </div>

          {filteredAttendees.length === 0 ? (
            <div className="p-10 text-center text-sm eh-text-muted">
              {attendeeSearch ? 'No attendees match your search.' : 'No attendees yet. Share your event link to get started.'}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-surface-2 text-xs uppercase tracking-wider eh-text-muted">
                      <th className="px-6 py-4 font-bold">Attendee</th>
                      <th className="px-6 py-4 font-bold">Ticket</th>
                      <th className="px-6 py-4 font-bold">Status</th>
                      <th className="px-6 py-4 text-right font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {currentAttendees.map((att, i) => (
                      <tr key={att?.user?._id || i} className="border-t border-line transition-colors hover:bg-surface-2">
                        <td className="px-6 py-4">
                          <div className="font-bold eh-text">{att?.user?.fullName || att?.fullName || 'Anonymous'}</div>
                          <div className="text-xs eh-text-muted">
                            {att?.user?.email || att?.email || 'N/A'}
                            {eventData.isOverview && <span className="mt-0.5 block font-bold eh-text-brand">{att.eventName}</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 eh-text-soft">{att?.type || att?.ticketType || 'Standard'}</td>
                        <td className="px-6 py-4"><StatusBadge verified={att?.isVerified} /></td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-3">
                            {att?.receiptUrl && (
                              <a href={att?.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-bold eh-text-brand hover:underline">View receipt</a>
                            )}
                            {att?.isVerified === false && (
                              <button onClick={() => handleApproveAttendee(att?.user?._id || att?.user?.id || att?.user, att?.eventId)} className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-600 transition hover:bg-emerald-500/20 dark:text-emerald-400">Approve</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="divide-y divide-line md:hidden">
                {currentAttendees.map((att, i) => (
                  <div key={att?.user?._id || i} className="flex items-start justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="truncate font-bold eh-text">{att?.user?.fullName || att?.fullName || 'Anonymous'}</p>
                      <p className="truncate text-xs eh-text-muted">{att?.user?.email || att?.email || 'N/A'}</p>
                      {eventData.isOverview && att.eventName && <p className="truncate text-xs font-bold eh-text-brand">{att.eventName}</p>}
                      <p className="mt-1 text-[11px] font-semibold eh-text-soft">{att?.type || att?.ticketType || 'Standard'}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <StatusBadge verified={att?.isVerified} />
                      {att?.receiptUrl && (
                        <a href={att?.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-bold eh-text-brand hover:underline">Receipt</a>
                      )}
                      {att?.isVerified === false && (
                        <button onClick={() => handleApproveAttendee(att?.user?._id || att?.user?.id || att?.user, att?.eventId)} className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 transition hover:bg-emerald-500/20 dark:text-emerald-400">Approve</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

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

      {/* Quick Edit Modal */}
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
                <label className="group relative block cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed border-line bg-surface-2 p-6 text-center transition-colors hover:border-brand">
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                    const file = e.target.files[0];
                    if (file && file.size > 5 * 1024 * 1024) {
                      alert("Cover image must be less than 5MB.");
                      return;
                    }
                    setEditingCoverImage(file);
                  }} />
                  <img src={editingCoverImage ? URL.createObjectURL(editingCoverImage) : (editForm.coverImage || '/placeholder.png')} alt="Cover preview" className="absolute inset-0 h-full w-full object-cover" />
                  <div className="relative z-10 inline-block rounded-lg bg-black/40 p-2 backdrop-blur-sm">
                    <ImageIcon size={24} className="mx-auto mb-2 text-white" />
                    <p className="text-xs font-bold text-white">Click to change cover image</p>
                  </div>
                </label>
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider eh-text-soft">Event title</label>
                  <input type="text" value={editForm.title || ''} onChange={e => setEditForm({ ...editForm, title: e.target.value })} className={inputStyle} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider eh-text-soft">Start date</label>
                    <input type="date" value={editForm.date ? editForm.date.substring(0, 10) : ''} onChange={e => setEditForm({ ...editForm, date: e.target.value })} className={inputStyle} required />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider eh-text-soft">Start time</label>
                    <input type="time" value={editForm.time || ''} onChange={e => setEditForm({ ...editForm, time: e.target.value })} className={inputStyle} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider eh-text-soft">End date</label>
                    <input type="date" value={editForm.endDate ? editForm.endDate.substring(0, 10) : ''} onChange={e => setEditForm({ ...editForm, endDate: e.target.value })} className={inputStyle} />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider eh-text-soft">End time</label>
                    <input type="time" value={editForm.endTime || ''} onChange={e => setEditForm({ ...editForm, endTime: e.target.value })} className={inputStyle} />
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider eh-text-soft">Location</label>
                  <input type="text" value={typeof editForm.location === 'object' ? editForm.location?.formattedAddress : (editForm.location || '')} onChange={e => setEditForm({ ...editForm, location: e.target.value })} className={inputStyle} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider eh-text-soft">Price (₦)</label>
                    <input type="number" value={editForm.price || 0} onChange={e => setEditForm({ ...editForm, price: e.target.value })} className={inputStyle} />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider eh-text-soft">Capacity</label>
                    <input type="number" value={editForm.capacity || ''} onChange={e => setEditForm({ ...editForm, capacity: e.target.value })} className={inputStyle} placeholder="Unlimited" />
                  </div>
                </div>
                {Number(editForm.price) > 0 && (
                  <div className="mt-4 rounded-2xl border border-line bg-surface-2 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <Landmark size={16} className="text-emerald-500" />
                      <h4 className="text-xs font-bold uppercase tracking-wider eh-text">Payment details</h4>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider eh-text-soft">Bank name</label>
                        <input type="text" value={editForm.bankName || ''} onChange={e => setEditForm({ ...editForm, bankName: e.target.value })} className={inputStyle} placeholder="e.g. GTBank" />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider eh-text-soft">Account number</label>
                        <input type="text" value={editForm.accountNumber || ''} onChange={e => setEditForm({ ...editForm, accountNumber: e.target.value })} className={inputStyle} placeholder="e.g. 0123456789" />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider eh-text-soft">Account name</label>
                        <input type="text" value={editForm.accountName || ''} onChange={e => setEditForm({ ...editForm, accountName: e.target.value })} className={inputStyle} placeholder="e.g. John Doe" />
                      </div>
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border border-line bg-surface-2 p-4">
                  <div className="mb-1 flex items-center gap-2">
                    <Ticket size={16} className="text-brand" />
                    <h4 className="text-xs font-bold uppercase tracking-wider eh-text">Ticket tiers</h4>
                  </div>
                  <p className="mb-4 text-xs eh-text-muted">Optional. Levels like VIP or VVIP, each with its own price and colour.</p>

                  {(editForm.ticketTiers || []).length > 0 && (
                    <div className="space-y-3">
                      {(editForm.ticketTiers || []).map((tier, idx) => (
                        <div key={idx} className="rounded-xl border border-line bg-surface p-3">
                          <div className="mb-2 flex items-center gap-2">
                            {TIER_COLORS.map((c) => (
                              <button key={c} type="button" aria-label={`Set tier colour ${c}`} onClick={() => updateEditTier(idx, 'color', c)} style={{ background: c }} className={`h-5 w-5 rounded-full transition ${tier.color === c ? 'ring-2 ring-[var(--eh-text)] ring-offset-2 ring-offset-[var(--eh-surface)]' : 'opacity-60 hover:opacity-100'}`} />
                            ))}
                            <button type="button" onClick={() => removeEditTier(idx)} aria-label="Remove tier" className="ml-auto grid h-7 w-7 place-items-center rounded-full text-ink-muted transition hover:bg-red-500/10 hover:text-red-500"><Trash2 size={14} /></button>
                          </div>
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                            <input value={tier.name || ''} onChange={(e) => updateEditTier(idx, 'name', e.target.value)} placeholder="Name (e.g. VIP)" className={inputStyle} />
                            <input type="number" value={tier.price ?? 0} onChange={(e) => updateEditTier(idx, 'price', e.target.value)} placeholder="Price (₦)" className={inputStyle} />
                            <input type="number" value={tier.capacity || ''} onChange={(e) => updateEditTier(idx, 'capacity', e.target.value)} placeholder="Capacity" className={inputStyle} />
                          </div>
                          <input value={tier.perks || ''} onChange={(e) => updateEditTier(idx, 'perks', e.target.value)} placeholder="Perks (optional)" className={`${inputStyle} mt-2`} />
                        </div>
                      ))}
                    </div>
                  )}

                  <button type="button" onClick={addEditTier} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-dashed border-line bg-surface px-3 py-2 text-xs font-semibold eh-text-soft transition hover:border-brand hover:text-brand">
                    <Plus size={14} /> Add tier
                  </button>
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => { setIsEditing(false); setEditingCoverImage(null); }} className="eh-btn eh-btn-ghost flex-1">Cancel</button>
                  <button type="button" onClick={handleDelete} disabled={isSaving || (!hasHappened && editForm?.status !== 'draft')} title={(!hasHappened && editForm?.status !== 'draft') ? "Published events can only be deleted after they have happened" : "Delete event"} className="rounded-2xl bg-red-500/10 px-5 font-semibold text-red-600 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400">Delete</button>
                  {editForm?.status === 'draft' && (
                    <button type="button" disabled={isSaving} onClick={(e) => { editForm.status = 'published'; handleEditSubmit(e); }} className="flex-1 rounded-2xl bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50">Publish</button>
                  )}
                  <button type="submit" disabled={isSaving} className="eh-btn eh-btn-primary flex-1 disabled:opacity-50">{isSaving ? 'Saving…' : 'Save'}</button>
                </div>
              </form>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Event Confirmation Modal */}
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

      {/* Broadcast Modal */}
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
