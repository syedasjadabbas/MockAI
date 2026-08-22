import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Calendar, Edit2, Check, X, Briefcase, TrendingUp, Lock, Eye, EyeOff, AlertCircle, RefreshCw } from 'lucide-react';
import CandidateLayout from '../layouts/CandidateLayout';
import StatsCard from '../../components/StatsCard';
import { CardSkeleton } from '../../components/Skeleton';
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

  // Name edit state
  const [editing, setEditing] = useState(false);
  const [nameValue, setNameValue] = useState(session?.name || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Change password state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);

  const loadProfile = () => {
    setProfileLoading(true);
    setProfileError('');
    getProfile()
      .then((data) => {
        setSession(data);
        setNameValue(data.name || '');
      })
      .catch((err) => setProfileError(err.message || 'Failed to load profile.'))
      .finally(() => setProfileLoading(false));
  };

  useEffect(() => {
    loadProfile();
    getDashboardSummary().then(setSummary);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    if (!nameValue.trim()) {
      setError('Name cannot be empty.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const updated = await updateProfile({ name: nameValue.trim() });
      setSession(updated);
      setEditing(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
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
      // The backend can't invalidate the old JWT (stateless, no session
      // store) - logging out here is a client-side best practice so the
      // candidate immediately re-authenticates with the new password,
      // not because the old token stops working.
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
        <h2 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">Profile</h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">Your account details and interview activity summary.</p>
      </div>

      {profileLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <CardSkeleton />
          <div className="lg:col-span-2"><CardSkeleton /></div>
        </div>
      ) : profileError ? (
        <div className="glass-card rounded-2xl p-8 flex flex-col items-center text-center gap-3">
          <AlertCircle className="w-8 h-8 text-rose-500" />
          <p className="text-sm font-semibold text-[var(--text-primary)]">Couldn't load your profile</p>
          <p className="text-xs text-[var(--text-muted)]">{profileError}</p>
          <button
            onClick={loadProfile}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-500/20 transition-all active:scale-[0.98]"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile card */}
        <div className="lg:col-span-1 glass-card rounded-2xl p-6 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-indigo-500/10 flex items-center justify-center border-2 border-indigo-500/30 mb-4">
            <User className="w-10 h-10 text-indigo-500" />
          </div>

          {editing ? (
            <div className="w-full flex flex-col items-center gap-2">
              <input
                autoFocus
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                className="w-full text-center theme-input border rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                maxLength={60}
                disabled={saving}
              />
              {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}
              <div className="flex gap-2 mt-1">
                <button onClick={handleSave} disabled={saving} className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-sm transition-all disabled:opacity-60">
                  <Check className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save'}
                </button>
                <button onClick={() => { setEditing(false); setNameValue(session.name); setError(''); }} disabled={saving} className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-xl border border-[var(--border-card)] text-[var(--text-secondary)] font-semibold transition-all hover:bg-[var(--bg-card-hover)] disabled:opacity-60">
                  <X className="w-3.5 h-3.5" /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setEditing(true)} title="Click to edit name" className="flex items-center gap-1.5 text-xl font-bold text-[var(--text-primary)] hover:text-indigo-500 transition-colors group">
              {session?.name}
              <Edit2 className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-indigo-500 transition-opacity" />
            </button>
          )}

          {success && <p className="text-xs text-emerald-500 font-semibold mt-2">Profile updated</p>}

          <span className="px-2.5 py-0.5 mt-3 bg-indigo-500/10 text-indigo-500 text-xs font-bold rounded-full border border-indigo-500/20 uppercase tracking-wider">
            Candidate
          </span>

          <div className="w-full mt-6 pt-6 border-t border-[var(--border-panel)] space-y-3.5 text-left">
            <div className="flex items-center gap-2.5">
              <Mail className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
              <span className="text-sm text-[var(--text-secondary)] truncate">{session?.email}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
              <span className="text-sm text-[var(--text-secondary)]">Member since {formatDateOnly(session?.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Activity summary + security */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <StatsCard title="Total Interviews" value={summary?.totalInterviews ?? '—'} icon={Briefcase} subtitle="All sessions started" />
            <StatsCard title="Average Score" value={summary?.averageScore ?? '—'} icon={TrendingUp} subtitle="Across completed interviews" />
          </div>

          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-base font-bold text-[var(--text-primary)] mb-1 flex items-center gap-2">
              <Lock className="w-4 h-4 text-indigo-500" /> Change Password
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mb-5">
              Update the password used to sign in to your account.
            </p>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Current Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={pwSaving}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm theme-input border focus:outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 transition-all disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">New Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input
                      type={showPasswords ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      disabled={pwSaving}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm theme-input border focus:outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 transition-all disabled:opacity-60"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Confirm New Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input
                      type={showPasswords ? 'text' : 'password'}
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      disabled={pwSaving}
                      className="w-full pl-10 pr-11 py-2.5 rounded-xl text-sm theme-input border focus:outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 transition-all disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords((v) => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                      aria-label={showPasswords ? 'Hide passwords' : 'Show passwords'}
                    >
                      {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {pwError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {pwError}
                </div>
              )}
              {pwSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                  Password updated. Signing you out to sign back in with your new password…
                </div>
              )}

              <button
                type="submit"
                disabled={pwSaving}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-md shadow-indigo-500/20 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
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
