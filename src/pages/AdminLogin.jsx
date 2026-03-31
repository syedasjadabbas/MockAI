import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Terminal, Mail, Lock, AlertCircle } from 'lucide-react';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Mock Authentication Logic
    setTimeout(() => {
      if (email === 'admin@mockai.com' && password === 'admin123') {
        navigate('/admin/dashboard');
      } else {
        setError('Invalid email or password. Try admin@mockai.com / admin123');
        setLoading(false);
      }
    }, 1000);
  };

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
        </form>

        <div className="mt-8 text-center">
          <p className="text-xs text-slate-500">Security notice: Access strictly for authorized admins.</p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
