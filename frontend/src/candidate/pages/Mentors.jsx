import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Users,
  Calendar,
  Clock,
  Star,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  ChevronRight,
  Filter,
  X,
  RefreshCw,
  Plus,
  ArrowRight,
  CalendarCheck2,
  CalendarX2,
} from 'lucide-react';
import CandidateLayout from '../layouts/CandidateLayout';
import CandidateEmptyState from '../components/CandidateEmptyState';
import MentorBookingModal from '../components/MentorBookingModal';
import MentorProfileModal from '../components/MentorProfileModal';
import { getMentors, getMyAppointments, cancelAppointment } from '../services/mentorApi';
import { formatDate } from '../../utils/dateFormat';

const SPECIALIZATIONS = [
  'All Domains',
  'Distributed Systems',
  'Frontend Architecture',
  'AI & Machine Learning',
  'System Design',
  'Data Analytics & SQL',
  'Behavioral & Leadership',
];

const Mentors = () => {
  // Tabs: 'browse' | 'appointments'
  const [activeTab, setActiveTab] = useState('browse');

  // Mentors state
  const [mentors, setMentors] = useState([]);
  const [loadingMentors, setLoadingMentors] = useState(true);
  const [mentorError, setMentorError] = useState(null);

  // Appointments state
  const [appointments, setAppointments] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [appointmentError, setAppointmentError] = useState(null);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialization, setSelectedSpecialization] = useState('All Domains');
  const [appointmentFilter, setAppointmentFilter] = useState('upcoming'); // 'all' | 'upcoming' | 'past'

  // Modals state
  const [selectedMentorForProfile, setSelectedMentorForProfile] = useState(null);
  const [selectedMentorForBooking, setSelectedMentorForBooking] = useState(null);
  const [cancellingAppointment, setCancellingAppointment] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');

  // Toast notifications
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch Mentors
  const loadMentors = async () => {
    setLoadingMentors(true);
    setMentorError(null);
    try {
      const data = await getMentors({
        search: searchQuery,
        specialization: selectedSpecialization !== 'All Domains' ? selectedSpecialization : undefined,
      });
      setMentors(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('[Mentors] Could not load mentors from backend:', err);
      // In accordance with instructions: real error reported clearly when backend endpoint does not exist
      if (err.status === 404 || err.message?.includes('404') || err.message?.includes('Not Found')) {
        setMentorError('The mentor service endpoint (/candidate/mentors) is not yet mounted on the backend. No fake mentor profiles were fabricated.');
      } else {
        setMentorError(err.message || 'Failed to load mentors. Please check network connection.');
      }
      setMentors([]);
    } finally {
      setLoadingMentors(false);
    }
  };

  // Fetch Appointments
  const loadAppointments = async () => {
    setLoadingAppointments(true);
    setAppointmentError(null);
    try {
      const data = await getMyAppointments();
      setAppointments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('[Mentors] Could not load appointments from backend:', err);
      if (err.status === 404 || err.message?.includes('404') || err.message?.includes('Not Found')) {
        setAppointmentError('The appointment service endpoint (/candidate/appointments) is not yet mounted on the backend.');
      } else {
        setAppointmentError(err.message || 'Failed to load appointments.');
      }
      setAppointments([]);
    } finally {
      setLoadingAppointments(false);
    }
  };

  useEffect(() => {
    loadMentors();
  }, [selectedSpecialization]);

  useEffect(() => {
    if (activeTab === 'appointments') {
      loadAppointments();
    }
  }, [activeTab]);

  // Client-side search filtering across name, title, bio, and specialization
  const filteredMentors = useMemo(() => {
    if (!searchQuery.trim()) return mentors;
    const q = searchQuery.toLowerCase().trim();
    return mentors.filter((m) => {
      const matchName = (m.name || '').toLowerCase().includes(q);
      const matchTitle = (m.title || '').toLowerCase().includes(q);
      const matchCompany = (m.company || '').toLowerCase().includes(q);
      const matchBio = (m.bio || '').toLowerCase().includes(q);
      const matchSpec = (m.specialization || []).some((s) => s.toLowerCase().includes(q));
      return matchName || matchTitle || matchCompany || matchBio || matchSpec;
    });
  }, [mentors, searchQuery]);

  // Appointments filtering
  const filteredAppointments = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return appointments.filter((apt) => {
      if (appointmentFilter === 'all') return true;
      const isPast = (apt.date < todayStr) || apt.status === 'completed' || apt.status === 'cancelled';
      if (appointmentFilter === 'upcoming') return !isPast;
      if (appointmentFilter === 'past') return isPast;
      return true;
    });
  }, [appointments, appointmentFilter]);

  // Handle Cancel Appointment
  const handleConfirmCancel = async () => {
    if (!cancellingAppointment) return;
    setIsCancelling(true);
    setCancelError('');

    try {
      await cancelAppointment(cancellingAppointment.id || cancellingAppointment._id);
      showToast('Appointment cancelled successfully.', 'info');
      setCancellingAppointment(null);
      loadAppointments();
    } catch (err) {
      setCancelError(err.message || 'Failed to cancel appointment.');
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <CandidateLayout>
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border text-xs font-semibold backdrop-blur-md transition-all ${
            toast.type === 'error'
              ? 'bg-rose-950/90 text-rose-200 border-rose-500/40'
              : 'bg-[#181818] text-white border-[#FF6B35]/40 shadow-black/60'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-[#FF6B35]" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="c-eyebrow" style={{ color: 'var(--c-accent, #FF6B35)' }}>
              1-on-1 Guidance
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-1">
              Technical Mentors & Coaching
            </h1>
            <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--c-text-secondary, #A3A3A3)' }}>
              Schedule live mock interview practice and technical deep-dives with verified senior engineers.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (activeTab === 'browse') loadMentors();
              else loadAppointments();
            }}
            disabled={loadingMentors || loadingAppointments}
            className="self-start sm:self-auto p-2 rounded-lg border text-xs font-semibold text-neutral-300 hover:text-white flex items-center gap-1.5 transition-colors"
            style={{
              background: 'var(--c-surface, #181818)',
              borderColor: 'var(--c-border, #2A2A2A)',
            }}
            title="Refresh"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loadingMentors || loadingAppointments ? 'animate-spin text-[#FF6B35]' : ''}`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* Tab Switcher */}
        <div
          className="flex items-center gap-2 border-b pb-2"
          style={{ borderColor: 'var(--c-border, #2A2A2A)' }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('browse')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'browse'
                ? 'bg-[#FF6B35]/15 text-[#FF6B35] border border-[#FF6B35]/30'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/40'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Discover Mentors</span>
            {mentors.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-neutral-800 text-neutral-300">
                {mentors.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('appointments')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'appointments'
                ? 'bg-[#FF6B35]/15 text-[#FF6B35] border border-[#FF6B35]/30'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/40'
            }`}
          >
            <CalendarCheck2 className="w-3.5 h-3.5" />
            <span>My Bookings</span>
            {appointments.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-neutral-800 text-neutral-300">
                {appointments.length}
              </span>
            )}
          </button>
        </div>

        {/* ===================================================================
            TAB 1: DISCOVER MENTORS
           =================================================================== */}
        {activeTab === 'browse' && (
          <div className="space-y-5">
            {/* Search and Specialization Filter Bar */}
            <div
              className="p-4 rounded-xl border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3"
              style={{
                background: 'var(--c-surface, #181818)',
                borderColor: 'var(--c-border, #2A2A2A)',
              }}
            >
              {/* Search Bar */}
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search mentors by name, company, or technical topic..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="c-input w-full pl-9 pr-8 py-2 rounded-lg text-xs"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Specialization Filter Dropdown */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedSpecialization}
                  onChange={(e) => setSelectedSpecialization(e.target.value)}
                  className="c-input px-3 py-2 rounded-lg text-xs font-medium cursor-pointer"
                >
                  {SPECIALIZATIONS.map((spec) => (
                    <option key={spec} value={spec}>
                      {spec}
                    </option>
                  ))}
                </select>

                {(searchQuery || selectedSpecialization !== 'All Domains') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedSpecialization('All Domains');
                    }}
                    className="p-2 rounded-lg text-neutral-400 hover:text-white border text-xs"
                    style={{ borderColor: 'var(--c-border, #2A2A2A)' }}
                    title="Reset Filters"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Error State Banner */}
            {mentorError && (
              <div
                className="p-4 rounded-xl border flex items-start justify-between gap-3 text-xs"
                style={{
                  background: 'rgba(239, 68, 68, 0.08)',
                  borderColor: 'rgba(239, 68, 68, 0.25)',
                  color: '#F87171',
                }}
              >
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Backend Connection Notice: </span>
                    <span>{mentorError}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={loadMentors}
                  className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold transition-colors flex-shrink-0"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Loading Skeletons */}
            {loadingMentors ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="h-56 rounded-xl animate-pulse border"
                    style={{
                      background: 'rgba(32, 32, 32, 0.5)',
                      borderColor: 'var(--c-border, #2A2A2A)',
                    }}
                  />
                ))}
              </div>
            ) : filteredMentors.length === 0 ? (
              /* Empty State */
              <CandidateEmptyState
                icon={Users}
                title={
                  mentorError
                    ? 'Mentor Service Pending Backend Deployment'
                    : searchQuery || selectedSpecialization !== 'All Domains'
                    ? 'No Mentors Match Your Search'
                    : 'No Verified Mentors Available'
                }
                description={
                  mentorError
                    ? 'The frontend is fully configured and ready for the mentor scheduling endpoints. Once deployed to FastAPI, live mentor profiles will display here automatically.'
                    : searchQuery || selectedSpecialization !== 'All Domains'
                    ? 'Try adjusting your search criteria or resetting filters to see all available engineering mentors.'
                    : 'Verified engineering mentors will be listed here with upcoming available mock interview slots.'
                }
                actionLabel={
                  searchQuery || selectedSpecialization !== 'All Domains' ? 'Clear Filters' : undefined
                }
                onAction={
                  searchQuery || selectedSpecialization !== 'All Domains'
                    ? () => {
                        setSearchQuery('');
                        setSelectedSpecialization('All Domains');
                      }
                    : undefined
                }
              />
            ) : (
              /* Mentors Grid */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMentors.map((mentor) => (
                  <div
                    key={mentor.id || mentor._id}
                    className="rounded-xl border p-5 flex flex-col justify-between space-y-4 transition-all hover:border-[#FF6B35]/40"
                    style={{
                      background: 'var(--c-surface, #181818)',
                      borderColor: 'var(--c-border, #2A2A2A)',
                    }}
                  >
                    <div className="space-y-3">
                      {/* Identity Card Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm border flex-shrink-0"
                            style={{
                              background: '#202020',
                              color: 'var(--c-accent, #FF6B35)',
                              borderColor: 'var(--c-border, #2A2A2A)',
                            }}
                          >
                            {mentor.name?.charAt(0) || 'M'}
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-white leading-tight">
                              {mentor.name}
                            </h3>
                            <p className="text-xs text-neutral-400 truncate mt-0.5">
                              {mentor.title} {mentor.company ? `• ${mentor.company}` : ''}
                            </p>
                          </div>
                        </div>

                        <span
                          className="text-[10px] font-mono px-2 py-0.5 rounded-full border uppercase"
                          style={{
                            background: 'rgba(34, 197, 94, 0.1)',
                            borderColor: 'rgba(34, 197, 94, 0.25)',
                            color: '#22C55E',
                          }}
                        >
                          {mentor.availability_status || 'Available'}
                        </span>
                      </div>

                      {/* Bio */}
                      <p
                        className="text-xs leading-relaxed line-clamp-2"
                        style={{ color: 'var(--c-text-secondary, #A3A3A3)' }}
                      >
                        {mentor.bio ||
                          'Senior software engineer specializing in algorithmic reasoning, distributed systems architecture, and technical interview preparation.'}
                      </p>

                      {/* Expertise Badges */}
                      {mentor.specialization && mentor.specialization.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {mentor.specialization.slice(0, 3).map((spec, i) => (
                            <span
                              key={i}
                              className="text-[10px] px-2 py-0.5 rounded border font-mono"
                              style={{
                                background: '#141414',
                                borderColor: 'var(--c-border, #2A2A2A)',
                                color: 'var(--c-accent, #FF6B35)',
                              }}
                            >
                              #{spec}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Card Actions */}
                    <div
                      className="pt-3 border-t flex items-center justify-between gap-2"
                      style={{ borderColor: 'var(--c-border, #2A2A2A)' }}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedMentorForProfile(mentor)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-neutral-300 hover:text-white border transition-colors"
                        style={{ borderColor: 'var(--c-border, #2A2A2A)' }}
                      >
                        View Profile
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedMentorForBooking(mentor)}
                        className="c-btn c-btn-primary px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Book Session</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===================================================================
            TAB 2: MY APPOINTMENTS / SESSIONS
           =================================================================== */}
        {activeTab === 'appointments' && (
          <div className="space-y-5">
            {/* Filter Bar */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                {['upcoming', 'past', 'all'].map((filterVal) => (
                  <button
                    key={filterVal}
                    type="button"
                    onClick={() => setAppointmentFilter(filterVal)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize border transition-all ${
                      appointmentFilter === filterVal
                        ? 'border-[#FF6B35] bg-[#FF6B35]/15 text-[#FF6B35]'
                        : 'border-neutral-800 bg-[#141414] text-neutral-400 hover:text-white'
                    }`}
                  >
                    {filterVal} Sessions
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('browse')}
                className="c-btn c-btn-primary px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Book New Session</span>
              </button>
            </div>

            {/* Error State Banner */}
            {appointmentError && (
              <div
                className="p-4 rounded-xl border flex items-start justify-between gap-3 text-xs"
                style={{
                  background: 'rgba(239, 68, 68, 0.08)',
                  borderColor: 'rgba(239, 68, 68, 0.25)',
                  color: '#F87171',
                }}
              >
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Appointments Notice: </span>
                    <span>{appointmentError}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={loadAppointments}
                  className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold transition-colors flex-shrink-0"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Loading */}
            {loadingAppointments ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-24 rounded-xl animate-pulse border"
                    style={{
                      background: 'rgba(32, 32, 32, 0.5)',
                      borderColor: 'var(--c-border, #2A2A2A)',
                    }}
                  />
                ))}
              </div>
            ) : filteredAppointments.length === 0 ? (
              /* Empty State */
              <CandidateEmptyState
                icon={CalendarCheck2}
                title={
                  appointmentError
                    ? 'Appointment Ledger Awaiting Backend Deployment'
                    : `No ${appointmentFilter !== 'all' ? appointmentFilter : ''} Mentorship Sessions`
                }
                description={
                  appointmentError
                    ? 'When the /candidate/appointments endpoint is mounted, all upcoming and past booked coaching sessions will appear in this ledger.'
                    : 'You do not have any sessions scheduled yet. Discover a technical mentor to book a 1-on-1 interview practice session.'
                }
                actionLabel="Find a Mentor"
                onAction={() => setActiveTab('browse')}
              />
            ) : (
              /* Appointments Ledger */
              <div className="space-y-3">
                {filteredAppointments.map((apt) => {
                  const isCancelled = apt.status === 'cancelled';
                  const isCompleted = apt.status === 'completed';

                  return (
                    <div
                      key={apt.id || apt._id}
                      className="p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      style={{
                        background: 'var(--c-surface, #181818)',
                        borderColor: 'var(--c-border, #2A2A2A)',
                      }}
                    >
                      {/* Left: Mentor Info & Time */}
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border flex-shrink-0"
                          style={{
                            background: '#202020',
                            color: 'var(--c-accent, #FF6B35)',
                            borderColor: 'var(--c-border, #2A2A2A)',
                          }}
                        >
                          {apt.mentor_name?.charAt(0) || 'M'}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">{apt.mentor_name}</h4>
                          <p className="text-xs text-neutral-400">{apt.mentor_title || 'Technical Mentor'}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs font-mono">
                            <span className="flex items-center gap-1 text-[#FF9F1C]">
                              <Calendar className="w-3.5 h-3.5" /> {apt.date}
                            </span>
                            <span className="flex items-center gap-1 text-neutral-300">
                              <Clock className="w-3.5 h-3.5" /> {apt.start_time}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Status & Actions */}
                      <div className="flex items-center gap-3 self-end sm:self-auto">
                        <span
                          className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full border uppercase ${
                            isCancelled
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                              : isCompleted
                              ? 'bg-neutral-800 text-neutral-400 border-neutral-700'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          }`}
                        >
                          {apt.status || 'Confirmed'}
                        </span>

                        {!isCancelled && !isCompleted && (
                          <button
                            type="button"
                            onClick={() => setCancellingAppointment(apt)}
                            className="px-3 py-1 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 border border-rose-500/30 rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Booking Modal */}
      <MentorBookingModal
        mentor={selectedMentorForBooking}
        isOpen={Boolean(selectedMentorForBooking)}
        onClose={() => setSelectedMentorForBooking(null)}
        onSuccess={() => {
          showToast('Appointment booked successfully!');
          loadAppointments();
        }}
      />

      {/* Profile Modal */}
      <MentorProfileModal
        mentor={selectedMentorForProfile}
        isOpen={Boolean(selectedMentorForProfile)}
        onClose={() => setSelectedMentorForProfile(null)}
        onBook={(mentor) => {
          setSelectedMentorForProfile(null);
          setSelectedMentorForBooking(mentor);
        }}
      />

      {/* Cancel Confirmation Dialog */}
      {cancellingAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div
            className="w-full max-w-sm rounded-2xl border p-6 shadow-2xl space-y-4"
            style={{
              background: 'var(--c-surface, #181818)',
              borderColor: 'var(--c-border, #2A2A2A)',
            }}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-500 mx-auto">
              <CalendarX2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold text-white">Cancel Appointment?</h3>
              <p className="text-xs text-neutral-400">
                Are you sure you want to cancel your session with {cancellingAppointment.mentor_name} on {cancellingAppointment.date} at {cancellingAppointment.start_time}?
              </p>
            </div>

            {cancelError && (
              <p className="text-xs text-rose-400 text-center font-medium">{cancelError}</p>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCancellingAppointment(null)}
                disabled={isCancelling}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-neutral-400 hover:text-white"
              >
                Keep Session
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={isCancelling}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-colors"
              >
                {isCancelling ? 'Cancelling...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </CandidateLayout>
  );
};

export default Mentors;
