import React, { useState, useEffect } from 'react';
import { motion as Motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Lock, CheckCircle2, Download, Landmark } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import sanitizeError from '../utils/errorMessages';

const EventRegistration = ({ darkMode }) => {
  const { eventId } = useParams();
  const [eventData, setEventData] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', agree: false });
  const [selectedTier, setSelectedTier] = useState(null);
  const [receiptFile, setReceiptFile] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await api.get(`/events/${eventId}`);
        setEventData(res.data.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchEvent();
  }, [eventId]);

  useEffect(() => {
    if (eventData?.ticketTiers?.length > 0 && !selectedTier) {
      setSelectedTier(eventData.ticketTiers[0]);
    } else if (eventData && !selectedTier) {
      setSelectedTier({ name: 'General Admission', price: eventData.price || 0 });
    }
  }, [eventData, selectedTier]);

  const handleChange = (key) => (e) => {
    const value = key === 'agree' ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const price = selectedTier ? selectedTier.price : eventData?.price || 0;
    if (price > 0 && !receiptFile) {
      return alert("Please upload your payment receipt to continue!");
    }

    if (!form.name || !form.email || !form.agree) return;

    setIsLoading(true);
    try {
      const payload = new FormData();
      if (selectedTier) payload.append('ticketType', selectedTier.name);
      if (receiptFile) payload.append('receipt', receiptFile);

      await api.post(`/events/${eventId}/rsvp`, payload);
      setSubmitted(true);
    } catch (error) {
      alert(sanitizeError(error, "Failed to register. Please try again."));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadTicket = async () => {
    setIsDownloading(true);
    try {
      const res = await api.get(`/events/${eventId}/ticket`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${form.name.replace(/\s+/g, '_')}_Ticket.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert('Could not download your ticket right now. Please try again later.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Motion.main
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      className={`min-h-screen px-4 py-24 ${darkMode ? 'bg-slate-950' : 'bg-slate-50'}`}
    >
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-blue-600/10 text-blue-600 font-bold">
              <span>EventHub</span>
            </div>
          </div>
          <Link to={`/event-details/${eventId}`} className={`inline-flex items-center gap-2 text-sm font-semibold hover:text-blue-600 transition-colors ${darkMode ? 'text-white' : 'text-slate-700'}`}>
            <ArrowLeft size={18} /> Back to Event
          </Link>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-8">
          <div className="rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-8">
            <div className="space-y-4">
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest ${darkMode ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'}`}>
                Registration
              </span>
            <h1 className={`text-3xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>Register for this Event</h1>
            <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-slate-600'}`}>
                Fill in the details below to secure your spot and unlock the event chat.
            </p>
            </div>
            {!submitted ? (
              <form onSubmit={handleSubmit} className="space-y-6 mt-10">
                <div className="space-y-2">
                  <label className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Full Name <span className="text-red-500">*</span></label>
                  <input
                    value={form.name}
                    onChange={handleChange('name')}
                    className={`w-full rounded-2xl border px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'border-slate-700 bg-slate-950 text-white' : 'border-slate-200 bg-slate-50 text-slate-900'}`}
                    placeholder="Your full name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Email Address <span className="text-red-500">*</span></label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={handleChange('email')}
                    className={`w-full rounded-2xl border px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'border-slate-700 bg-slate-950 text-white' : 'border-slate-200 bg-slate-50 text-slate-900'}`}
                    placeholder="your@email.com"
                    required
                  />
                </div>

                <div className="space-y-3">
                  <label className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Select Ticket Tier</label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {eventData?.ticketTiers?.length > 0 ? (
                      eventData.ticketTiers.map((tier, idx) => (
                        <div
                          key={idx}
                          onClick={() => setSelectedTier(tier)}
                          className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${selectedTier?.name === tier.name ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' : darkMode ? 'border-slate-700 bg-slate-800 hover:border-slate-500' : 'border-slate-200 bg-slate-50 hover:border-slate-300'}`}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className={`flex items-center gap-2 font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: tier.color || '#2563eb' }} />
                              {tier.name}
                            </span>
                            <span className="text-blue-600 font-bold">{tier.price === 0 ? 'Free' : `₦${tier.price.toLocaleString()}`}</span>
                          </div>
                          {tier.perks && <div className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">{tier.perks}</div>}
                          {tier.capacity && <div className="text-xs text-slate-500 dark:text-slate-400">{tier.capacity} Tickets Total</div>}
                        </div>
                      ))
                    ) : (
                      <div onClick={() => setSelectedTier({ name: 'General Admission', price: eventData?.price || 0 })} className="p-4 rounded-2xl border-2 cursor-pointer transition-all border-blue-600 bg-blue-50 dark:bg-blue-900/20">
                         <div className="flex justify-between items-center mb-1">
                            <span className={`font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>General Admission</span>
                            <span className="text-blue-600 font-bold">{!eventData || eventData.price === 0 ? 'Free' : `₦${eventData.price.toLocaleString()}`}</span>
                          </div>
                      </div>
                    )}
                  </div>
                </div>

                {((selectedTier && selectedTier.price > 0) || (!selectedTier && eventData?.price > 0)) && (
                  <div className="space-y-2 mt-6">
                    <label className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Upload Payment Receipt</label>
                    <div className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer relative transition-colors ${darkMode ? 'border-slate-700 bg-slate-900 hover:border-blue-500' : 'border-slate-300 bg-slate-50 hover:border-blue-500'}`}>
                      <input
                        type="file"
                        accept="image

