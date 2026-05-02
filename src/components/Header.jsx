import React, { useState } from 'react';
import { Bell, Search, User, Key, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const Header = () => {
  const location = useLocation();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const getPageTitle = (path) => {
    switch(path) {
      case '/admin/dashboard': return 'Dashboard';
      case '/admin/users': return 'Manage Users';
      case '/admin/interviews': return 'Interviews';
      case '/admin/results': return 'Evaluation Results';
      case '/admin/logs': return 'Action Logs';
      default: return 'Admin Panel';
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('mockai_admin_token');
      const response = await fetch('http://localhost:8000/api/admin/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          old_password: oldPassword,
          new_password: newPassword
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update password');
      }

      alert('Password updated successfully');
      setShowPasswordModal(false);
      setOldPassword('');
      setNewPassword('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <header className="fixed top-0 right-0 left-64 h-16 glass-panel border-b border-slate-800/40 z-30 px-6 flex items-center justify-between">
        {/* Title */}
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">{getPageTitle(location.pathname)}</h1>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative hidden md:block">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search everything..." 
              onKeyDown={(e) => { if(e.key === 'Enter') alert(`Searching for: ${e.target.value}`) }}
              className="pl-10 pr-4 py-1.5 rounded-lg bg-slate-900/40 border border-slate-800/40 text-slate-200 text-sm focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20 w-60"
            />
          </div>

          {/* Notif */}
          <button onClick={() => alert("You have 3 new notifications!")} className="relative w-9 h-9 flex items-center justify-center rounded-lg bg-slate-800/30 text-slate-400 hover:text-white border border-slate-800/40 hover:border-slate-700/60 transition-all">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
          </button>

          {/* Profile */}
          <div className="flex items-center gap-3 pl-2 border-l border-slate-800/60">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
              <User className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="hidden md:flex flex-col">
              <p className="text-sm font-semibold text-slate-200">Admin User</p>
              <button 
                onClick={() => setShowPasswordModal(true)} 
                className="text-[11px] text-indigo-400 hover:text-indigo-300 text-left transition-colors flex items-center gap-1"
              >
                <Key className="w-3 h-3" />
                Change Password
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl w-96 relative shadow-2xl">
            <button 
              onClick={() => setShowPasswordModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-white mb-4">Change Password</h2>
            
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Old Password</label>
                <input 
                  type="password" 
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">New Password</label>
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 rounded-lg transition-colors disabled:opacity-50 mt-2"
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
