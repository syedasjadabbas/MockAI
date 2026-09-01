import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { 
  Check, 
  Clock, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  LayoutDashboard, 
  History, 
  FileText,
  Layers,
  Sparkles
} from 'lucide-react';
import InterviewFlowLayout from '../layouts/InterviewFlowLayout';
import { getActiveInterview, getRealEvaluation } from '../services/candidateApi';
import { formatDate } from '../../utils/dateFormat';

// FR10 - Interview Session Completion & Evaluation Status
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
        <div className="max-w-5xl mx-auto py-20 flex flex-col items-center justify-center gap-4 text-center">
          <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--c-accent)', borderTopColor: 'transparent' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--c-text-secondary)' }}>
            Retrieving interview completion receipt…
          </p>
        </div>
      </InterviewFlowLayout>
    );
  }

  if (error || !interview) {
    return (
      <InterviewFlowLayout step="complete">
        <div className="max-w-xl mx-auto py-16 text-center space-y-5">
          <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center border" style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)', color: 'var(--c-danger)' }}>
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h1 className="c-heading text-2xl">Session Unavailable</h1>
            <p className="text-sm max-w-md mx-auto" style={{ color: 'var(--c-text-secondary)' }}>
              {error || 'We were unable to locate this interview record.'}
            </p>
          </div>
          <Link to="/dashboard" className="c-btn c-btn-primary px-6 py-2.5 text-xs">
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
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Top Context & Reference */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4" style={{ borderColor: 'var(--c-border)' }}>
          <div className="flex items-center gap-3">
            <span className="c-eyebrow">Session Finalization</span>
            <span style={{ color: 'var(--c-border-strong)' }}>/</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded border" style={{ borderColor: 'var(--c-border)', color: 'var(--c-text-muted)', background: 'var(--c-surface-muted)' }}>
              REF: {id.slice(-6).toUpperCase()}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="c-badge c-badge-success flex items-center gap-1">
              <Check className="w-3 h-3" /> Submitted Successfully
            </span>
          </div>
        </div>

        {/* Hero Title Statement */}
        <div className="space-y-3">
          <p className="c-eyebrow">Submission Confirmed</p>
          <h1 className="c-heading text-3xl sm:text-4xl md:text-5xl leading-tight">
            Interview complete.
          </h1>
          <p className="text-base sm:text-lg max-w-3xl leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
            Your spoken responses for <strong className="font-semibold" style={{ color: 'var(--c-text)' }}>{interview.role}</strong> have been finalized and securely submitted for evaluation.
          </p>
        </div>

        {/* Main Two-Column Summary & Evaluation Dossier */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Official Session Summary & Prompt Ledger (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Session Ledger Card */}
            <div className="c-card p-6 sm:p-7 space-y-5">
              <div className="border-b pb-3 flex items-center justify-between" style={{ borderColor: 'var(--c-border)' }}>
                <div>
                  <p className="c-eyebrow">Official Record</p>
                  <h2 className="c-heading text-lg mt-0.5">Session Summary</h2>
                </div>
                <span className="text-xs font-mono" style={{ color: 'var(--c-text-muted)' }}>
                  {formatDate(interview.completedAt || interview.createdAt)}
                </span>
              </div>

              <dl className="divide-y text-xs sm:text-sm" style={{ borderColor: 'var(--c-border)' }}>
                <div className="py-3 flex items-center justify-between">
                  <dt style={{ color: 'var(--c-text-secondary)' }}>Target Discipline</dt>
                  <dd className="font-semibold text-right" style={{ color: 'var(--c-text)' }}>
                    {interview.role}
                  </dd>
                </div>

                <div className="py-3 flex items-center justify-between">
                  <dt style={{ color: 'var(--c-text-secondary)' }}>Interview Track</dt>
                  <dd className="font-semibold text-right capitalize" style={{ color: 'var(--c-text)' }}>
                    {interview.type || 'Technical'}
                  </dd>
                </div>

                <div className="py-3 flex items-center justify-between">
                  <dt style={{ color: 'var(--c-text-secondary)' }}>Responses Recorded</dt>
                  <dd className="font-semibold text-right c-serif-num text-sm" style={{ color: 'var(--c-text)' }}>
                    {answeredCount} of {totalQuestions} Prompts
                  </dd>
                </div>

                {totalRecordedSeconds > 0 && (
                  <div className="py-3 flex items-center justify-between">
                    <dt style={{ color: 'var(--c-text-secondary)' }}>Total Spoken Duration</dt>
                    <dd className="font-semibold text-right c-serif-num text-sm" style={{ color: 'var(--c-text)' }}>
                      {formatDuration(totalRecordedSeconds)}
                    </dd>
                  </div>
                )}

                <div className="py-3 flex items-center justify-between">
                  <dt style={{ color: 'var(--c-text-secondary)' }}>Session Status</dt>
                  <dd className="font-semibold text-right" style={{ color: 'var(--c-success)' }}>
                    Finalized & Archived
                  </dd>
                </div>
              </dl>
            </div>

            {/* Prompt Response Breakdown Ledger */}
            <div className="c-card p-6 space-y-4">
              <div className="border-b pb-3 flex items-center justify-between" style={{ borderColor: 'var(--c-border)' }}>
                <div>
                  <p className="c-eyebrow">Submission Ledger</p>
                  <h3 className="c-heading text-base mt-0.5">Recorded Prompts</h3>
                </div>
                <span className="text-xs font-mono" style={{ color: 'var(--c-text-muted)' }}>
                  {answeredCount}/{totalQuestions} Received
                </span>
              </div>

              <div className="divide-y text-xs" style={{ borderColor: 'var(--c-border)' }}>
                {interview.questions.map((q, i) => {
                  const resp = (interview.responses || []).find((r) => (r.question_id || r.questionId) === q.id);
                  const isSaved = !!resp;
                  const duration = resp?.duration_seconds || resp?.durationSeconds;

                  return (
                    <div key={q.id} className="py-3 px-1 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-mono text-xs font-bold w-5 shrink-0" style={{ color: 'var(--c-accent)' }}>
                          {(i + 1).toString().padStart(2, '0')}
                        </span>
                        <p className="truncate font-medium" style={{ color: 'var(--c-text)' }}>
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
                          <span className="c-badge c-badge-success text-[10px] py-0.5 px-2 flex items-center gap-1">
                            <Check className="w-2.5 h-2.5" /> Saved
                          </span>
                        ) : (
                          <span className="c-badge c-badge-muted text-[10px] py-0.5 px-2">
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

          {/* Right Column: Evaluation Lifecycle & Candidate Navigation (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Evaluation Status Card */}
            <div className="c-card p-6 space-y-4">
              <div className="border-b pb-3 flex items-center justify-between" style={{ borderColor: 'var(--c-border)' }}>
                <div>
                  <p className="c-eyebrow">Lifecycle</p>
                  <h3 className="c-heading text-lg mt-0.5">Evaluation Status</h3>
                </div>

                {isEvalCompleted ? (
                  <span className="c-badge c-badge-success text-xs">Ready</span>
                ) : (
                  <span className="c-badge c-badge-accent text-xs">Pending Analysis</span>
                )}
              </div>

              {isEvalCompleted ? (
                <div className="space-y-4">
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                    Your session analysis and aggregate performance scoring are ready for review.
                  </p>
                  <Link 
                    to={`/interview/${id}/results`}
                    className="c-btn c-btn-primary w-full py-3.5 text-xs font-bold flex items-center justify-center gap-2"
                  >
                    <span>View Evaluation Report</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl space-y-2 border" style={{ background: 'var(--c-surface-muted)', borderColor: 'var(--c-border)' }}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--c-accent)' }} />
                      <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--c-text)' }}>
                        Analysis In Pipeline
                      </p>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                      Your spoken responses are securely archived. Comprehensive scoring and multimodal evaluation will appear in your history once the evaluation service processes this session.
                    </p>
                  </div>

                  <Link 
                    to={`/interview/${id}/results`}
                    className="c-btn c-btn-secondary w-full py-3 text-xs flex items-center justify-center gap-2"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Preview Results Layout</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Candidate Next Actions Card */}
            <div className="c-card p-6 space-y-4">
              <div className="border-b pb-3" style={{ borderColor: 'var(--c-border)' }}>
                <p className="c-eyebrow">Next Steps</p>
                <h3 className="c-heading text-lg mt-0.5">Candidate Actions</h3>
              </div>

              <div className="space-y-3">
                <Link
                  to="/dashboard"
                  className="c-btn c-btn-primary w-full py-3.5 text-xs font-bold flex items-center justify-center gap-2"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Return to Dashboard</span>
                </Link>

                <Link
                  to="/history"
                  className="c-btn c-btn-secondary w-full py-3.5 text-xs flex items-center justify-center gap-2"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>View Interview History</span>
                </Link>
              </div>
            </div>

            {/* Candidate Privacy & Security Ledger */}
            <div className="c-card-flat p-5 space-y-2 rounded-2xl">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" style={{ color: 'var(--c-accent)' }} />
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--c-text)' }}>
                  Secure Data Archival
                </span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                Your responses are stored securely and associated strictly with your authenticated candidate profile.
              </p>
            </div>

          </div>

        </div>

      </div>
    </InterviewFlowLayout>
  );
};

export default InterviewCompletion;
