// Centralized API service for Candidate Mentor Discovery and Appointment Scheduling (Task 2)
// Backed by the real candidate API client (services/api.js's fetchCandidateApi).
//
// In accordance with MockAI safety and data integrity policies:
// - All calls pass through fetchCandidateApi, transmitting the candidate JWT token.
// - No fake responses or hardcoded fallback data are fabricated here.
// - If the backend endpoint does not exist or returns an error, the call rejects cleanly,
//   allowing the frontend UI to display authentic error/empty states.

import { fetchCandidateApi } from './api';

/**
 * Fetch list of mentors with optional search and specialization filters.
 * Endpoint: GET /candidate/mentors?search=...&specialization=...
 */
export async function getMentors(params = {}) {
  const searchParams = new URLSearchParams();
  if (params.search && params.search.trim()) {
    searchParams.append('search', params.search.trim());
  }
  if (params.specialization && params.specialization !== 'all') {
    searchParams.append('specialization', params.specialization);
  }
  if (params.page) {
    searchParams.append('page', params.page);
  }
  const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
  return fetchCandidateApi(`/mentors${query}`);
}

/**
 * Fetch detailed profile of a single mentor including upcoming availability.
 * Endpoint: GET /candidate/mentors/:id
 */
export async function getMentorById(mentorId) {
  if (!mentorId) throw new Error('Mentor ID is required');
  return fetchCandidateApi(`/mentors/${mentorId}`);
}

/**
 * Fetch availability slots for a mentor on a specific date.
 * Endpoint: GET /candidate/mentors/:id/availability?date=YYYY-MM-DD
 */
export async function getMentorAvailability(mentorId, date) {
  if (!mentorId) throw new Error('Mentor ID is required');
  const query = date ? `?date=${encodeURIComponent(date)}` : '';
  return fetchCandidateApi(`/mentors/${mentorId}/availability${query}`);
}

/**
 * Book an interview session / appointment with a mentor.
 * Endpoint: POST /candidate/appointments
 * Payload: { mentor_id, slot_id, date, start_time, notes }
 */
export async function bookAppointment(payload) {
  if (!payload.mentor_id) throw new Error('Mentor ID is required');
  if (!payload.date) throw new Error('Appointment date is required');
  if (!payload.start_time) throw new Error('Time slot is required');

  return fetchCandidateApi('/appointments', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Fetch candidate's scheduled and past mentor appointments.
 * Endpoint: GET /candidate/appointments
 */
export async function getMyAppointments() {
  return fetchCandidateApi('/appointments');
}

/**
 * Cancel a scheduled appointment.
 * Endpoint: DELETE /candidate/appointments/:id
 */
export async function cancelAppointment(appointmentId, reason = '') {
  if (!appointmentId) throw new Error('Appointment ID is required');
  return fetchCandidateApi(`/appointments/${appointmentId}`, {
    method: 'DELETE',
    body: JSON.stringify({ reason }),
  });
}
