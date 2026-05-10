import React, { useState, useEffect, useContext } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Lock, ArrowRight, CheckCircle2, ShieldCheck, Eye, EyeOff, Target, MessageSquare, CalendarDays, PartyPopper, Camera, Image as ImageIcon } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';

const interestsList = ['Technology', 'Music', 'Business', 'Wellness', 'Startups', 'Networking'];

const Register = ({ darkMode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const prefill = location.state || {};
  const isEditing = prefill.isEditing || false;
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState('');
  const [resendStatus, setResendStatus] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  const [errors, setErrors] = useState({});
  const [usernameStatus, setUsernameStatus] = useState(''); // 'checking', 'available', 'taken'
  
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
  };
  const { setUser } = useContext(AuthContext);
  const [resendTimer, setResendTimer] = useState(() => {
    const savedTime = localStorage.getItem('resendOtpExpiry');
    if (savedTime) {
      const remaining = Math.floor((parseInt(savedTime, 10) - Date.now()) / 1000);
      return remaining > 0 ? remaining : 0;
    }
    return 0;
  });
  const [form, setForm] = useState(() => {
    const saved = localStorage.getItem('registrationDraft');
    return saved ? JSON.parse(saved) : {
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
    };
  });

  useEffect(() => {
    localStorage.setItem('registrationDraft', JSON.stringify(form));
  }, [form]);
  const [selectedInterests, setSelectedInterests] = useState(prefill.interests || []);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    if (!form.username) {
      setUsernameStatus('');
      return;
    }

    setUsernameStatus('checking');
    const delayDebounceFn = setTimeout(async () => {
      try {
        const res = await api.post('/auth/check-username', { username: form.username });
        setUsernameStatus(res.data.available ? 'available' : 'taken');
      } catch (err) {
        setUsernameStatus('');
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [form.username]);

  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            localStorage.removeItem('resendOtpExpiry');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const getInputStyle = (field) => `w-full rounded-2xl border px-4 py-3.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${errors[field] ? 'border-red-500 bg-red-50 dark:bg-red-500/10' : (darkMode ? 'bg-slate-900/60 border-slate-700 text-white placeholder-slate-400' : 'bg-white border-slate-200 text-slate-900')}`;

  const goToStep = (next) => {
    setError('');
    setErrors({});
    setStep(next);
  };

  const handleNextStep1 = () => {
    const newErrors = {};
    if (!form.name) newErrors.name = true;
    if (!form.username || usernameStatus === 'taken') newErrors.username = true;
    if (!form.email) newErrors.email = true;
    if (!form.gender) newErrors.gender = true;
    if (!form.phone) newErrors.phone = true;
    if (!isEditing) {
      if (!form.password) newErrors.password = true;
      if (!form.confirmPassword) newErrors.confirmPassword = true;
      if (form.password && form.confirmPassword && form.password !== form.confirmPassword) {
        newErrors.password = true;
        newErrors.confirmPassword = true;
        setError('Passwords do not match.');
      }
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      if (!newErrors.password || form.password === form.confirmPassword) {
        setError('Please fill in all highlighted fields.');
        if (usernameStatus === 'taken') setError('That username is already taken.');
      }
      return;
    }
    goToStep(2);
  };

  const handleNextStep2 = () => {
    const newErrors = {};
    if (!form.bio) newErrors.bio = true;
    if (!form.location) newErrors.location = true;
    if (!isEditing && !form.coverPhoto) newErrors.coverPhoto = true;
    if (!isEditing && !form.profilePicture) newErrors.profilePicture = true;
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setError('Please fill in all highlighted fields.');
      return;
    }
    goToStep(3);
  };

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
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setForm((prev) => ({ ...prev, [field]: reader.result })); // Store as Base64 for JSON transmission
        };
        reader.readAsDataURL(file);
        return; // Early return since FileReader is async
      } else value = '';
    } else {
      value = e.target.value;
    }
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleOtpChange = (index) => (e) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    setOtp((prev) => prev.map((digit, idx) => (idx === index ? val : digit)));
    
    // Auto-focus next input
    if (val && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const submitRegistration = async () => {
    if (selectedInterests.length === 0) {
      setError('Please select at least one interest.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      if (isEditing) {
        // Assuming your backend uses PATCH /users/me to update profile info
        const updatePayload = {
          fullName: form.name,
          username: form.username,
          phone: form.phone,
          gender: form.gender,
          bio: form.bio,
          location: form.location,
          website: form.website,
          interests: selectedInterests
        };
        
        const res = await api.patch('/users/me', updatePayload);
        
        if (setUser) {
          setUser(prev => ({ ...prev, ...updatePayload, ...(res.data?.user || res.data?.data || res.data || {}) }));
        }
        
        showToast('Profile updated successfully!', 'success');
        setTimeout(() => navigate('/profile', { replace: true }), 1500);
      } else {
        await api.post('/auth/register', {
          fullName: form.name,
          username: form.username,
          email: form.email,
          password: form.password,
          role: 'user',
          phone: form.phone,
          gender: form.gender,
          bio: form.bio,
          location: form.location,
          website: form.website,
          profilePicture: form.profilePicture,
          coverPhoto: form.coverPhoto,
          interests: selectedInterests
        });
        localStorage.removeItem('registrationDraft');
        goToStep(4);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.response?.data?.message || '';
      
      if (errorMsg.toLowerCase().includes('duplicate') || errorMsg.includes('E11000')) {
        setError("That email or username is already in use. Please try another one or log in.");
      } else {
        setError(errorMsg || "Registration failed. Try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setIsResending(true);
    setError('');
    setResendStatus('');
    try {
      // Assuming your backend has an endpoint to resend the OTP
      await api.post('/auth/resend-otp', { email: form.email });
      setResendStatus('A new OTP has been sent to your email.');
      const expiry = Date.now() + 60 * 1000;
      localStorage.setItem('resendOtpExpiry', expiry.toString());
      setResendTimer(60); // Start the 60-second countdown
    } catch (error) {
      setError(error.response?.data?.error || "Failed to resend OTP. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  const verifyOTP = async (e) => {
    e.preventDefault();
    if (!agreed) return;
    setIsLoading(true);
    setError('');
    const otpCode = otp.join('');
    
    try {
      await api.post('/auth/verify', { email: form.email, otp: otpCode });
      localStorage.removeItem('resendOtpExpiry'); // Cleanup on success
      setIsComplete(true);
      setStep(5);
    } catch (error) {
      setError(error.response?.data?.error || "Invalid verification code. Please check your email.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Motion.main
      className={`pt-32 pb-20 px-4 md:px-8 min-h-screen ${darkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}
    >
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className={`rounded-[2.5rem] p-10 shadow-2xl overflow-hidden ${darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
          <div className="flex items-center gap-4 mb-10">
            <div className="h-16 w-16 rounded-3xl bg-blue-600 text-white flex items-center justify-center text-2xl font-black overflow-hidden">
              <img src="/logo.png" alt="EventHub Logo" className="w-full h-full object-contain p-2" />
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
                  <h3 className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>{isEditing ? 'Edit your profile' : 'Create your account'}</h3>
                  {!isEditing && <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-slate-900'} mt-2`}>Already a member? <Link to="/login" className="text-blue-600 hover:underline">Sign in</Link></p>}
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
              
              {error && <div className="mt-6 p-4 rounded-xl bg-red-500/10 text-red-500 text-sm font-bold text-center border border-red-500/20">{error}</div>}
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
                      <input value={form.name} onChange={handleFormChange('name')} placeholder="Alex Peters" className={getInputStyle('name')} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-900 dark:text-white">Username</label>
                      <div className="relative">
                        <span className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>@</span>
                      <input value={form.username} onChange={handleFormChange('username')} placeholder="alex_games" className={`w-full rounded-2xl border px-10 py-3.5 text-sm font-medium focus:outline-none focus:ring-2 transition ${errors.username || usernameStatus === 'taken' ? 'border-red-500 focus:ring-red-500 bg-red-50 dark:bg-red-500/10' : usernameStatus === 'available' ? 'border-emerald-500 focus:ring-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' : (darkMode ? 'bg-slate-900/60 border-slate-700 text-white placeholder-slate-400 focus:ring-blue-500' : 'bg-white border-slate-200 text-slate-900 focus:ring-blue-500')}`} />
                      </div>
                    {usernameStatus === 'checking' && <p className="text-xs font-bold text-blue-500 mt-1">Checking availability...</p>}
                    {usernameStatus === 'available' && <p className="text-xs font-bold text-emerald-500 mt-1">Username is available!</p>}
                    {usernameStatus === 'taken' && <p className="text-xs font-bold text-red-500 mt-1">Username is already taken.</p>}
                    </div>
                  </div>
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-900 dark:text-white">Email Address</label>
                      <input type="email" value={form.email} onChange={handleFormChange('email')} placeholder="alex@example.com" className={getInputStyle('email')} />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-900 dark:text-white">Gender</label>
                        <select value={form.gender} onChange={handleFormChange('gender')} className={getInputStyle('gender')}>
                          <option value="">Select gender</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Prefer not to say</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-900 dark:text-white">Phone Number</label>
                        <input type="tel" value={form.phone} onChange={handleFormChange('phone')} placeholder="+234 567 8900" className={getInputStyle('phone')} />
                      </div>
                    </div>
                  </div>
                  {!isEditing && (
                    <div className="grid gap-4">
                      <div className="space-y-2 relative">
                        <label className="text-sm font-bold text-slate-900 dark:text-white">Password</label>
                        <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={handleFormChange('password')} placeholder="Min. 8 characters" className={getInputStyle('password')} />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className={`absolute right-4 top-1/2 -translate-y-1/2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-900 dark:text-white">Confirm Password</label>
                        <input type={showPassword ? 'text' : 'password'} value={form.confirmPassword} onChange={handleFormChange('confirmPassword')} placeholder="Repeat password" className={getInputStyle('confirmPassword')} />
                      </div>
                    </div>
                  )}
                  <div className={`flex ${isEditing ? 'justify-between' : 'justify-end'} gap-3`}>
                    {isEditing && (
                      <button type="button" onClick={() => navigate('/profile')} className={`rounded-2xl border px-6 py-4 text-sm font-bold transition ${darkMode ? 'border-slate-700 bg-slate-800 text-white hover:bg-slate-700' : 'border-slate-200 bg-slate-100 text-slate-900 hover:bg-slate-200'}`}>
                        Cancel
                      </button>
                    )}
                    <button 
                      type="button" 
                      onClick={handleNextStep1} 
                      className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 text-sm font-black text-white hover:bg-blue-700 transition"
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
                        <label className={`block h-32 w-full rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors overflow-hidden relative ${errors.coverPhoto ? 'border-red-500 bg-red-50 dark:bg-red-500/10' : (darkMode ? 'border-slate-700 bg-slate-800/50 hover:border-blue-500' : 'border-slate-300 bg-slate-50 hover:border-blue-500')}`}>
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
                        <label className={`absolute -bottom-6 left-6 h-16 w-16 sm:h-20 sm:w-20 rounded-full border-4 flex flex-col items-center justify-center cursor-pointer transition-colors overflow-hidden ${errors.profilePicture ? 'border-red-500 bg-red-50 dark:bg-red-500/10' : (darkMode ? 'border-slate-900 bg-slate-800 hover:border-blue-500' : 'border-white bg-slate-100 hover:border-blue-500')}`}>
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
                      <textarea value={form.bio} onChange={handleFormChange('bio')} placeholder="Tell people a little about yourself... e.g. 'I love tech events & concerts'" rows={4} className={getInputStyle('bio')} />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Location</label>
                        <input value={form.location} onChange={handleFormChange('location')} placeholder="e.g. Lagos, Nigeria" className={getInputStyle('location')} />
                      </div>
                      <div className="space-y-2">
                        <label className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Website / Portfolio <span className="opacity-50 text-xs font-normal">(Optional)</span></label>
                        <input value={form.website} onChange={handleFormChange('website')} placeholder="https://yoursite.com" className={getInputStyle('website')} />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between gap-3">
                    <button type="button" onClick={() => goToStep(1)} className={`rounded-2xl border px-6 py-4 text-sm font-bold transition ${darkMode ? 'border-slate-700 bg-slate-800 text-white hover:bg-slate-700' : 'border-slate-200 bg-slate-100 text-slate-900 hover:bg-slate-200'}`}>
                      ← Back
                    </button>
                    <button 
                      type="button" 
                      onClick={handleNextStep2} 
                      className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 text-sm font-black text-white hover:bg-blue-700 transition"
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
                      onClick={submitRegistration} 
                      disabled={selectedInterests.length === 0 || isLoading}
                      className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 text-sm font-black text-white hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (isEditing ? "Saving..." : "Creating...") : (isEditing ? "Save Changes" : "Continue")} <ArrowRight size={18} />
                    </button>
                  </div>
                </Motion.form>
              )}
              {step === 4 && (
                <Motion.form
                  key="step4"
                  onSubmit={verifyOTP}
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
                        id={`otp-${index}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={handleOtpChange(index)}
                        className={`w-full rounded-2xl border text-center text-xl font-black focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-slate-900/60 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                      />
                    ))}
                  </div>
                
                {resendStatus && <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500 text-sm font-bold text-center border border-emerald-500/20">{resendStatus}</div>}
                
                <div className="text-center">
                  <p className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    Didn't receive the code?{' '}
                    {resendTimer > 0 ? (
                      <span className="text-slate-500 font-bold">Resend in {resendTimer}s</span>
                    ) : (
                      <button type="button" onClick={handleResendOTP} disabled={isResending} className="text-blue-600 font-bold hover:underline disabled:opacity-50">
                        {isResending ? 'Resending...' : 'Resend OTP'}
                      </button>
                    )}
                  </p>
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

      <AnimatePresence>
        {toast.show && (
          <Motion.div
            initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-2xl z-50 font-bold text-sm text-white ${toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'}`}
          >
            {toast.message}
          </Motion.div>
        )}
      </AnimatePresence>
    </Motion.main>
  );
};

export default Register;
