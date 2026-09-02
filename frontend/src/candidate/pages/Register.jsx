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
import GoogleAuthButton from '../components/GoogleAuthButton';
import logo from '../../assets/logo.png';

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
    <div className="candidate-app min-h-screen grid grid-cols-1 lg:grid-cols-[1.1fr_1fr]" style={{ background: 'var(--c-bg)' }}>
      <AuthVisualPanel />

      {/* Form column with clean background */}
      <div 
        className="flex items-center justify-center px-6 sm:px-10 py-12 relative"
        style={{ background: 'var(--c-bg)' }}
      >
        <div className="absolute top-5 right-5 z-20">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-[24rem] px-2 relative z-10">

          {/* STEP 1: INITIAL REGISTRATION FORM */}
          {step === REGISTER_STEPS.FORM && (
            <>
              <div className="mb-4 lg:hidden select-none">
                <img src={logo} alt="MockAI Logo" className="c-brand-logo" />
              </div>

              <h2 className="c-heading text-2xl font-bold mb-1" style={{ color: 'var(--c-text)' }}>Create Account</h2>
              <p className="text-xs mb-5" style={{ color: 'var(--c-text-secondary)' }}>
                Set up your candidate profile to begin practice.
              </p>

              <form onSubmit={handleSubmitForm} className="space-y-3.5">
                <div>
                  <label className="c-label block mb-1">Full Name</label>
                  <div className="relative">
                    <UserIcon className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--c-text-muted)' }} />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="c-input w-full pl-9 pr-3 py-2 rounded-md text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="c-label block mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--c-text-muted)' }} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="c-input w-full pl-9 pr-3 py-2 rounded-md text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="c-label block mb-1">Password</label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--c-text-muted)' }} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      required
                      className="c-input w-full pl-9 pr-9 py-2 rounded-md text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-80"
                      style={{ color: 'var(--c-text-muted)' }}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="c-label block mb-1">Confirm Password</label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--c-text-muted)' }} />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      required
                      className="c-input w-full pl-9 pr-9 py-2 rounded-md text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-80"
                      style={{ color: 'var(--c-text-muted)' }}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="c-badge-danger rounded-md px-3 py-2 flex items-center gap-2 text-xs font-semibold w-full">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
                  </div>
                )}

                <button type="submit" disabled={loading} className="c-btn c-btn-primary w-full py-2.5 font-semibold text-xs rounded-md mt-1">
                  {loading ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Create Account'}
                </button>
              </form>

              {/* OR Divider */}
              <div className="flex items-center my-4 select-none">
                <div className="flex-1 border-t" style={{ borderColor: 'var(--c-input-border)' }} />
                <span className="px-3 text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--c-text-muted)' }}>or</span>
                <div className="flex-1 border-t" style={{ borderColor: 'var(--c-input-border)' }} />
              </div>

              {/* Continue with Google button */}
              <GoogleAuthButton
                mode="register"
                label="Continue with Google"
                onError={(msg) => setError(msg)}
                disabled={loading}
              />

              <p className="text-xs mt-5 text-center" style={{ color: 'var(--c-text-secondary)' }}>
                Already have an account?{' '}
                <Link to="/login" className="font-semibold hover:underline" style={{ color: 'var(--c-accent)' }}>
                  Sign in
                </Link>
              </p>
            </>
          )}

          {/* STEP 2: EMAIL OTP VERIFICATION */}
          {step === REGISTER_STEPS.OTP && (
            <>
              <button
                type="button"
                onClick={() => {
                  setStep(REGISTER_STEPS.FORM);
                  setError('');
                }}
                className="flex items-center gap-1.5 text-xs font-semibold mb-6 hover:opacity-80 transition-opacity"
                style={{ color: 'var(--c-text-muted)' }}
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to details
              </button>

              <h2 className="c-heading text-xl sm:text-2xl font-bold mb-1.5" style={{ color: 'var(--c-text)' }}>Verify Email</h2>
              <p className="text-xs mb-5 leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                We sent a 6-digit verification code to <span className="font-semibold" style={{ color: 'var(--c-text)' }}>{email}</span>.
              </p>

              {error && (
                <div className="c-badge-danger rounded-md px-3.5 py-2.5 mb-4 flex items-center gap-2 text-xs font-semibold w-full">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="c-label">6-Digit Code</label>
                    <span
                      className={`text-xs font-semibold flex items-center gap-1 ${
                        otpSecondsLeft <= 60 ? 'text-red-500' : ''
                      }`}
                      style={{ color: otpSecondsLeft > 60 ? 'var(--c-text-muted)' : undefined }}
                    >
                      <Clock className="w-3 h-3" />
                      {otpSecondsLeft > 0 ? formatTimer(otpSecondsLeft) : 'Expired'}
                    </span>
                  </div>

                  <div className="relative">
                    <KeyRound className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--c-text-muted)' }} />
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
                      className="c-input w-full pl-9 pr-3 py-2 rounded-md text-center text-base font-bold tracking-widest"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.length !== 6 || otpSecondsLeft === 0}
                  className="c-btn c-btn-primary w-full py-2.5 font-semibold text-xs rounded-md disabled:opacity-50"
                >
                  {loading ? (
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Verify Email'
                  )}
                </button>

                <div className="flex items-center justify-center pt-1">
                  <button
                    type="button"
                    disabled={resendCooldown > 0 || loading}
                    onClick={handleResendOtp}
                    className="inline-flex items-center gap-1 text-xs font-semibold disabled:opacity-50"
                    style={{ color: 'var(--c-text-muted)' }}
                  >
                    <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                  </button>
                </div>
              </form>
            </>
          )}

          {/* STEP 3: SUCCESS CONFIRMATION */}
          {step === REGISTER_STEPS.SUCCESS && (
            <div className="text-center py-4">
              <div
                className="w-12 h-12 rounded-md mx-auto mb-4 flex items-center justify-center border"
                style={{
                  background: 'var(--c-surface-muted)',
                  borderColor: 'var(--c-border)',
                }}
              >
                <ShieldCheck className="w-6 h-6 text-emerald-500" />
              </div>

              <h2 className="c-heading text-xl font-bold mb-2" style={{ color: 'var(--c-text)' }}>Email Verified</h2>
              <p className="text-xs mb-6 leading-relaxed max-w-sm mx-auto" style={{ color: 'var(--c-text-secondary)' }}>
                Your MockAI account is active. You can now sign in to start practicing interviews.
              </p>

              <button
                type="button"
                onClick={() => navigate('/login')}
                className="c-btn c-btn-primary w-full py-2.5 font-semibold text-xs rounded-md"
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
