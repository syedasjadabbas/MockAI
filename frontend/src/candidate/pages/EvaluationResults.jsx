import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Clock, 
  Calendar, 
  User, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  LayoutDashboard, 
  History, 
  RotateCcw,
  Sparkles,
  FileText,
  Activity,
  Layers,
  ThumbsUp,
  AlertTriangle,
  Lightbulb
} from 'lucide-react';
import InterviewFlowLayout from '../layouts/InterviewFlowLayout';
import { getActiveInterview, getRealEvaluation } from '../services/candidateApi';
import { getSession } from '../services/candidateAuth';
import { formatDate } from '../../utils/dateFormat';

// FR17-FR20, FR24-FR27, FR35 - Candidate Evaluation Results & Report
const EvaluationResults = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [interview, setInterview] = useState(null);
  const [realEval, setRealEval] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const candidateSession = getSession();
  const candidateName = candidateSession?.name || 'Candidate';

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      getActiveInterview(id),
      getRealEvaluation(id).catch(() => ({ evaluationStatus: 'pending_evaluation', evaluation: null })),
    ])
      .then(([interviewData, evalData]) => {
        if (!isMounted) return;
        if (!interviewData) {
          setError('Assessment record could not be found.');
          return;
        }
        setInterview(interviewData);
        setRealEval(evalData);
      })
      .catch((err) => {
        if (isMounted) setError(err.message || 'Failed to load assessment details.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <InterviewFlowLayout step="results">
        <div className="max-w-5xl mx-auto py-20 flex flex-col items-center justify-center gap-4 text-center">
          <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--c-accent)', borderTopColor: 'transparent' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--c-text-secondary)' }}>
            Retrieving official evaluation record…
          </p>
        </div>
      </InterviewFlowLayout>
    );
  }

  if (error || !interview) {
    return (
      <InterviewFlowLayout step="results">
        <div className="max-w-xl mx-auto py-16 text-center space-y-5">
          <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center border" style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)', color: 'var(--c-danger)' }}>
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h1 className="c-heading text-2xl">Report Unavailable</h1>
            <p className="text-sm max-w-md mx-auto" style={{ color: 'var(--c-text-secondary)' }}>
              {error || 'The requested evaluation report could not be loaded.'}
            </p>
          </div>
          <Link to="/history" className="c-btn c-btn-primary px-6 py-2.5 text-xs">
            Return to Interview History
          </Link>
        </div>
      </InterviewFlowLayout>
    );
  }

  // Real backend fields only - never fabricated
  const evalStatus = realEval?.evaluationStatus || interview.evaluationStatus || 'pending_evaluation';
  const evaluation = realEval?.evaluation;

  const overallScore = evaluation?.overall_score ?? interview.score;
  const confidenceScore = evaluation?.confidence_score ?? interview.confidence;
  const stressLevel = evaluation?.stress_level ?? interview.stress;
  const interpretation = evaluation?.interpretation;
  const strengths = Array.isArray(evaluation?.strengths) ? evaluation.strengths.filter(Boolean) : [];
  const weaknesses = Array.isArray(evaluation?.weaknesses) ? evaluation.weaknesses.filter(Boolean) : [];
  const suggestions = Array.isArray(evaluation?.suggestions) ? evaluation.suggestions.filter(Boolean) : [];
  const perQuestionEval = Array.isArray(evaluation?.per_question) ? evaluation.per_question : [];

  const isCompleted = evalStatus === 'completed' && overallScore != null;
  const isFailed = evalStatus === 'failed';
  const isProcessing = !isCompleted && !isFailed;

  const answeredCount = (interview.responses || []).length;
  const totalQuestions = (interview.questions || []).length;

  return (
    <InterviewFlowLayout step="results">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* 1. REPORT HEADER */}
        <div className="space-y-4 border-b pb-6" style={{ borderColor: 'var(--c-border)' }}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="c-eyebrow">Assessment Record</span>
              <span style={{ color: 'var(--c-border-strong)' }}>/</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded border" style={{ borderColor: 'var(--c-border)', color: 'var(--c-text-muted)', background: 'var(--c-surface-muted)' }}>
                REF: {id.slice(-6).toUpperCase()}
              </span>
            </div>

            <div>
              {isCompleted ? (
                <span className="c-badge c-badge-success text-xs flex items-center gap-1">
                  <Check className="w-3 h-3" /> Evaluation Completed
                </span>
              ) : isFailed ? (
                <span className="c-badge c-badge-danger text-xs flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Evaluation Failed
                </span>
              ) : (
                <span className="c-badge c-badge-accent text-xs flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--c-accent)' }} />
                  Analysis in Pipeline
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-2">
            <div className="space-y-2">
              <h1 className="c-heading text-3xl sm:text-4xl md:text-5xl leading-tight">
                Interview Assessment
              </h1>
              <p className="text-base" style={{ color: 'var(--c-text-secondary)' }}>
                Official performance summary for <strong className="font-semibold" style={{ color: 'var(--c-text)' }}>{interview.role}</strong>
              </p>
            </div>

            {/* Dossier Metadata Strip */}
            <div className="flex flex-wrap items-center gap-4 text-xs font-medium" style={{ color: 'var(--c-text-secondary)' }}>
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" style={{ color: 'var(--c-accent)' }} />
                <span>{candidateName}</span>
              </div>
              <span>·</span>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" style={{ color: 'var(--c-accent)' }} />
                <span>{formatDate(interview.completedAt || interview.createdAt)}</span>
              </div>
              <span>·</span>
              <span className="capitalize">{interview.type || 'Technical'}</span>
            </div>
          </div>
        </div>

        {/* 2. OVERALL ASSESSMENT SECTION */}
        {isCompleted ? (
          <div className="c-card p-7 sm:p-9 space-y-6">
            <div className="border-b pb-4 flex items-center justify-between" style={{ borderColor: 'var(--c-border)' }}>
              <div>
                <p className="c-eyebrow">Aggregate Assessment</p>
                <h2 className="c-heading text-xl mt-0.5">Overall Performance</h2>
              </div>
              <span className="text-xs font-mono" style={{ color: 'var(--c-text-muted)' }}>
                Standardized 0–100 Scale
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              <div className="md:col-span-4 flex flex-col items-center justify-center p-6 rounded-2xl border text-center" style={{ background: 'var(--c-surface-muted)', borderColor: 'var(--c-border)' }}>
                <div className="flex items-baseline gap-1">
                  <span className="c-serif-num text-5xl sm:text-6xl font-bold" style={{ color: 'var(--c-accent)' }}>
                    {Math.round(overallScore)}
                  </span>
                  <span className="text-xl font-medium" style={{ color: 'var(--c-text-muted)' }}>
                    /100
                  </span>
                </div>
                <p className="text-xs font-bold uppercase tracking-wider mt-2" style={{ color: 'var(--c-text)' }}>
                  Composite Score
                </p>
              </div>

              <div className="md:col-span-8 space-y-3">
                <h3 className="c-heading text-lg">Score Interpretation</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                  {interpretation || 
                    `This composite score is computed from your response delivery, technical depth, and communication clarity across ${answeredCount} evaluated prompts.`}
                </p>
              </div>
            </div>
          </div>
        ) : isFailed ? (
          <div className="c-card p-6 sm:p-8 space-y-4 border-l-4" style={{ borderColor: 'var(--c-danger)' }}>
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--c-danger)' }} />
              <div className="space-y-1">
                <h2 className="c-heading text-lg">Evaluation Processing Interrupted</h2>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                  {evaluation?.failed_reason || 'An issue was encountered while processing your response recordings. Your session remains safely saved.'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="c-card p-7 sm:p-9 space-y-5">
            <div className="border-b pb-4 flex items-center justify-between" style={{ borderColor: 'var(--c-border)' }}>
              <div>
                <p className="c-eyebrow">Status Overview</p>
                <h2 className="c-heading text-xl mt-0.5">Evaluation In Pipeline</h2>
              </div>
              <span className="c-badge c-badge-accent text-xs">Processing Queued</span>
            </div>

            <div className="p-5 rounded-2xl border space-y-3" style={{ background: 'var(--c-surface-muted)', borderColor: 'var(--c-border)' }}>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: 'var(--c-accent)' }} />
                <p className="text-sm font-semibold" style={{ color: 'var(--c-text)' }}>
                  Responses Ingested & Awaiting Analysis
                </p>
              </div>
              <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                Your {answeredCount} recorded audio-visual responses are archived in the Question Bank. Aggregate scoring, confidence analysis, and speech transcripts will appear automatically in your candidate record once evaluation processing concludes.
              </p>
            </div>
          </div>
        )}

        {/* 3. PERFORMANCE BREAKDOWN (Rendered only when real metric fields exist) */}
        {isCompleted && (confidenceScore != null || stressLevel != null) && (
          <div className="space-y-4">
            <div className="border-b pb-2" style={{ borderColor: 'var(--c-border)' }}>
              <p className="c-eyebrow">Dimensions</p>
              <h2 className="c-heading text-xl mt-0.5">Performance Breakdown</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {confidenceScore != null && (
                <div className="c-card p-6 space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--c-text-muted)' }}>
                    Confidence Assessment
                  </p>
                  <div className="flex items-baseline gap-1">
                    <span className="c-serif-num text-3xl font-bold" style={{ color: 'var(--c-text)' }}>
                      {Math.round(confidenceScore)}%
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                    Derived from speech pacing, tone modulation, and clarity of response formulation.
                  </p>
                </div>
              )}

              {stressLevel != null && (
                <div className="c-card p-6 space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--c-text-muted)' }}>
                    Stress & Composure Indicator
                  </p>
                  <div className="flex items-baseline gap-1">
                    <span className="c-serif-num text-3xl font-bold" style={{ color: 'var(--c-accent)' }}>
                      {stressLevel}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                    Behavioral stability and tension levels observed across sequential prompts.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. RESPONSE-BY-RESPONSE REVIEW */}
        <div className="c-card p-6 sm:p-7 space-y-5">
          <div className="border-b pb-4 flex items-center justify-between" style={{ borderColor: 'var(--c-border)' }}>
            <div>
              <p className="c-eyebrow">Audit</p>
              <h2 className="c-heading text-xl mt-0.5">Prompt & Response Review</h2>
            </div>
            <span className="text-xs font-mono" style={{ color: 'var(--c-text-muted)' }}>
              {answeredCount} of {totalQuestions} Recorded
            </span>
          </div>

          <div className="divide-y" style={{ borderColor: 'var(--c-border)' }}>
            {interview.questions.map((q, idx) => {
              const resp = (interview.responses || []).find((r) => (r.question_id || r.questionId) === q.id);
              const qEval = perQuestionEval.find((item) => (item.question_id || item.questionId) === q.id);
              const isRecorded = !!resp;
              const duration = resp?.duration_seconds || resp?.durationSeconds;
              const transcript = qEval?.asr?.transcript;
              const questionScore = qEval?.multimodal?.score ?? qEval?.score;

              return (
                <div key={q.id} className="py-4 space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="c-serif-num font-bold text-sm shrink-0 mt-0.5" style={{ color: 'var(--c-accent)' }}>
                        {(idx + 1).toString().padStart(2, '0')}
                      </span>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold" style={{ color: 'var(--c-text)' }}>
                          {q.question_text}
                        </p>
                        <div className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--c-text-muted)' }}>
                          <span className="capitalize">{q.difficulty || 'Medium'}</span>
                          <span>·</span>
                          <span>{q.type || 'Technical'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {duration != null && (
                        <span className="text-xs font-mono" style={{ color: 'var(--c-text-muted)' }}>
                          {duration}s
                        </span>
                      )}
                      {questionScore != null && (
                        <span className="c-badge c-badge-accent text-xs font-mono font-bold">
                          {Math.round(questionScore)}%
                        </span>
                      )}
                      {isRecorded ? (
                        <span className="c-badge c-badge-success text-[11px] py-0.5 px-2">
                          Recorded
                        </span>
                      ) : (
                        <span className="c-badge c-badge-muted text-[11px] py-0.5 px-2">
                          Skipped
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Transcript snippet if real transcription exists */}
                  {transcript && (
                    <div className="ml-7 p-3 rounded-lg text-xs leading-relaxed border" style={{ background: 'var(--c-surface-muted)', borderColor: 'var(--c-border)', color: 'var(--c-text-secondary)' }}>
                      <span className="font-bold text-[10px] uppercase tracking-wider block mb-1" style={{ color: 'var(--c-text-muted)' }}>
                        Transcribed Response
                      </span>
                      "{transcript}"
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 5. & 6. STRENGTHS & AREAS TO IMPROVE (Real backend data only) */}
        {(strengths.length > 0 || weaknesses.length > 0 || suggestions.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {strengths.length > 0 && (
              <div className="c-card p-6 space-y-4">
                <div className="flex items-center gap-2 border-b pb-3" style={{ borderColor: 'var(--c-border)' }}>
                  <ThumbsUp className="w-4 h-4" style={{ color: 'var(--c-success)' }} />
                  <h3 className="c-heading text-lg">Demonstrated Strengths</h3>
                </div>
                <ul className="space-y-2.5 text-xs sm:text-sm">
                  {strengths.map((st, i) => (
                    <li key={i} className="flex items-start gap-2.5 leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--c-success)' }} />
                      <span>{st}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(weaknesses.length > 0 || suggestions.length > 0) && (
              <div className="c-card p-6 space-y-4">
                <div className="flex items-center gap-2 border-b pb-3" style={{ borderColor: 'var(--c-border)' }}>
                  <Lightbulb className="w-4 h-4" style={{ color: 'var(--c-accent)' }} />
                  <h3 className="c-heading text-lg">Recommendations for Growth</h3>
                </div>
                <ul className="space-y-2.5 text-xs sm:text-sm">
                  {[...weaknesses, ...suggestions].map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                      <span className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" style={{ background: 'var(--c-accent)' }} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* 8. ACTIONS */}
        <div className="border-t pt-6 flex flex-wrap items-center justify-between gap-4" style={{ borderColor: 'var(--c-border)' }}>
          <div className="flex items-center gap-3">
            <Link
              to="/history"
              className="c-btn c-btn-secondary px-5 py-3 text-xs flex items-center gap-2"
            >
              <History className="w-3.5 h-3.5" />
              <span>Interview History</span>
            </Link>
            <Link
              to="/dashboard"
              className="c-btn c-btn-secondary px-5 py-3 text-xs flex items-center gap-2"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </Link>
          </div>

          <Link
            to="/interview/goal"
            className="c-btn c-btn-primary px-6 py-3 text-xs font-bold flex items-center gap-2"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Practice Another Interview</span>
          </Link>
        </div>

      </div>
    </InterviewFlowLayout>
  );
};

export default EvaluationResults;
