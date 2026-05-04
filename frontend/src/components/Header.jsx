import React, { useEffect, useState } from 'react';
import { Bell, Search, User, Key, X, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { fetchWithAuth } from '../api';

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [globalSearchData, setGlobalSearchData] = useState({ users: [], interviews: [], logs: [] });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [adminInfo, setAdminInfo] = useState({ name: 'Admin User', email: 'admin@mockai.com', role: 'Admin' });

  // Add Admin State
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [addAdminName, setAddAdminName] = useState('');
  const [addAdminEmail, setAddAdminEmail] = useState('');
  const [addAdminPassword, setAddAdminPassword] = useState('');
  const [addAdminOtp, setAddAdminOtp] = useState('');
  const [addAdminStep, setAddAdminStep] = useState(1);
  const [addAdminLoading, setAddAdminLoading] = useState(false);
  const [addAdminError, setAddAdminError] = useState('');

  // Initial load & Logs Sync
  useEffect(() => {
    const storedNotifs = JSON.parse(localStorage.getItem('mockai_notifications') || '[]');
    setNotifications(storedNotifs);
    setUnreadCount(parseInt(localStorage.getItem('mockai_unread_count') || '0', 10));

    const token = localStorage.getItem('mockai_admin_token');
    if (!token) return;

    fetch('http://localhost:8000/api/admin/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      if (data && data.name) {
        setAdminInfo({ name: data.name, email: data.email, role: data.role });
      }
    })
    .catch(() => {});

    fetch('http://localhost:8000/api/admin/logs', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      if (Array.isArray(data)) {
        const newNotifs = [];
        data.forEach(log => {
          let message = '';
          let type = 'info';
          if (log.action === 'CREATE_USER') { message = `New user created: ${log.target}`; type = 'success'; }
          else if (log.action === 'DELETE_USER') { message = `User deleted: ${log.target}`; type = 'warning'; }
          else if (log.action === 'DELETE_INTERVIEW') { message = `Interview deleted: ${log.target}`; type = 'warning'; }
          else if (log.action === 'LOGIN') { message = `Admin logged in`; type = 'info'; }
          
          if (message) {
            newNotifs.push({
              id: log._id || Date.now() + Math.random(),
              message,
              type,
              time: new Date(log.created_at).toLocaleString()
            });
          }
        });

        setNotifications(prev => {
          const combined = [...newNotifs, ...prev];
          const unique = [];
          const seen = new Set();
          for (const item of combined) {
            if (!seen.has(item.message)) {
              seen.add(item.message);
              unique.push(item);
            }
          }
          const final = unique.slice(0, 20).sort((a,b) => new Date(b.time) - new Date(a.time));
          localStorage.setItem('mockai_notifications', JSON.stringify(final));
          return final;
        });
      }
    })
    .catch(() => {});
  }, []);

  // Low score detection
  useEffect(() => {
    const token = localStorage.getItem('mockai_admin_token');
    if (!token) return;
    
    const fetchGlobalData = () => {
      Promise.all([
        fetchWithAuth('/users').catch(() => []),
        fetchWithAuth('/interviews').catch(() => []),
        fetchWithAuth('/logs').catch(() => [])
      ]).then(([usersData, interviewsData, logsData]) => {
        setGlobalSearchData({
          users: Array.isArray(usersData) ? usersData : [],
          interviews: Array.isArray(interviewsData) ? interviewsData : [],
          logs: Array.isArray(logsData) ? logsData : []
        });
      });
    };

    fetchGlobalData();
    window.addEventListener('dataUpdated', fetchGlobalData);

    fetch('http://localhost:8000/api/admin/interviews', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      if (Array.isArray(data)) {
        const flaggedIds = JSON.parse(localStorage.getItem('mockai_flagged_scores') || '[]');
        const lowScores = data.filter(i => i.score !== null && i.score < 50);
        let updatedFlagged = [...flaggedIds];
        let hasNew = false;

        lowScores.forEach(recent => {
          if (!flaggedIds.includes(recent._id)) {
            updatedFlagged.push(recent._id);
            hasNew = true;
            const newNotif = {
              id: `low-score-${recent._id}`,
              message: `Low score detected (< 50) for ${recent.candidate_name}`,
              type: 'error',
              time: new Date().toLocaleString()
            };
            setNotifications(prev => {
              if (prev.some(n => n.message === newNotif.message)) return prev;
              
              setUnreadCount(u => {
                const count = u + 1;
                localStorage.setItem('mockai_unread_count', count.toString());
                return count;
              });
              
              const next = [newNotif, ...prev].slice(0, 20);
              localStorage.setItem('mockai_notifications', JSON.stringify(next));
              return next;
            });
          }
        });

        if (hasNew) {
          localStorage.setItem('mockai_flagged_scores', JSON.stringify(updatedFlagged));
        }
      }
    })
    .catch(() => {});

    return () => window.removeEventListener('dataUpdated', fetchGlobalData);
  }, []);

  // Custom events
  useEffect(() => {
    const handleNotify = (e) => {
      const newNotif = {
        id: Date.now().toString(),
        message: e.detail.message,
        type: e.detail.type || 'info',
        time: new Date().toLocaleString()
      };
      setNotifications(prev => {
        if (prev.some(n => n.message === newNotif.message)) return prev;
        
        setUnreadCount(u => {
          const count = u + 1;
          localStorage.setItem('mockai_unread_count', count.toString());
          return count;
        });

        const next = [newNotif, ...prev].slice(0, 20);
        localStorage.setItem('mockai_notifications', JSON.stringify(next));
        return next;
      });
    };
    window.addEventListener('notify', handleNotify);
    return () => window.removeEventListener('notify', handleNotify);
  }, []);

  const handleOpenNotifications = () => {
    setShowNotifications(!showNotifications);
    setUnreadCount(0);
    localStorage.setItem('mockai_unread_count', '0');
  };

  const handleClearNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
    setShowNotifications(false);
    localStorage.setItem('mockai_notifications', '[]');
    localStorage.setItem('mockai_unread_count', '0');
  };
  
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

  const handleSearch = (e) => {
    if (e.key === 'Enter') {
      const query = searchQuery.trim();
      if (!query) return;
      
      const exactMatches = getSearchResults();
      if (exactMatches.length > 0) {
        navigate(exactMatches[0].path);
      } else {
        navigate(`/admin/users?search=${encodeURIComponent(query)}`);
      }
      setSearchQuery('');
      setShowSearchDropdown(false);
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

      window.dispatchEvent(new CustomEvent('notify', { detail: { message: 'Password updated successfully', type: 'success' } }));
      setShowPasswordModal(false);
      setOldPassword('');
      setNewPassword('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setAddAdminLoading(true);
    setAddAdminError('');
    try {
      const token = localStorage.getItem('mockai_admin_token');
      const response = await fetch('http://localhost:8000/api/admin/create/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: addAdminName, email: addAdminEmail })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to send OTP');
      }
      setAddAdminStep(2);
    } catch (err) {
      setAddAdminError(err.message);
    } finally {
      setAddAdminLoading(false);
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setAddAdminLoading(true);
    setAddAdminError('');
    try {
      const token = localStorage.getItem('mockai_admin_token');
      const response = await fetch('http://localhost:8000/api/admin/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: addAdminName, email: addAdminEmail, password: addAdminPassword, otp: addAdminOtp })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create admin');
      }
      window.dispatchEvent(new CustomEvent('notify', { detail: { message: 'Admin created successfully', type: 'success' } }));
      setShowAddAdminModal(false);
      setAddAdminName('');
      setAddAdminEmail('');
      setAddAdminPassword('');
      setAddAdminOtp('');
      setAddAdminStep(1);
    } catch (err) {
      setAddAdminError(err.message);
    } finally {
      setAddAdminLoading(false);
    }
  };

  const getSearchResults = () => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    const results = [];

    globalSearchData.users.forEach(u => {
      if (u.name?.toLowerCase().includes(query) || u.email?.toLowerCase().includes(query)) {
        results.push({ type: 'User', id: u._id, title: u.name, subtitle: u.email, path: `/admin/users?search=${encodeURIComponent(u.email)}` });
      }
    });

    globalSearchData.interviews.forEach(i => {
      const interviewId = `INT-${i._id.slice(-6).toUpperCase()}`;
      if (
        interviewId.toLowerCase().includes(query) ||
        i.candidate_name?.toLowerCase().includes(query) ||
        i.role?.toLowerCase().includes(query)
      ) {
        if (i.score != null) {
          results.push({ type: 'Result', id: i._id, title: `${interviewId} - ${i.candidate_name || 'Unknown'}`, subtitle: `${i.role || 'No Role'} • Score: ${i.score}%`, path: `/admin/results?search=${encodeURIComponent(interviewId)}` });
        } else {
          results.push({ type: 'Interview', id: i._id, title: `${interviewId} - ${i.candidate_name || 'Unknown'}`, subtitle: i.role || 'No Role', path: `/admin/interviews?search=${encodeURIComponent(interviewId)}` });
        }
      }
    });

    globalSearchData.logs?.forEach(l => {
      const logId = `LOG-${l._id?.slice(-6).toUpperCase() || 'UNKNOWN'}`;
      if (
        logId.toLowerCase().includes(query) ||
        l.admin_email?.toLowerCase().includes(query) ||
        l.action?.toLowerCase().includes(query) ||
        l.target?.toLowerCase().includes(query)
      ) {
        results.push({ type: 'Log', id: l._id || logId, title: `${l.action} - ${l.admin_email || 'System'}`, subtitle: `Target: ${l.target || 'None'}`, path: `/admin/logs?search=${encodeURIComponent(l.target || l.action)}` });
      }
    });

    return results.slice(0, 5);
  };

  const searchResults = getSearchResults();

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
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchDropdown(true);
              }}
              onFocus={() => setShowSearchDropdown(true)}
              onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
              onKeyDown={handleSearch}
              className="pl-10 pr-4 py-1.5 rounded-lg bg-slate-900/40 border border-slate-800/40 text-slate-200 text-sm focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20 w-60"
            />
            {showSearchDropdown && searchQuery.trim() && (
              <div className="absolute top-full mt-2 w-full bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden">
                {searchResults.length === 0 ? (
                  <div className="p-3 text-xs text-slate-500 text-center">No results found</div>
                ) : (
                  searchResults.map((res, i) => (
                    <div 
                      key={i} 
                      onClick={() => {
                        navigate(res.path);
                        setShowSearchDropdown(false);
                        setSearchQuery('');
                      }} 
                      className="p-3 border-b border-slate-800/40 hover:bg-slate-800/40 cursor-pointer transition-colors flex flex-col gap-0.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-200">{res.title}</span>
                        <span className="text-[10px] uppercase font-bold text-indigo-400">{res.type}</span>
                      </div>
                      <span className="text-xs text-slate-400">{res.subtitle}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Notif */}
          <div className="relative">
            <button onClick={handleOpenNotifications} className="relative w-9 h-9 flex items-center justify-center rounded-lg bg-slate-800/30 text-slate-400 hover:text-white border border-slate-800/40 hover:border-slate-700/60 transition-all">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">{unreadCount}</span>
              )}
            </button>
            {showNotifications && (
              <div className="absolute top-12 right-0 w-80 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/60 bg-slate-800/30">
                  <h3 className="text-sm font-bold text-white">Notifications</h3>
                  <button onClick={handleClearNotifications} className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300">Clear All</button>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="px-4 py-6 text-center text-xs text-slate-500">No new notifications</p>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} className="px-4 py-3 border-b border-slate-800/40 hover:bg-slate-800/20 transition-colors flex gap-3">
                        <div className="mt-0.5">
                          {n.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                          {n.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400" />}
                          {n.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-400" />}
                          {n.type === 'info' && <Info className="w-4 h-4 text-indigo-400" />}
                        </div>
                        <div>
                          <p className="text-sm text-slate-200 leading-snug">{n.message}</p>
                          <p className="text-[10px] text-slate-500 mt-1 font-medium">{n.time}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Profile */}
          <div className="flex items-center gap-3 pl-2 border-l border-slate-800/60">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
              <User className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="hidden md:flex flex-col">
              <button 
                onClick={() => setShowProfileModal(true)} 
                className="text-sm font-semibold text-slate-200 text-left hover:text-white transition-colors"
              >
                {adminInfo.name}
              </button>
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

      {/* Admin Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card p-6 rounded-2xl w-full max-w-sm relative border border-slate-800 bg-slate-900 shadow-2xl">
            <button onClick={() => setShowProfileModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <div className="flex flex-col items-center mb-6 mt-2">
              <div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 mb-3">
                <User className="w-8 h-8 text-indigo-400" />
              </div>
              <h2 className="text-xl font-bold text-white">{adminInfo.name}</h2>
              <span className="px-2 py-1 mt-2 bg-indigo-500/20 text-indigo-400 text-xs font-semibold rounded border border-indigo-500/20 uppercase tracking-wider">{adminInfo.role}</span>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-400">Email</p>
                <p className="font-semibold text-slate-200">{adminInfo.email}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Role</p>
                <p className="font-semibold text-slate-200 capitalize">{adminInfo.role}</p>
              </div>
            </div>
            <button onClick={() => {setShowProfileModal(false); setShowAddAdminModal(true);}} className="w-full mt-6 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 rounded-lg transition-colors border border-indigo-500">
              + Add Admin
            </button>
            <button onClick={() => setShowProfileModal(false)} className="w-full mt-2 bg-slate-800 hover:bg-slate-700 text-white font-medium py-2 rounded-lg transition-colors border border-slate-700">
              Close
            </button>
          </div>
        </div>
      )}

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

      {/* Add Admin Modal */}
      {showAddAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl w-96 relative shadow-2xl">
            <button 
              onClick={() => {
                setShowAddAdminModal(false);
                setAddAdminStep(1);
                setAddAdminError('');
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-white mb-4">Create Admin</h2>
            
            {addAdminError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {addAdminError}
              </div>
            )}

            {addAdminStep === 1 ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Name</label>
                  <input 
                    type="text" 
                    value={addAdminName}
                    onChange={(e) => setAddAdminName(e.target.value)}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Email</label>
                  <input 
                    type="email" 
                    value={addAdminEmail}
                    onChange={(e) => setAddAdminEmail(e.target.value)}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Password</label>
                  <input 
                    type="password" 
                    value={addAdminPassword}
                    onChange={(e) => setAddAdminPassword(e.target.value)}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={addAdminLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 rounded-lg transition-colors disabled:opacity-50 mt-2"
                >
                  {addAdminLoading ? 'Sending...' : 'Verify Email'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleCreateAdmin} className="space-y-4">
                <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg mb-4">
                  <p className="text-sm text-indigo-200">A 6-digit verification code has been sent to <strong>{addAdminEmail}</strong>.</p>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Enter Verification Code (OTP)</label>
                  <input 
                    type="text" 
                    value={addAdminOtp}
                    onChange={(e) => setAddAdminOtp(e.target.value)}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 tracking-widest text-center font-mono text-lg"
                    maxLength={6}
                    required
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={addAdminLoading || addAdminOtp.length !== 6}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 rounded-lg transition-colors disabled:opacity-50 mt-2"
                >
                  {addAdminLoading ? 'Creating...' : 'Create Admin'}
                </button>
                <button 
                  type="button"
                  onClick={() => {setAddAdminStep(1); setAddAdminOtp('');}}
                  className="w-full mt-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-2 rounded-lg transition-colors text-sm"
                >
                  Back
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
