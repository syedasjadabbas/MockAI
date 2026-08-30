import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Calendar, Edit2, Check, X, Briefcase, TrendingUp, Lock, Eye, EyeOff, AlertCircle, RefreshCw, User as UserIcon } from 'lucide-react';
import CandidateLayout from '../layouts/CandidateLayout';
import CandidateStat from '../components/CandidateStat';
import { getSession, getProfile, updateProfile, changePassword, logout } from '../services/candidateAuth';
import { getDashboardSummary } from '../services/candidateApi';
import { formatDateOnly } from '../../utils/dateFormat';

// FR04 - View User Profile, FR05 - Edit User Profile
const Profile = () => {
  const navigate = useNavigate();

  // Real profile load state
  const [session, setSession] = useState(getSession());
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState('');

  const [summary, setSummary] = useState(null);

  // Profile fields edit state
  const [nameValue, setNameValue] = useState(session?.name || '');
  const [emailValue, setEmailValue] = useState(session?.email || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Avatar upload state
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const [imgError, setImgError] = useState(false);

  // Change password state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [session?.avatar]);

  const loadProfile = () => {
    setProfileLoading(true);
    setProfileError('');
    getProfile()
      .then((data) => {
        setSession(data);
        setNameValue(data.name || '');
        setEmailValue(data.email || '');
      })
      .catch((err) => setProfileError(err.message || 'Failed to load profile.'))
      .finally(() => setProfileLoading(false));
  };

  useEffect(() => {
    loadProfile();
    getDashboardSummary().then(setSummary);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!nameValue.trim()) {
      setError('Name cannot be empty.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess(false);
    try {
      const updated = await updateProfile({ name: nameValue.trim() });
      setSession(updated);
      setSuccess(true);
      // Trigger header updates
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
        // Trigger header updates
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
      <div className="mb-6">
        <p className="c-eyebrow mb-2">Account</p>
        <h1 className="c-heading text-2xl sm:text-3xl">Profile</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--c-text-secondary)' }}>Your account details and interview activity summary.</p>
      </div>

      {profileLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="c-skeleton h-64 rounded-2xl" />
          <div className="lg:col-span-2 c-skeleton h-64 rounded-2xl" />
        </div>
      ) : profileError ? (
        <div className="c-card rounded-2xl p-8 flex flex-col items-center text-center gap-3">
          <AlertCircle className="w-8 h-8" style={{ color: 'var(--c-danger)' }} />
          <p className="text-sm font-semibold">Couldn't load your profile</p>
          <p className="text-xs" style={{ color: 'var(--c-text-muted)' }}>{profileError}</p>
          <button onClick={loadProfile} className="c-btn c-btn-primary px-4 py-2 text-xs">
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Identity card */}
        <div className="lg:col-span-1 c-card rounded-2xl p-6 flex flex-col items-center text-center">
          <div className="relative group mb-4 select-none">
            {session?.avatar && !imgError ? (
              <img
                src={session.avatar}
                alt={session.name || 'Candidate'}
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="w-24 h-24 rounded-full object-cover border-2"
                style={{ borderColor: 'var(--c-border-strong)' }}
              />
            ) : (
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold border-2"
                style={{
                  background: 'var(--c-accent-soft)',
                  color: 'var(--c-accent)',
                  borderColor: 'var(--c-border-strong)',
                  fontFamily: 'var(--c-font-heading)'
                }}
              >
                {(session?.name || 'C').trim().charAt(0).toUpperCase()}
              </div>
            )}
            
            {/* Edit Photo Overlay */}
            <label className="absolute inset-0 w-full h-full rounded-full bg-black/45 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white">
              {avatarSaving ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Edit2 className="w-4.5 h-4.5 mb-1 text-white" />
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
          
          {avatarError && <p className="text-xs font-semibold text-[var(--c-danger)] mt-1 mb-2">{avatarError}</p>}

          <h3 className="c-heading text-xl">{session?.name}</h3>
          <span className="c-badge c-badge-accent mt-2.5 uppercase text-[10px] tracking-widest font-extrabold">Candidate</span>

          <div className="w-full mt-6 pt-6 space-y-3.5 text-left" style={{ borderTop: '1px solid var(--c-border)' }}>
            <div className="flex items-center gap-2.5 min-w-0">
              <Mail className="w-4 h-4 shrink-0" style={{ color: 'var(--c-text-muted)' }} />
              <span className="text-sm truncate" style={{ color: 'var(--c-text-secondary)' }} title={session?.email}>{session?.email}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Calendar className="w-4 h-4 shrink-0" style={{ color: 'var(--c-text-muted)' }} />
              <span className="text-sm" style={{ color: 'var(--c-text-secondary)' }}>Member since {formatDateOnly(session?.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Activity summary + settings edit */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CandidateStat label="Total Interviews" value={summary?.totalInterviews ?? '—'} icon={Briefcase} hint="All sessions started" />
            <CandidateStat label="Average Score" value={summary?.averageScore ?? '—'} icon={TrendingUp} hint="Across completed interviews" />
          </div>

          {/* Profile settings form */}
          <div className="c-card rounded-2xl p-6">
            <h2 className="c-heading text-base mb-1 flex items-center gap-2">
              <UserIcon className="w-4 h-4" style={{ color: 'var(--c-accent)' }} /> Profile Details
            </h2>
            <p className="text-xs mb-5" style={{ color: 'var(--c-text-secondary)' }}>
              Update your account name (email address is read-only).
            </p>

            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="c-label block mb-1.5">Full Name</label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--c-text-muted)' }} />
                    <input
                      type="text"
                      value={nameValue}
                      onChange={(e) => setNameValue(e.target.value)}
                      disabled={saving}
                      required
                      className="c-input w-full pl-10 pr-4 py-2.5 rounded-xl text-sm disabled:opacity-60"
                    />
                  </div>
                </div>
                <div>
                  <label className="c-label block mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--c-text-muted)' }} />
                    <input
                      type="email"
                      value={emailValue}
                      disabled
                      className="c-input w-full pl-10 pr-4 py-2.5 rounded-xl text-sm opacity-50 cursor-not-allowed select-none bg-[var(--c-bg-soft)]"
                      style={{ background: 'rgba(0,0,0,0.03)', borderColor: 'var(--c-border)' }}
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="c-badge-danger rounded-xl px-3.5 py-3 flex items-center gap-2 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}
              {success && (
                <div className="c-badge-success rounded-xl px-3.5 py-3 text-xs font-semibold">
                  Profile updated successfully.
                </div>
              )}

              <button type="submit" disabled={saving} className="c-btn c-btn-primary w-full sm:w-auto px-6 py-2.5">
                {saving && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </form>
          </div>

          {/* Change Password form */}
          <div className="c-card rounded-2xl p-6">
            <h2 className="c-heading text-base mb-1 flex items-center gap-2">
              <Lock className="w-4 h-4" style={{ color: 'var(--c-accent)' }} /> Change Password
            </h2>
            <p className="text-xs mb-5" style={{ color: 'var(--c-text-secondary)' }}>
              Update the password used to sign in to your account.
            </p>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="c-label block mb-1.5">Current Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--c-text-muted)' }} />
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={pwSaving}
                    className="c-input w-full pl-10 pr-4 py-2.5 rounded-xl text-sm disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="c-label block mb-1.5">New Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--c-text-muted)' }} />
                    <input
                      type={showPasswords ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      disabled={pwSaving}
                      className="c-input w-full pl-10 pr-4 py-2.5 rounded-xl text-sm disabled:opacity-60"
                    />
                  </div>
                </div>
                <div>
                  <label className="c-label block mb-1.5">Confirm New Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--c-text-muted)' }} />
                    <input
                      type={showPasswords ? 'text' : 'password'}
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      disabled={pwSaving}
                      className="c-input w-full pl-10 pr-11 py-2.5 rounded-xl text-sm disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords((v) => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2"
                      style={{ color: 'var(--c-text-muted)' }}
                      aria-label={showPasswords ? 'Hide passwords' : 'Show passwords'}
                    >
                      {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {pwError && (
                <div className="c-badge-danger rounded-xl px-3.5 py-3 flex items-center gap-2 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {pwError}
                </div>
              )}
              {pwSuccess && (
                <div className="c-badge-success rounded-xl px-3.5 py-3 text-xs font-semibold">
                  Password updated. Signing you out to sign back in with your new password…
                </div>
              )}

              <button type="submit" disabled={pwSaving} className="c-btn c-btn-primary w-full sm:w-auto px-6 py-2.5">
                {pwSaving && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                {pwSaving ? 'Updating…' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      </div>
      )}
    </CandidateLayout>
  );
};

export default Profile;
