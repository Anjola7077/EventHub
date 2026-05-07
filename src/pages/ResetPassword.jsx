import React, { useState } from 'react';
import { motion as Motion } from 'framer-motion';
import { Lock, Eye, EyeOff, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';

const ResetPassword = ({ darkMode }) => {
  const { token } = useParams();
  const navigate = useNavigate();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      return setError("Passwords do not match.");
    }
    if (password.length < 8) {
      return setError("Password must be at least 8 characters long.");
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      await api.put(`/auth/reset-password/${token}`, { password });
      setIsSuccess(true);
    } catch (err) {
      const responseError = err.response?.data?.error || err.response?.data?.message;
      setError(responseError || "Failed to reset password. The link might be invalid or expired.");
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
        
        {isSuccess ? (
          <Motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-6"
          >
            <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={40} />
            </div>
            <h2 className={`text-2xl font-black mb-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Password Reset!</h2>
            <p className={`text-sm font-semibold opacity-100 mb-8 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Your password has been successfully updated. You can now sign in with your new credentials.
            </p>
            <button 
              onClick={() => navigate('/login')}
              className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black tracking-wide shadow-xl shadow-blue-600/30 transition-all"
            >
              Go to Login
            </button>
          </Motion.div>
        ) : (
          <>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white shadow-lg">
                <Lock size={32} />
              </div>
              <h2 className={`text-2xl font-black mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Create New Password</h2>
              <p className={`text-sm font-semibold opacity-100 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Please enter and confirm your new password below.
              </p>
            </div>
            
            {error && <div className="mb-6 p-4 rounded-xl bg-red-500/10 text-red-500 text-sm font-bold text-center border border-red-500/20">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="relative">
                <Lock size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 ${darkMode ? 'text-white opacity-100' : 'text-slate-900 opacity-40'}`} />
                <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New Password" required className={`w-full pl-12 pr-12 py-3.5 rounded-2xl text-sm font-medium border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${darkMode ? 'bg-slate-900/50 border-slate-700 text-white placeholder-slate-400' : 'bg-white/50 border-white text-slate-900'}`} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className={`absolute right-4 top-1/2 -translate-y-1/2 transition-opacity ${darkMode ? 'text-white opacity-100' : 'text-slate-900 opacity-40 hover:opacity-100'}`}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              
              <div className="relative">
                <Lock size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 ${darkMode ? 'text-white opacity-100' : 'text-slate-900 opacity-40'}`} />
                <input type={showPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm New Password" required className={`w-full pl-12 pr-12 py-3.5 rounded-2xl text-sm font-medium border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${darkMode ? 'bg-slate-900/50 border-slate-700 text-white placeholder-slate-400' : 'bg-white/50 border-white text-slate-900'}`} />
              </div>
              
              <button type="submit" disabled={isLoading || !password || !confirmPassword} className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black tracking-wide shadow-xl shadow-blue-600/30 transition-all flex justify-center items-center h-14 disabled:opacity-70 disabled:cursor-not-allowed">
                {isLoading ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Reset Password"}
              </button>
            </form>
          </>
        )}
      </div>
    </Motion.main>
  );
};

export default ResetPassword;