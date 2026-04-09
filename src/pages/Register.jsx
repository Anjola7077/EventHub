import React, { useState } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Lock, ArrowRight, CheckCircle2, ShieldCheck, Eye, EyeOff, Target, MessageSquare, CalendarDays, PartyPopper, Camera, Image as ImageIcon } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const interestsList = ['Technology', 'Music', 'Business', 'Wellness', 'Startups', 'Networking'];

const Register = ({ darkMode }) => {
  const location = useLocation();
  const prefill = location.state || {};
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [form, setForm] = useState({
    name: prefill.name || '',
    username: prefill.username || '',
    email: prefill.email || '',
    gender: prefill.gender || '',
    phone: prefill.phone || '',
    password: '',
    confirmPassword: '',
    bio: prefill.bio || '',
    location: prefill.location || '',
    website: prefill.website || '',
    profilePicture: '',
    coverPhoto: ''
  });
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [agreed, setAgreed] = useState(false);

  const inputStyle = `w-full rounded-2xl border px-4 py-3.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${darkMode ? 'bg-slate-900/60 border-slate-700 text-white placeholder-white' : 'bg-white border-slate-200 text-slate-900'}`;

  const goToStep = (next) => setStep(next);
  const toggleInterest = (interest) => {
    setSelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((item) => item !== interest)
        : [...prev, interest]
    );
  };

  const handleFormChange = (field) => (e) => {
    let value;
    if (e.target.type === 'checkbox') {
      value = e.target.checked;
    } else if (e.target.type === 'file') {
      const file = e.target.files[0];
      value = file ? URL.createObjectURL(file) : '';
    } else {
      value = e.target.value;
    }
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleOtpChange = (index) => (e) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    setOtp((prev) => prev.map((digit, idx) => (idx === index ? val : digit)));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (step < 4) {
      setStep(step + 1);
      return;
    }
    if (!agreed) return;
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsComplete(true);
      setStep(5);
    }, 1500);
  };

  return (
    <Motion.main
      className={`pt-32 pb-20 px-4 md:px-8 min-h-screen ${darkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}
    >
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className={`rounded-[2.5rem] p-10 shadow-2xl overflow-hidden ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
          <div className="flex items-center gap-4 mb-10">
            <div className="h-16 w-16 rounded-3xl bg-blue-600 text-white flex items-center justify-center text-2xl font-black overflow-hidden">
              <img src="/logo.png" alt="EventHub Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-blue-600 font-black">EventHub</p>
              <h2 className={`mt-3 text-3xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>Join the community.</h2>
            </div>
          </div>
          <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-slate-900'} mb-8`}>
            Discover events, connect with people who share your passions, and never miss a moment.
          </p>
          <div className="space-y-5">
            <div className={`rounded-3xl p-5 flex items-center gap-3 ${darkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
              <Target className="text-blue-500" size={20} />
              <p className="text-sm font-bold">Personalised event recommendations</p>
            </div>
            <div className={`rounded-3xl p-5 flex items-center gap-3 ${darkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
              <MessageSquare className="text-blue-500" size={20} />
              <p className="text-sm font-bold">Live event chats</p>
            </div>
            <div className={`rounded-3xl p-5 flex items-center gap-3 ${darkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
              <CalendarDays className="text-blue-500" size={20} />
              <p className="text-sm font-bold">Never miss an upcoming event</p>
            </div>
          </div>
        </div>

        <div className={`rounded-[2.5rem] border ${darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'} shadow-2xl overflow-hidden`}>
          <div className="p-8">
            <div className="mb-8">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>Create your account</h3>
                  <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-slate-900'} mt-2`}>Already a member? <Link to="/login" className="text-blue-600 hover:underline">Sign in</Link></p>
                </div>
                <div className={`hidden sm:flex items-center gap-2 text-xs uppercase tracking-[0.3em] ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  {[1, 2, 3, 4].map((stepNumber) => (
                    <div
                      key={stepNumber}
                      className={`h-8 w-8 rounded-full grid place-items-center font-black ${step >= stepNumber ? 'bg-blue-600 text-white' : `${darkMode ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-900'}`}`}
                    >
                      {stepNumber}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 rounded-full bg-slate-200 dark:bg-slate-800 h-2 overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-500"
                  style={{ width: step === 1 ? '0%' : step === 2 ? '33%' : step === 3 ? '66%' : '100%' }}
                />
              </div>
            </div>

            <AnimatePresence mode="wait">
              {step === 1 && (
                <Motion.form
                  key="step1"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  className="space-y-5"
                >
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-900 dark:text-white">Full Name</label>
                      <input value={form.name} onChange={handleFormChange('name')} placeholder="Alex Peters" className={inputStyle} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-900 dark:text-white">Username</label>
                      <div className="relative">
                        <span className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>@</span>
                        <input value={form.username} onChange={handleFormChange('username')} placeholder="alex_games" className={`w-full rounded-2xl border px-10 py-3.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${darkMode ? 'bg-slate-900/60 border-slate-700 text-white placeholder-white' : 'bg-white border-slate-200 text-slate-900'}`} />
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-900 dark:text-white">Email Address</label>
                      <input type="email" value={form.email} onChange={handleFormChange('email')} placeholder="alex@example.com" className={inputStyle} />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-900 dark:text-white">Gender</label>
                        <select value={form.gender} onChange={handleFormChange('gender')} className={inputStyle}>
                          <option value="">Select gender</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Prefer not to say</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-900 dark:text-white">Phone Number</label>
                        <input type="tel" value={form.phone} onChange={handleFormChange('phone')} placeholder="+234 567 8900" className={inputStyle} />
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4">
                    <div className="space-y-2 relative">
                      <label className="text-sm font-bold text-slate-900 dark:text-white">Password</label>
                      <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={handleFormChange('password')} placeholder="Min. 8 characters" className={inputStyle} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className={`absolute right-4 top-1/2 -translate-y-1/2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-900 dark:text-white">Confirm Password</label>
                      <input type={showPassword ? 'text' : 'password'} value={form.confirmPassword} onChange={handleFormChange('confirmPassword')} placeholder="Repeat password" className={inputStyle} />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button 
                      type="button" 
                      onClick={() => goToStep(2)} 
                      disabled={!form.name || !form.username || !form.email || !form.gender || !form.phone || !form.password || !form.confirmPassword}
                      className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 text-sm font-black text-white hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Continue <ArrowRight size={18} />
                    </button>
                  </div>
                </Motion.form>
              )}

              {step === 2 && (
                <Motion.form
                  key="step2"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  className="space-y-6"
                >
                  <div className="space-y-6">
                    <div>
                      <h4 className={`text-xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>Profile Details</h4>
                      <p className={`text-sm mt-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Add a short bio and your profile details.</p>
                    </div>
                
                <div className="space-y-3">
                  <label className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Profile Images</label>
                  <div className="relative mb-8">
                    {/* Cover Photo */}
                    <label className={`block h-32 w-full rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors overflow-hidden relative ${darkMode ? 'border-slate-700 bg-slate-800/50 hover:border-blue-500' : 'border-slate-300 bg-slate-50 hover:border-blue-500'}`}>
                      <input type="file" className="hidden" accept="image/*" onChange={handleFormChange('coverPhoto')} />
                      {form.coverPhoto ? (
                        <img src={form.coverPhoto} alt="Cover" className="w-full h-full object-cover" />
                      ) : (
                        <>
                          <ImageIcon className={`mb-2 ${form.coverPhoto ? 'text-blue-500' : 'text-slate-400'}`} size={24} />
                          <span className="text-xs font-semibold text-slate-500">{form.coverPhoto ? 'Cover photo selected' : 'Upload Cover Photo'}</span>
                        </>
                      )}
                    </label>
                    {/* Profile Picture */}
                    <label className={`absolute -bottom-6 left-6 h-16 w-16 sm:h-20 sm:w-20 rounded-full border-4 flex flex-col items-center justify-center cursor-pointer transition-colors overflow-hidden ${darkMode ? 'border-slate-900 bg-slate-800 hover:border-blue-500' : 'border-white bg-slate-100 hover:border-blue-500'}`}>
                      <input type="file" className="hidden" accept="image/*" onChange={handleFormChange('profilePicture')} />
                      {form.profilePicture ? (
                        <img src={form.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <Camera className={form.profilePicture ? 'text-blue-500' : 'text-slate-400'} size={20} />
                      )}
                    </label>
                  </div>
                </div>

                    <div className="space-y-2">
                      <label className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Bio</label>
                      <textarea value={form.bio} onChange={handleFormChange('bio')} placeholder="Tell people a little about yourself… e.g. 'I love tech events & concerts'" rows={4} className={inputStyle} />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Location</label>
                        <input value={form.location} onChange={handleFormChange('location')} placeholder="e.g. Lagos, Nigeria" className={inputStyle} />
                      </div>
                      <div className="space-y-2">
                        <label className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Website / Portfolio</label>
                        <input value={form.website} onChange={handleFormChange('website')} placeholder="https://yoursite.com" className={inputStyle} />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between gap-3">
                    <button type="button" onClick={() => goToStep(1)} className={`rounded-2xl border px-6 py-4 text-sm font-bold transition ${darkMode ? 'border-slate-700 bg-slate-800 text-white hover:bg-slate-700' : 'border-slate-200 bg-slate-100 text-slate-900 hover:bg-slate-200'}`}>
                      ← Back
                    </button>
                    <button 
                      type="button" 
                      onClick={() => goToStep(3)} 
                  disabled={!form.bio || !form.location || !form.website || !form.profilePicture || !form.coverPhoto}
                      className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 text-sm font-black text-white hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Continue <ArrowRight size={18} />
                    </button>
                  </div>
                </Motion.form>
              )}

              {step === 3 && (
                <Motion.form
                  key="step3"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  className="space-y-6"
                >
                  <div>
                    <h4 className={`text-xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>Your Interests</h4>
                    <p className={`text-sm mt-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Pick the things you love — we'll use these to suggest events just for you.</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {interestsList.map((interest) => (
                      <button
                        key={interest}
                        type="button"
                        onClick={() => toggleInterest(interest)}
                        className={`rounded-2xl border px-4 py-3 text-left text-sm font-bold transition ${selectedInterests.includes(interest) ? 'border-blue-600 bg-blue-600/10 text-blue-700 dark:text-blue-300' : 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-white'}`}
                      >
                        {interest}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between gap-3">
                    <button type="button" onClick={() => goToStep(2)} className={`rounded-2xl border px-6 py-4 text-sm font-bold transition ${darkMode ? 'border-slate-700 bg-slate-800 text-white hover:bg-slate-700' : 'border-slate-200 bg-slate-100 text-slate-900 hover:bg-slate-200'}`}>
                      ← Back
                    </button>
                    <button 
                      type="button" 
                      onClick={() => goToStep(4)} 
                      disabled={selectedInterests.length === 0}
                      className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 text-sm font-black text-white hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Continue <ArrowRight size={18} />
                    </button>
                  </div>
                </Motion.form>
              )}

              {step === 4 && (
                <Motion.form
                  key="step4"
                  onSubmit={handleSubmit}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  className="space-y-6"
                >
                  <div>
                    <h4 className={`text-xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>Almost there!</h4>
                    <p className={`text-sm mt-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>We sent a 6-digit code to <strong>{form.email || 'your email'}</strong>. Enter it below to verify your account.</p>
                  </div>
                  <div className="grid grid-cols-6 gap-2">
                    {otp.map((digit, index) => (
                      <input
                        key={index}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={handleOtpChange(index)}
                        className={`w-full rounded-2xl border text-center text-xl font-black focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-slate-900/60 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                      />
                    ))}
                  </div>
                  <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-100 p-4 text-sm dark:border-slate-700 dark:bg-slate-800">
                    <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1 h-5 w-5 rounded-md text-blue-600 focus:ring-blue-500" />
                    <span>I agree to the <a href="#" className="text-blue-600 hover:underline">Terms & Conditions</a> and <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>.</span>
                  </label>
                  <div className="flex justify-between gap-3">
                    <button type="button" onClick={() => goToStep(3)} className={`rounded-2xl border px-6 py-4 text-sm font-bold transition ${darkMode ? 'border-slate-700 bg-slate-800 text-white hover:bg-slate-700' : 'border-slate-200 bg-slate-100 text-slate-900 hover:bg-slate-200'}`}>
                      ← Back
                    </button>
                    <button 
                      type="submit" 
                      disabled={!agreed || isLoading || otp.some(digit => !digit)} 
                      className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 text-sm font-black text-white hover:bg-blue-700 transition disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isLoading ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <>Create Account <PartyPopper size={18} /></>}
                    </button>
                  </div>
                </Motion.form>
              )}

              {step === 5 && isComplete && (
                <Motion.div
                  key="step5"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="space-y-6 text-center py-8"
                >
                  <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
                    <ShieldCheck size={48} />
                  </div>
                  <h3 className={`text-3xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>Welcome aboard!</h3>
                  <p className={`text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>Your account is verified. Start discovering events made for you.</p>
                  <Link to="/events" className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 text-sm font-black text-white hover:bg-blue-700 transition">
                    Explore Events
                  </Link>
                </Motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </Motion.main>
  );
};

export default Register;
