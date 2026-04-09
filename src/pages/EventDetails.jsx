import React, { useState } from 'react';
import { motion as Motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { MapPin, Calendar, Share2, Heart, Users, Clock, ArrowRight } from 'lucide-react';

const EventDetails = ({ darkMode }) => {
  const [isLiked, setIsLiked] = useState(false);
  const [isRegistered] = useState(false);

  const glassStyle = darkMode
    ? 'bg-slate-800 border-slate-700'
    : 'bg-white border-slate-200';

  return (
    <Motion.main
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="pt-24 pb-20 px-4 md:px-8 max-w-7xl mx-auto"
    >
      <div className="space-y-8">
        <div className="relative overflow-hidden rounded-[2.5rem] shadow-2xl h-[42vh] min-h-[320px] bg-blue-600">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.18),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(7,89,234,0.55),_transparent_30%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.15),rgba(15,23,42,0.75))]" />
          <div className="relative z-10 h-full p-8 md:p-12 flex flex-col justify-between">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="inline-flex items-center rounded-full bg-white/15 px-4 py-2 text-xs font-black uppercase tracking-[0.35em] text-white">
                  Conference
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsLiked(!isLiked)}
                  className="rounded-full border border-white/20 bg-white/10 p-3 text-white transition hover:bg-white/20"
                >
                  <Heart size={18} className={isLiked ? 'text-red-500' : 'text-white'} />
                </button>
                <button
                  onClick={() => console.log('Share clicked')}
                  className="rounded-full border border-white/20 bg-white/10 p-3 text-white transition hover:bg-white/20"
                >
                  <Share2 size={18} />
                </button>
              </div>
            </div>

            <div className="max-w-3xl">
              <h1 className="text-4xl sm:text-5xl font-black text-white leading-tight">Future of Web3 Summit</h1>
              <div className="mt-6 flex flex-col sm:flex-row sm:flex-wrap gap-4 text-sm font-semibold text-white">
                <span className="inline-flex items-center gap-2">
                  <Calendar size={16} /> Saturday, Nov 12 · 10:00 AM
                </span>
                <span className="inline-flex items-center gap-2">
                  <MapPin size={16} /> San Francisco Convention Center
                </span>
                <span className="inline-flex items-center gap-2">
                  <Users size={16} /> 1.2k Attending
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[2fr_0.95fr] gap-8">
          <div className="space-y-8">
            <section className={`rounded-[2rem] border ${glassStyle} p-8`}> 
              <h2 className={`text-2xl font-black mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>About this event</h2>
              <p className={`text-sm font-medium leading-relaxed mb-6 ${darkMode ? 'text-white' : 'text-slate-600'}`}>
                Join industry leaders, developers, and visionaries for a deep dive into the next generation of the internet. Expect hands-on workshops, keynote presentations from pioneers in decentralized tech, and unparalleled networking opportunities.
              </p>
              <ul className={`space-y-4 text-sm ${darkMode ? 'text-white' : 'text-slate-600'}`}>
                {[
                  'Keynote by Vitalik Buterin',
                  'Smart contract security workshop',
                  'Exclusive VIP networking dinner',
                  'Hackathon with $50k prize pool'
                ].map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="mt-1 h-2.5 w-2.5 rounded-full bg-blue-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className={`rounded-[2rem] border ${glassStyle} p-8`}>
              <h2 className={`text-2xl font-black mb-6 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Location</h2>
              <div className={`rounded-[1.75rem] p-6 border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className={`flex items-center gap-3 text-sm font-semibold mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  <MapPin size={18} /> 747 Howard St, San Francisco, CA 94103
                </div>
                <div className={`h-52 rounded-[1.5rem] ${darkMode ? 'bg-slate-800' : 'bg-slate-200'}`} />
                <button className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 transition">
                  <ArrowRight size={16} /> View Map
                </button>
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <div className={`rounded-[2rem] border ${glassStyle} p-6`}> 
              {!isRegistered ? (
                <>
                  <Link to="/event-registration" className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-4 text-sm font-black text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition">
                    Register for Event
                  </Link>
                  <button disabled className={`w-full rounded-2xl border px-5 py-4 text-sm font-bold ${darkMode ? 'border-slate-700 bg-slate-800 text-white' : 'border-slate-300 bg-slate-100 text-slate-500'}`}>
                    Join Event Chat
                  </button>
                  <p className={`mt-4 text-sm ${darkMode ? 'text-white' : 'text-slate-500'}`}>Register to unlock the event chat and RSVP controls.</p>
                </>
              ) : (
                <>
                  <div className={`rounded-3xl p-4 text-sm font-bold ${darkMode ? 'bg-emerald-500/10 text-white' : 'bg-emerald-50 text-emerald-700'}`}>You are registered!</div>
                  <div className={`text-sm mb-4 ${darkMode ? 'text-white' : 'text-slate-600'}`}>Are you going?</div>
                  <div className="grid gap-3">
                    {['Going', 'Maybe', 'No'].map((option) => (
                      <button key={option} className={`rounded-2xl border px-4 py-3 text-sm font-bold transition ${darkMode ? 'border-slate-700 text-white hover:bg-slate-800' : 'border-slate-200 text-slate-900 hover:bg-slate-100'}`}>
                        {option}
                      </button>
                    ))}
                  </div>
                  <button className="mt-4 w-full rounded-2xl bg-blue-600 px-5 py-4 text-sm font-black text-white hover:bg-blue-700 transition">Join Event Chat</button>
                  <button className={`mt-3 w-full rounded-2xl border px-5 py-4 text-sm font-bold transition ${darkMode ? 'border-slate-700 text-white hover:bg-slate-800' : 'border-slate-200 text-slate-900 hover:bg-slate-100'}`}>Unregister from event</button>
                </>
              )}
            </div>

            <div className={`rounded-[2rem] border ${glassStyle} p-6`}> 
              <div className={`text-xs uppercase tracking-[0.3em] mb-4 ${darkMode ? 'text-white' : 'text-slate-500'}`}>Organiser</div>
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-3xl bg-blue-600 text-white flex items-center justify-center font-black overflow-hidden">
                  <img src="/logo.png" alt="Organiser Logo" className="w-full h-full object-cover" />
                </div>
                <div>
                  <div className={`font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>Silicon Valley Tech Group</div>
                  <div className={`text-sm ${darkMode ? 'text-white' : 'text-slate-500'}`}>Host of 12 previous events</div>
                </div>
              </div>
              <button className={`mt-6 w-full rounded-2xl px-5 py-3 text-sm font-bold transition ${darkMode ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-slate-100 text-slate-900 hover:bg-slate-200'}`}>
                View Profile
              </button>
            </div>

            <div className={`rounded-[2rem] border ${glassStyle} p-6`}> 
              <div className="flex flex-wrap gap-2">
                {['Web3', 'Startup', 'Networking', 'Workshops', 'VIP'].map((tag) => (
                  <span key={tag} className={`rounded-full px-4 py-2 text-xs font-bold ${darkMode ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700'}`}>{tag}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Motion.main>
  );
};

export default EventDetails;
