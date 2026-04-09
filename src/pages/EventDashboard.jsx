import React from 'react';
import { motion as Motion } from 'framer-motion';
import { Users, CalendarCheck, CreditCard, TrendingUp, Download, MapPin, Settings } from 'lucide-react';

const EventDashboard = ({ darkMode }) => {
  const stats = [
    { title: 'Total Attendees', value: '1,240', icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/20' },
    { title: 'Going', value: '850', icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/20' },
    { title: 'Maybe', value: '290', icon: CalendarCheck, color: 'text-amber-500', bg: 'bg-amber-500/20' },
    { title: 'Revenue', value: '₦4.5M', icon: CreditCard, color: 'text-purple-500', bg: 'bg-purple-500/20' },
  ];

  const glassStyle = darkMode 
    ? 'bg-slate-800/40 border-slate-700/50 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.3)]' 
    : 'bg-white/40 border-white/40 backdrop-blur-2xl shadow-[0_8px_32px_rgba(10,31,110,0.1)]';

  return (
    <Motion.main 
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="pt-32 pb-20 px-6 max-w-7xl mx-auto space-y-8"
    >
      {}
      <div className={`border rounded-[2rem] p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 ${glassStyle}`}>
        <div>
          <span className="px-4 py-1.5 rounded-full text-xs font-extrabold tracking-widest uppercase bg-blue-500/20 text-blue-600 dark:text-blue-400 mb-4 inline-block">
            Technology
          </span>
        <h1 className={`text-3xl md:text-4xl font-black mb-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>React Summit 2024</h1>
        <div className={`flex flex-wrap items-center gap-6 text-sm font-medium opacity-100 ${darkMode ? 'text-white' : 'text-slate-600'}`}>
            <span className="flex items-center gap-2"><CalendarCheck size={16} /> Jun 15 · 9:00 AM</span>
            <span className="flex items-center gap-2"><MapPin size={16} /> San Francisco, CA</span>
          </div>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
        <button className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-full transition-all font-bold ${darkMode ? 'bg-slate-700/50 hover:bg-slate-600/50 text-white' : 'bg-white/50 hover:bg-white/80 text-slate-900'}`} onClick={() => console.log('Manage clicked')}>
            <Settings size={18} /> Manage
          </button>
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white transition-all font-bold shadow-lg shadow-blue-600/30" onClick={() => console.log('Export CSV clicked')}>
            <Download size={18} /> Export CSV
          </button>
        </div>
      </div>

      {}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <Motion.div 
            key={idx}
            whileHover={{ y: -6, scale: 1.02 }}
            className={`rounded-[1.5rem] p-6 border flex items-center gap-5 ${glassStyle}`}
          >
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

      {}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className={`lg:col-span-2 border rounded-[2rem] overflow-hidden ${glassStyle}`}>
          <div className="p-6 border-b border-black/5 dark:border-white/5 flex justify-between items-center">
          <h2 className={`text-lg font-extrabold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Recent Registrations</h2>
          </div>
          <div className="overflow-x-auto">
          <table className={`w-full text-left ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              <thead>
              <tr className={`text-xs uppercase tracking-wider opacity-100 ${darkMode ? 'text-white' : 'text-slate-600'}`}>
                  <th className="px-6 py-4 font-extrabold">Attendee</th>
                  <th className="px-6 py-4 font-extrabold">Ticket</th>
                  <th className="px-6 py-4 font-extrabold">RSVP</th>
                </tr>
              </thead>
              <tbody className="text-sm font-medium">
                {[
                  { name: 'Sarah Johnson', email: 'sarah@example.com', ticket: 'VIP Access', rsvp: 'Going' },
                  { name: 'James Tunde', email: 'james@example.com', ticket: 'Early Bird', rsvp: 'Maybe' },
                  { name: 'Priya Mehta', email: 'priya@example.com', ticket: 'General Admission', rsvp: 'Going' },
                ].map((user, i) => (
                  <tr key={i} className="border-t border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-base">{user.name}</div>
                      <div className={`opacity-100 text-xs ${darkMode ? 'text-white' : 'text-slate-600'}`}>{user.email}</div>
                    </td>
                    <td className="px-6 py-4">{user.ticket}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider ${
                        user.rsvp === 'Going' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                      }`}>
                        {user.rsvp}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {}
        <div className={`border rounded-[2rem] p-6 h-fit ${glassStyle}`}>
        <h2 className={`text-lg font-extrabold mb-6 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Sales Breakdown</h2>
          <div className="space-y-6">
            {[
              { name: 'VIP Access', count: 120, rev: '₦1.8M', pct: '75%' },
              { name: 'General Admission', count: 450, rev: '₦3.6M', pct: '95%' },
              { name: 'Early Bird', count: 200, rev: '₦1.0M', pct: '100%' }
            ].map((t, i) => (
              <div key={i}>
              <div className={`flex justify-between font-bold mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  <span>{t.name}</span>
                  <span className="text-blue-500">{t.rev}</span>
                </div>
              <div className={`text-xs font-semibold opacity-100 mb-3 ${darkMode ? 'text-white' : 'text-slate-600'}`}>{t.count} sold</div>
                <div className="w-full bg-black/10 dark:bg-white/10 rounded-full h-2.5 overflow-hidden">
                  <Motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: t.pct }}
                    transition={{ duration: 1, delay: i * 0.2 }}
                    className="bg-blue-500 h-full rounded-full" 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Motion.main>
  );
};

export default EventDashboard;
