import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { 
  Check, 
  ArrowRight, 
  AlertCircle, 
  ShieldCheck, 
  LayoutDashboard, 
  History, 
  FileText,
} from 'lucide-react';
import InterviewFlowLayout from '../layouts/InterviewFlowLayout';
import { getActiveInterview, getRealEvaluation } from '../services/candidateApi';
import { formatDate } from '../../utils/dateFormat';
import { CANDIDATE_IMAGES } from '../assets/images';
import {
  AssessmentDossierSeal,
  CornerReticles,
  TechnicalHUDTag,
} from '../components/TechnicalDoodles';

const InterviewCompletion = () => {
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
        if (isMounted) setError(err.message || 'Failed to load interview session details.');
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
      <InterviewFlowLayout step="complete">
        <div className="max-w-5xl mx-auto py-16 flex flex-col items-center justify-center gap-3 text-center">
          <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--c-accent)', borderTopColor: 'transparent' }} />
          <p className="text-xs font-medium" style={{ color: 'var(--c-text-secondary)' }}>
            Retrieving interview completion receipt…
          </p>
        </div>
      </InterviewFlowLayout>
    );
  }

  if (error || !interview) {
    return (
      <InterviewFlowLayout step="complete">
        <div className="max-w-md mx-auto py-14 text-center space-y-4">
          <div className="w-10 h-10 rounded-md mx-auto flex items-center justify-center border"
            style={{ background: 'var(--c-badge-danger-bg)', borderColor: 'var(--c-badge-danger-border)', color: 'var(--c-danger)' }}
          >
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h1 className="c-heading text-xl font-bold" style={{ color: 'var(--c-text)' }}>Session Unavailable</h1>
            <p className="text-xs" style={{ color: 'var(--c-text-secondary)' }}>
              {error || 'We were unable to locate this interview record.'}
            </p>
          </div>
          <Link to="/dashboard" className="c-btn c-btn-primary px-5 py-2 text-xs font-semibold rounded-md inline-block">
            Return to Dashboard
          </Link>
        </div>
      </InterviewFlowLayout>
    );
  }

  const answeredCount = (interview.responses || []).length;
  const totalQuestions = (interview.questions || []).length;
  const totalRecordedSeconds = (interview.responses || []).reduce(
    (sum, r) => sum + (r.duration_seconds || r.durationSeconds || 0),
    0
  );

  const formatDuration = (secs) => {
    if (!secs) return null;
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    if (mins === 0) return `${remSecs}s`;
    return remSecs > 0 ? `${mins}m ${remSecs}s` : `${mins}m`;
  };

  const isEvalCompleted = 
    (realEval?.evaluationStatus === 'completed' || interview.evaluationStatus === 'completed') && 
    !!realEval?.evaluation;

  return (
    <InterviewFlowLayout step="complete">
      <div className="max-w-5xl mx-auto space-y-8 py-4 sm:py-6">
        
        {/* Top Context & Reference */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4" style={{ borderColor: 'var(--c-border)' }}>
          <div className="flex items-center gap-2.5">
            <span className="c-eyebrow">Session Status</span>
            <span style={{ color: 'var(--c-border)' }}>/</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded border font-semibold"
              style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface-muted)', color: 'var(--c-text-secondary)' }}
            >
              REF: {id.slice(-6).toUpperCase()}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="c-badge c-badge-success flex items-center gap-1 font-semibold text-xs">
              <Check className="w-3 h-3" /> Submitted & Finalized
            </span>
          </div>
        </div>

        {/* Hero Title Statement directly on page */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="c-eyebrow mb-1">Receipt</p>
            <h1 className="c-heading text-2xl sm:text-3xl font-bold" style={{ color: 'var(--c-text)' }}>
              Interview Finished
            </h1>
            <p className="text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
              Your responses for <strong className="font-semibold" style={{ color: 'var(--c-text)' }}>{interview.role}</strong> have been finalized and recorded.
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-3 pr-2">
            <AssessmentDossierSeal size={40} />
            <div className="text-left">
              <span className="c-tech-annotation block text-[10px]">INGESTION COMPLETE</span>
              <span className="text-xs font-mono font-bold" style={{ color: 'var(--c-text)' }}>
                {answeredCount}/{totalQuestions} TAKES
              </span>
            </div>
          </div>
        </div>

        {/* Main Two-Column Summary & Evaluation Dossier */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Summary & Prompts (7 cols) — Open editorial ledger */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* Session Ledger */}
            <div className="space-y-3">
              <div className="border-b pb-2 flex items-center justify-between" style={{ borderColor: 'var(--c-border)' }}>
                <div>
                  <p className="c-eyebrow mb-0.5">Overview</p>
                  <h2 className="c-heading text-base font-bold" style={{ color: 'var(--c-text)' }}>Session Summary</h2>
                </div>
                <span className="text-xs font-mono" style={{ color: 'var(--c-text-muted)' }}>
                  {formatDate(interview.completedAt || interview.createdAt)}
                </span>
              </div>

              <dl className="divide-y text-xs border-b" style={{ borderColor: 'var(--c-border)' }}>
                <div className="py-2.5 flex items-center justify-between">
                  <dt style={{ color: 'var(--c-text-secondary)' }}>Role Track</dt>
                  <dd className="font-bold text-right" style={{ color: 'var(--c-text)' }}>{interview.role}</dd>
                </div>

                <div className="py-2.5 flex items-center justify-between">
                  <dt style={{ color: 'var(--c-text-secondary)' }}>Track Type</dt>
                  <dd className="font-bold text-right capitalize" style={{ color: 'var(--c-text)' }}>{interview.type || 'Technical'}</dd>
                </div>

                <div className="py-2.5 flex items-center justify-between">
                  <dt style={{ color: 'var(--c-text-secondary)' }}>Prompts Recorded</dt>
                  <dd className="font-bold text-right font-mono" style={{ color: 'var(--c-text)' }}>
                    {answeredCount} of {totalQuestions} Prompts
                  </dd>
                </div>

                {totalRecordedSeconds > 0 && (
                  <div className="py-2.5 flex items-center justify-between">
                    <dt style={{ color: 'var(--c-text-secondary)' }}>Spoken Duration</dt>
                    <dd className="font-bold text-right font-mono" style={{ color: 'var(--c-text)' }}>
                      {formatDuration(totalRecordedSeconds)}
                    </dd>
                  </div>
                )}

                <div className="py-2.5 flex items-center justify-between">
                  <dt style={{ color: 'var(--c-text-secondary)' }}>Status</dt>
                  <dd className="font-bold text-emerald-500 text-right">
                    Finalized
                  </dd>
                </div>
              </dl>
            </div>

            {/* Prompt Response Breakdown Ledger */}
            <div className="space-y-3">
              <div className="border-b pb-2 flex items-center justify-between" style={{ borderColor: 'var(--c-border)' }}>
                <div>
                  <p className="c-eyebrow mb-0.5">Prompts</p>
                  <h3 className="c-heading text-base font-bold" style={{ color: 'var(--c-text)' }}>Recorded Takes</h3>
                </div>
                <span className="text-xs font-mono font-bold" style={{ color: 'var(--c-text-secondary)' }}>
                  {answeredCount}/{totalQuestions} Received
                </span>
              </div>

              <div className="divide-y text-xs border-b" style={{ borderColor: 'var(--c-border)' }}>
                {interview.questions.map((q, i) => {
                  const resp = (interview.responses || []).find((r) => (r.question_id || r.questionId) === q.id);
                  const isSaved = !!resp;
                  const duration = resp?.duration_seconds || resp?.durationSeconds;

                  return (
                    <div key={q.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-mono text-xs font-bold w-4 shrink-0" style={{ color: 'var(--c-text-muted)' }}>
                          {(i + 1).toString().padStart(2, '0')}
                        </span>
                        <p className="truncate font-medium text-xs" style={{ color: 'var(--c-text)' }}>
                          {q.question_text}
                        </p>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        {duration && (
                          <span className="text-[11px] font-mono" style={{ color: 'var(--c-text-muted)' }}>
                            {duration}s
                          </span>
                        )}
                        {isSaved ? (
                          <span className="c-badge c-badge-success text-[10px] py-0.5 px-1.5 font-bold flex items-center gap-1">
                            <Check className="w-2.5 h-2.5" /> Saved
                          </span>
                        ) : (
                          <span className="c-badge c-badge-muted text-[10px] py-0.5 px-1.5">
                            Skipped
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Right Column: Actions (5 cols) */}
          <div className="lg:col-span-5 space-y-6">

            {/* 3D Completion Visual */}
            <div className="relative rounded-lg overflow-hidden border group" style={{ borderColor: 'var(--c-border)', aspectRatio: '16/9' }}>
              <img
                src={CANDIDATE_IMAGES.completionSeal}
                alt="Interview Complete"
                className="w-full h-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, var(--c-bg) 0%, transparent 60%)' }} />
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                <span className="c-tech-annotation px-1.5 py-0.5 rounded bg-black/60 text-emerald-400 border border-white/10 text-[10px]">[SESSION FINALIZED]</span>
                <span className="c-tech-annotation px-1.5 py-0.5 rounded bg-black/60 text-blue-400 border border-white/10 text-[10px]">{answeredCount}/{totalQuestions} TAKES</span>
              </div>
            </div>
            
            {/* Evaluation Status & Actions Panel */}
            <div className="c-card p-5 space-y-4 rounded-lg border"
              style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)' }}
            >
              <div className="border-b pb-2.5 flex items-center justify-between" style={{ borderColor: 'var(--c-border)' }}>
                <div>
                  <p className="c-eyebrow mb-0.5">Report</p>
                  <h3 className="c-heading text-base font-bold" style={{ color: 'var(--c-text)' }}>Evaluation Status</h3>
                </div>

                {isEvalCompleted ? (
                  <span className="c-badge c-badge-success text-xs font-bold">Ready</span>
                ) : (
                  <span className="c-badge c-badge-accent text-xs font-bold">Processing</span>
                )}
              </div>

              {isEvalCompleted ? (
                <div className="space-y-3">
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                    Your session analysis and aggregate performance scoring are ready for review.
                  </p>
                  <Link 
                    to={`/interview/${id}/results`}
                    className="c-btn c-btn-primary w-full py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 rounded-md"
                  >
                    <span>View Evaluation Report</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                    Spoken takes are being transcribed and evaluated across technical concepts and delivery.
                  </p>

                  <Link 
                    to={`/interview/${id}/results`}
                    className="c-btn c-btn-secondary w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 rounded-md"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Open Results Page</span>
                  </Link>
                </div>
              )}

              <div className="pt-2 border-t space-y-2" style={{ borderColor: 'var(--c-border)' }}>
                <Link
                  to="/dashboard"
                  className="c-btn c-btn-primary w-full py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 rounded-md"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Return to Dashboard</span>
                </Link>

                <Link
                  to="/history"
                  className="c-btn c-btn-secondary w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 rounded-md"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>View History</span>
                </Link>
              </div>
            </div>

            {/* Archival Notice */}
            <div className="pt-2">
              <div className="flex items-center gap-1.5 mb-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-[11px] font-bold" style={{ color: 'var(--c-text)' }}>Archival Notice</span>
              </div>
              <p className="text-[11px] leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                Responses are stored securely with your candidate profile and accessible anytime from Interview History.
              </p>
            </div>

          </div>

        </div>

      </div>
    </InterviewFlowLayout>
  );
};

export default InterviewCompletion;
