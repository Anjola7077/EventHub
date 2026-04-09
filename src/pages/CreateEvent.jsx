import React, { useState } from 'react';
import { motion as Motion } from 'framer-motion';
import { Calendar, MapPin, Image as ImageIcon, Tag, Users, AlignLeft, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

const CreateEvent = ({ darkMode }) => {
  const [activeCategory, setActiveCategory] = useState('Technology');
  const [publicEvent, setPublicEvent] = useState(true);
  const [approvalRequired, setApprovalRequired] = useState(false);
  const categories = ['Technology', 'Design', 'Business', 'Music', 'Networking', 'Education'];

  const glassStyle = darkMode 
    ? 'bg-slate-800/40 border-slate-700/50 backdrop-blur-2xl shadow-xl' 
    : 'bg-white/60 border-white/50 backdrop-blur-2xl shadow-[0_8px_32px_rgba(10,31,110,0.08)]';

  const inputStyle = `w-full px-5 py-3.5 rounded-2xl text-sm font-medium border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
    darkMode 
      ? 'bg-slate-900/50 border-slate-700 focus:bg-slate-800 text-white placeholder-white' 
      : 'bg-white/50 border-white focus:bg-white text-slate-900'
  }`;

  return (
    <Motion.main 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="pt-32 pb-20 px-4 md:px-8 max-w-6xl mx-auto"
    >
      <div className="mb-10 text-center md:text-left">
        <h1 className={`text-3xl md:text-4xl font-black mb-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Create New Event</h1>
        <p className={`text-sm font-semibold opacity-100 ${darkMode ? 'text-white' : 'text-slate-600'}`}>Design and launch your next unforgettable experience.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Form Content */}
        <div className="lg:col-span-2 space-y-8">
          
          <Motion.section whileHover={{ scale: 1.01 }} className={`p-8 rounded-[2rem] border ${glassStyle}`}>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-500"><AlignLeft size={20} /></div>
              <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Basic Information</h2>
            </div>
            <div className="space-y-5">
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider opacity-100 mb-2 ${darkMode ? 'text-white' : 'text-slate-600'}`}>Event Title</label>
                <input type="text" placeholder="e.g., Summer Networking Mixer" className={inputStyle} />
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
                <textarea rows="4" placeholder="What can attendees expect?" className={`${inputStyle} resize-none`}></textarea>
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
                <input type="date" className={inputStyle} />
              </div>
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider opacity-100 mb-2 ${darkMode ? 'text-white' : 'text-slate-600'}`}>Start Time</label>
                <input type="time" className={inputStyle} />
              </div>
              <div className="md:col-span-2">
                <label className={`block text-xs font-bold uppercase tracking-wider opacity-100 mb-2 ${darkMode ? 'text-white' : 'text-slate-600'}`}>Venue / Link</label>
                <div className="relative">
                  <MapPin size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 ${darkMode ? 'text-white opacity-100' : 'text-slate-900 opacity-40'}`} />
                  <input type="text" placeholder="Add a physical address or meeting link" className={`${inputStyle} pl-12`} />
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
            <div className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ${darkMode ? 'border-slate-600 hover:border-blue-500 bg-slate-900/30' : 'border-blue-200 hover:border-blue-500 bg-blue-50/50'}`}>
              <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto mb-3">
                <ImageIcon size={24} />
              </div>
              <p className={`text-sm font-bold mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Click to upload</p>
              <p className={`text-xs opacity-100 font-medium ${darkMode ? 'text-white' : 'text-slate-600'}`}>PNG, JPG up to 5MB</p>
            </div>
          </Motion.div>

          <Motion.div whileHover={{ scale: 1.02 }} className={`p-6 rounded-[2rem] border ${glassStyle}`}>
            <h3 className={`text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              <ShieldCheck size={16} /> Preferences
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-black/5 dark:bg-white/5">
                <div>
                  <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Public Event</p>
                  <p className={`text-[10px] font-semibold opacity-100 uppercase ${darkMode ? 'text-white' : 'text-slate-600'}`}>Visible to everyone</p>
                </div>
                <div className="w-12 h-6 bg-blue-500 rounded-full relative cursor-pointer shadow-inner" onClick={() => setPublicEvent(!publicEvent)}>
                  <Motion.div layout className="w-5 h-5 bg-white rounded-full absolute shadow-md" animate={{ left: publicEvent ? 'calc(100% - 20px)' : '2px', top: '2px' }} />
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-black/5 dark:bg-white/5">
                <div>
                  <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Approval Required</p>
                  <p className={`text-[10px] font-semibold opacity-100 uppercase ${darkMode ? 'text-white' : 'text-slate-600'}`}>Manual RSVP check</p>
                </div>
                <div className="w-12 h-6 bg-slate-300 dark:bg-slate-700 rounded-full relative cursor-pointer shadow-inner" onClick={() => setApprovalRequired(!approvalRequired)}>
                  <Motion.div layout className="w-5 h-5 bg-white rounded-full absolute shadow-md" animate={{ left: approvalRequired ? 'calc(100% - 20px)' : '2px', top: '2px' }} />
                </div>
              </div>
            </div>
          </Motion.div>

          <button className={`w-full py-4 rounded-2xl font-bold tracking-wide border transition-colors ${darkMode ? 'border-slate-700 hover:bg-slate-800 text-white' : 'border-blue-200 hover:bg-blue-50 text-slate-900'}`}>
            <Link to="/flyer-designer" className="block w-full h-full flex items-center justify-center">
              Design Flyer
            </Link>
          </button>

          <button className="w-full py-4 rounded-2xl bg-blue-600 text-white font-black tracking-wide shadow-xl shadow-blue-600/30 hover:scale-[1.02] transition-transform" onClick={() => console.log('Publish Event clicked')}>
            Publish Event
          </button>
          <button className={`w-full py-4 rounded-2xl font-bold tracking-wide border transition-colors ${darkMode ? 'border-slate-700 hover:bg-slate-800 text-white' : 'border-blue-200 hover:bg-blue-50 text-slate-900'}`} onClick={() => console.log('Save as Draft clicked')}>
            Save as Draft
          </button>
        </div>
      </div>
    </Motion.main>
  );
};

export default CreateEvent;
