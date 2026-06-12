import React, { useState } from 'react';
import { motion as Motion } from 'framer-motion';
import { Mail, KeyRound, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

const ForgotPassword = ({ darkMode }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    setError('');
    setMessage('');

    try {

      const res = await api.post('/auth/forgot-password', { email });
      console.log("Forgot Password Response:", res.data);
      setMessage(res.data?.message || "If an account exists, a password reset link has been sent.");
      setEmail('');
    } catch (err) {
      console.error("Forgot Password Error:", err);
      setError(err.response?.data?.error || "Failed to process request. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Motion.main
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex items-center justify-center px-4 pt-20"
    >
      <div className={`w-full max-w-md p-8 rounded-[2rem] border backdrop-blur-2xl shadow-2xl ${darkMode ? 'bg-slate-800/60 border-slate-700/50' : 'bg-white/60 border-white/50'}`}>
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white shadow-lg">
            <KeyRound size={32} />
          </div>
          <h2 className={`text-2xl font-black mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Forgot Password?</h2>
          <p className={`text-sm font-semibold opacity-100 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        {error && <div className="mb-6 p-4 rounded-xl bg-red-500/10 text-red-500 text-sm font-bold text-center border border-red-500/20">{error}</div>}
        {message && <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 text-emerald-500 text-sm font-bold text-center border border-emerald-500/20">{message}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
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

          <button
            type="submit"
            disabled={isLoading || !email}
            className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black tracking-wide shadow-xl shadow-blue-600/30 transition-all flex justify-center items-center h-14 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Send Reset Link"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/login" className={`inline-flex items-center gap-2 text-sm font-bold hover:underline transition-colors ${darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}>
            <ArrowLeft size={16} /> Back to Login
          </Link>
        </div>
      </div>
    </Motion.main>
  );
};

export default ForgotPassword;