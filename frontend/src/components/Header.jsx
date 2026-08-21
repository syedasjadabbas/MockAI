import React, { useEffect, useRef, useState } from 'react';
import { Bell, Search, User, Key, X, CheckCircle2, AlertCircle, Info, Camera, Edit2, Menu } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { fetchWithAuth, API_BASE } from '../api';
import ThemeToggle from './ThemeToggle';
import { useTheme } from '../context/ThemeContext';

const Header = ({ onToggleMobileMenu }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isDark } = useTheme();
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
  const [adminInfo, setAdminInfo] = useState({ name: 'Admin User', email: 'admin@mockai.com', role: 'Admin', profile_picture: null });
  const [profilePicture, setProfilePicture] = useState(null);
  const [pictureUploading, setPictureUploading] = useState(false);
  const [pictureError, setPictureError] = useState('');
  const fileInputRef = useRef(null);
  const [nameEditing, setNameEditing] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [nameLoading, setNameLoading] = useState(false);
  const [nameError, setNameError] = useState('');

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

    fetchWithAuth('/me')
      .then(data => {
        if (data && data.name) {
          setAdminInfo({ name: data.name, email: data.email, role: data.role, profile_picture: data.profile_picture || null });
          if (data.profile_picture) {
            const url = data.profile_picture.startsWith('http') ? data.profile_picture : `${API_BASE}${data.profile_picture}`;
            setProfilePicture(url);
          }
        }
      })
      .catch(() => { });

    fetchWithAuth('/logs')
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
            const final = unique.slice(0, 20).sort((a, b) => new Date(b.time) - new Date(a.time));
            localStorage.setItem('mockai_notifications', JSON.stringify(final));
            return final;
          });
        }
      })
      .catch(() => { });
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

    fetchWithAuth('/interviews')
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
      .catch(() => { });

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
    switch (path) {
      case '/admin/dashboard': return 'Dashboard';
      case '/admin/users': return 'Manage Users';
      case '/admin/interviews': return 'Interviews';
      case '/admin/results': return 'Evaluation Results';
      case '/admin/logs': return 'Action Logs';
      case '/admin/admins': return 'Manage Admins';
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
      await fetchWithAuth('/change-password', {
        method: 'PUT',
        body: JSON.stringify({
          old_password: oldPassword,
          new_password: newPassword
        })
      });

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
      await fetchWithAuth('/create/send-otp', {
        method: 'POST',
        body: JSON.stringify({ name: addAdminName, email: addAdminEmail })
      });
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
      await fetchWithAuth('/create', {
        method: 'POST',
        body: JSON.stringify({ name: addAdminName, email: addAdminEmail, password: addAdminPassword, otp: addAdminOtp })
      });
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

  const handleProfilePictureUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setPictureError('Only JPG and PNG files are allowed.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setPictureError('File size must be under 2MB.');
      return;
    }
    setPictureError('');
    setPictureUploading(true);
    try {
      const token = localStorage.getItem('mockai_admin_token');
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_BASE}/admin/profile-picture`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Upload failed');
      }
      const data = await res.json();
      const fullUrl = `${API_BASE}${data.url}`;
      setProfilePicture(fullUrl);
      setAdminInfo(prev => ({ ...prev, profile_picture: data.url }));
    } catch (err) {
      setPictureError(err.message || 'Upload failed');
    } finally {
      setPictureUploading(false);
    }
  };

  const handleUpdateName = async () => {
    if (!nameValue.trim()) { setNameError('Name cannot be empty'); return; }
    setNameLoading(true);
    setNameError('');
    try {
      const data = await fetchWithAuth('/update-name', {
        method: 'PATCH',
        body: JSON.stringify({ name: nameValue.trim() })
      });
      setAdminInfo(prev => ({ ...prev, name: data.name }));
      setNameEditing(false);
    } catch (err) {
      setNameError(err.message || 'Failed to update name');
    } finally {
      setNameLoading(false);
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
      <header className="fixed top-0 right-0 left-0 lg:left-64 h-16 glass-panel border-b z-30 px-4 sm:px-6 flex items-center justify-between transition-all duration-200">
        {/* Left: Mobile hamburger & Page Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMobileMenu}
            className="lg:hidden p-2 rounded-xl border border-[var(--border-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-all"
            aria-label="Toggle menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-[var(--text-primary)]">
              {getPageTitle(location.pathname)}
            </h1>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2.5 sm:gap-3.5">
          {/* Global Search Bar */}
          <div className="relative hidden md:block">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search users, interviews, logs..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchDropdown(true);
              }}
              onFocus={() => setShowSearchDropdown(true)}
              onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
              onKeyDown={handleSearch}
              className="pl-9 pr-4 py-2 rounded-xl text-xs sm:text-sm theme-input border focus:outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/15 w-48 lg:w-64 transition-all"
            />
            {showSearchDropdown && searchQuery.trim() && (
              <div className="absolute top-full mt-2 w-full theme-modal rounded-2xl shadow-2xl z-50 overflow-hidden border">
                {searchResults.length === 0 ? (
                  <div className="p-4 text-xs text-[var(--text-muted)] text-center">No results found</div>
                ) : (
                  searchResults.map((res, i) => (
                    <div
                      key={i}
                      onClick={() => {
                        navigate(res.path);
                        setShowSearchDropdown(false);
                        setSearchQuery('');
                      }}
                      className="p-3 border-b border-[var(--border-table)] hover:bg-[var(--bg-table-row-hover)] cursor-pointer transition-colors flex flex-col gap-0.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-[var(--text-primary)]">{res.title}</span>
                        <span className="text-[10px] uppercase font-bold text-indigo-500 bg-indigo-500/10 px-1.5 py-0.5 rounded">{res.type}</span>
                      </div>
                      <span className="text-xs text-[var(--text-secondary)]">{res.subtitle}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Theme Toggle Button */}
          <ThemeToggle />

          {/* Notifications Dropdown */}
          <div className="relative">
            <button 
              onClick={handleOpenNotifications} 
              className="relative p-2.5 rounded-xl border border-[var(--border-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-all"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>
            {showNotifications && (
              <div className="absolute top-12 right-0 w-80 sm:w-96 theme-modal rounded-2xl shadow-2xl z-50 overflow-hidden border">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-table)] bg-[var(--bg-table-header)]">
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">Notifications</h3>
                  <button onClick={handleClearNotifications} className="text-[11px] font-semibold text-indigo-500 hover:text-indigo-600">
                    Clear All
                  </button>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="px-4 py-8 text-center text-xs text-[var(--text-muted)]">No new notifications</p>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} className="px-4 py-3 border-b border-[var(--border-table)] hover:bg-[var(--bg-table-row-hover)] transition-colors flex gap-3">
                        <div className="mt-0.5 flex-shrink-0">
                          {n.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                          {n.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-500" />}
                          {n.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-500" />}
                          {n.type === 'info' && <Info className="w-4 h-4 text-indigo-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm text-[var(--text-primary)] leading-snug break-words">{n.message}</p>
                          <p className="text-[10px] text-[var(--text-muted)] mt-1 font-medium">{n.time}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Profile Button & Menu */}
          <div className="flex items-center gap-3 pl-2 border-l border-[var(--border-panel)]">
            <div 
              className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 overflow-hidden cursor-pointer hover:border-indigo-500/50 transition-all" 
              onClick={() => setShowProfileModal(true)}
              title="Admin Profile"
            >
              {profilePicture
                ? <img src={profilePicture} alt="Admin" className="w-full h-full object-cover" onError={() => setProfilePicture(null)} />
                : <User className="w-4 h-4 text-indigo-500" />}
            </div>
            <div className="hidden sm:flex flex-col">
              <button
                onClick={() => setShowProfileModal(true)}
                className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] text-left hover:text-indigo-500 transition-colors"
              >
                {adminInfo.name}
              </button>
              <button
                onClick={() => setShowPasswordModal(true)}
                className="text-[11px] text-indigo-500 hover:text-indigo-600 text-left transition-colors flex items-center gap-1 font-medium"
              >
                <Key className="w-3 h-3" />
                Password
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Admin Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="theme-modal p-6 sm:p-8 rounded-3xl w-full max-w-sm relative border">
            <button 
              onClick={() => setShowProfileModal(false)} 
              className="absolute top-4 right-4 p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex flex-col items-center mb-6 mt-2">
              <div className="relative group w-20 h-20 mb-3">
                <div className="w-20 h-20 rounded-full bg-indigo-500/10 flex items-center justify-center border-2 border-indigo-500/30 overflow-hidden">
                  {profilePicture
                    ? <img src={profilePicture} alt="Admin" className="w-full h-full object-cover" onError={() => setProfilePicture(null)} />
                    : <User className="w-10 h-10 text-indigo-500" />}
                </div>
                <button
                  onClick={() => { setPictureError(''); fileInputRef.current?.click(); }}
                  disabled={pictureUploading}
                  className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:cursor-not-allowed"
                  title="Upload profile picture"
                >
                  {pictureUploading
                    ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <Camera className="w-5 h-5 text-white" />}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  className="hidden"
                  onChange={handleProfilePictureUpload}
                />
              </div>
              {pictureError && <p className="text-xs text-rose-500 mb-1 text-center font-medium">{pictureError}</p>}
              
              {/* Editable name */}
              {nameEditing ? (
                <div className="flex flex-col items-center gap-2 w-full">
                  <input
                    autoFocus
                    value={nameValue}
                    onChange={e => setNameValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleUpdateName(); if (e.key === 'Escape') setNameEditing(false); }}
                    className="w-full text-center theme-input border rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    disabled={nameLoading}
                    maxLength={60}
                  />
                  {nameError && <p className="text-xs text-rose-500 font-medium">{nameError}</p>}
                  <div className="flex gap-2 mt-1">
                    <button 
                      onClick={handleUpdateName} 
                      disabled={nameLoading} 
                      className="px-3 py-1.5 text-xs rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-sm transition-all"
                    >
                      {nameLoading ? 'Saving…' : 'Save'}
                    </button>
                    <button 
                      onClick={() => { setNameEditing(false); setNameError(''); }} 
                      className="px-3 py-1.5 text-xs rounded-xl border border-[var(--border-card)] text-[var(--text-secondary)] font-semibold transition-all hover:bg-[var(--bg-card-hover)]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { setNameValue(adminInfo.name); setNameEditing(true); setNameError(''); }}
                  className="flex items-center gap-1.5 text-xl font-bold text-[var(--text-primary)] hover:text-indigo-500 transition-colors group"
                  title="Click to edit name"
                >
                  {adminInfo.name}
                  <Edit2 className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-indigo-500 transition-opacity" />
                </button>
              )}
              <span className="px-2.5 py-0.5 mt-2 bg-indigo-500/10 text-indigo-500 text-xs font-bold rounded-full border border-indigo-500/20 uppercase tracking-wider">
                {adminInfo.role}
              </span>
              <p className="text-[11px] text-[var(--text-muted)] mt-1.5">Click photo to change (JPG/PNG, max 2MB)</p>
            </div>
            
            <div className="space-y-3.5 p-4 rounded-2xl bg-[var(--bg-table-header)] border border-[var(--border-table)]">
              <div>
                <p className="text-xs text-[var(--text-muted)] font-medium">Email Address</p>
                <p className="text-sm font-semibold text-[var(--text-primary)] break-all">{adminInfo.email}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)] font-medium">Role</p>
                <p className="text-sm font-semibold text-[var(--text-primary)] capitalize">{adminInfo.role}</p>
              </div>
            </div>

            <button 
              onClick={() => { setShowProfileModal(false); setShowAddAdminModal(true); }} 
              className="w-full mt-5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl transition-all shadow-md shadow-indigo-500/20 text-sm"
            >
              + Add Admin
            </button>
            <button 
              onClick={() => setShowProfileModal(false)} 
              className="w-full mt-2 border border-[var(--border-card)] hover:bg-[var(--bg-card-hover)] text-[var(--text-secondary)] font-semibold py-2.5 rounded-xl transition-all text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="theme-modal border p-6 sm:p-8 rounded-3xl w-full max-w-sm relative shadow-2xl">
            <button
              onClick={() => setShowPasswordModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">Change Password</h2>

            {error && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Old Password</label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full theme-input border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full theme-input border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50 mt-3 text-sm"
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Admin Modal */}
      {showAddAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="theme-modal border p-6 sm:p-8 rounded-3xl w-full max-w-sm relative shadow-2xl">
            <button
              onClick={() => {
                setShowAddAdminModal(false);
                setAddAdminStep(1);
                setAddAdminError('');
              }}
              className="absolute top-4 right-4 p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">Create Admin</h2>

            {addAdminError && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {addAdminError}
              </div>
            )}

            {addAdminStep === 1 ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Name</label>
                  <input
                    type="text"
                    value={addAdminName}
                    onChange={(e) => setAddAdminName(e.target.value)}
                    className="w-full theme-input border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Email</label>
                  <input
                    type="email"
                    value={addAdminEmail}
                    onChange={(e) => setAddAdminEmail(e.target.value)}
                    className="w-full theme-input border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Password</label>
                  <input
                    type="password"
                    value={addAdminPassword}
                    onChange={(e) => setAddAdminPassword(e.target.value)}
                    className="w-full theme-input border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={addAdminLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50 mt-3 text-sm"
                >
                  {addAdminLoading ? 'Sending...' : 'Verify Email'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleCreateAdmin} className="space-y-4">
                <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl mb-4">
                  <p className="text-xs text-indigo-500 font-medium">A 6-digit verification code has been sent to <strong>{addAdminEmail}</strong>.</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Enter Verification Code (OTP)</label>
                  <input
                    type="text"
                    value={addAdminOtp}
                    onChange={(e) => setAddAdminOtp(e.target.value)}
                    className="w-full theme-input border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 tracking-widest text-center font-mono text-lg"
                    maxLength={6}
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={addAdminLoading || addAdminOtp.length !== 6}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50 mt-3 text-sm"
                >
                  {addAdminLoading ? 'Creating...' : 'Create Admin'}
                </button>
                <button
                  type="button"
                  onClick={() => { setAddAdminStep(1); setAddAdminOtp(''); }}
                  className="w-full mt-2 border border-[var(--border-card)] hover:bg-[var(--bg-card-hover)] text-[var(--text-secondary)] font-semibold py-2.5 rounded-xl transition-all text-sm"
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
