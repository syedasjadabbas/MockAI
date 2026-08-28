import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, AlertCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import ThemeToggle from '../../components/ThemeToggle';
import { login, requestPasswordReset } from '../services/candidateAuth';
import AuthVisualPanel from '../components/AuthVisualPanel';

// FR02 - User Login, FR03 - Password Recovery
const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPwd, setShowForgotPwd] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login({ email, password });
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPwd = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResetSuccess(false);
    try {
      await requestPasswordReset(forgotEmail);
      setResetSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[1.2fr_1fr]">
      <AuthVisualPanel />

      {/* Form column */}
      <div className="flex items-center justify-center px-6 sm:px-10 py-16 relative bg-[var(--c-bg)]">
        <div className="absolute top-6 right-6">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-[26rem] px-2 sm:px-4">
          {showForgotPwd ? (
            <>
              <button
                onClick={() => setShowForgotPwd(false)}
                className="flex items-center gap-1.5 text-xs font-semibold mb-8 hover:opacity-85 transition-opacity"
                style={{ color: 'var(--c-text-muted)' }}
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
              </button>

              <h2 className="c-heading text-2xl mb-1.5">Reset your password</h2>
              <p className="text-sm mb-6" style={{ color: 'var(--c-text-secondary)' }}>
                Enter your email and we'll send you instructions.
              </p>

              {error && (
                <div className="c-badge-danger rounded-xl px-4 py-3 mb-5 flex items-center gap-2 text-xs font-semibold w-full">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                </div>
              )}
              {resetSuccess && (
                <div className="c-badge-success rounded-xl px-4 py-3 mb-5 text-xs font-semibold w-full">
                  If an account exists for this email, reset instructions have been sent.
                </div>
              )}

              <form onSubmit={handleForgotPwd} className="space-y-5">
                <div>
                  <label className="c-label block mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--c-text-muted)' }} />
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="jane@example.com"
                      required
                      className="c-input w-full pl-11 pr-4 py-3 rounded-xl text-sm"
                    />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="c-btn c-btn-cta w-full py-3 mt-2">
                  {loading ? 'Sending…' : 'Send Reset Instructions'}
                </button>
              </form>
            </>
          ) : (
            <>
              {/* Elegant Mobile Wordmark */}
              <div className="flex items-baseline gap-0.5 mb-3 lg:hidden select-none">
                <span className="c-heading text-xl tracking-tight">Mock</span>
                <span className="c-heading text-xl tracking-tight" style={{ color: 'var(--c-accent)' }}>AI</span>
              </div>
              
              <h2 className="c-heading text-3xl mb-1.5">Welcome back</h2>
              <p className="text-sm mb-6" style={{ color: 'var(--c-text-secondary)' }}>
                Sign in to continue your interview practice.
              </p>

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="c-label block mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--c-text-muted)' }} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="jane@example.com"
                      required
                      className="c-input w-full pl-11 pr-4 py-3 rounded-xl text-sm"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="c-label">Password</label>
                    <button
                      type="button"
                      onClick={() => setShowForgotPwd(true)}
                      className="text-xs font-semibold hover:opacity-85 transition-opacity"
                      style={{ color: 'var(--c-accent)' }}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--c-text-muted)' }} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
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

                {error && (
                  <div className="c-badge-danger rounded-xl px-3.5 py-3 flex items-center gap-2 text-xs font-semibold w-full">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                  </div>
                )}

                <button type="submit" disabled={loading} className="c-btn c-btn-cta w-full py-3 mt-2">
                  {loading ? <span className="w-4.5 h-4.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Sign In'}
                </button>
              </form>

              <p className="text-sm mt-7 text-center" style={{ color: 'var(--c-text-secondary)' }}>
                Don't have an account?{' '}
                <Link to="/register" className="font-semibold hover:opacity-85 transition-opacity" style={{ color: 'var(--c-accent)' }}>
                  Start practicing
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
