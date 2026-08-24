import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Terminal, Mail, Lock, AlertCircle, ArrowLeft, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { fetchWithAuth } from '../api';
import ThemeToggle from '../components/ThemeToggle';
import '../admin-auth-theme.css';
import { ADMIN_AUTH_HERO } from '../assets/adminAuthImages';

// Brand mark shared with Sidebar.jsx's Terminal+"MockAI"+ADMIN badge
// treatment, restyled with the auth screens' own burgundy accent instead
// of the rest of the Admin Panel's indigo - this file's tokens are scoped
// under .admin-auth-shell (admin-auth-theme.css) so nothing here touches
// the shared indigo styling the rest of Admin still uses.
const Brand = ({ tone = 'default' }) => (
  <div className="flex items-center gap-2.5">
    <div
      className="w-9 h-9 rounded-xl flex items-center justify-center"
      style={{
        background: tone === 'onDark' ? 'rgba(251,243,236,0.12)' : 'var(--aa-accent-soft)',
        color: tone === 'onDark' ? '#fbf3ec' : 'var(--aa-accent)',
      }}
    >
      <Terminal className="w-4.5 h-4.5" />
    </div>
    <div className="flex items-center gap-1.5">
      <span className="font-extrabold text-lg tracking-tight" style={{ color: tone === 'onDark' ? '#fbf3ec' : 'var(--aa-text)' }}>
        MockAI
      </span>
      <span
        className="text-[10px] font-bold px-1.5 py-0.5 rounded border tracking-wider"
        style={
          tone === 'onDark'
            ? { color: '#e3ac95', borderColor: 'rgba(227,172,149,0.35)', background: 'rgba(227,172,149,0.1)' }
            : { color: 'var(--aa-accent)', borderColor: 'var(--aa-accent-soft-strong)', background: 'var(--aa-accent-soft)' }
        }
      >
        ADMIN
      </span>
    </div>
  </div>
);

// Right-hand visual panel - one deliberate photo + minimal brand copy, no
// fake dashboard mockups, no stats, no testimonials.
const VisualPanel = () => (
  <div className="relative hidden lg:block">
    <img src={ADMIN_AUTH_HERO} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: 'center 35%' }} />
    <div className="absolute inset-0 aa-scrim" />
    <div className="relative h-full flex flex-col justify-between p-12">
      <Brand tone="onDark" />
      <div className="max-w-sm">
        <p
          className="text-[11px] font-bold uppercase tracking-[0.14em] mb-3"
          style={{ color: '#e3ac95' }}
        >
          Administrative Access
        </p>
        <h2 className="text-2xl font-bold leading-snug" style={{ color: '#fbf3ec' }}>
          System management, question banks, and candidate oversight — in one secure console.
        </h2>
        <p className="text-sm mt-4 leading-relaxed flex items-start gap-2" style={{ color: 'rgba(251,243,236,0.72)' }}>
          <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
          Access is restricted to authorized administrators.
        </p>
      </div>
    </div>
  </div>
);

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPwd, setShowForgotPwd] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    setLoading(true);

    fetchWithAuth('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    })
    .then(data => {
      setError('');
      localStorage.setItem('mockai_admin_auth', 'true');
      localStorage.setItem('mockai_admin_token', data.access_token);
      navigate('/admin/dashboard');
    })
    .catch(() => {
      setError('Invalid email or password');
      setLoading(false);
    });
  };

  const handleForgotPwd = (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResetSuccess(false);

    fetchWithAuth('/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: forgotEmail })
    })
    .then(() => {
      setResetSuccess(true);
    })
    .catch(err => setError(err.message))
    .finally(() => setLoading(false));
  };

  return (
    <div className="admin-auth-shell min-h-screen grid grid-cols-1 lg:grid-cols-2">
      <VisualPanel />

      <div className="flex items-center justify-center px-4 sm:px-8 py-12 relative">
        <div className="absolute top-6 right-6">
          <ThemeToggle />
        </div>
        <div className="absolute top-6 left-6 lg:hidden">
          <Brand />
        </div>

        <div className="w-full max-w-sm">
          {showForgotPwd ? (
            <>
              <button
                onClick={() => { setShowForgotPwd(false); setError(''); setResetSuccess(false); }}
                className="aa-btn aa-btn-ghost gap-1.5 px-0 py-1 mb-8 text-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
              </button>

              <h1 className="text-2xl font-bold tracking-tight mb-1.5">Reset admin password</h1>
              <p className="text-sm mb-8" style={{ color: 'var(--aa-text-secondary)' }}>
                Enter the account email and we'll send a new temporary password.
              </p>

              {error && (
                <div className="aa-alert-danger rounded-xl px-4 py-3 mb-5 flex items-center gap-2 text-xs sm:text-sm font-medium">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                </div>
              )}
              {resetSuccess && (
                <div className="aa-alert-success rounded-xl px-4 py-3 mb-5 text-xs sm:text-sm font-medium">
                  Password reset email sent. Please check your inbox.
                </div>
              )}

              <form onSubmit={handleForgotPwd} className="space-y-4">
                <div>
                  <label className="aa-label block mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--aa-text-muted)' }} />
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="admin@mockai.com"
                      required
                      className="aa-input w-full pl-10 pr-4 py-2.5 rounded-xl text-sm"
                    />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="aa-btn aa-btn-primary w-full py-2.5">
                  {loading ? 'Processing…' : 'Send Temporary Password'}
                </button>
              </form>
            </>
          ) : (
            <>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-1.5 mt-8 lg:mt-0">Admin Portal</h1>
              <p className="text-sm mb-8" style={{ color: 'var(--aa-text-secondary)' }}>
                Sign in to access the MockAI admin console.
              </p>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="aa-label block mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--aa-text-muted)' }} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@mockai.com"
                      required
                      className="aa-input w-full pl-10 pr-4 py-2.5 rounded-xl text-sm"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="aa-label">Password</label>
                    <button
                      type="button"
                      onClick={() => { setShowForgotPwd(true); setError(''); }}
                      className="text-xs font-semibold"
                      style={{ color: 'var(--aa-accent)' }}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--aa-text-muted)' }} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="aa-input w-full pl-10 pr-11 py-2.5 rounded-xl text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2"
                      style={{ color: 'var(--aa-text-muted)' }}
                      title={showPassword ? 'Hide password' : 'Show password'}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="aa-alert-danger rounded-xl px-3.5 py-3 flex items-center gap-2 text-xs font-semibold">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                  </div>
                )}

                <button type="submit" disabled={loading} className="aa-btn aa-btn-primary w-full py-2.5 mt-2">
                  {loading ? <span className="w-4.5 h-4.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Sign In'}
                </button>
              </form>

              <div className="flex items-center gap-2 mt-8 pt-6" style={{ borderTop: '1px solid var(--aa-border)' }}>
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--aa-text-muted)' }} />
                <p className="text-[11px]" style={{ color: 'var(--aa-text-muted)' }}>
                  Security notice: access strictly for authorized admins.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
