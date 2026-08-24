import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Terminal, Mail, Lock, AlertCircle, ArrowLeft, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { fetchWithAuth } from '../api';
import ThemeToggle from '../components/ThemeToggle';
import '../admin-auth-theme.css';
import { ADMIN_AUTH_HERO } from '../assets/adminAuthImages';

// Brand mark shared conceptually with Sidebar.jsx's Terminal+"MockAI"+
// ADMIN badge treatment (same icon, same wordmark), restyled at a much
// larger, more confident scale for the hero and with this screen's own
// burgundy accent - this file's tokens are scoped under .admin-auth-shell
// (admin-auth-theme.css) so nothing here touches the shared indigo
// styling the rest of Admin still uses.
const Brand = ({ large = false }) => (
  <div className="flex items-center gap-3">
    <div
      className={`rounded-xl flex items-center justify-center ${large ? 'w-12 h-12' : 'w-9 h-9'}`}
      style={{ background: 'rgba(251,243,236,0.14)', color: '#fbf3ec' }}
    >
      <Terminal className={large ? 'w-6 h-6' : 'w-4.5 h-4.5'} />
    </div>
    <div className="flex items-center gap-2">
      <span className={`font-extrabold tracking-tight ${large ? 'text-2xl' : 'text-lg'}`} style={{ color: '#fbf3ec' }}>
        MockAI
      </span>
      <span
        className={`font-bold rounded border tracking-widest ${large ? 'text-[11px] px-2 py-0.5' : 'text-[10px] px-1.5 py-0.5'}`}
        style={{ color: '#e9b39c', borderColor: 'rgba(233,179,156,0.4)', background: 'rgba(233,179,156,0.12)' }}
      >
        ADMIN
      </span>
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
    <div className="admin-auth-shell min-h-screen relative overflow-hidden">
      {/* Full-bleed photography - the entire viewport, not half of it */}
      <img
        src={ADMIN_AUTH_HERO}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        style={{ objectPosition: 'center 32%' }}
      />
      <div className="absolute inset-0 aa-duotone" />
      <div className="absolute inset-0 aa-scrim" />

      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col lg:flex-row">
        {/* Brand + editorial headline - uses the space a form-only layout
            would leave empty, rather than a mostly-empty photo panel */}
        <div className="flex-1 flex flex-col justify-between p-6 sm:p-10 lg:p-14 min-h-[34vh] lg:min-h-screen">
          <Brand large />

          <div className="max-w-xl mt-8 lg:mt-0 mb-2 lg:mb-20">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] mb-4" style={{ color: '#e9b39c' }}>
              Administrative Access
            </p>
            <h1
              className="font-extrabold leading-[1.04] tracking-tight text-[2.25rem] sm:text-5xl lg:text-6xl"
              style={{ color: '#fbf3ec' }}
            >
              Administrative<br className="hidden sm:block" /> Console
            </h1>
            <p
              className="hidden sm:block mt-5 text-sm lg:text-base max-w-md leading-relaxed"
              style={{ color: 'rgba(251,243,236,0.72)' }}
            >
              Question banks, candidate oversight, and system integrity — managed from one secure console.
            </p>
          </div>
        </div>

        {/* Floating access panel */}
        <div className="w-full lg:w-[440px] xl:w-[480px] shrink-0 flex items-center justify-center p-6 sm:p-10 lg:pr-14 lg:pl-0">
          <div className="relative w-full max-w-sm aa-console-panel rounded-2xl p-7 sm:p-8">
            <span className="aa-bracket aa-bracket-tl" />
            <span className="aa-bracket aa-bracket-br" />

            {showForgotPwd ? (
              <>
                <button
                  onClick={() => { setShowForgotPwd(false); setError(''); setResetSuccess(false); }}
                  className="aa-btn aa-btn-ghost gap-1.5 px-0 py-1 mb-6 text-xs"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
                </button>

                <h2 className="text-xl font-bold tracking-tight mb-1.5">Reset password</h2>
                <p className="text-sm mb-6" style={{ color: 'var(--aa-text-secondary)' }}>
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
                <h2 className="text-xl font-bold tracking-tight mb-1.5">Sign In</h2>
                <p className="text-sm mb-6" style={{ color: 'var(--aa-text-secondary)' }}>
                  Enter your credentials to continue.
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

                <div className="flex items-center justify-center gap-1.5 mt-7">
                  <ShieldCheck className="w-3 h-3 shrink-0" style={{ color: 'var(--aa-text-muted)' }} />
                  <p className="text-[10.5px] font-medium tracking-wide" style={{ color: 'var(--aa-text-muted)' }}>
                    Authorized administrative access only
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
