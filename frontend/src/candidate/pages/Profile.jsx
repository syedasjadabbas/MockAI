import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User as UserIcon,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Briefcase,
  TrendingUp,
  Calendar,
  Edit2,
  RefreshCw,
} from 'lucide-react';
import CandidateLayout from '../layouts/CandidateLayout';
import { getProfile, updateProfile, changePassword, getSession, logout } from '../services/candidateAuth';
import { getDashboardSummary } from '../services/candidateApi';
import { formatDateOnly } from '../../utils/dateFormat';

const Profile = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState(getSession());
  const [summary, setSummary] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState('');

  // Profile Form state
  const [nameValue, setNameValue] = useState(session?.name || '');
  const [emailValue, setEmailValue] = useState(session?.email || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Avatar upload state
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const [imgError, setImgError] = useState(false);

  // Password Change state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);

  const loadProfile = async () => {
    setProfileLoading(true);
    setProfileError('');
    try {
      const data = await getProfile();
      setSession(data);
      setNameValue(data.name || '');
      setEmailValue(data.email || '');
      setImgError(false);
    } catch (err) {
      setProfileError(err.message || 'Failed to fetch candidate profile.');
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
    getDashboardSummary().then(setSummary);
  }, []);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!nameValue.trim()) {
      setError('Name is required.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      const updated = await updateProfile({ name: nameValue.trim() });
      setSession(updated);
      setSuccess(true);
      window.dispatchEvent(new Event('storage'));
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setAvatarError('Image size must be less than 2MB.');
      return;
    }

    setAvatarSaving(true);
    setAvatarError('');

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result;
        const updated = await updateProfile({ avatar: base64Data });
        setSession(updated);
        window.dispatchEvent(new Event('storage'));
      } catch (err) {
        setAvatarError(err.message || 'Failed to upload photo.');
      } finally {
        setAvatarSaving(false);
      }
    };
    reader.onerror = () => {
      setAvatarError('Failed to read image file.');
      setAvatarSaving(false);
    };
    reader.readAsDataURL(file);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess(false);

    if (!oldPassword || !newPassword || !confirmNewPassword) {
      setPwError('Please fill in all password fields.');
      return;
    }
    if (newPassword.length < 6) {
      setPwError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPwError('New passwords do not match.');
      return;
    }

    setPwSaving(true);
    try {
      await changePassword({ oldPassword, newPassword });
      setPwSuccess(true);
      setOldPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setTimeout(() => {
        logout();
        navigate('/login');
      }, 1500);
    } catch (err) {
      setPwError(err.message || 'Failed to change password.');
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <CandidateLayout>
      <div className="space-y-8 py-2">
        {/* Header directly on page */}
        <div className="border-b pb-6" style={{ borderColor: 'var(--c-border)' }}>
          <p className="c-eyebrow mb-1">Account</p>
          <h1 className="c-heading text-2xl sm:text-3xl font-bold" style={{ color: 'var(--c-text)' }}>
            Profile & Security
          </h1>
          <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--c-text-secondary)' }}>
            Candidate credentials and account details.
          </p>
        </div>

        {profileLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="c-skeleton h-60 rounded-lg" />
            <div className="lg:col-span-2 c-skeleton h-60 rounded-lg" />
          </div>
        ) : profileError ? (
          <div className="py-12 flex flex-col items-center text-center gap-3 border-t border-b"
            style={{ borderColor: 'var(--c-border)' }}
          >
            <AlertCircle className="w-6 h-6 text-red-500" />
            <p className="text-sm font-bold" style={{ color: 'var(--c-text)' }}>Couldn't load profile</p>
            <p className="text-xs" style={{ color: 'var(--c-text-muted)' }}>{profileError}</p>
            <button onClick={loadProfile} className="c-btn c-btn-primary px-3.5 py-1.5 text-xs rounded-md">
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Identity Column (Directly on page with subtle dividers) */}
            <div className="lg:col-span-4 space-y-5">
              <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
                <div className="relative group mb-3 select-none">
                  {session?.avatar && !imgError ? (
                    <img
                      src={session.avatar}
                      alt={session.name || 'Candidate'}
                      referrerPolicy="no-referrer"
                      onError={() => setImgError(true)}
                      className="w-20 h-20 rounded-full object-cover border"
                      style={{ borderColor: 'var(--c-border)' }}
                    />
                  ) : (
                    <div
                      className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold border"
                      style={{
                        background: 'var(--c-surface-muted)',
                        color: 'var(--c-text)',
                        borderColor: 'var(--c-border)',
                      }}
                    >
                      {(session?.name || 'C').trim().charAt(0).toUpperCase()}
                    </div>
                  )}
                  
                  {/* Edit Photo Overlay */}
                  <label className="absolute inset-0 w-full h-full rounded-full bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white">
                    {avatarSaving ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Edit2 className="w-4 h-4 mb-0.5 text-white" />
                        <span className="text-[10px] font-bold text-white uppercase tracking-wider">Change</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      disabled={avatarSaving}
                      className="hidden"
                    />
                  </label>
                </div>
                
                {avatarError && <p className="text-xs font-semibold text-red-500 mt-1 mb-2">{avatarError}</p>}

                <h3 className="c-heading text-lg font-bold" style={{ color: 'var(--c-text)' }}>{session?.name}</h3>
                <span className="c-badge c-badge-muted mt-1.5 text-[10px] font-bold">Candidate Account</span>

                <div className="w-full mt-4 pt-4 space-y-2 text-left border-t text-xs" style={{ borderColor: 'var(--c-border)' }}>
                  <div className="flex items-center gap-2 min-w-0">
                    <Mail className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--c-text-muted)' }} />
                    <span className="truncate" style={{ color: 'var(--c-text-secondary)' }} title={session?.email}>{session?.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--c-text-muted)' }} />
                    <span style={{ color: 'var(--c-text-secondary)' }}>Member since {formatDateOnly(session?.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* Statistics directly on page with dividers */}
              <div className="border-t pt-4 space-y-3" style={{ borderColor: 'var(--c-border)' }}>
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--c-text-muted)' }}>Total Sessions</span>
                  <span className="c-serif-num text-xl font-bold" style={{ color: 'var(--c-text)' }}>{summary?.totalInterviews ?? '—'}</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--c-text-muted)' }}>Average Score</span>
                  <span className="c-serif-num text-xl font-bold" style={{ color: 'var(--c-text)' }}>{summary?.averageScore != null ? `${Math.round(summary.averageScore)}%` : '—'}</span>
                </div>
              </div>
            </div>

            {/* Forms Column (LEVEL 3 — Restrained form modules) */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Profile settings form */}
              <div className="c-card rounded-lg p-5 sm:p-6 border"
                style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)' }}
              >
                <h2 className="c-heading text-sm font-bold mb-0.5 flex items-center gap-2" style={{ color: 'var(--c-text)' }}>
                  <UserIcon className="w-4 h-4" style={{ color: 'var(--c-text-muted)' }} /> Candidate Identity
                </h2>
                <p className="text-xs mb-4" style={{ color: 'var(--c-text-secondary)' }}>
                  Update your candidate profile name.
                </p>

                <form onSubmit={handleProfileSubmit} className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="c-label block mb-1">Full Name</label>
                      <div className="relative">
                        <UserIcon className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--c-text-muted)' }} />
                        <input
                          type="text"
                          value={nameValue}
                          onChange={(e) => setNameValue(e.target.value)}
                          disabled={saving}
                          required
                          className="c-input w-full pl-9 pr-3 py-2 rounded-md text-xs disabled:opacity-60"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="c-label block mb-1">Email Address</label>
                      <div className="relative">
                        <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--c-text-muted)' }} />
                        <input
                          type="email"
                          value={emailValue}
                          disabled
                          className="c-input w-full pl-9 pr-3 py-2 rounded-md text-xs opacity-50 cursor-not-allowed select-none"
                        />
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="c-badge-danger rounded-md px-3 py-2 flex items-center gap-2 text-xs font-semibold">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      {error}
                    </div>
                  )}
                  {success && (
                    <div className="c-badge-success rounded-md px-3 py-2 text-xs font-semibold">
                      Profile updated successfully.
                    </div>
                  )}

                  <button type="submit" disabled={saving} className="c-btn c-btn-primary px-4 py-2 rounded-md font-semibold text-xs">
                    {saving && <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin mr-1" />}
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                </form>
              </div>

              {/* Change Password form */}
              <div className="c-card rounded-lg p-5 sm:p-6 border"
                style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)' }}
              >
                <h2 className="c-heading text-sm font-bold mb-0.5 flex items-center gap-2" style={{ color: 'var(--c-text)' }}>
                  <Lock className="w-4 h-4" style={{ color: 'var(--c-text-muted)' }} /> Security & Password
                </h2>
                <p className="text-xs mb-4" style={{ color: 'var(--c-text-secondary)' }}>
                  Update password credentials.
                </p>

                <form onSubmit={handleChangePassword} className="space-y-3.5">
                  <div>
                    <label className="c-label block mb-1">Current Password</label>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--c-text-muted)' }} />
                      <input
                        type={showPasswords ? 'text' : 'password'}
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        placeholder="••••••••"
                        disabled={pwSaving}
                        className="c-input w-full pl-9 pr-3 py-2 rounded-md text-xs disabled:opacity-60"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="c-label block mb-1">New Password</label>
                      <div className="relative">
                        <Lock className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--c-text-muted)' }} />
                        <input
                          type={showPasswords ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="At least 6 characters"
                          disabled={pwSaving}
                          className="c-input w-full pl-9 pr-3 py-2 rounded-md text-xs disabled:opacity-60"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="c-label block mb-1">Confirm New Password</label>
                      <div className="relative">
                        <Lock className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--c-text-muted)' }} />
                        <input
                          type={showPasswords ? 'text' : 'password'}
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value)}
                          placeholder="Re-enter password"
                          disabled={pwSaving}
                          className="c-input w-full pl-9 pr-9 py-2 rounded-md text-xs disabled:opacity-60"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-80"
                          style={{ color: 'var(--c-text-muted)' }}
                          aria-label={showPasswords ? 'Hide passwords' : 'Show passwords'}
                        >
                          {showPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {pwError && (
                    <div className="c-badge-danger rounded-md px-3 py-2 flex items-center gap-2 text-xs font-semibold">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      {pwError}
                    </div>
                  )}
                  {pwSuccess && (
                    <div className="c-badge-success rounded-md px-3 py-2 text-xs font-semibold">
                      Password updated. Signing out…
                    </div>
                  )}

                  <button type="submit" disabled={pwSaving} className="c-btn c-btn-primary px-4 py-2 rounded-md font-semibold text-xs">
                    {pwSaving && <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin mr-1" />}
                    {pwSaving ? 'Updating…' : 'Update Password'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </CandidateLayout>
  );
};

export default Profile;
