import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  RotateCcw,
  History,
  LayoutDashboard,
  ThumbsUp,
  Lightbulb,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import InterviewFlowLayout from '../layouts/InterviewFlowLayout';
import { getActiveInterview, getRealEvaluation } from '../services/candidateApi';
import { formatDate } from '../../utils/dateFormat';
import { CANDIDATE_IMAGES } from '../assets/images';
import {
  AssessmentDossierSeal,
  CornerReticles,
  TechnicalHUDTag,
  LiveAudioWaveform,
} from '../components/TechnicalDoodles';

// FR17-FR23 - Real Multimodal Evaluation Results (Assessment Report Layout)
const EvaluationResults = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [interview, setInterview] = useState(null);
  const [realEval, setRealEval] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      getActiveInterview(id),
      getRealEvaluation(id).catch(() => ({ evaluationStatus: 'pending_evaluation', evaluation: null })),
    ])
      .then(([interviewData, evalData]) => {
        if (!isMounted) return;
        if (!interviewData) {
          setError('Interview session could not be located.');
          return;
        }
        setInterview(interviewData);
        setRealEval(evalData);
      })
      .catch((err) => {
        if (isMounted) setError(err.message || 'Failed to load evaluation results.');
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
        <div className="max-w-4xl mx-auto py-20 flex flex-col items-center justify-center gap-3 text-center">
          <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--c-accent)', borderTopColor: 'transparent' }} />
          <p className="text-xs font-medium" style={{ color: 'var(--c-text-secondary)' }}>
            Generating executive assessment dossierâ€¦
          </p>
        </div>
      </InterviewFlowLayout>
    );
  }

  if (error || !interview) {
    return (
      <InterviewFlowLayout step="results">
        <div className="max-w-md mx-auto py-16 text-center space-y-4">
          <div className="w-10 h-10 rounded-md mx-auto flex items-center justify-center border"
            style={{ background: 'var(--c-badge-danger-bg)', borderColor: 'var(--c-badge-danger-border)', color: 'var(--c-danger)' }}
          >
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h1 className="c-heading text-xl font-bold" style={{ color: 'var(--c-text)' }}>Results Unavailable</h1>
            <p className="text-xs" style={{ color: 'var(--c-text-secondary)' }}>
              {error || 'We were unable to locate this evaluation record.'}
            </p>
          </div>
          <Link to="/dashboard" className="c-btn c-btn-primary px-5 py-2 text-xs font-semibold rounded-md inline-block">
            Return to Dashboard
          </Link>
        </div>
      </InterviewFlowLayout>
    );
  }

  const evaluationStatus = realEval?.evaluationStatus || interview.evaluationStatus || 'pending_evaluation';
  const evaluation = realEval?.evaluation;
  const isCompleted = evaluationStatus === 'completed' && !!evaluation;
  const isProcessing = evaluationStatus === 'processing' || evaluationStatus === 'pending_evaluation';
  const isFailed = evaluationStatus === 'failed';

  const overallScore = evaluation?.overall_score ?? interview.score ?? 0;
  const confidenceScore = evaluation?.confidence_score ?? interview.confidence ?? null;
  const stressLevel = evaluation?.stress_level ?? interview.stress ?? null;
  const interpretation = evaluation?.interpretation ?? interview.interpretation ?? '';
  const strengths = evaluation?.strengths ?? interview.strengths ?? [];
  const weaknesses = evaluation?.weaknesses ?? interview.weaknesses ?? [];
  const suggestions = evaluation?.suggestions ?? interview.suggestions ?? [];
  const perQuestionEval = evaluation?.per_question ?? [];

  const answeredCount = (interview.responses || []).length;
  const totalQuestions = (interview.questions || []).length;

  return (
    <InterviewFlowLayout step="results">
      <div className="max-w-4xl mx-auto space-y-12 py-6 sm:py-10">
        
        {/* ===================================================================
            1. ASSESSMENT HEADER (Candidate / Role / Date / REF)
           =================================================================== */}
        <section aria-label="Assessment Metadata" className="border-b pb-8" style={{ borderColor: 'var(--c-border)' }}>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--c-text-muted)' }}>
              <span className="font-semibold" style={{ color: 'var(--c-text)' }}>Executive Assessment Report</span>
              <span>/</span>
              <span className="font-mono">REF: {id.slice(-6).toUpperCase()}</span>
            </div>

            <div className="flex items-center gap-3">
              <AssessmentDossierSeal size={28} />
              {isCompleted && (
                <span className="c-badge c-badge-success text-xs font-bold">
                  Evaluation Finalized
                </span>
              )}
              {isProcessing && (
                <span className="c-badge c-badge-accent text-xs font-bold flex items-center gap-1.5">
                  <div className="w-2 h-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Processing Evaluation</span>
                </span>
              )}
              {isFailed && (
                <span className="c-badge c-badge-danger text-xs font-bold">
                  Evaluation Interrupted
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3">
            <div>
              <h1 className="c-heading text-3xl sm:text-4xl font-bold tracking-tight" style={{ color: 'var(--c-text)' }}>
                {interview.role}
              </h1>
              <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--c-text-secondary)' }}>
                Track: <span className="capitalize font-semibold" style={{ color: 'var(--c-text)' }}>{interview.type || 'Technical'}</span> â€¢ Completed on {formatDate(interview.completedAt || interview.createdAt)}
              </p>
            </div>

            <div className="text-xs font-mono" style={{ color: 'var(--c-text-muted)' }}>
              {answeredCount} of {totalQuestions} Prompts Evaluated
            </div>
          </div>
        </section>

        {/* ===================================================================
            2. OVERALL SCORE & INTERPRETATION (Directly on page with dividers)
           =================================================================== */}
        {isCompleted ? (
          <section aria-label="Overall Score" className="border-b pb-10" style={{ borderColor: 'var(--c-border)' }}>
            <p className="c-eyebrow mb-2">Overall Score</p>
            
            {/* 3D eval chart visual */}
            <div className="relative rounded-lg overflow-hidden border mb-6 group" style={{ borderColor: 'var(--c-border)', aspectRatio: '21/9' }}>
              <img
                src={CANDIDATE_IMAGES.evalChart}
                alt="Evaluation Analytics"
                className="w-full h-full object-cover opacity-80 transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, var(--c-bg) 0%, transparent 40%, var(--c-bg) 100%)' }} />
              <div className="absolute inset-0 flex items-center justify-start pl-8">
                <div>
                  <span className="block c-tech-annotation text-[10px] text-yellow-400 mb-1">[ASSESSMENT ANALYTICS]</span>
                  <span className="c-serif-num text-5xl sm:text-7xl font-bold tracking-tight" style={{ color: 'var(--c-text)' }}>
                    {Math.round(overallScore)}%
                  </span>
                  <div className="w-32 bg-slate-500/20 h-1 rounded-full overflow-hidden mt-2">
                    <div
                      className="h-full bg-yellow-500 rounded-full transition-all duration-1000"
                      style={{ width: `${Math.min(100, Math.max(0, overallScore))}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="absolute bottom-2 right-2">
                <span className="c-tech-annotation px-1.5 py-0.5 rounded bg-black/60 text-yellow-400 border border-white/10 text-[10px]">[COMPOSITE SCORE]</span>
              </div>
            </div>
            <p className="text-xs sm:text-sm mt-4 leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
              {interpretation || 
                `This composite score is computed from response delivery, technical depth, and domain concept coverage across ${answeredCount} evaluated prompt takes.`}
            </p>
          </section>
        ) : isFailed ? (
          <section aria-label="Evaluation Failure" className="border-b pb-8" style={{ borderColor: 'var(--c-border)' }}>
            <div className="c-badge-danger p-4 rounded-md flex items-start gap-3 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <div>
                <p className="font-bold">Evaluation Interrupted</p>
                <p className="mt-0.5">{evaluation?.failed_reason || 'An issue occurred during evaluation processing.'}</p>
              </div>
            </div>
          </section>
        ) : (
          <section aria-label="Evaluation In Progress" className="border-b pb-8" style={{ borderColor: 'var(--c-border)' }}>
            <div className="p-4 rounded-md border text-xs" style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)' }}>
              <p className="font-bold mb-1" style={{ color: 'var(--c-text)' }}>Evaluation in Pipeline</p>
              <p style={{ color: 'var(--c-text-secondary)' }}>
                Your responses have been safely ingested. As soon as transcript analysis and multimodal scoring finish, scores and question feedback will appear here.
              </p>
            </div>
          </section>
        )}

        {/* ===================================================================
            3. PERFORMANCE BREAKDOWN (Structured Data Ledger)
           =================================================================== */}
        {isCompleted && (confidenceScore != null || stressLevel != null) && (
          <section aria-label="Performance Breakdown" className="border-b pb-10 space-y-4" style={{ borderColor: 'var(--c-border)' }}>
            <div>
              <p className="c-eyebrow mb-1">Dimensions</p>
              <h2 className="c-heading text-xl font-bold" style={{ color: 'var(--c-text)' }}>Performance Breakdown</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-2">
              {confidenceScore != null && (
                <div className="space-y-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--c-text-muted)' }}>
                    Speech Confidence
                  </p>
                  <p className="c-serif-num text-3xl font-bold" style={{ color: 'var(--c-text)' }}>
                    {Math.round(confidenceScore)}%
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                    Derived from spoken pacing, volume consistency, and hesitation minimization.
                  </p>
                </div>
              )}

              {stressLevel != null && (
                <div className="space-y-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--c-text-muted)' }}>
                    Composure Indicator
                  </p>
                  <p className="c-serif-num text-3xl font-bold" style={{ color: 'var(--c-text)' }}>
                    {stressLevel}
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                    Behavioral stability and tension levels observed across sequential prompts.
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ===================================================================
            4. QUESTION-BY-QUESTION REVIEW (Editorial Assessment Stream)
           =================================================================== */}
        <section aria-label="Question Review" className="border-b pb-10 space-y-6" style={{ borderColor: 'var(--c-border)' }}>
          <div className="flex items-baseline justify-between">
            <div>
              <p className="c-eyebrow mb-1">Audit</p>
              <h2 className="c-heading text-xl font-bold" style={{ color: 'var(--c-text)' }}>Question Review</h2>
            </div>
            <span className="text-xs font-mono font-bold" style={{ color: 'var(--c-text-muted)' }}>
              {answeredCount}/{totalQuestions} Takes
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
              const wpm = qEval?.delivery?.words_per_minute;
              const pacing = qEval?.delivery?.pacing;
              const feedback = qEval?.feedback || qEval?.nlp?.feedback;

              return (
                <div key={q.id} className="py-6 space-y-3">
                  {/* Header Row */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold" style={{ color: 'var(--c-text-muted)' }}>
                          Question {(idx + 1).toString().padStart(2, '0')}
                        </span>
                        <span className="text-[11px]" style={{ color: 'var(--c-border)' }}>â€¢</span>
                        <span className="text-[11px] capitalize font-medium" style={{ color: 'var(--c-text-secondary)' }}>
                          {q.type || 'Technical'} ({q.difficulty || 'Medium'})
                        </span>
                        {wpm != null && (
                          <>
                            <span className="text-[11px]" style={{ color: 'var(--c-border)' }}>â€¢</span>
                            <span className="text-[11px] font-mono" style={{ color: 'var(--c-text-muted)' }}>
                              {Math.round(wpm)} WPM ({pacing})
                            </span>
                          </>
                        )}
                      </div>

                      <h3 className="c-heading text-base font-bold" style={{ color: 'var(--c-text)' }}>
                        {q.question_text}
                      </h3>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {duration != null && (
                        <span className="text-xs font-mono" style={{ color: 'var(--c-text-muted)' }}>
                          {duration}s
                        </span>
                      )}
                      {questionScore != null && (
                        <span className="c-badge c-badge-accent text-xs font-mono font-bold px-2 py-0.5">
                          {Math.round(questionScore)}%
                        </span>
                      )}
                      {isRecorded ? (
                        <span className="c-badge c-badge-success text-[10px] py-0.5 px-1.5 font-bold">
                          Recorded
                        </span>
                      ) : (
                        <span className="c-badge c-badge-muted text-[10px] py-0.5 px-1.5">
                          Skipped
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Transcribed Response (Restrained inset block) */}
                  {transcript && (
                    <div className="p-3 rounded-md border text-xs leading-relaxed"
                      style={{ background: 'var(--c-surface-muted)', borderColor: 'var(--c-border)', color: 'var(--c-text)' }}
                    >
                      <span className="font-bold text-[10px] uppercase tracking-wider block mb-1" style={{ color: 'var(--c-text-muted)' }}>
                        Transcript
                      </span>
                      "{transcript}"
                    </div>
                  )}

                  {/* Specific Feedback if provided */}
                  {feedback && (
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                      <strong className="font-semibold" style={{ color: 'var(--c-text)' }}>Notes:</strong> {feedback}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ===================================================================
            5. STRENGTHS & RECOMMENDATIONS (Editorial Two-Column List)
           =================================================================== */}
        {(strengths.length > 0 || weaknesses.length > 0 || suggestions.length > 0) && (
          <section aria-label="Strengths and Recommendations" className="border-b pb-10 space-y-6" style={{ borderColor: 'var(--c-border)' }}>
            <div>
              <p className="c-eyebrow mb-1">Qualitative Insights</p>
              <h2 className="c-heading text-xl font-bold" style={{ color: 'var(--c-text)' }}>Assessment Highlights</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {strengths.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 border-b pb-2" style={{ borderColor: 'var(--c-border)' }}>
                    <ThumbsUp className="w-4 h-4 text-emerald-500" />
                    <h3 className="c-heading text-sm font-bold" style={{ color: 'var(--c-text)' }}>Demonstrated Strengths</h3>
                  </div>
                  <ul className="space-y-2.5 text-xs">
                    {strengths.map((st, i) => (
                      <li key={i} className="flex items-start gap-2.5 leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-500" />
                        <span>{st}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(weaknesses.length > 0 || suggestions.length > 0) && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 border-b pb-2" style={{ borderColor: 'var(--c-border)' }}>
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    <h3 className="c-heading text-sm font-bold" style={{ color: 'var(--c-text)' }}>Recommendations for Growth</h3>
                  </div>
                  <ul className="space-y-2.5 text-xs">
                    {[...weaknesses, ...suggestions].map((item, i) => (
                      <li key={i} className="flex items-start gap-2.5 leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                        <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: 'var(--c-border-strong)' }} />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ===================================================================
            6. ACTIONS BAR
           =================================================================== */}
        <section aria-label="Report Actions" className="pt-2 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              to="/history"
              className="c-btn c-btn-secondary px-4 py-2.5 text-xs font-semibold rounded-md flex items-center gap-1.5"
            >
              <History className="w-3.5 h-3.5" />
              <span>Interview History</span>
            </Link>
            <Link
              to="/dashboard"
              className="c-btn c-btn-secondary px-4 py-2.5 text-xs font-semibold rounded-md flex items-center gap-1.5"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </Link>
          </div>

          <Link
            to="/interview/goal"
            className="c-btn c-btn-primary px-5 py-2.5 text-xs font-bold rounded-md flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Practice Another Session</span>
          </Link>
        </section>

      </div>
    </InterviewFlowLayout>
  );
};

export default EvaluationResults;

