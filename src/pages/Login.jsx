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
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="eh-page-bg flex min-h-screen items-center justify-center px-4 py-24"
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

          <div className="relative">
            <h2 className="eh-display text-4xl font-extrabold leading-[1.05]">
              Your next night out is one login away.
            </h2>
            <ul className="mt-8 space-y-3">
              {perks.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-3 text-white/90">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15">
                    <Icon size={17} />
                  </span>
                  <span className="font-medium">{label}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="relative text-sm text-white/70">Discover. Connect. Show up.</p>
        </div>

        {/* Form */}
        <div className="p-8 sm:p-12">
          <div className="mb-8">
            <h1 className="eh-display text-3xl font-extrabold">Welcome back</h1>
            <p className="mt-2 text-sm eh-text-soft">Sign in to manage your events and RSVPs.</p>
          </div>

          {error && (
            <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-center text-sm font-semibold text-red-500">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                required
                className="w-full rounded-2xl border border-line bg-surface py-3.5 pl-12 pr-4 text-sm eh-text placeholder:text-ink-muted transition focus:border-brand focus:outline-none focus:[box-shadow:var(--eh-ring)]"
              />
            </div>
            <div className="relative">
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                className="w-full rounded-2xl border border-line bg-surface py-3.5 pl-12 pr-12 text-sm eh-text placeholder:text-ink-muted transition focus:border-brand focus:outline-none focus:[box-shadow:var(--eh-ring)]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-muted transition-colors hover:text-brand"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-sm font-semibold eh-text-brand hover:opacity-80 transition">
                Forgot password?
              </Link>
            </div>

            <button type="submit" disabled={isLoading} className="eh-btn eh-btn-primary h-14 w-full text-base disabled:opacity-60">
              {isLoading ? <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <>Sign in <ArrowRight size={18} /></>}
            </button>
          </form>

          <p className="mt-8 text-center text-sm eh-text-soft">
            New to EventHub? <Link to="/register" className="font-semibold eh-text-brand hover:opacity-80">Create an account</Link>
          </p>
        </div>
      </Motion.div>
    </Motion.main>
  );
};

export default Login;
