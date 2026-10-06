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

export async function startInterview({ categoryId, interviewType, role }) {
  const doc = await fetchCandidateApi('/interviews', {
    method: 'POST',
    body: JSON.stringify({ category_id: categoryId, type: interviewType, role }),
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

// FR11/FR12/FR33/FR15 - uploads the actual recorded Blob (the real
// counterpart to the older metadata-only call kept below), then real
// speech-to-text runs against it server-side (backend/services/
// asr_google.py). `response.blob` is required; `durationSeconds` is sent
// as form data since the server can't derive timing from the file alone.
// The upload can fail (network, validation, oversized file) - this
// throws in that case exactly like every other fetchCandidateApi call, so
// InterviewSimulator.jsx can show a real "upload failed, retry" state
// instead of silently treating the response as saved.
export async function submitResponse(interviewId, questionId, response) {
  const formData = new FormData();
  formData.append('file', response.blob, 'response.webm');
  if (response.durationSeconds != null) {
    formData.append('duration_seconds', String(response.durationSeconds));
  }

  const doc = await fetchCandidateApi(`/interviews/${interviewId}/responses/${questionId}/media`, {
    method: 'POST',
    body: formData,
  });
  return toFrontendInterview(doc);
}

// Metadata-only variant, kept for any caller that only has timing/size
// info and not the recording itself (e.g. a future retry-metadata path).
// Not used by InterviewSimulator.jsx's normal flow anymore - see
// submitResponse() above, which is now the real upload path.
export async function submitResponseMetadataOnly(interviewId, questionId, response) {
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
//
// Also fires the real evaluation-start call (pending_evaluation ->
// processing), matching the report's own description of this moment (Use
// Case 12 "End Interview Session": ending the session "prepares collected
// responses for analysis"). This is best-effort: if it fails, the
// interview is still validly completed and the candidate still proceeds -
// there is no actual AI pipeline behind it yet in this phase, only the
// state transition (see backend/routes/candidate_evaluation.py).
export async function endInterview(interviewId) {
  const doc = await fetchCandidateApi(`/interviews/${interviewId}/complete`, { method: 'POST' });
  try {
    await startEvaluation(interviewId);
  } catch {
    // Non-fatal - evaluation stays "pending_evaluation" and can be
    // started again later (e.g. by a future retry mechanism or worker).
  }
  return toFrontendInterview(doc);
}

// FR10-03 / FR20 prerequisite - transitions evaluation_status from
// "pending_evaluation" to "processing". Does not run any AI; see
// backend/routes/candidate_evaluation.py's module docstring.
export async function startEvaluation(interviewId) {
  return fetchCandidateApi(`/interviews/${interviewId}/evaluation/start`, { method: 'POST' });
}

// Real evaluation read - {evaluationStatus, evaluation}. evaluation is
// null/partial until evaluationStatus is "completed". Never fabricated.
export async function getRealEvaluation(interviewId) {
  const data = await fetchCandidateApi(`/interviews/${interviewId}/evaluation`);
  return { evaluationStatus: data.evaluation_status, evaluation: data.evaluation };
}

// ---------------------------------------------------------------------------
// FR24-FR27 / FR36 - Results, history, progress
// ---------------------------------------------------------------------------

// Used by EvaluationResults.jsx, Feedback.jsx, and InterviewCompletion.jsx.
// Returns ONLY real, persisted evaluation data from MongoDB. Never fabricates
// mock scores or pseudo-random evaluation placeholders. If evaluation is pending,
// processing, or failed, it returns an honest state without simulated numbers.
export async function getInterviewById(id) {
  try {
    const doc = await fetchCandidateApi(`/interviews/${id}`);
    const interview = toFrontendInterview(doc);

    const { evaluationStatus, evaluation } = await getRealEvaluation(id).catch(() => ({
      evaluationStatus: interview.evaluationStatus,
      evaluation: null,
    }));

    if (evaluationStatus === 'completed' && evaluation) {
      return {
        ...interview,
        evaluationSource: 'real',
        evaluationStatus,
        score: evaluation.overall_score ?? interview.score,
        confidence: evaluation.confidence_score ?? interview.confidence,
        confidenceLevel: evaluation.confidence_level ?? interview.confidenceLevel,
        stress: evaluation.stress_level ?? interview.stress,
        stressScore: evaluation.stress_score ?? interview.stressScore,
        confidenceAndStressSummary: evaluation.confidence_and_stress_summary,
        interpretation: evaluation.interpretation,
        strengths: evaluation.strengths || [],
        weaknesses: evaluation.weaknesses || [],
        suggestions: evaluation.suggestions || [],
        insights: evaluation.insights,
        summaryReport: evaluation.summary_report,
        dimensionScores: evaluation.dimension_scores,
        perQuestion: evaluation.per_question || [],
      };
    }

    // Persisted or honest pending/failed/processing state — zero mock scores fabricated
    return {
      ...interview,
      evaluationSource: 'real',
      evaluationStatus: evaluationStatus || interview.evaluationStatus || 'pending_evaluation',
      score: interview.score ?? null,
      confidence: interview.confidence ?? null,
      confidenceLevel: interview.confidenceLevel ?? null,
      stress: interview.stress ?? null,
      stressScore: interview.stressScore ?? null,
      confidenceAndStressSummary: null,
      interpretation: '',
      strengths: [],
      weaknesses: [],
      suggestions: [],
      insights: null,
      summaryReport: null,
      dimensionScores: null,
      perQuestion: [],
    };
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

export async function getCandidateStats() {
  return fetchCandidateApi('/stats');
}

export async function getDashboardSummary() {
  try {
    const stats = await getCandidateStats();
    const history = await getHistory();
    return {
      totalInterviews: stats.total_interviews,
      completedInterviews: stats.completed_interviews,
      averageScore: stats.average_score,
      bestScore: stats.best_score,
      dimensionAverages: stats.dimension_averages,
      averageConfidence: stats.average_confidence,
      averageStress: stats.average_stress,
      lastInterview: history[0] || null,
      recent: history.slice(0, 5),
    };
  } catch (err) {
    console.warn('[DashboardSummary] Backend stats endpoint error, falling back to history:', err);
    const history = await getHistory();
    const completed = history.filter(
      (i) => i.status === 'Completed' && i.evaluationStatus === 'completed'
    );
    const scored = completed.filter((i) => i.score != null);
    const avgScore = scored.length
      ? Math.round(scored.reduce((sum, i) => sum + i.score, 0) / scored.length)
      : null;
    const bestScore = scored.length ? Math.max(...scored.map((i) => i.score)) : null;

    return {
      totalInterviews: history.length,
      completedInterviews: completed.length,
      averageScore: avgScore,
      bestScore: bestScore,
      dimensionAverages: null,
      lastInterview: history[0] || null,
      recent: history.slice(0, 5),
    };
  }
}

export async function getProgress() {
  try {
    const stats = await getCandidateStats();
    return {
      scoreTrend: stats.score_trend || [],
      confidenceTrend: stats.confidence_trend || [],
      stressTrend: stats.stress_trend || [],
      byCategory: stats.by_category || [],
      bestScore: stats.best_score,
      averageScore: stats.average_score,
      dimensionAverages: stats.dimension_averages || {},
    };
  } catch (err) {
    console.warn('[Progress] Backend stats endpoint error, falling back to history:', err);
    const history = await getHistory();
    const completed = history
      .filter((i) => i.status === 'Completed' && i.evaluationStatus === 'completed')
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const scored = completed.filter((i) => i.score != null);

    return {
      scoreTrend: scored.map((i) => ({ date: i.createdAt, score: i.score, label: i.role })),
      confidenceTrend: scored.map((i) => ({ date: i.createdAt, confidence: i.confidence, label: i.role })),
      stressTrend: scored.map((i) => ({ date: i.createdAt, stress: i.stress, label: i.role })),
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
}
