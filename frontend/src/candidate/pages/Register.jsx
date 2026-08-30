import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Mail,
  Lock,
  User as UserIcon,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowLeft,
  KeyRound,
  Clock,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import ThemeToggle from '../../components/ThemeToggle';
import {
  initiateRegistration,
  verifyRegistrationOtp,
  resendRegistrationOtp,
} from '../services/candidateAuth';
import AuthVisualPanel from '../components/AuthVisualPanel';
import logo from '../../assets/logo.png';

const GoogleIcon = () => (
  <svg className="w-4 h-4 mr-2.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
  </svg>
);

const REGISTER_STEPS = {
  FORM: 'FORM',
  OTP: 'OTP',
  SUCCESS: 'SUCCESS',
};

// FR01 - User Registration with Production Email OTP Verification
const Register = () => {
  const [step, setStep] = useState(REGISTER_STEPS.FORM);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSecondsLeft, setOtpSecondsLeft] = useState(300); // 5 minutes
  const [resendCooldown, setResendCooldown] = useState(45); // 45 seconds

  const navigate = useNavigate();

  // Active countdown timer for OTP expiry & resend cooldown
  useEffect(() => {
    if (step !== REGISTER_STEPS.OTP) return;

    const timer = setInterval(() => {
      setOtpSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [step]);

  // Step 1: Submit form & request OTP
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await initiateRegistration({ name, email, password, confirmPassword });
      setOtp('');
      setOtpSecondsLeft(300);
      setResendCooldown(45);
      setStep(REGISTER_STEPS.OTP);
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || loading) return;
    setLoading(true);
    setError('');
    try {
      await resendRegistrationOtp(email);
      setOtpSecondsLeft(300);
      setResendCooldown(45);
    } catch (err) {
      setError(err.message || 'Failed to resend verification code.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify 6-digit OTP & activate account
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otpSecondsLeft === 0) {
      setError('Verification code has expired. Please click resend to get a new code.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await verifyRegistrationOtp({ email, otp });
      setStep(REGISTER_STEPS.SUCCESS);
    } catch (err) {
      setError(err.message || 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[1.2fr_1fr]">
      <AuthVisualPanel />

      {/* Form column with clean background */}
      <div 
        className="flex items-center justify-center px-6 sm:px-10 py-16 relative"
        style={{ background: 'var(--c-bg)' }}
      >
        <div className="absolute top-6 right-6 z-20">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-[26rem] px-2 sm:px-4 relative z-10">

          {/* ══════════════════════════════════════════════════════════════════
              STEP 1: REGISTRATION FORM ENTRY
          ══════════════════════════════════════════════════════════════════ */}
          {step === REGISTER_STEPS.FORM && (
            <>
              {/* Elegant Mobile Logo */}
              <div className="mb-4 lg:hidden select-none">
                <img src={logo} alt="MockAI Logo" className="h-20 w-auto object-contain" />
              </div>
              
              <h2 className="c-heading text-3xl mb-1.5">Create your account</h2>
              <p className="text-sm mb-6" style={{ color: 'var(--c-text-secondary)' }}>
                Start practicing interviews and tracking your progress.
              </p>

              <form onSubmit={handleSubmitForm} className="space-y-5">
                <div>
                  <label className="c-label block mb-1.5">Full Name</label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--c-text-muted)' }} />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="c-input w-full pl-11 pr-4 py-3 rounded-xl text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="c-label block mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--c-text-muted)' }} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="c-input w-full pl-11 pr-4 py-3 rounded-xl text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="c-label block mb-1.5">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--c-text-muted)' }} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      required
                      className="c-input w-full pl-11 pr-11 py-3 rounded-xl text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2"
                      style={{ color: 'var(--c-text-muted)' }}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="c-label block mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--c-text-muted)' }} />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your password"
                      required
                      className="c-input w-full pl-11 pr-11 py-3 rounded-xl text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2"
                      style={{ color: 'var(--c-text-muted)' }}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="c-badge-danger rounded-xl px-3.5 py-3 flex items-center gap-2 text-xs font-semibold w-full">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                  </div>
                )}

                <button type="submit" disabled={loading} className="c-btn c-btn-cta w-full py-3 mt-2">
                  {loading ? <span className="w-4.5 h-4.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Create Account'}
                </button>
              </form>

              {/* OR Divider */}
              <div className="flex items-center my-5 select-none">
                <div className="flex-1 border-t" style={{ borderColor: 'var(--c-input-border)' }} />
                <span className="px-3.5 text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--c-text-muted)' }}>or</span>
                <div className="flex-1 border-t" style={{ borderColor: 'var(--c-input-border)' }} />
              </div>

              {/* Continue with Google button */}
              <button
                type="button"
                onClick={() => setError('Google sign-up is not configured yet. Please use email and password.')}
                className="w-full flex items-center justify-center py-3 px-4 rounded-xl text-sm font-semibold border transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
                style={{
                  backgroundColor: 'var(--c-input-bg)',
                  borderColor: 'var(--c-input-border)',
                  color: 'var(--c-text)'
                }}
              >
                <GoogleIcon />
                Continue with Google
              </button>

              <p className="text-sm mt-7 text-center" style={{ color: 'var(--c-text-secondary)' }}>
                Already have an account?{' '}
                <Link to="/login" className="font-semibold hover:opacity-85 transition-opacity" style={{ color: 'var(--c-accent)' }}>
                  Sign in
                </Link>
              </p>
            </>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              STEP 2: EMAIL OTP VERIFICATION
          ══════════════════════════════════════════════════════════════════ */}
          {step === REGISTER_STEPS.OTP && (
            <>
              <button
                type="button"
                onClick={() => {
                  setStep(REGISTER_STEPS.FORM);
                  setError('');
                }}
                className="flex items-center gap-1.5 text-xs font-semibold mb-8 hover:opacity-85 transition-opacity"
                style={{ color: 'var(--c-text-muted)' }}
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to details
              </button>

              <h2 className="c-heading text-2xl sm:text-3xl mb-2">Verify your email</h2>
              <p className="text-sm mb-6 leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                We sent a 6-digit verification code to <span className="font-semibold text-[var(--c-text)]">{email}</span>.
              </p>

              {error && (
                <div className="c-badge-danger rounded-xl px-4 py-3 mb-5 flex items-center gap-2 text-xs font-semibold w-full">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="c-label">6-Digit Verification Code</label>
                    <span
                      className={`text-xs font-semibold flex items-center gap-1 ${
                        otpSecondsLeft <= 60 ? 'text-rose-500 font-bold' : ''
                      }`}
                      style={{ color: otpSecondsLeft > 60 ? 'var(--c-text-muted)' : undefined }}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      {otpSecondsLeft > 0 ? formatTimer(otpSecondsLeft) : 'Expired'}
                    </span>
                  </div>

                  <div className="relative">
                    <KeyRound className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--c-text-muted)' }} />
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      required
                      autoFocus
                      className="c-input w-full pl-11 pr-4 py-3 rounded-xl text-center text-lg font-bold tracking-[0.3em]"
                      style={{ letterSpacing: '0.25em' }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.length !== 6 || otpSecondsLeft === 0}
                  className="c-btn c-btn-cta w-full py-3 mt-2 font-bold disabled:opacity-50"
                >
                  {loading ? (
                    <span className="w-4.5 h-4.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Verify Email'
                  )}
                </button>

                {/* Resend OTP Row */}
                <div className="flex items-center justify-center pt-2">
                  <button
                    type="button"
                    disabled={resendCooldown > 0 || loading}
                    onClick={handleResendOtp}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold transition-opacity disabled:opacity-50 hover:opacity-85"
                    style={{ color: 'var(--c-accent)' }}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend Code'}
                  </button>
                </div>
              </form>
            </>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              STEP 3: SUCCESS CONFIRMATION
          ══════════════════════════════════════════════════════════════════ */}
          {step === REGISTER_STEPS.SUCCESS && (
            <div className="text-center py-4">
              <div
                className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-sm"
                style={{
                  background: 'var(--c-surface-muted)',
                  border: '1px solid var(--c-border)',
                }}
              >
                <ShieldCheck className="w-8 h-8" style={{ color: 'var(--c-accent)' }} />
              </div>

              <h2 className="c-heading text-2xl sm:text-3xl mb-3">Email verified successfully</h2>
              <p className="text-sm mb-8 leading-relaxed max-w-sm mx-auto" style={{ color: 'var(--c-text-secondary)' }}>
                Your MockAI account is ready. You can now sign in to start practicing realistic interviews.
              </p>

              <button
                type="button"
                onClick={() => navigate('/login')}
                className="c-btn c-btn-cta w-full py-3.5 font-bold"
              >
                Continue to Sign In
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Register;
