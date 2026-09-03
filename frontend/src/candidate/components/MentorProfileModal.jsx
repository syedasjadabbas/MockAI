import React from 'react';
import {
  X,
  User,
  Briefcase,
  Star,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  Layers,
  Award,
} from 'lucide-react';

const MentorProfileModal = ({ mentor, isOpen, onClose, onBook }) => {
  if (!isOpen || !mentor) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        style={{
          background: 'var(--c-surface, #181818)',
          borderColor: 'var(--c-border, #2A2A2A)',
        }}
      >
        {/* Header */}
        <div
          className="p-5 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--c-border, #2A2A2A)' }}
        >
          <div className="flex items-center gap-2">
            <span
              className="text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider"
              style={{
                background: 'rgba(255, 107, 53, 0.12)',
                color: 'var(--c-accent, #FF6B35)',
                border: '1px solid rgba(255, 107, 53, 0.25)',
              }}
            >
              Mentor Profile
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Identity Header */}
          <div className="flex items-start gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-xl border flex-shrink-0"
              style={{
                background: '#202020',
                color: 'var(--c-accent, #FF6B35)',
                borderColor: 'var(--c-border, #2A2A2A)',
              }}
            >
              {mentor.avatar ? (
                <img
                  src={mentor.avatar}
                  alt={mentor.name}
                  className="w-full h-full object-cover rounded-2xl"
                />
              ) : (
                mentor.name?.charAt(0) || 'M'
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="text-lg font-bold text-white leading-tight">{mentor.name}</h3>
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

              <p className="text-xs text-neutral-300 font-medium">
                {mentor.title} {mentor.company ? `• ${mentor.company}` : ''}
              </p>

              {mentor.experience_years && (
                <p className="text-xs text-neutral-400 mt-1">
                  {mentor.experience_years}+ years industry engineering experience
                </p>
              )}
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div
              className="p-3 rounded-xl border text-center"
              style={{ background: '#141414', borderColor: 'var(--c-border, #2A2A2A)' }}
            >
              <div className="text-[10px] text-neutral-400 uppercase font-mono">Rating</div>
              <div className="text-sm font-bold text-[#FF9F1C] flex items-center justify-center gap-1 mt-0.5">
                <Star className="w-3.5 h-3.5 fill-[#FF9F1C]" />
                <span>{mentor.rating || '5.0'}</span>
              </div>
            </div>

            <div
              className="p-3 rounded-xl border text-center"
              style={{ background: '#141414', borderColor: 'var(--c-border, #2A2A2A)' }}
            >
              <div className="text-[10px] text-neutral-400 uppercase font-mono">Completed</div>
              <div className="text-sm font-bold text-white mt-0.5">
                {mentor.sessions_completed || 0}+ Mocks
              </div>
            </div>

            <div
              className="p-3 rounded-xl border text-center"
              style={{ background: '#141414', borderColor: 'var(--c-border, #2A2A2A)' }}
            >
              <div className="text-[10px] text-neutral-400 uppercase font-mono">Format</div>
              <div className="text-sm font-bold text-[#22C55E] mt-0.5">1-on-1 Live</div>
            </div>
          </div>

          {/* About & Bio */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
              About the Mentor
            </h4>
            <div
              className="p-4 rounded-xl border text-xs leading-relaxed text-neutral-300 whitespace-pre-wrap"
              style={{ background: '#141414', borderColor: 'var(--c-border, #2A2A2A)' }}
            >
              {mentor.bio ||
                'Experienced senior technical engineer providing comprehensive interview guidance, system design mock sessions, and algorithmic code reviews.'}
            </div>
          </div>

          {/* Specialization / Expertise Tags */}
          {mentor.specialization && mentor.specialization.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                Core Domains & Expertise
              </h4>
              <div className="flex items-center gap-1.5 flex-wrap">
                {mentor.specialization.map((spec, i) => (
                  <span
                    key={i}
                    className="text-xs px-2.5 py-1 rounded-lg border font-mono"
                    style={{
                      background: 'rgba(255, 107, 53, 0.08)',
                      borderColor: 'rgba(255, 107, 53, 0.2)',
                      color: 'var(--c-accent, #FF6B35)',
                    }}
                  >
                    #{spec}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Available Slots Preview */}
          {mentor.available_slots && mentor.available_slots.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                Upcoming Open Slots
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {mentor.available_slots.slice(0, 6).map((slot) => (
                  <div
                    key={slot.id}
                    className="p-2 rounded-lg border text-center font-mono text-xs flex items-center justify-between"
                    style={{ background: '#141414', borderColor: 'var(--c-border, #2A2A2A)' }}
                  >
                    <span className="text-neutral-400">{slot.date}</span>
                    <span className="text-[#FF9F1C] font-semibold">{slot.start_time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          className="p-4 border-t flex items-center justify-between gap-3"
          style={{ borderColor: 'var(--c-border, #2A2A2A)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              if (onBook) onBook(mentor);
            }}
            className="c-btn c-btn-primary px-5 py-2 text-xs font-bold rounded-lg flex items-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            <span>Book Mentorship Session</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MentorProfileModal;
