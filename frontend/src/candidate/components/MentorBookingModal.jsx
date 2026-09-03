import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { bookAppointment } from '../services/mentorApi';

const MentorBookingModal = ({ mentor, isOpen, onClose, onSuccess }) => {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [sessionNotes, setSessionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(null);

  // Initialize dates and slots when mentor changes
  useEffect(() => {
    if (mentor) {
      setErrorMsg('');
      setBookingSuccess(null);
      setSessionNotes('');
      setSelectedSlot(null);

      // Default date to first slot date or today if available
      const slots = mentor.available_slots || [];
      if (slots.length > 0) {
        setSelectedDate(slots[0].date);
      } else {
        // Default to tomorrow's date string YYYY-MM-DD
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setSelectedDate(tomorrow.toISOString().split('T')[0]);
      }
    }
  }, [mentor, isOpen]);

  if (!isOpen || !mentor) return null;

  // Filter slots for selected date
  const availableSlots = (mentor.available_slots || []).filter(
    (slot) => !selectedDate || slot.date === selectedDate
  );

  const handleSubmitBooking = async (e) => {
    e.preventDefault();
    if (isSubmitting) return; // Prevent double submission

    if (!selectedDate) {
      setErrorMsg('Please select an appointment date.');
      return;
    }

    if (!selectedSlot) {
      setErrorMsg('Please select an available time slot.');
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);

    try {
      const payload = {
        mentor_id: mentor.id || mentor._id,
        slot_id: selectedSlot.id,
        date: selectedDate,
        start_time: selectedSlot.start_time,
        end_time: selectedSlot.end_time || '',
        notes: sessionNotes.trim(),
      };

      const result = await bookAppointment(payload);
      setBookingSuccess(result || {
        mentor_name: mentor.name,
        date: selectedDate,
        start_time: selectedSlot.start_time,
        status: 'confirmed',
      });
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Failed to book appointment:', err);
      // Give clear, informative error (e.g. endpoint not found on backend or slot unavailable)
      if (err.status === 404 || err.message?.includes('404') || err.message?.includes('Not Found')) {
        setErrorMsg('Mentor scheduling API (/candidate/appointments) is currently not mounted on the backend. No fake booking was generated.');
      } else {
        setErrorMsg(err.message || 'Unable to schedule session. Please try another time slot.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
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
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm"
              style={{
                background: 'rgba(255, 107, 53, 0.12)',
                color: 'var(--c-accent, #FF6B35)',
                border: '1px solid rgba(255, 107, 53, 0.25)',
              }}
            >
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {bookingSuccess ? 'Session Confirmed' : 'Schedule Mentorship Session'}
              </h3>
              <p className="text-xs" style={{ color: 'var(--c-text-secondary, #A3A3A3)' }}>
                {mentor.name} • {mentor.title || 'Technical Mentor'}
              </p>
            </div>
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
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {bookingSuccess ? (
            /* Booking Confirmation Screen */
            <div className="text-center py-4 space-y-4">
              <div
                className="w-14 h-14 rounded-full mx-auto flex items-center justify-center"
                style={{
                  background: 'rgba(34, 197, 94, 0.15)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  color: '#22C55E',
                }}
              >
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h4 className="text-lg font-bold text-white">Interview Session Booked</h4>
                <p className="text-xs" style={{ color: 'var(--c-text-secondary, #A3A3A3)' }}>
                  Your appointment request has been scheduled with {mentor.name}.
                </p>
              </div>

              <div
                className="p-4 rounded-xl border text-left space-y-2 text-xs font-mono"
                style={{
                  background: '#141414',
                  borderColor: 'var(--c-border, #2A2A2A)',
                }}
              >
                <div className="flex justify-between">
                  <span className="text-neutral-400">Mentor:</span>
                  <span className="text-white font-semibold">{mentor.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Date:</span>
                  <span className="text-white font-semibold">{selectedDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Time Slot:</span>
                  <span className="text-[#FF9F1C] font-semibold">{selectedSlot?.start_time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Status:</span>
                  <span className="text-[#22C55E] font-semibold uppercase">Confirmed</span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="c-btn c-btn-primary w-full py-2.5 text-xs font-bold rounded-lg shadow-md"
              >
                Done
              </button>
            </div>
          ) : (
            /* Booking Form */
            <form onSubmit={handleSubmitBooking} className="space-y-4">
              {errorMsg && (
                <div
                  className="p-3.5 rounded-xl border text-xs flex items-start gap-2.5"
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    borderColor: 'rgba(239, 68, 68, 0.3)',
                    color: '#F87171',
                  }}
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{errorMsg}</span>
                </div>
              )}

              {/* Mentor Summary Card */}
              <div
                className="p-3.5 rounded-xl border flex items-center gap-3"
                style={{
                  background: '#141414',
                  borderColor: 'var(--c-border, #2A2A2A)',
                }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border"
                  style={{
                    background: '#202020',
                    color: 'var(--c-accent, #FF6B35)',
                    borderColor: 'var(--c-border, #2A2A2A)',
                  }}
                >
                  {mentor.name?.charAt(0) || 'M'}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-white truncate">{mentor.name}</h4>
                  <p className="text-xs text-neutral-400 truncate">
                    {mentor.title} {mentor.company ? `• ${mentor.company}` : ''}
                  </p>
                </div>
                <div
                  className="text-[10px] font-mono px-2 py-0.5 rounded-full border uppercase"
                  style={{
                    background: 'rgba(34, 197, 94, 0.1)',
                    borderColor: 'rgba(34, 197, 94, 0.25)',
                    color: '#22C55E',
                  }}
                >
                  {mentor.availability_status || 'Available'}
                </div>
              </div>

              {/* Step 1: Select Date */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300">
                  Select Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      setSelectedSlot(null);
                    }}
                    min={new Date().toISOString().split('T')[0]}
                    className="c-input w-full px-3 py-2 rounded-lg text-xs"
                    required
                  />
                </div>
              </div>

              {/* Step 2: Select Time Slot */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300">
                    Available Time Slots
                  </label>
                  <span className="text-[10px] text-neutral-400">
                    {availableSlots.length > 0
                      ? `${availableSlots.length} available`
                      : 'Slots generated on demand'}
                  </span>
                </div>

                {availableSlots.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {availableSlots.map((slot) => {
                      const isSelected = selectedSlot?.id === slot.id;
                      const isBooked = slot.is_booked;

                      return (
                        <button
                          key={slot.id}
                          type="button"
                          disabled={isBooked}
                          onClick={() => setSelectedSlot(slot)}
                          className={`py-2 px-3 rounded-lg text-xs font-mono font-semibold border transition-all flex items-center justify-center gap-1 ${
                            isBooked
                              ? 'opacity-40 cursor-not-allowed border-neutral-800 bg-neutral-900 text-neutral-500'
                              : isSelected
                              ? 'border-[#FF6B35] bg-[#FF6B35]/20 text-[#FF6B35] shadow-sm'
                              : 'border-neutral-800 bg-[#141414] text-neutral-300 hover:border-neutral-700'
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          <span>{slot.start_time}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  /* Standard fallback slots if mentor has general availability */
                  <div className="grid grid-cols-3 gap-2">
                    {['10:00 AM', '02:00 PM', '04:30 PM', '06:00 PM'].map((timeStr, idx) => {
                      const slotObj = { id: `slot-${idx}`, start_time: timeStr };
                      const isSelected = selectedSlot?.start_time === timeStr;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedSlot(slotObj)}
                          className={`py-2 px-3 rounded-lg text-xs font-mono font-semibold border transition-all flex items-center justify-center gap-1 ${
                            isSelected
                              ? 'border-[#FF6B35] bg-[#FF6B35]/20 text-[#FF6B35] shadow-sm'
                              : 'border-neutral-800 bg-[#141414] text-neutral-300 hover:border-neutral-700'
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          <span>{timeStr}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Step 3: Session Notes / Preparation Topics */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300">
                  Session Focus & Questions (Optional)
                </label>
                <textarea
                  rows={3}
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  placeholder="e.g. Distributed system design review, behavioral mock preparation, or system scaling feedback..."
                  className="c-input w-full p-3 rounded-lg text-xs resize-none"
                />
              </div>

              {/* Policy Note */}
              <div className="flex items-center gap-2 text-[11px] text-neutral-400 pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#FF9F1C] flex-shrink-0" />
                <span>Sessions include live 1-on-1 audio/video and structured rubric feedback.</span>
              </div>

              {/* Action Buttons */}
              <div
                className="pt-4 border-t flex items-center justify-end gap-3"
                style={{ borderColor: 'var(--c-border, #2A2A2A)' }}
              >
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedSlot}
                  className="c-btn c-btn-primary px-5 py-2 text-xs font-bold rounded-lg flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isSubmitting ? 'Scheduling...' : 'Confirm Appointment'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default MentorBookingModal;
