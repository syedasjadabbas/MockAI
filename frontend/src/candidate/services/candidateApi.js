// Candidate interview session data (FR06-FR10, FR27, FR31-FR32) - backed
// by the real FastAPI + MongoDB backend (backend/routes/candidate_interview.py),
// replacing the earlier localStorage mock for everything session/history
// related. All HTTP calls go through services/api.js's fetchCandidateApi -
// nothing here calls `fetch` directly.
//
// IMPORTANT - real data vs. placeholder evaluation, kept deliberately
// separate:
//   - Category, question, interview session, response, and history data
//     below is 100% real: it comes from MongoDB via the backend and is
//     never fabricated. score/confidence/stress/evaluation stay `null`
//     everywhere (history, dashboard, progress) until a real Evaluation
//     backend exists - this file never invents a number for them.
//   - The ONE exception is getInterviewById(), used only by the Results
//     and Feedback pages: when an interview has no real score yet (which
//     is currently always, since Evaluation isn't built), it overlays a
//     clearly-marked MOCK evaluation so those two pages keep working as a
//     preview of the eventual real UI. That overlay is generated
//     client-side, seeded by the interview's own id so it's stable across
//     repeated views, and is NEVER sent back to the backend or reflected
//     in history/dashboard/progress.

import { fetchCandidateApi } from './api';

function toFrontendQuestion(q) {
  // The interview snapshot stored server-side uses `question_id`; the
  // catalogue endpoint (list questions for a category) already returns
  // `id`. Normalizing both to `id` here means InterviewSimulator.jsx and
  // friends never need to know which shape they got.
  return {
    id: q.question_id || q.id,
    question_text: q.question_text,
    difficulty: q.difficulty,
    type: q.type,
    tags: q.tags || [],
  };
}

function toFrontendInterview(doc) {
  return {
    id: doc.id,
    role: doc.role,
    categoryId: doc.category_id,
    type: doc.type,
    status: doc.status,
    evaluationStatus: doc.evaluation_status,
    score: doc.score,
    confidence: doc.confidence,
    stress: doc.stress,
    createdAt: doc.created_at,
    completedAt: doc.completed_at,
    questions: (doc.questions || []).map(toFrontendQuestion),
    responses: doc.responses || [],
  };
}

// ---------------------------------------------------------------------------
// FR07 / FR08 - Interview goal & question selection (real Question Bank)
// ---------------------------------------------------------------------------

export async function getCategories() {
  return fetchCandidateApi('/categories');
}

export async function getQuestionsForCategory(categoryId, { limit } = {}) {
  const questions = await fetchCandidateApi(`/categories/${categoryId}/questions`);
  return limit ? questions.slice(0, limit) : questions;
}

// ---------------------------------------------------------------------------
// FR06 / FR09 / FR10 / FR32 / FR33 - Interview session lifecycle
// ---------------------------------------------------------------------------

export async function startInterview({ categoryId, interviewType }) {
  const doc = await fetchCandidateApi('/interviews', {
    method: 'POST',
    body: JSON.stringify({ category_id: categoryId, type: interviewType }),
  });
  return toFrontendInterview(doc);
}

export async function getActiveInterview(id) {
  try {
    const doc = await fetchCandidateApi(`/interviews/${id}`);
    return toFrontendInterview(doc);
  } catch {
    return null;
  }
}

// FR11/FR12/FR33 - metadata only (duration/size), never the recording
// itself. See backend/routes/candidate_interview.py's module docstring for
// the documented future media-upload integration point (the `media_url`
// field this returns, currently always null).
export async function submitResponse(interviewId, questionId, response) {
  const doc = await fetchCandidateApi(`/interviews/${interviewId}/responses`, {
    method: 'POST',
    body: JSON.stringify({
      question_id: questionId,
      duration_seconds: response.durationSeconds,
      size_bytes: response.sizeBytes,
    }),
  });
  return toFrontendInterview(doc);
}

// FR10 - ends the session. Returns the real, still-unevaluated interview
// (status "Completed", evaluationStatus "pending_evaluation", score/
// confidence/stress still null) - the mock evaluation overlay is applied
// later, only when Results/Feedback actually load the interview for
// display (see getInterviewById below), not here.
export async function endInterview(interviewId) {
  const doc = await fetchCandidateApi(`/interviews/${interviewId}/complete`, { method: 'POST' });
  return toFrontendInterview(doc);
}

// ---------------------------------------------------------------------------
// FR17-FR20 / FR21-FR23 / FR35 - Evaluation & feedback (PLACEHOLDER OVERLAY)
// ---------------------------------------------------------------------------

const STRENGTH_POOL = [
  'Clear, structured explanations that were easy to follow.',
  'Stayed calm and composed when the question got harder.',
  'Gave concrete examples instead of speaking in generalities.',
  'Good pacing — answers were neither rushed nor overly long.',
  'Demonstrated solid grasp of core fundamentals in this domain.',
];

const WEAKNESS_POOL = [
  'A few answers trailed off without a clear conclusion.',
  'Some technical terms were used without fully explaining them.',
  'Noticeable hesitation before answering follow-up-style questions.',
  'Could provide more specific, quantified examples from past experience.',
];

const SUGGESTION_POOL = [
  'Practice summarizing each answer in one closing sentence before moving on.',
  'When using a technical term, briefly define it as part of your answer.',
  'Prepare 2-3 concrete project examples in advance so they come out naturally.',
  'Try the STAR method (Situation, Task, Action, Result) for behavioral questions.',
];

// Small deterministic PRNG (mulberry32) seeded from the interview's own id,
// so the same interview always renders the same placeholder numbers across
// repeated views/refreshes instead of re-randomizing every load - a purely
// cosmetic consistency detail, not a claim of real, reproducible analysis.
function seededRandom(seedStr) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function next() {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

function seededPick(pool, n, rand) {
  const shuffled = [...pool].sort(() => rand() - 0.5);
  return shuffled.slice(0, n);
}

// PLACEHOLDER ONLY - replace with a real call to the multimodal evaluation
// service once FR13-FR16/FR34/FR15-19 (report numbering) are implemented.
// No audio/video is analyzed here; scores are structured, seeded mock data
// for frontend/demo purposes, applied only for display and never persisted.
function generateMockEvaluation(interview) {
  const rand = seededRandom(interview.id || 'seed');
  const overallScore = Math.floor(65 + rand() * 30); // 65-95
  const confidenceScore = Math.floor(55 + rand() * 40); // 55-95
  const stressPool = ['Low', 'Medium', 'High'];
  const stressLevel = stressPool[Math.floor(rand() * stressPool.length)];

  const perQuestion = (interview.questions || []).map((q) => ({
    questionId: q.id,
    questionText: q.question_text,
    score: Math.floor(55 + rand() * 40),
    note: 'Placeholder per-question note — populated by real evaluation once AI modules are integrated.',
  }));

  return {
    score: overallScore,
    confidence: confidenceScore,
    stress: stressLevel,
    strengths: seededPick(STRENGTH_POOL, 3, rand),
    weaknesses: seededPick(WEAKNESS_POOL, 2, rand),
    suggestions: seededPick(SUGGESTION_POOL, 3, rand),
    perQuestion,
  };
}

// ---------------------------------------------------------------------------
// FR24-FR27 / FR36 - Results, history, progress
// ---------------------------------------------------------------------------

// Used by EvaluationResults.jsx, Feedback.jsx, and InterviewCompletion.jsx.
// This is the ONLY function in this file that ever attaches placeholder
// evaluation data - see the file header and generateMockEvaluation() above.
export async function getInterviewById(id) {
  try {
    const doc = await fetchCandidateApi(`/interviews/${id}`);
    const interview = toFrontendInterview(doc);
    if (interview.score == null) {
      return { ...interview, ...generateMockEvaluation(interview) };
    }
    return interview;
  } catch {
    return null;
  }
}

// Real data only - used by History and Dashboard. score/confidence/stress
// stay null (honest "pending evaluation") until a real Evaluation backend
// sets them; no placeholder overlay is applied here.
export async function getHistory() {
  const list = await fetchCandidateApi('/interviews');
  return list.map(toFrontendInterview);
}

export async function getDashboardSummary() {
  const history = await getHistory();
  const completed = history.filter((i) => i.status === 'Completed');
  const scored = completed.filter((i) => i.score != null);
  const avgScore = scored.length
    ? Math.round(scored.reduce((sum, i) => sum + i.score, 0) / scored.length)
    : null;

  return {
    totalInterviews: history.length,
    completedInterviews: completed.length,
    averageScore: avgScore,
    lastInterview: history[0] || null,
    recent: history.slice(0, 5),
  };
}

// Only calculates trends from interviews that actually have a real score -
// currently none, since Evaluation doesn't exist yet, so these arrays stay
// empty and the existing "Not enough data yet" EmptyState in
// ProgressTracking.jsx handles it exactly as it already does for a
// brand-new candidate. This is the "clean API/data contract for future
// evaluation integration" - once real scores exist, this starts populating
// with zero changes needed in ProgressTracking.jsx itself.
export async function getProgress() {
  const history = await getHistory();
  const completed = history
    .filter((i) => i.status === 'Completed')
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const scored = completed.filter((i) => i.score != null);

  return {
    scoreTrend: scored.map((i) => ({ date: i.createdAt, score: i.score, label: i.role })),
    confidenceTrend: scored.map((i) => ({ date: i.createdAt, confidence: i.confidence, label: i.role })),
    byCategory: Object.values(
      scored.reduce((acc, i) => {
        acc[i.role] = acc[i.role] || { category: i.role, count: 0, avgScore: 0, totalScore: 0 };
        acc[i.role].count += 1;
        acc[i.role].totalScore += i.score;
        acc[i.role].avgScore = Math.round(acc[i.role].totalScore / acc[i.role].count);
        return acc;
      }, {})
    ),
  };
}
