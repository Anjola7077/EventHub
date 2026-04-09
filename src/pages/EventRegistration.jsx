import React, { useState } from 'react';
import { motion as Motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Lock, CheckCircle2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const EventRegistration = ({ darkMode }) => {
  const [form, setForm] = useState({ name: '', email: '', ticket: 'General Admission', agree: false });
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();

  const handleChange = (key) => (e) => {
    const value = key === 'agree' ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.agree) return;
    setSubmitted(true);
  };

  const ticketPrice = form.ticket === 'VIP Access' ? '₦35,000' : form.ticket === 'Early Bird' ? '₦20,000' : '₦0';

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
          <Link to="/event-details" className={`inline-flex items-center gap-2 text-sm font-semibold hover:text-blue-600 transition-colors ${darkMode ? 'text-white' : 'text-slate-700'}`}>
            <ArrowLeft size={18} /> Back to Event
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-8">
          <div className="rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-8">
            <div className="space-y-4">
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest ${darkMode ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'}`}>
                Conference
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

                <div className="space-y-2">
              <label className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Ticket Type</label>
                  <select
                    value={form.ticket}
                    onChange={handleChange('ticket')}
                className={`w-full rounded-2xl border px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'border-slate-700 bg-slate-950 text-white' : 'border-slate-200 bg-slate-50 text-slate-900'}`}
                  >
                    <option>General Admission</option>
                    <option>Early Bird</option>
                    <option>VIP Access</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                <label className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Agree to terms</label>
                <span className={`text-xs ${darkMode ? 'text-white' : 'text-slate-500'}`}>Required</span>
                  </div>
              <label className={`flex items-center gap-3 rounded-2xl border px-4 py-3 cursor-pointer ${darkMode ? 'border-slate-700 bg-slate-950' : 'border-slate-200 bg-slate-50'}`}>
                    <input type="checkbox" checked={form.agree} onChange={handleChange('agree')} className="h-5 w-5 rounded-md text-blue-600 focus:ring-blue-500" />
                <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-slate-700'}`}>I agree to the Terms & Conditions and refund policy.</span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 text-sm font-black text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-colors"
                >
                  Confirm Registration <ArrowRight size={18} />
                </button>

            <p className={`text-sm inline-flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-500'}`}>
                  <Lock size={16} /> This is a free event — no payment required.
                </p>
              </form>
            ) : (
              <div className="space-y-6 mt-10 text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <CheckCircle2 size={36} />
                </div>
                <div>
                  <h2 className={`text-3xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>You're registered!</h2>
              <p className={`mt-3 text-sm ${darkMode ? 'text-white' : 'text-slate-600'}`}>
                    You've successfully registered for <strong>Future of Web3 Summit</strong>. A confirmation has been sent to <strong>{form.email}</strong>.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    onClick={() => navigate('/event-details')}
                className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-6 py-4 text-sm font-bold transition-colors ${darkMode ? 'border-slate-700 bg-slate-950 text-white hover:bg-slate-800' : 'border-slate-200 bg-slate-50 text-slate-900 hover:bg-slate-100'}`}
                  >
                    View Event Details
                  </button>
                  <button
                    onClick={() => navigate('/chat/1')}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 text-sm font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-colors"
                  >
                    Join Event Chat
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className={`rounded-[2rem] border p-6 shadow-2xl ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <h2 className={`text-lg font-black mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Event summary</h2>
              <div className={`space-y-4 text-sm ${darkMode ? 'text-white' : 'text-slate-600'}`}>
                <div className={`rounded-2xl p-4 ${darkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
                  <div className="font-bold">Tech Innovators Summit 2024</div>
                  <div className="mt-2">Saturday, Nov 12 · 10:00 AM</div>
                  <div className="mt-1">San Francisco Convention Center</div>
                </div>
                <div className={`rounded-2xl p-4 ${darkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
                  <div className="font-bold">Selected ticket</div>
                  <div className="mt-2">{form.ticket}</div>
                </div>
                <div className={`rounded-2xl p-4 ${darkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
                  <div className="font-bold">Total</div>
                  <div className="mt-2 text-xl font-black">{ticketPrice}</div>
                </div>
              </div>
            </div>

            <div className={`rounded-[2rem] border p-6 shadow-2xl ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <h2 className={`text-lg font-black mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Need help?</h2>
              <p className={`text-sm ${darkMode ? 'text-white' : 'text-slate-600'}`}>
                If you need help with your registration, contact the organizer or visit the event page for more details.
              </p>
              <div className="mt-6 space-y-3">
                <button onClick={() => navigate('/profile')} className={`w-full rounded-2xl border px-5 py-3 text-sm font-bold transition-colors ${darkMode ? 'border-slate-700 bg-slate-950 text-white hover:bg-slate-800' : 'border-slate-200 bg-slate-50 text-slate-900 hover:bg-slate-100'}`}>
                  View Organizer Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Motion.main>
  );
};

export default EventRegistration;
