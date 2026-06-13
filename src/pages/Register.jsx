import React, { useState, useEffect, useContext } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, CheckCircle2, ShieldCheck, Eye, EyeOff, Target, MessageSquare, CalendarDays, PartyPopper, Camera, Image as ImageIcon } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import sanitizeError from '../utils/errorMessages';

const interestsList = ['Technology', 'Music', 'Business', 'Wellness', 'Startups', 'Networking'];

const Register = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const prefill = location.state || {};
  const isEditing = prefill.isEditing || false;
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState('');
  const [resendStatus, setResendStatus] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  const [errors, setErrors] = useState({});
  const [usernameStatus, setUsernameStatus] = useState(''); // 'checking', 'available', 'taken'
  const [emailStatus, setEmailStatus] = useState(''); // 'checking', 'available', 'taken'

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

  const passwordRequirements = {
    length: form.password.length >= 8,
    upper: /[A-Z]/.test(form.password),
    lower: /[a-z]/.test(form.password),
    number: /\d/.test(form.password),
    special: /[!@#$%^&*(),.?":{}|<>\-_]/.test(form.password),
  };
  const isPasswordValid = Object.values(passwordRequirements).every(Boolean);

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
    if (!form.email) {
      setEmailStatus('');
      return;
    }

    // Only run backend check if it loosely looks like a valid email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      setEmailStatus('');
      return;
    }

    setEmailStatus('checking');
    const delayDebounceFn = setTimeout(async () => {
      try {
        const res = await api.post('/auth/check-email', { email: form.email });
        setEmailStatus(res.data.available ? 'available' : 'taken');
      } catch (err) {
        setEmailStatus('');
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [form.email]);

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

  const getInputStyle = (field) => `w-full rounded-2xl border px-4 py-3.5 text-sm font-medium transition focus:outline-none focus:[box-shadow:var(--eh-ring)] ${errors[field] ? 'border-red-500 bg-red-500/10 eh-text placeholder:text-ink-muted' : 'border-line bg-surface eh-text placeholder:text-ink-muted focus:border-brand'}`;

  const goToStep = (next) => {
    setError('');
    setErrors({});
    setStep(next);
  };

  const handleNextStep1 = () => {
    const newErrors = {};
    if (!form.name) newErrors.name = true;
    if (!form.username || usernameStatus === 'taken') newErrors.username = true;
    if (!form.email || emailStatus === 'taken') newErrors.email = true;

    let errorMessage = 'Please fill in all highlighted fields.';

    if (!isEditing) {
      if (!form.password) {
        newErrors.password = true;
      } else if (!isPasswordValid) {
        newErrors.password = true;
        errorMessage = 'Please meet all password requirements.';
      }

      if (!form.confirmPassword) newErrors.confirmPassword = true;

      if (form.password && isPasswordValid && form.confirmPassword && form.password !== form.confirmPassword) {
        newErrors.password = true;
        newErrors.confirmPassword = true;
        errorMessage = 'Passwords do not match.';
      }
    }

    if (emailStatus === 'taken') {
      errorMessage = 'That email address is already registered.';
    } else if (usernameStatus === 'taken') {
      errorMessage = 'That username is already taken.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setError(errorMessage);
      return;
    }
    goToStep(2);
  };

  const handleNextStep2 = () => {
    // All step-2 fields are optional; the profile can be completed later.
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
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
          showToast("File size must be less than 5MB.", "error");
          return;
        }
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

  const submitRegistration = async (allowEmptyInterests = false) => {
    if (!allowEmptyInterests && selectedInterests.length === 0) {
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

        const expiry = Date.now() + 60 * 1000;
        localStorage.setItem('resendOtpExpiry', expiry.toString());
        setResendTimer(60);

        goToStep(4);
      }
    } catch (error) {
      setError(sanitizeError(error, "Registration failed. Please try again."));
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
      setError(sanitizeError(error, "Failed to resend OTP. Please try again."));
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
      const res = await api.post('/auth/verify', { email: form.email, otp: otpCode });
      localStorage.removeItem('resendOtpExpiry'); // Cleanup on success
      setIsComplete(true);
      setStep(5);

      // Save token and instantly log the user in on the frontend
      if (res.data?.token) {
        localStorage.setItem('token', res.data.token);
      }
      if (setUser) {
        setUser(res.data?.user || res.data?.data);
      }
    } catch (error) {
      setError(sanitizeError(error, "Invalid verification code. Please check your email."));
    } finally {
      setIsLoading(false);
    }
  };

  const backBtn = "eh-btn eh-btn-ghost";
  const nextBtn = "eh-btn eh-btn-primary";

  return (
    <Motion.main className="eh-page-bg min-h-screen px-4 pb-20 pt-32 md:px-8">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        {/* Brand panel */}
        <div className="relative hidden overflow-hidden rounded-[2.5rem] bg-brand p-10 text-white shadow-eh-lg lg:flex lg:flex-col">
          <div className="absolute -right-16 -top-16 h-60 w-60 rounded-full bg-white/10 blur-2xl" aria-hidden />
          <div className="absolute -bottom-24 -left-12 h-60 w-60 rounded-full bg-white/10 blur-2xl" aria-hidden />
          <div className="relative flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center overflow-hidden rounded-2xl bg-white/15">
              <img src="/logo.png" alt="EventHub" className="h-full w-full object-contain p-1.5" />
            </span>
            <span className="text-sm font-bold uppercase tracking-[0.2em]">EventHub</span>
          </div>

          <h2 className="eh-display relative mt-10 text-4xl font-extrabold leading-[1.05]">Join the community.</h2>
          <p className="relative mt-4 max-w-sm text-white/80">
            Discover events, connect with people who share your passions, and never miss a moment.
          </p>

          <div className="relative mt-10 space-y-3">
            {[
              { icon: Target, label: 'Personalised event recommendations' },
              { icon: MessageSquare, label: 'Live event chats' },
              { icon: CalendarDays, label: 'Never miss an upcoming event' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3 rounded-2xl bg-white/10 p-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/15"><Icon size={17} /></span>
                <p className="text-sm font-semibold">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Form card */}
        <div className="eh-surface overflow-hidden rounded-[2.5rem] shadow-eh-lg">
          <div className="p-7 sm:p-9">
            <div className="mb-8">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="eh-display text-2xl font-extrabold">{isEditing ? 'Edit your profile' : 'Create your account'}</h3>
                  {!isEditing && <p className="mt-1.5 text-sm eh-text-soft">Already a member? <Link to="/login" className="font-semibold eh-text-brand hover:opacity-80">Sign in</Link></p>}
                </div>
                <div className="hidden items-center gap-2 sm:flex">
                  {[1, 2, 3, 4].map((stepNumber) => (
                    <div
                      key={stepNumber}
                      className={`grid h-8 w-8 place-items-center rounded-full text-sm font-bold transition-colors ${step >= stepNumber ? 'bg-brand text-white' : 'bg-surface-2 text-ink-muted'}`}
                    >
                      {stepNumber}
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-6 h-2 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full bg-brand transition-all duration-500"
                  style={{ width: step === 1 ? '0%' : step === 2 ? '33%' : step === 3 ? '66%' : '100%' }}
                />
              </div>

              {error && <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-center text-sm font-semibold text-red-500">{error}</div>}
            </div>

            <AnimatePresence mode="wait">
              {step === 1 && (
                <Motion.form
                  key="step1"
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  className="space-y-5"
                >
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold eh-text">Full name</label>
                      <input value={form.name} onChange={handleFormChange('name')} placeholder="Alex Peters" className={getInputStyle('name')} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold eh-text">Username</label>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted">@</span>
                        <input value={form.username} onChange={handleFormChange('username')} placeholder="alex_games" className={`w-full rounded-2xl border px-10 py-3.5 text-sm font-medium eh-text placeholder:text-ink-muted transition focus:outline-none focus:[box-shadow:var(--eh-ring)] ${errors.username || usernameStatus === 'taken' ? 'border-red-500 bg-red-500/10' : usernameStatus === 'available' ? 'border-emerald-500 bg-emerald-500/10' : 'border-line bg-surface focus:border-brand'}`} />
                      </div>
                      {usernameStatus === 'checking' && <p className="mt-1 text-xs font-bold eh-text-brand">Checking availability…</p>}
                      {usernameStatus === 'available' && <p className="mt-1 text-xs font-bold text-emerald-500">Username is available!</p>}
                      {usernameStatus === 'taken' && <p className="mt-1 text-xs font-bold text-red-500">Username is already taken.</p>}
                    </div>
                  </div>
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold eh-text">Email address</label>
                      <input type="email" value={form.email} onChange={handleFormChange('email')} placeholder="alex@example.com" className={`w-full rounded-2xl border px-4 py-3.5 text-sm font-medium eh-text placeholder:text-ink-muted transition focus:outline-none focus:[box-shadow:var(--eh-ring)] ${errors.email || emailStatus === 'taken' ? 'border-red-500 bg-red-500/10' : emailStatus === 'available' ? 'border-emerald-500 bg-emerald-500/10' : 'border-line bg-surface focus:border-brand'}`} />
                      {emailStatus === 'checking' && <p className="mt-1 text-xs font-bold eh-text-brand">Checking availability…</p>}
                      {emailStatus === 'available' && <p className="mt-1 text-xs font-bold text-emerald-500">Email is available!</p>}
                      {emailStatus === 'taken' && <p className="mt-1 text-xs font-bold text-red-500">Email is already registered.</p>}
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-bold eh-text">Gender <span className="text-xs font-normal eh-text-muted">(optional)</span></label>
                        <select value={form.gender} onChange={handleFormChange('gender')} className={getInputStyle('gender')}>
                          <option value="">Select gender</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Prefer not to say</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold eh-text">Phone number <span className="text-xs font-normal eh-text-muted">(optional)</span></label>
                        <input type="tel" value={form.phone} onChange={handleFormChange('phone')} placeholder="+234 567 8900" className={getInputStyle('phone')} />
                      </div>
                    </div>
                  </div>
                  {!isEditing && (
                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-bold eh-text">Password</label>
                        <div className="relative">
                          <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={handleFormChange('password')} onFocus={() => setPasswordFocused(true)} placeholder="Min. 8 characters" className={getInputStyle('password')} />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-muted hover:text-brand transition-colors">
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                        {(passwordFocused || form.password) && (
                          <ul className="grid gap-1.5 pt-1 text-xs font-medium eh-text-muted sm:grid-cols-2">
                            <li className={`flex items-center gap-2 transition-colors duration-300 ${passwordRequirements.length ? 'text-emerald-500' : ''}`}><CheckCircle2 size={14} className={passwordRequirements.length ? '' : 'opacity-40'} /> 8+ characters</li>
                            <li className={`flex items-center gap-2 transition-colors duration-300 ${passwordRequirements.upper ? 'text-emerald-500' : ''}`}><CheckCircle2 size={14} className={passwordRequirements.upper ? '' : 'opacity-40'} /> 1 uppercase letter</li>
                            <li className={`flex items-center gap-2 transition-colors duration-300 ${passwordRequirements.lower ? 'text-emerald-500' : ''}`}><CheckCircle2 size={14} className={passwordRequirements.lower ? '' : 'opacity-40'} /> 1 lowercase letter</li>
                            <li className={`flex items-center gap-2 transition-colors duration-300 ${passwordRequirements.number ? 'text-emerald-500' : ''}`}><CheckCircle2 size={14} className={passwordRequirements.number ? '' : 'opacity-40'} /> 1 number</li>
                            <li className={`flex items-center gap-2 transition-colors duration-300 ${passwordRequirements.special ? 'text-emerald-500' : ''}`}><CheckCircle2 size={14} className={passwordRequirements.special ? '' : 'opacity-40'} /> 1 special character</li>
                          </ul>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold eh-text">Confirm password</label>
                        <input type={showPassword ? 'text' : 'password'} value={form.confirmPassword} onChange={handleFormChange('confirmPassword')} placeholder="Repeat password" className={getInputStyle('confirmPassword')} />
                      </div>
                    </div>
                  )}
                  <div className={`flex ${isEditing ? 'justify-between' : 'justify-end'} gap-3 pt-2`}>
                    {isEditing && (
                      <button type="button" onClick={() => navigate('/profile')} className={backBtn}>Cancel</button>
                    )}
                    <button type="button" onClick={handleNextStep1} className={nextBtn}>
                      Continue <ArrowRight size={18} />
                    </button>
                  </div>
                </Motion.form>
              )}
              {step === 2 && (
                <Motion.form
                  key="step2"
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  className="space-y-6"
                >
                  <div>
                    <h4 className="eh-display text-xl font-bold">Profile details</h4>
                    <p className="mt-1.5 text-sm eh-text-soft">Add a short bio and your profile photos.</p>
                  </div>
                  <div className="space-y-3">
                    <label className="text-sm font-bold eh-text">Profile images <span className="text-xs font-normal eh-text-muted">(optional)</span></label>
                    <div className="relative mb-8">
                      <label className={`flex h-32 w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition-colors ${errors.coverPhoto ? 'border-red-500 bg-red-500/10' : 'border-line bg-surface-2 hover:border-brand'}`}>
                        <input type="file" className="hidden" accept="image/*" onChange={handleFormChange('coverPhoto')} />
                        {form.coverPhoto ? (
                          <img src={form.coverPhoto} alt="Cover" className="h-full w-full object-cover" />
                        ) : (
                          <>
                            <ImageIcon className="mb-2 text-ink-muted" size={24} />
                            <span className="text-xs font-semibold eh-text-muted">Upload cover photo</span>
                          </>
                        )}
                      </label>
                      <label className={`absolute -bottom-6 left-6 flex h-16 w-16 cursor-pointer items-center justify-center overflow-hidden rounded-full border-4 transition-colors sm:h-20 sm:w-20 ${errors.profilePicture ? 'border-red-500 bg-red-500/10' : 'border-surface bg-surface-2 hover:border-brand'}`}>
                        <input type="file" className="hidden" accept="image/*" onChange={handleFormChange('profilePicture')} />
                        {form.profilePicture ? (
                          <img src={form.profilePicture} alt="Profile" className="h-full w-full object-cover" />
                        ) : (
                          <Camera className="text-ink-muted" size={20} />
                        )}
                      </label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold eh-text">Bio <span className="text-xs font-normal eh-text-muted">(optional)</span></label>
                    <textarea value={form.bio} onChange={handleFormChange('bio')} placeholder="Tell people a little about yourself, e.g. 'I love tech events and concerts'" rows={4} className={getInputStyle('bio')} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-bold eh-text">Location <span className="text-xs font-normal eh-text-muted">(optional)</span></label>
                      <input value={form.location} onChange={handleFormChange('location')} placeholder="e.g. Lagos, Nigeria" className={getInputStyle('location')} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold eh-text">Website / portfolio <span className="text-xs font-normal eh-text-muted">(optional)</span></label>
                      <input value={form.website} onChange={handleFormChange('website')} placeholder="https://yoursite.com" className={getInputStyle('website')} />
                    </div>
                  </div>
                  <div className="flex justify-between gap-3 pt-2">
                    <button type="button" onClick={() => goToStep(1)} className={backBtn}>Back</button>
                    <button type="button" onClick={handleNextStep2} className={nextBtn}>Continue <ArrowRight size={18} /></button>
                  </div>
                </Motion.form>
              )}
              {step === 3 && (
                <Motion.form
                  key="step3"
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  className="space-y-6"
                >
                  <div>
                    <h4 className="eh-display text-xl font-bold">Your interests</h4>
                    <p className="mt-1.5 text-sm eh-text-soft">Pick the things you love. We’ll use these to suggest events for you.</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {interestsList.map((interest) => (
                      <button
                        key={interest}
                        type="button"
                        onClick={() => toggleInterest(interest)}
                        className={`rounded-2xl border px-4 py-3 text-left text-sm font-bold transition ${selectedInterests.includes(interest) ? 'border-brand bg-brand-soft text-brand' : 'border-line bg-surface-2 eh-text-soft hover:border-brand'}`}
                      >
                        {interest}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <button type="button" onClick={() => goToStep(2)} className={backBtn}>Back</button>
                    <div className="flex items-center gap-4">
                      <button type="button" onClick={() => submitRegistration(true)} disabled={isLoading} className="text-sm font-semibold text-ink-muted transition-colors hover:text-ink-soft disabled:opacity-50">
                        Skip for now
                      </button>
                      <button
                        type="button"
                        onClick={() => submitRegistration(false)}
                        disabled={selectedInterests.length === 0 || isLoading}
                        className={`${nextBtn} disabled:cursor-not-allowed disabled:opacity-50`}
                      >
                        {isLoading ? (isEditing ? "Saving…" : "Creating…") : (isEditing ? "Save changes" : "Continue")} <ArrowRight size={18} />
                      </button>
                    </div>
                  </div>
                </Motion.form>
              )}
              {step === 4 && (
                <Motion.form
                  key="step4"
                  onSubmit={verifyOTP}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  className="space-y-6"
                >
                  <div>
                    <h4 className="eh-display text-xl font-bold">Almost there</h4>
                    <p className="mt-1.5 text-sm eh-text-soft">We sent a 6-digit code to <strong className="eh-text">{form.email || 'your email'}</strong>. Enter it below to verify your account.</p>
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
                        className="w-full rounded-2xl border border-line bg-surface py-3 text-center text-xl font-bold eh-text transition focus:border-brand focus:outline-none focus:[box-shadow:var(--eh-ring)]"
                      />
                    ))}
                  </div>

                  {resendStatus && <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-center text-sm font-bold text-emerald-500">{resendStatus}</div>}

                  <div className="text-center">
                    <p className="text-sm eh-text-soft">
                      Didn’t receive the code?{' '}
                      {resendTimer > 0 ? (
                        <span className="font-bold eh-text-muted">Resend in {resendTimer}s</span>
                      ) : (
                        <button type="button" onClick={handleResendOTP} disabled={isResending} className="font-bold eh-text-brand hover:opacity-80 disabled:opacity-50">
                          {isResending ? 'Resending…' : 'Resend OTP'}
                        </button>
                      )}
                    </p>
                  </div>

                  <label className="flex items-start gap-3 rounded-2xl border border-line bg-surface-2 p-4 text-sm eh-text-soft">
                    <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-5 w-5 rounded-md accent-[var(--eh-brand)]" />
                    <span>I agree to the <a href="#" className="font-semibold eh-text-brand hover:opacity-80">Terms &amp; Conditions</a> and <a href="#" className="font-semibold eh-text-brand hover:opacity-80">Privacy Policy</a>.</span>
                  </label>
                  <div className="flex justify-between gap-3 pt-2">
                    <button type="button" onClick={() => goToStep(3)} className={backBtn}>Back</button>
                    <button
                      type="submit"
                      disabled={!agreed || isLoading || otp.some(digit => !digit)}
                      className={`${nextBtn} disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      {isLoading ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <>Create account <PartyPopper size={18} /></>}
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
                  className="space-y-6 py-8 text-center"
                >
                  <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
                    <ShieldCheck size={48} />
                  </div>
                  <h3 className="eh-display text-3xl font-extrabold">Welcome aboard!</h3>
                  <p className="text-sm eh-text-soft">Your account is verified. Start discovering events made for you.</p>
                  <Link to="/events" className="eh-btn eh-btn-primary w-full">Explore events</Link>
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
            className={`fixed bottom-8 left-1/2 z-50 -translate-x-1/2 rounded-full px-6 py-3 text-sm font-bold text-white shadow-eh-lg ${toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'}`}
          >
            {toast.message}
          </Motion.div>
        )}
      </AnimatePresence>
    </Motion.main>
  );
};

export default Register;
