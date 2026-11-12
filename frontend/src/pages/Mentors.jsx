import React, { useEffect, useState } from 'react';
import { UserPlus, Pencil, Trash2, X, CalendarPlus, AlertCircle, CheckCircle2, Link2, Calendar } from 'lucide-react';
import { fetchWithAuth } from '../api';
import EmptyState from '../components/EmptyState';
import { TableSkeleton } from '../components/Skeleton';

// Objective 6 - administrators manage mentors, their available time slots and
// meeting links, and see every booking.
const EMPTY_FORM = {
  name: '', title: '', company: '', email: '', meeting_link: '', bio: '',
  specialization: '', experience_years: 0, hourly_rate: '', is_active: true,
};

const Mentors = () => {
  const [mentors, setMentors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState(null); // null | { ...fields, id? }
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [slotFor, setSlotFor] = useState(null);
  const [slot, setSlot] = useState({ date: '', start_time: '10:00 AM', end_time: '11:00 AM' });
  const [slotError, setSlotError] = useState('');
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = () => {
    setLoading(true);
    Promise.all([fetchWithAuth('/mentors'), fetchWithAuth('/appointments').catch(() => [])])
      .then(([m, a]) => { setMentors(m || []); setAppointments(a || []); })
      .catch(() => setLoadError('Failed to load mentors. Please try again.'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const replaceMentor = (updated) => setMentors((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));

  const openNew = () => { setForm({ ...EMPTY_FORM }); setFormError(''); };
  const openEdit = (m) => {
    setForm({ ...m, specialization: (m.specialization || []).join(', ') });
    setFormError('');
  };

  const saveMentor = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.name.trim()) { setFormError('Name is required.'); return; }
    const payload = {
      name: form.name, title: form.title, company: form.company, email: form.email,
      meeting_link: form.meeting_link, bio: form.bio,
      specialization: form.specialization.split(',').map((s) => s.trim()).filter(Boolean),
      experience_years: parseInt(form.experience_years, 10) || 0,
      hourly_rate: form.hourly_rate, is_active: !!form.is_active,
    };
    setSaving(true);
    try {
      if (form.id) {
        replaceMentor(await fetchWithAuth(`/mentors/${form.id}`, { method: 'PUT', body: JSON.stringify(payload) }));
        showToast('Mentor updated');
      } else {
        const created = await fetchWithAuth('/mentors', { method: 'POST', body: JSON.stringify(payload) });
        setMentors((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
        showToast('Mentor added');
      }
      setForm(null);
    } catch (err) {
      setFormError(err.message || 'Could not save the mentor.');
    } finally {
      setSaving(false);
    }
  };

  const deleteMentor = async (m) => {
    if (!window.confirm(`Delete ${m.name}? Mentors with upcoming bookings can only be deactivated.`)) return;
    try {
      await fetchWithAuth(`/mentors/${m.id}`, { method: 'DELETE' });
      setMentors((prev) => prev.filter((x) => x.id !== m.id));
      showToast('Mentor deleted');
    } catch (err) {
      showToast(err.message || 'Could not delete the mentor', 'error');
    }
  };

  const addSlot = async (e) => {
    e.preventDefault();
    setSlotError('');
    try {
      replaceMentor(await fetchWithAuth(`/mentors/${slotFor.id}/slots`, { method: 'POST', body: JSON.stringify(slot) }));
      showToast('Time slot added');
      setSlot((s) => ({ ...s, date: '' }));
    } catch (err) {
      setSlotError(err.message || 'Could not add the slot.');
    }
  };

  const removeSlot = async (m, s) => {
    try {
      replaceMentor(await fetchWithAuth(`/mentors/${m.id}/slots/${encodeURIComponent(s.id)}`, { method: 'DELETE' }));
      showToast('Time slot removed');
    } catch (err) {
      showToast(err.message || 'Could not remove the slot', 'error');
    }
  };

  const upcomingSlots = (m) => (m.available_slots || []).filter((s) => !s.is_past);
  const slotMentor = slotFor ? mentors.find((m) => m.id === slotFor.id) || slotFor : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Mentors</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">Add mentors, publish their available times and meeting links, and see bookings.</p>
        </div>
        <button onClick={openNew} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold">
          <UserPlus className="w-4 h-4" /> Add mentor
        </button>
      </div>

      {loading ? (
        <TableSkeleton rows={4} />
      ) : loadError ? (
        <p className="text-sm text-rose-400">{loadError}</p>
      ) : mentors.length === 0 ? (
        <EmptyState title="No mentors yet" description="Add a mentor so candidates can book coaching sessions." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {mentors.map((m) => (
            <div key={m.id} className="glass-card p-5 rounded-2xl space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-[var(--text-primary)] truncate">
                    {m.name}
                    {!m.is_active && <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-slate-500/20 text-[var(--text-muted)]">Inactive</span>}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] truncate">{[m.title, m.company].filter(Boolean).join(' · ')}</p>
                  <p className="text-[11px] text-[var(--text-muted)] mt-1">{(m.specialization || []).join(', ')}</p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => openEdit(m)} className="p-2 rounded-xl border border-[var(--border-card)] text-[var(--text-secondary)] hover:text-orange-500" title="Edit mentor" aria-label={`Edit ${m.name}`}>
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteMentor(m)} className="p-2 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/10" title="Delete mentor" aria-label={`Delete ${m.name}`}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 shrink-0" />
                {m.meeting_link ? <span className="truncate">{m.meeting_link}</span> : <span className="text-amber-500">No meeting link set</span>}
              </p>
              <div>
                <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Upcoming time slots</p>
                {upcomingSlots(m).length === 0 ? (
                  <p className="text-xs text-amber-500">No upcoming slots, so candidates cannot book this mentor.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {upcomingSlots(m).map((s) => (
                      <span key={s.id} className={`inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg border ${s.is_booked ? 'border-emerald-500/40 text-emerald-500' : 'border-[var(--border-card)] text-[var(--text-secondary)]'}`}>
                        {s.date} {s.start_time}{s.is_booked ? ' · booked' : ''}
                        {!s.is_booked && (
                          <button onClick={() => removeSlot(m, s)} className="hover:text-rose-400" aria-label={`Remove slot ${s.date} ${s.start_time}`}>
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={() => { setSlotFor(m); setSlotError(''); }} className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-500 hover:underline">
                <CalendarPlus className="w-3.5 h-3.5" /> Add time slot
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Bookings */}
      <div className="glass-card p-5 rounded-2xl">
        <h2 className="text-base font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2"><Calendar className="w-4 h-4 text-orange-500" /> Bookings</h2>
        {appointments.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)]">No sessions have been booked yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border-table)] text-[var(--text-muted)] uppercase tracking-wider">
                  <th className="py-2 pr-3">Date</th><th className="py-2 px-3">Time</th><th className="py-2 px-3">Candidate</th>
                  <th className="py-2 px-3">Mentor</th><th className="py-2 px-3">Status</th><th className="py-2 pl-3">E-mail notice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-table)]">
                {appointments.map((a) => (
                  <tr key={a.id}>
                    <td className="py-2 pr-3 font-mono text-[var(--text-primary)]">{a.date}</td>
                    <td className="py-2 px-3 text-[var(--text-secondary)]">{a.start_time}{a.end_time ? `-${a.end_time}` : ''}</td>
                    <td className="py-2 px-3 text-[var(--text-primary)]">{a.candidate}</td>
                    <td className="py-2 px-3 text-[var(--text-secondary)]">{a.mentor_name}</td>
                    <td className="py-2 px-3 capitalize text-[var(--text-secondary)]">{a.status}</td>
                    <td className="py-2 pl-3 text-[var(--text-muted)]">{a.notification || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / edit mentor */}
      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <form onSubmit={saveMentor} className="theme-modal p-6 rounded-3xl w-full max-w-lg border space-y-3 max-h-[90dvh] overflow-y-auto relative">
            <button type="button" onClick={() => setForm(null)} className="absolute top-4 right-4 p-1 text-[var(--text-muted)]" aria-label="Close"><X className="w-5 h-5" /></button>
            <h3 className="text-xl font-bold text-[var(--text-primary)]">{form.id ? 'Edit mentor' : 'Add mentor'}</h3>
            {[
              ['name', 'Full name'], ['title', 'Job title'], ['company', 'Company'], ['email', 'E-mail (for booking notices)'],
              ['meeting_link', 'Meeting link (https://...)'], ['specialization', 'Specialisations (comma separated)'], ['hourly_rate', 'Rate (e.g. Free, $50/hr)'],
            ].map(([key, label]) => (
              <label key={key} className="block space-y-1">
                <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">{label}</span>
                <input value={form[key] ?? ''} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="theme-input w-full px-3 py-2 rounded-xl text-sm border" />
              </label>
            ))}
            <label className="block space-y-1">
              <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Years of experience</span>
              <input type="number" min={0} max={60} value={form.experience_years} onChange={(e) => setForm({ ...form, experience_years: e.target.value })} className="theme-input w-full px-3 py-2 rounded-xl text-sm border" />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Bio</span>
              <textarea rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} className="theme-input w-full px-3 py-2 rounded-xl text-sm border" />
            </label>
            <label className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
              <input type="checkbox" checked={!!form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
              Active (shown to candidates)
            </label>
            {formError && <p className="text-xs text-rose-400">{formError}</p>}
            <button type="submit" disabled={saving} className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm">
              {saving ? 'Saving…' : 'Save mentor'}
            </button>
          </form>
        </div>
      )}

      {/* Add slot */}
      {slotMentor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <form onSubmit={addSlot} className="theme-modal p-6 rounded-3xl w-full max-w-sm border space-y-3 relative">
            <button type="button" onClick={() => setSlotFor(null)} className="absolute top-4 right-4 p-1 text-[var(--text-muted)]" aria-label="Close"><X className="w-5 h-5" /></button>
            <h3 className="text-lg font-bold text-[var(--text-primary)]">Add time slot</h3>
            <p className="text-xs text-[var(--text-muted)]">{slotMentor.name}</p>
            <label className="block space-y-1">
              <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Date</span>
              <input type="date" required value={slot.date} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setSlot({ ...slot, date: e.target.value })} className="theme-input w-full px-3 py-2 rounded-xl text-sm border" />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block space-y-1">
                <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Start</span>
                <input value={slot.start_time} onChange={(e) => setSlot({ ...slot, start_time: e.target.value })} placeholder="10:00 AM" className="theme-input w-full px-3 py-2 rounded-xl text-sm border" />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">End</span>
                <input value={slot.end_time} onChange={(e) => setSlot({ ...slot, end_time: e.target.value })} placeholder="11:00 AM" className="theme-input w-full px-3 py-2 rounded-xl text-sm border" />
              </label>
            </div>
            {slotError && <p className="text-xs text-rose-400">{slotError}</p>}
            <button type="submit" className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm">Add slot</button>
            <button type="button" onClick={() => setSlotFor(null)} className="w-full py-2 rounded-xl border border-[var(--border-card)] text-[var(--text-primary)] text-sm">Done</button>
          </form>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-5 right-5 px-5 py-3 rounded-2xl shadow-xl z-50 font-semibold text-sm flex items-center gap-2.5 ${toast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}`}>
          {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default Mentors;
