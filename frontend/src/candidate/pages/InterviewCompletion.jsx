import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  Check,
  CheckCircle2,
  ArrowRight,
  AlertCircle,
  LayoutDashboard,
  History,
} from 'lucide-react';
import InterviewFlowLayout from '../layouts/InterviewFlowLayout';
import { getActiveInterview, getRealEvaluation, startEvaluation, endInterview } from '../services/candidateApi';
import { formatDate } from '../../utils/dateFormat';

const InterviewCompletion = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [interview, setInterview] = useState(null);
  const [realEval, setRealEval] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [elapsed, setElapsed] = useState(0);

  // Seconds since this page opened, shown while the answers are analysed.
  const finished = realEval?.evaluationStatus === 'completed' || realEval?.evaluationStatus === 'failed';
  useEffect(() => {
    if (finished) return undefined;
    const t = setInterval(() => setElapsed((sec) => sec + 1), 1000);
    return () => clearInterval(t);
  }, [finished]);

  useEffect(() => {
    let isMounted = true;
    let pollInterval = null;

    Promise.all([
      getActiveInterview(id),
      getRealEvaluation(id).catch(() => ({ evaluationStatus: 'pending_evaluation', evaluation: null })),
    ])
      .then(async ([interviewData, evalData]) => {
        if (!isMounted) return;
        if (!interviewData) {
          setError('Interview session could not be located.');
          return;
        }
        setInterview(interviewData);
        setRealEval(evalData);

        // Ensure evaluation is triggered if pending
        const currentStatus = evalData?.evaluationStatus || interviewData.evaluationStatus || 'pending_evaluation';
        if (currentStatus === 'pending_evaluation') {
          if (interviewData.status !== 'Completed') {
            await endInterview(id).catch(() => {});
          } else {
            await startEvaluation(id).catch(() => {});
          }
          if (isMounted) {
            setRealEval((prev) => ({ ...(prev || {}), evaluationStatus: 'processing' }));
          }
        }

        // Poll every 3s if not yet completed
        const isDone = evalData?.evaluationStatus === 'completed' || interviewData.evaluationStatus === 'completed';
        if (!isDone) {
          pollInterval = setInterval(async () => {
            try {
              const latestEval = await getRealEvaluation(id);
              if (!isMounted) return;
              setRealEval(latestEval);
              if (latestEval.evaluationStatus === 'completed' || latestEval.evaluationStatus === 'failed') {
                clearInterval(pollInterval);
                pollInterval = null;
              }
            } catch {
              // Ignore polling errors
            }
          }, 3000);
        }
      })
      .catch((err) => {
        if (isMounted) setError(err.message || 'Failed to load interview session details.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [id]);

  if (loading) {
    return (
      <InterviewFlowLayout step="complete">
        <div className="py-16 flex flex-col items-center justify-center gap-3 text-center">
          <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--c-accent)', borderTopColor: 'transparent' }} />
          <p className="text-xs font-medium" style={{ color: 'var(--c-text-secondary)' }}>
            Loading…
          </p>
        </div>
      </InterviewFlowLayout>
    );
  }

  if (error || !interview) {
    return (
      <InterviewFlowLayout step="complete">
        <div className="max-w-md py-14 space-y-4">
          <div className="w-10 h-10 rounded-md flex items-center justify-center border"
            style={{ background: 'var(--c-badge-danger-bg)', borderColor: 'var(--c-badge-danger-border)', color: 'var(--c-danger)' }}
          >
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h1 className="c-heading text-xl font-bold" style={{ color: 'var(--c-text)' }}>Interview not found</h1>
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
  const isTyped = (r) => (r.response_mode || r.responseMode) === 'text';
  const totalRecordedSeconds = (interview.responses || []).filter((r) => !isTyped(r)).reduce(
    (sum, r) => sum + (r.duration_seconds || r.durationSeconds || 0),
    0
  );
  const spokenAnswers = (interview.responses || []).filter((r) => (r.response_mode || r.responseMode || 'spoken') !== 'text').length;
  const usedCamera = !!interview.recordingConsent?.camera;

  const formatDuration = (secs) => {
    if (!secs) return null;
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    if (mins === 0) return `${remSecs}s`;
    return remSecs > 0 ? `${mins}m ${remSecs}s` : `${mins}m`;
  };
  const clock = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`;
  const typeName = { technical: 'Technical', behavioral: 'HR & Behavioral', situational: 'Situational' }[interview.type] || 'Technical';

  const isEvalCompleted =
    (realEval?.evaluationStatus === 'completed' || interview.evaluationStatus === 'completed') &&
    !!realEval?.evaluation;
  const isEvalFailed = realEval?.evaluationStatus === 'failed';

  const checks = [
    { label: 'What you said', note: 'content and key points' },
    spokenAnswers > 0 && { label: 'How you said it', note: 'pace, pauses and filler words' },
    usedCamera && spokenAnswers > 0 && { label: 'On camera', note: 'expression and staying in frame' },
  ].filter(Boolean);

  return (
    <InterviewFlowLayout step="complete">
      <div className="max-w-3xl mx-auto py-6 sm:py-10 space-y-6">

        {/* Status: one clear next step */}
        <section
          className="rounded-xl border p-6 sm:p-8 text-center space-y-5"
          style={{ background: 'var(--c-surface)', borderColor: isEvalCompleted ? 'var(--c-success)' : 'var(--c-border)' }}
          role="status"
          aria-live="polite"
        >
          {isEvalCompleted ? (
            <>
              <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center" style={{ background: 'var(--c-badge-success-bg)', color: 'var(--c-success)' }}>
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h1 className="c-heading text-2xl sm:text-3xl font-bold" style={{ color: 'var(--c-text)' }}>Your results are ready</h1>
                <p className="text-sm" style={{ color: 'var(--c-text-secondary)' }}>
                  We analysed your {answeredCount} answer{answeredCount === 1 ? '' : 's'} for {interview.role}.
                </p>
              </div>
              <Link
                to={`/interview/${id}/results`}
                className="c-btn c-btn-primary mx-auto w-full sm:w-auto px-8 py-3.5 text-sm font-bold rounded-md inline-flex items-center justify-center gap-2"
              >
                See my results <ArrowRight className="w-4 h-4" />
              </Link>
            </>
          ) : isEvalFailed ? (
            <>
              <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center" style={{ background: 'var(--c-badge-danger-bg)', color: 'var(--c-danger)' }}>
                <AlertCircle className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h1 className="c-heading text-2xl sm:text-3xl font-bold" style={{ color: 'var(--c-text)' }}>We could not analyse your answers</h1>
                <p className="text-sm" style={{ color: 'var(--c-text-secondary)' }}>
                  Your answers are saved. Open the results page and press Try again.
                </p>
              </div>
              <Link
                to={`/interview/${id}/results`}
                className="c-btn c-btn-primary mx-auto w-full sm:w-auto px-8 py-3.5 text-sm font-bold rounded-md inline-flex items-center justify-center gap-2"
              >
                Open results <ArrowRight className="w-4 h-4" />
              </Link>
            </>
          ) : (
            <>
              <div className="w-16 h-16 mx-auto rounded-full border-4 animate-spin" style={{ borderColor: 'var(--c-border)', borderTopColor: 'var(--c-accent)' }} />
              <div className="space-y-1.5">
                <h1 className="c-heading text-2xl sm:text-3xl font-bold" style={{ color: 'var(--c-text)' }}>Analysing your answers…</h1>
                <p className="text-sm max-w-lg mx-auto" style={{ color: 'var(--c-text-secondary)' }}>
                  This usually takes about a minute. Your answers are saved, so you can wait here or come back later from Interview History.
                </p>
                <p className="block w-full text-center font-mono text-xs" style={{ color: 'var(--c-text-muted)' }} aria-label="Time elapsed">{clock}</p>
              </div>
              <ul className="max-w-sm mx-auto text-left space-y-2">
                {checks.map((c) => (
                  <li key={c.label} className="flex items-center gap-3 rounded-lg border px-3.5 py-2.5" style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface-muted)' }}>
                    <span className="w-2 h-2 rounded-full animate-pulse shrink-0" style={{ background: 'var(--c-accent)' }} />
                    <span className="text-sm">
                      <strong style={{ color: 'var(--c-text)' }}>{c.label}</strong>
                      <span style={{ color: 'var(--c-text-muted)' }}> · {c.note}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-xs" style={{ color: 'var(--c-text-muted)' }}>The button to your results appears here when they are ready.</p>
            </>
          )}

          <div className="flex items-center justify-center gap-5 pt-1 text-xs font-semibold">
            <Link to="/dashboard" className="flex items-center gap-1.5 hover:underline underline-offset-2" style={{ color: 'var(--c-text-secondary)' }}>
              <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
            </Link>
            <Link to="/history" className="flex items-center gap-1.5 hover:underline underline-offset-2" style={{ color: 'var(--c-text-secondary)' }}>
              <History className="w-3.5 h-3.5" /> Interview history
            </Link>
          </div>
        </section>

        {/* What was submitted */}
        <section className="rounded-xl border p-5 sm:p-6 space-y-4" style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)' }}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="c-heading text-base font-bold" style={{ color: 'var(--c-text)' }}>What you submitted</h2>
            <div className="flex flex-wrap gap-2">
              {[
                `${typeName} interview`,
                `${answeredCount} of ${totalQuestions} answered`,
                totalRecordedSeconds > 0 && `${formatDuration(totalRecordedSeconds)} speaking`,
              ].filter(Boolean).map((t) => (
                <span key={t} className="rounded-full border px-2.5 py-0.5 text-[11px] font-medium" style={{ borderColor: 'var(--c-border)', color: 'var(--c-text-secondary)' }}>{t}</span>
              ))}
            </div>
          </div>
          <ol className="space-y-2">
            {interview.questions.map((q, i) => {
              const resp = (interview.responses || []).find((r) => (r.question_id || r.questionId) === q.id);
              const typed = (resp?.response_mode || resp?.responseMode) === 'text';
              const duration = resp?.duration_seconds || resp?.durationSeconds;
              return (
                <li key={q.id} className="flex items-start gap-3 rounded-lg px-3 py-2.5" style={{ background: 'var(--c-surface-muted)' }}>
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                    style={{ background: resp ? 'var(--c-success)' : 'var(--c-border)', color: resp ? '#fff' : 'var(--c-text-muted)' }}>
                    {resp ? <Check className="w-3.5 h-3.5" /> : i + 1}
                  </span>
                  <p className="flex-1 min-w-0 text-sm leading-snug" style={{ color: 'var(--c-text)' }}>{q.question_text}</p>
                  <span className="shrink-0 text-[11px] font-medium pt-0.5" style={{ color: 'var(--c-text-muted)' }}>
                    {!resp ? 'Skipped' : typed ? 'Typed' : duration ? `${duration}s` : 'Answered'}
                  </span>
                </li>
              );
            })}
          </ol>
        </section>
      </div>
    </InterviewFlowLayout>
  );
};

export default InterviewCompletion;
