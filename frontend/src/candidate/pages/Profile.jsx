import React, { useEffect, useState } from 'react';
import { User, Mail, Calendar, Edit2, Check, X, Briefcase, TrendingUp } from 'lucide-react';
import CandidateLayout from '../layouts/CandidateLayout';
import StatsCard from '../../components/StatsCard';
import { getSession, updateProfile } from '../services/candidateAuth';
import { getDashboardSummary } from '../services/candidateApi';
import { formatDateOnly } from '../../utils/dateFormat';

// FR04 - View User Profile, FR05 - Edit User Profile
const Profile = () => {
  const [session, setSession] = useState(getSession());
  const [summary, setSummary] = useState(null);
  const [editing, setEditing] = useState(false);
  const [nameValue, setNameValue] = useState(session?.name || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    getDashboardSummary().then(setSummary);
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

  return (
    <CandidateLayout>
      <div className="mb-6">
        <h2 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">Profile</h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">Your account details and interview activity summary.</p>
      </div>

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
                <button onClick={handleSave} disabled={saving} className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-sm transition-all">
                  <Check className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save'}
                </button>
                <button onClick={() => { setEditing(false); setNameValue(session.name); setError(''); }} className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-xl border border-[var(--border-card)] text-[var(--text-secondary)] font-semibold transition-all hover:bg-[var(--bg-card-hover)]">
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

        {/* Activity summary */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <StatsCard title="Total Interviews" value={summary?.totalInterviews ?? '—'} icon={Briefcase} subtitle="All sessions started" />
            <StatsCard title="Average Score" value={summary?.averageScore ?? '—'} icon={TrendingUp} subtitle="Across completed interviews" />
          </div>

          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-base font-bold text-[var(--text-primary)] mb-2">Account Security</h3>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Password changes and multi-factor account security will be available once the Candidate Panel is connected to the
              production authentication backend (JWT + bcrypt, matching the Admin Panel).
            </p>
          </div>
        </div>
      </div>
    </CandidateLayout>
  );
};

export default Profile;
