import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Terminal, Mail, Lock, AlertCircle, X, Eye, EyeOff } from 'lucide-react';
import { fetchWithAuth } from '../api';
import ThemeToggle from '../components/ThemeToggle';
import { useTheme } from '../context/ThemeContext';

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
  const { isDark } = useTheme();

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

  if (showForgotPwd) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-app)] px-4 relative transition-colors duration-300">
        {/* Glow Effect behind card */}
        <div className="absolute w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[90px] -z-10 pointer-events-none" />

        {/* Top-Right Theme Toggle */}
        <div className="absolute top-6 right-6 z-20">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-md glass-card p-8 rounded-3xl relative border">
          <button 
            onClick={() => setShowForgotPwd(false)} 
            className="absolute top-5 right-5 p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-1 tracking-tight">Forgot Password</h2>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mb-6">Enter your email to receive password reset instructions.</p>
          
          {error && (
            <div className="mb-5 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs sm:text-sm font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
          {resetSuccess && (
            <div className="mb-5 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm font-medium">
              Password reset email sent. Please check your inbox.
            </div>
          )}
          
          <form onSubmit={handleForgotPwd} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)]" />
                <input 
                  type="email" 
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="admin@mockai.com" 
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm theme-input border focus:outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </div>
            </div>
            <button 
              type="submit" 
              disabled={loading} 
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-md shadow-indigo-500/20 transition-all active:scale-[0.98]"
            >
              {loading ? 'Processing...' : 'Reset Password'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-app)] px-4 relative transition-colors duration-300">
      {/* Glow Effect behind card */}
      <div className="absolute w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[90px] -z-10 pointer-events-none" />

      {/* Top-Right Theme Toggle */}
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle />
      </div>
      
      <div className="w-full max-w-md glass-card p-8 rounded-3xl relative border">
        <div className="flex flex-col items-center mb-8">
          <div className="w-13 h-13 p-3 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/30 mb-3.5 shadow-sm">
            <Terminal className="w-7 h-7 text-indigo-500" />
          </div>
          <h2 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">Admin Portal</h2>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">Sign in to access admin portal</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)]" />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@mockai.com" 
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm theme-input border focus:outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)]" />
              <input 
                type={showPassword ? 'text' : 'password'} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" 
                required
                className="w-full pl-10 pr-11 py-2.5 rounded-xl text-sm theme-input border focus:outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] focus:outline-none transition-colors"
                title={showPassword ? 'Hide password' : 'Show password'}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-md shadow-indigo-500/20 active:scale-[0.98] transition-all flex items-center justify-center mt-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Sign In'
            )}
          </button>
          
          <div className="text-right">
            <button 
              type="button" 
              onClick={() => setShowForgotPwd(true)} 
              className="text-xs font-semibold text-indigo-500 hover:text-indigo-600 transition-colors"
            >
              Forgot Password?
            </button>
          </div>
        </form>

        <div className="mt-8 text-center">
          <p className="text-[11px] text-[var(--text-muted)]">Security notice: Access strictly for authorized admins.</p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
