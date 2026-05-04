import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Terminal, Mail, Lock, AlertCircle, X } from 'lucide-react';
import { fetchWithAuth } from '../api';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPwd, setShowForgotPwd] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    fetchWithAuth('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    })
    .then(data => {
      localStorage.setItem('mockai_admin_auth', 'true');
      localStorage.setItem('mockai_admin_token', data.access_token);
      navigate('/admin/dashboard');
    })
    .catch(err => {
      setError(err.message);
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
    .then(data => {
      setResetSuccess(true);
    })
    .catch(err => setError(err.message))
    .finally(() => setLoading(false));
  };

  if (showForgotPwd) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080a10] px-4">
        <div className="absolute w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[80px] -z-10"></div>
        <div className="w-full max-w-md glass-card p-8 rounded-3xl relative">
          <button onClick={() => setShowForgotPwd(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
            <AlertCircle className="w-5 h-5 hidden" />
            <X className="w-5 h-5" />
          </button>
          
          <h2 className="text-2xl font-bold text-white mb-2">Forgot Password</h2>
          <p className="text-sm text-slate-400 mb-6">Enter your email to receive a temporary password.</p>
          
          {error && <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4 flex-shrink-0" />{error}</div>}
          {resetSuccess && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
              Password reset email sent. Please check your inbox.
            </div>
          )}
          
          <form onSubmit={handleForgotPwd} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500" />
                <input 
                  type="email" 
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="admin@mockai.com" 
                  required
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-900/40 border border-slate-800/60 text-slate-200 text-sm focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                />
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-500/20 transition-all">
              {loading ? 'Processing...' : 'Reset Password'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080a10] px-4">
      {/* Glow Effect behind card */}
      <div className="absolute w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[80px] -z-10"></div>
      
      <div className="w-full max-w-md glass-card p-8 rounded-3xl relative">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/30 mb-4 animate-float">
            <Terminal className="w-6 h-6 text-indigo-400" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Admin Portal</h2>
          <p className="text-sm text-slate-400 mt-1">Sign in to manage MockAI platform</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
            <div className="relative">
              <Mail className="w-5 h-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500" />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@mockai.com" 
                required
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-900/40 border border-slate-800/60 text-slate-200 text-sm focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/20 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500" />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" 
                required
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-900/40 border border-slate-800/60 text-slate-200 text-sm focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/20 transition-all"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all flex items-center justify-center"
          >
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Sign In'}
          </button>
          
          <div className="text-right">
            <button type="button" onClick={() => setShowForgotPwd(true)} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
              Forgot Password?
            </button>
          </div>
        </form>

        <div className="mt-8 text-center">
          <p className="text-xs text-slate-500">Security notice: Access strictly for authorized admins.</p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
