import React from 'react';
import { motion as Motion } from 'framer-motion';
import { CalendarPlus, Compass, Users, Ticket, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const Home = ({ darkMode }) => {
  const cards = [
    { id: 'create', title: 'Create', description: 'Build new events and grow your audience.', icon: CalendarPlus, path: '/create-event' },
    { id: 'discover', title: 'Discover', description: 'Find curated events near you.', icon: Compass, path: '/events' },
    { id: 'connect', title: 'Connect', description: 'Meet people at events and network.', icon: Users, path: '/register' },
    { id: 'attend', title: 'Attend', description: 'Reserve tickets and join the chat.', icon: Ticket, path: '/login' }
  ];

  return (
    <Motion.main
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className={`pt-32 pb-20 px-4 md:px-8 min-h-screen ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}
    >
      <div className="mx-auto max-w-7xl px-4 py-8">
        <header className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between mb-12">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-3xl bg-blue-600 text-white flex items-center justify-center text-xl font-black shadow-lg overflow-hidden">
              <img src="/logo.png" alt="EventHub Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-blue-600 font-black ">EventHub</p>
              <h1 className={`text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mt-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Event Networking Platform</h1>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link to="/login" className={`rounded-full px-5 py-3 text-sm font-semibold shadow-sm transition ${darkMode ? 'border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800' : 'border-slate-300 bg-white text-slate-900 hover:bg-slate-100'}`}>
              Login
            </Link>
            <Link to="/register" className="rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-700">
              Register
            </Link>
          </div>
        </header>

        <div className="space-y-8">
          <section className="grid gap-8 lg:grid-cols-[1.4fr_1fr] items-start">
            <div className={`rounded-[2.5rem] p-10 shadow-2xl ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}>
              <span className="inline-flex items-center rounded-full bg-blue-600/10 px-4 py-2 text-xs font-black uppercase tracking-[0.3em] text-blue-600">
                Welcome
              </span>
              <h2 className={`mt-6 text-4xl sm:text-5xl font-black leading-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Launch your next event. Discover new experiences. Connect instantly.
              </h2>
              <p className={`mt-6 max-w-xl text-sm font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                EventHub brings creators, attendees, and organizers together with a seamless experience for building events, collecting RSVPs, and staying connected.
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <Link to="/login" className="inline-flex items-center gap-3 rounded-2xl bg-blue-600 px-8 py-4 text-sm font-black text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition">
                  Get Started <ArrowRight size={18} />
                </Link>
              </div>
            </div>

            <div className="grid gap-6">
              {cards.slice(0, 2).map((card, index) => {
                const Icon = card.icon;
                return (
                  <Motion.div
                    key={card.id}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.08, duration: 0.4 }}
                    className={`rounded-[2rem] p-8 shadow-xl hover:-translate-y-1 transition-transform ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
                  >
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-3xl bg-blue-600/10 text-blue-600 mb-6">
                      <Icon size={22} />
                    </div>
                    <h3 className={`text-xl font-black mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{card.title}</h3>
                    <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>{card.description}</p>
                    <Link to={card.path} className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700 transition">
                      {card.title} <ArrowRight size={16} />
                    </Link>
                  </Motion.div>
                );
              })}
            </div>
          </section>

          <section className="grid gap-6 md:grid-cols-2">
            {cards.slice(2, 4).map((card, index) => {
              const Icon = card.icon;
              return (
                <Motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (index + 2) * 0.08, duration: 0.4 }}
                  className={`rounded-[2rem] p-8 shadow-xl hover:-translate-y-1 transition-transform ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}
                >
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-3xl bg-blue-600/10 text-blue-600 mb-6">
                    <Icon size={22} />
                  </div>
                  <h3 className={`text-xl font-black mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{card.title}</h3>
                  <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>{card.description}</p>
                  <Link to={card.path} className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700 transition">
                    {card.title} <ArrowRight size={16} />
                  </Link>
                </Motion.div>
              );
            })}
          </section>
        </div>
      </div>
    </Motion.main>
  );
};

export default Home;
