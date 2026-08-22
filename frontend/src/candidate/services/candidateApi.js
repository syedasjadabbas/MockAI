// MOCK candidate data layer for interview setup/flow, evaluation, history,
// and progress (FR06-FR10, FR17-FR27, FR32-FR36).
//
// Every function here is async and returns data shaped exactly like the
// records the FastAPI backend already stores for interviews (see
// backend/routes/admin.py INTERVIEW_DETAIL_PROJECTION and
// backend/database.py interviews_collection: user_id, role, status, score,
// confidence, stress, transcript, created_at). During backend integration,
// each function body is replaced with a `fetchWithAuth`-style call to a new
// `/candidate/*` FastAPI route — callers do not change.
//
// IMPORTANT: generateMockEvaluation() below produces PLACEHOLDER scoring
// data only. It does not run any speech, text, or facial analysis. Real
// evaluation (FR13-FR16, FR34) is explicit future AI-integration work.

import { CATEGORIES, getCategoryById } from '../data/categories';
import { getSession } from './candidateAuth';

const INTERVIEWS_KEY = 'mockai_candidate_interviews';
const ACTIVE_INTERVIEW_KEY = 'mockai_candidate_active_interview';

const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

const currentUserId = () => getSession()?.id || 'guest';

function readInterviews() {
  try {
    return JSON.parse(localStorage.getItem(INTERVIEWS_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeInterviews(list) {
  localStorage.setItem(INTERVIEWS_KEY, JSON.stringify(list));
}

// ---------------------------------------------------------------------------
// FR07 / FR08 - Interview goal & question selection
// ---------------------------------------------------------------------------

export async function getCategories() {
  await delay(200);
  return CATEGORIES;
}

export async function getQuestionsForCategory(categoryId, { limit = 5 } = {}) {
  await delay(200);
  const category = getCategoryById(categoryId);
  if (!category) throw new Error('Category not found.');
  return category.questions.slice(0, limit);
}

// ---------------------------------------------------------------------------
// FR06 / FR09 / FR10 / FR32 / FR33 - Interview session lifecycle
// ---------------------------------------------------------------------------

export async function startInterview({ categoryId, interviewType }) {
  await delay(250);
  const category = getCategoryById(categoryId);
  if (!category) throw new Error('Category not found.');

  const interview = {
    id: `interview-${Date.now()}`,
    userId: currentUserId(),
    role: category.name,
    categoryId: category.id,
    type: interviewType || category.interviewType,
    status: 'In Progress',
    score: null,
    confidence: null,
    stress: null,
    transcript: [],
    questions: category.questions.slice(0, 5),
    responses: [],
    createdAt: new Date().toISOString(),
  };

  localStorage.setItem(ACTIVE_INTERVIEW_KEY, JSON.stringify(interview));
  return interview;
}

export async function getActiveInterview(id) {
  await delay(100);
  try {
    const active = JSON.parse(localStorage.getItem(ACTIVE_INTERVIEW_KEY) || 'null');
    if (active && active.id === id) return active;
  } catch {
    /* fall through */
  }
  // Fall back to a saved (already-completed) interview if this id refers to one.
  return readInterviews().find((i) => i.id === id) || null;
}

// FR11/FR12/FR33 - a response is recorded per question. `media` carries
// whatever the Simulator captured (duration, and object URLs for local
// playback only — nothing is uploaded anywhere in this phase).
export async function submitResponse(interviewId, questionId, response) {
  await delay(150);
  const active = JSON.parse(localStorage.getItem(ACTIVE_INTERVIEW_KEY) || 'null');
  if (!active || active.id !== interviewId) throw new Error('No active interview session found.');

  active.responses = [...(active.responses || []).filter((r) => r.questionId !== questionId), { questionId, ...response }];
  localStorage.setItem(ACTIVE_INTERVIEW_KEY, JSON.stringify(active));
  return active;
}

// FR10 - ends the session and hands off to the evaluation placeholder.
export async function endInterview(interviewId) {
  await delay(300);
  const active = JSON.parse(localStorage.getItem(ACTIVE_INTERVIEW_KEY) || 'null');
  if (!active || active.id !== interviewId) throw new Error('No active interview session found.');

  active.status = 'Completed';
  active.completedAt = new Date().toISOString();

  const evaluation = generateMockEvaluation(active);
  const finished = { ...active, ...evaluation };

  const all = readInterviews();
  all.unshift(finished);
  writeInterviews(all);
  localStorage.removeItem(ACTIVE_INTERVIEW_KEY);

  return finished;
}

// ---------------------------------------------------------------------------
// FR17-FR20 / FR21-FR23 / FR35 - Evaluation & feedback (PLACEHOLDER)
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

function pick(pool, n) {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

// PLACEHOLDER ONLY - replace with a real call to the multimodal evaluation
// service once FR13-FR16/FR34 are implemented. No audio/video is analyzed
// here; scores are structured mock data for frontend development.
function generateMockEvaluation(interview) {
  const overallScore = Math.floor(65 + Math.random() * 30); // 65-95
  const confidenceScore = Math.floor(55 + Math.random() * 40); // 55-95
  const stressPool = ['Low', 'Medium', 'High'];
  const stressLevel = stressPool[Math.floor(Math.random() * stressPool.length)];

  const perQuestion = (interview.questions || []).map((q) => ({
    questionId: q.id,
    questionText: q.question_text,
    score: Math.floor(55 + Math.random() * 40),
    note: 'Placeholder per-question note — populated by real evaluation once AI modules are integrated.',
  }));

  return {
    score: overallScore,
    confidence: confidenceScore,
    stress: stressLevel,
    strengths: pick(STRENGTH_POOL, 3),
    weaknesses: pick(WEAKNESS_POOL, 2),
    suggestions: pick(SUGGESTION_POOL, 3),
    perQuestion,
  };
}

// ---------------------------------------------------------------------------
// FR24-FR27 / FR36 - Results, history, progress
// ---------------------------------------------------------------------------

export async function getInterviewById(id) {
  await delay(150);
  return readInterviews().find((i) => i.id === id) || null;
}

export async function getHistory() {
  await delay(200);
  return readInterviews()
    .filter((i) => i.userId === currentUserId())
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function getDashboardSummary() {
  await delay(200);
  const history = readInterviews().filter((i) => i.userId === currentUserId());
  const completed = history.filter((i) => i.status === 'Completed');
  const avgScore = completed.length
    ? Math.round(completed.reduce((sum, i) => sum + (i.score || 0), 0) / completed.length)
    : null;

  return {
    totalInterviews: history.length,
    completedInterviews: completed.length,
    averageScore: avgScore,
    lastInterview: history[0] || null,
    recent: history.slice(0, 5),
  };
}

export async function getProgress() {
  await delay(200);
  const completed = readInterviews()
    .filter((i) => i.userId === currentUserId() && i.status === 'Completed')
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  return {
    scoreTrend: completed.map((i) => ({ date: i.createdAt, score: i.score, label: i.role })),
    confidenceTrend: completed.map((i) => ({ date: i.createdAt, confidence: i.confidence, label: i.role })),
    byCategory: Object.values(
      completed.reduce((acc, i) => {
        acc[i.role] = acc[i.role] || { category: i.role, count: 0, avgScore: 0, totalScore: 0 };
        acc[i.role].count += 1;
        acc[i.role].totalScore += i.score || 0;
        acc[i.role].avgScore = Math.round(acc[i.role].totalScore / acc[i.role].count);
        return acc;
      }, {})
    ),
  };
}
