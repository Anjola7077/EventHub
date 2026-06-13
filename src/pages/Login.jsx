import React, { useState, useContext } from 'react';
import { motion as Motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowRight, CalendarDays, MessageSquare, Sparkles } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import sanitizeError from '../utils/errorMessages';

const perks = [
  { icon: Sparkles, label: 'Events picked for you' },
  { icon: MessageSquare, label: 'Live chats with attendees' },
  { icon: CalendarDays, label: 'Never miss a moment' },
];

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(sanitizeError(err, "Invalid email or password."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Motion.main
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="min-h-screen flex items-center justify-center px-4 pt-20"
    >
      <Motion.div
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="eh-surface grid w-full max-w-5xl overflow-hidden rounded-[2rem] shadow-eh-lg lg:grid-cols-2"
      >
        {/* Brand panel */}
        <div className="relative hidden flex-col justify-between overflow-hidden bg-brand p-10 text-white lg:flex">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" aria-hidden />
          <div className="absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-white/10 blur-2xl" aria-hidden />
          <div className="relative flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center overflow-hidden rounded-2xl bg-white/15">
              <img src="/logo.png" alt="EventHub" className="h-full w-full object-contain p-1.5" />
            </span>
            <span className="text-sm font-bold uppercase tracking-[0.2em]">EventHub</span>
          </div>
          <h2 className={`text-2xl font-black mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Welcome Back</h2>
          <p className={`text-sm font-semibold opacity-100 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Sign in to manage your events.</p>
        </div>

        {error && <div className="mb-6 p-4 rounded-xl bg-red-500/10 text-red-500 text-sm font-bold text-center border border-red-500/20">{error}</div>}

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="relative">
            <Mail size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 ${darkMode ? 'text-white opacity-100' : 'text-slate-900 opacity-40'}`} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email Address"
              required
              className={`w-full pl-12 pr-4 py-3.5 rounded-2xl text-sm font-medium border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${darkMode ? 'bg-slate-900/50 border-slate-700 text-white placeholder-slate-400' : 'bg-white/50 border-white text-slate-900'}`}
            />
          </div>
          <div className="relative">
            <Lock size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 ${darkMode ? 'text-white opacity-100' : 'text-slate-900 opacity-40'}`} />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              className={`w-full pl-12 pr-12 py-3.5 rounded-2xl text-sm font-medium border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${darkMode ? 'bg-slate-900/50 border-slate-700 text-white placeholder-slate-400' : 'bg-white/50 border-white text-slate-900'}`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className={`absolute right-4 top-1/2 -translate-y-1/2 transition-opacity ${darkMode ? 'text-white opacity-100' : 'text-slate-900 opacity-40 hover:opacity-100'}`}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div className="flex justify-end">
            <Link to="/forgot-password" className="text-sm font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 transition-colors">
              Forgot Password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black tracking-wide shadow-xl shadow-blue-600/30 transition-all flex justify-center items-center h-14"
          >
            {isLoading ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Sign In"}
          </button>
        </form>
        <p className={`text-center mt-6 text-sm font-semibold opacity-100 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
          Don't have an account? <Link to="/register" className="text-blue-600 dark:text-blue-400 hover:underline">Create one</Link>
        </p>
      </div>
    </Motion.main>
  );
};

export default Login;
