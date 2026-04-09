import React, { useState } from 'react';
import { motion as Motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, LogIn } from 'lucide-react';
import { Link } from 'react-router-dom';

const Login = ({ darkMode }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1500); // Mock network request
  };

  return (
    <Motion.main 
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="min-h-screen flex items-center justify-center px-4"
    >
      <div className={`w-full max-w-md p-8 rounded-[2rem] border backdrop-blur-2xl shadow-2xl ${darkMode ? 'bg-slate-800/60 border-slate-700/50' : 'bg-white/60 border-white/50'}`}>
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white shadow-lg">
            <LogIn size={32} />
          </div>
          <h2 className={`text-2xl font-black mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Welcome Back</h2>
          <p className={`text-sm font-semibold opacity-100 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Sign in to manage your events.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="relative">
            <Mail size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 ${darkMode ? 'text-white opacity-100' : 'text-slate-900 opacity-40'}`} />
            <input type="email" placeholder="Email Address" required className={`w-full pl-12 pr-4 py-3.5 rounded-2xl text-sm font-medium border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${darkMode ? 'bg-slate-900/50 border-slate-700 text-white placeholder-white' : 'bg-white/50 border-white text-slate-900'}`} />
          </div>
          <div className="relative">
            <Lock size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 ${darkMode ? 'text-white opacity-100' : 'text-slate-900 opacity-40'}`} />
            <input type={showPassword ? "text" : "password"} placeholder="Password" required className={`w-full pl-12 pr-12 py-3.5 rounded-2xl text-sm font-medium border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${darkMode ? 'bg-slate-900/50 border-slate-700 text-white placeholder-white' : 'bg-white/50 border-white text-slate-900'}`} />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className={`absolute right-4 top-1/2 -translate-y-1/2 transition-opacity ${darkMode ? 'text-white opacity-100' : 'text-slate-900 opacity-40 hover:opacity-100'}`}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <button type="submit" disabled={isLoading} className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black tracking-wide shadow-xl shadow-blue-600/30 transition-all flex justify-center items-center h-14">
            {isLoading ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Sign In"}
          </button>
        </form>

        <p className={`text-center mt-6 text-sm font-semibold opacity-100 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
          Don't have an account? <Link to="/register" className="text-blue-600 dark:text-blue-400 hover:underline">Create one</Link>
        </p>
      </div>
    </Motion.main>
  );
};

export default Login;
