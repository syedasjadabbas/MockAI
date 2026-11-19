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
  Brain,
  Video,
  VideoOff,
  Activity,
  Mic,
  FileText,
  Eye,
  ShieldAlert,
  ChevronDown,
  HelpCircle,
  Info,
  Trash2,
} from 'lucide-react';
import InterviewFlowLayout from '../layouts/InterviewFlowLayout';
import ScoreRing from '../components/ScoreRing';
import { getActiveInterview, getRealEvaluation, startEvaluation, endInterview, deleteRecordings } from '../services/candidateApi';
import { formatDate } from '../../utils/dateFormat';

// FR17-FR23 - Real Multimodal Evaluation Results (Assessment Report Layout)
const EvaluationResults = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [interview, setInterview] = useState(null);
  const [realEval, setRealEval] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openQuestion, setOpenQuestion] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  // FR 24-03 - interactive score help
  const [openWhy, setOpenWhy] = useState(null);
  const [helpTopic, setHelpTopic] = useState(null);
  // NFR 11 - delete recordings
  const [confirmDeleteRec, setConfirmDeleteRec] = useState(false);
  const [deletingRec, setDeletingRec] = useState(false);
  const [recMessage, setRecMessage] = useState('');

  useEffect(() => {
    let isMounted = true;
    let pollInterval = null;

    const initLoad = async () => {
      try {
        const [interviewData, evalData] = await Promise.all([
          getActiveInterview(id),
          getRealEvaluation(id).catch(() => ({ evaluationStatus: 'pending_evaluation', evaluation: null })),
        ]);

        if (!isMounted) return;
        if (!interviewData) {
          setError('Interview session could not be located.');
          setLoading(false);
          return;
        }

        setInterview(interviewData);
        setRealEval(evalData);
        setLoading(false);

        // If evaluation is still pending or processing, kick off and poll
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

        if (currentStatus !== 'completed' && currentStatus !== 'failed') {
          pollInterval = setInterval(async () => {
            try {
              const latestEval = await getRealEvaluation(id);
              if (!isMounted) return;
              setRealEval(latestEval);

              if (latestEval?.evaluationStatus === 'completed' || latestEval?.evaluationStatus === 'failed') {
                clearInterval(pollInterval);
                pollInterval = null;
                // Re-fetch interview document to synchronize denormalized score/status fields
                const updatedInterview = await getActiveInterview(id);
                if (isMounted && updatedInterview) {
                  setInterview(updatedInterview);
                }
              }
            } catch {
              // Ignore background polling errors
            }
          }, 3000);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load evaluation results.');
          setLoading(false);
        }
      }
    };

    initLoad();

    return () => {
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [id]);

  const evaluationStatus = realEval?.evaluationStatus || interview?.evaluationStatus || 'pending_evaluation';
  const evaluation = realEval?.evaluation || interview?.evaluation || (interview?.evaluationSource === 'real' ? interview : null);
  const isCompleted = (evaluationStatus === 'completed' && !!evaluation) || !!evaluation?.overall_score || !!interview?.score;
  const isProcessing = evaluationStatus === 'processing' || evaluationStatus === 'pending_evaluation';
  const isFailed = evaluationStatus === 'failed';

  const overallScore = evaluation?.overall_score ?? interview?.score ?? 0;
  const confidenceScore = evaluation?.confidence_score ?? interview?.confidence ?? null;
  const confidenceLevel = evaluation?.confidence_level ?? interview?.confidenceLevel ?? null;
  const stressScore = evaluation?.stress_score ?? interview?.stressScore ?? null;
  const stressLevel = evaluation?.stress_level ?? interview?.stress ?? null;
  const interpretation = evaluation?.interpretation ?? interview?.interpretation ?? '';
  const strengths = evaluation?.strengths ?? interview?.strengths ?? [];
  const weaknesses = evaluation?.weaknesses ?? interview?.weaknesses ?? [];
  const suggestions = evaluation?.suggestions ?? interview?.suggestions ?? [];
  const insights = evaluation?.insights ?? interview?.insights ?? null;
  const scoreRationale = insights?.score_explanation?.score_rationale ?? null;
  const dimensionBreakdown = insights?.score_explanation?.dimension_breakdown ?? {};
  const behavioralObservations = insights?.score_explanation?.behavioral_observations ?? [];
  const summaryReport = evaluation?.summary_report ?? interview?.summaryReport ?? null;
  const performanceRating = summaryReport?.performance_overview?.performance_rating || (overallScore >= 70 ? 'Proficient Performance' : (overallScore >= 55 ? 'Competent Performance' : 'Developing'));
  const dimensionScores = evaluation?.dimension_scores ?? interview?.dimensionScores ?? {
    technical_content: 0,
    communication_fluency: 0,
    behavioral_composure: 0,
  };
  const perQuestionEval = evaluation?.per_question ?? [];
  const languageSummary = evaluation?.language_summary ?? insights?.language_analysis ?? interview?.languageSummary ?? null;
  const facialSummary = evaluation?.facial_summary;
  const hasVisionSummary = facialSummary?.status === 'completed';
  // Camera presence & expression flags (measured per answer by the backend)
  const cameraConduct = evaluation?.camera_conduct ?? insights?.camera_conduct ?? null;
  const offCameraAnswers = cameraConduct?.off_camera_answers || [];
  const flaggedAnswers = cameraConduct?.flagged_answers || [];
  const hasCameraIssues = offCameraAnswers.length > 0 || flaggedAnswers.length > 0;

  const answeredCount = (interview?.responses || []).length;
  const totalQuestions = (interview?.questions || []).length;

  if (loading) {
    return (
      <InterviewFlowLayout step="results">
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-center">
          <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--c-accent)', borderTopColor: 'transparent' }} />
          <p className="text-xs font-medium" style={{ color: 'var(--c-text-secondary)' }}>
            Loading your results…
          </p>
        </div>
      </InterviewFlowLayout>
    );
  }

  if (error || !interview) {
    return (
      <InterviewFlowLayout step="results">
        <div className="max-w-md py-16 space-y-4">
          <div className="w-10 h-10 rounded-md flex items-center justify-center border"
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

  const verdictFor = (score) => (
    score >= 75 ? 'Strong' : score >= 55 ? 'Good' : score >= 35 ? 'Getting there' : 'Needs work'
  );
  const firstSentence = (text) => {
    const match = (text || '').trim().match(/^.*?[.!?](\s|$)/);
    return (match ? match[0] : (text || '')).trim();
  };
  const cameraAreaMeasured = hasVisionSummary || offCameraAnswers.length > 0;
  const spokenCount = (interview?.responses || []).filter((r) => (r.response_mode || r.responseMode) !== 'text').length;
  const areaRows = [
    {
      key: 'content',
      why: dimensionBreakdown.technical,
      icon: FileText,
      label: 'What you said',
      score: dimensionScores?.technical_content,
      measured: true,
      help: 'Did your answers cover the key points a good answer would?',
    },
    {
      key: 'speaking',
      why: dimensionBreakdown.communication,
      icon: Mic,
      label: 'How you said it',
      score: dimensionScores?.communication_fluency,
      // Typed answers have no speech to measure, so an all-typed interview
      // shows Not scored instead of 0%.
      measured: spokenCount > 0,
      help: spokenCount > 0
        ? 'Your speaking pace, pauses, and filler words like "um".'
        : 'All answers were typed, so speaking was not scored.',
    },
    {
      key: 'camera',
      why: dimensionBreakdown.behavioral,
      icon: Eye,
      label: 'On camera',
      score: dimensionScores?.behavioral_composure,
      measured: cameraAreaMeasured,
      help: offCameraAnswers.length > 0 && !hasVisionSummary
        ? `You were out of frame for most of answer${offCameraAnswers.length > 1 ? 's' : ''} ${offCameraAnswers.join(', ')}.`
        : cameraAreaMeasured
        ? 'Staying in frame, facing the camera and keeping a steady expression.'
        : facialSummary?.status === 'no_face_detected'
        ? 'Video was recorded but no face was found, so this was not scored.'
        : 'No video was used, so this was not scored.',
    },
  ];
  const topFixes = weaknesses.slice(0, 3);
  const topStrengths = strengths.slice(0, 2);

  // FR 24 / 3.3.24 - the candidate asks about their score and the system
  // answers from the evaluation itself (no generic text).
  const notScoredParts = areaRows.filter((a) => !a.measured).map((a) => a.label.toLowerCase());
  const helpTopics = [
    {
      id: 'overall',
      question: 'How was my overall score worked out?',
      answer: scoreRationale
        ? [scoreRationale]
        : ['Each answer is scored on what you said (50%), how you said it (30%) and how you came across on camera (20%). Harder questions count more in the overall score.'],
    },
    {
      id: 'observed',
      question: 'What did the system notice about how I answered?',
      answer: behavioralObservations.length ? behavioralObservations : ['No delivery observations were recorded for this interview.'],
    },
    {
      id: 'missing',
      question: notScoredParts.length ? `Why was ${notScoredParts.join(' and ')} not scored?` : 'Were all parts of my answers scored?',
      answer: notScoredParts.length
        ? [
            'A part is only scored when there is enough evidence for it. Answers typed instead of spoken have no speaking score, and interviews without a camera (or with your face out of frame) have no camera score.',
            'When a part is missing, its weight is shared between the parts that were measured, so you are not marked down for it.',
          ]
        : ['Yes. Every part of your answers had enough evidence to be scored.'],
    },
    {
      id: 'improve',
      question: 'What would raise my score the most?',
      answer: (weaknesses.length ? weaknesses.slice(0, 2) : ['Go deeper in your answers: mention trade-offs, standard practice and real examples.']),
    },
  ];
  const showRecordings = isCompleted && (interview?.hasRecordings || interview?.recordingsDeletedAt);

  const handleDeleteRecordings = async () => {
    setDeletingRec(true);
    setRecMessage('');
    try {
      const res = await deleteRecordings(id);
      setInterview((prev) => ({ ...prev, hasRecordings: false, recordingsDeletedAt: res?.interview?.recordings_deleted_at || new Date().toISOString() }));
      setRecMessage('Your recordings for this interview were deleted. Your scores, transcripts and feedback are still here.');
    } catch (err) {
      setRecMessage(err.message || 'Could not delete the recordings. Please try again.');
    } finally {
      setDeletingRec(false);
      setConfirmDeleteRec(false);
    }
  };

  // ---------------------------------------------------------------------
  // Plain-language helpers for a non-technical reader
  // ---------------------------------------------------------------------
  const toneFor = (score) => (
    score >= 75 ? 'success' : score >= 55 ? 'accent' : score >= 35 ? 'warning' : 'danger'
  );
  const colorFor = (score) => `var(--c-${toneFor(score)})`;
  const paceWords = (pacing, wpm) => {
    const p = String(pacing || '').toLowerCase();
    if (p.includes('fast') || (wpm && wpm > 170)) return 'a little fast';
    if (p.includes('slow') || (wpm && wpm < 100)) return 'a little slow';
    return 'a good pace';
  };
  const levelTone = {
    High: 'success', Moderate: 'accent', Developing: 'warning', Low: 'warning',
  };
  const stressTone = { Low: 'success', Moderate: 'warning', Elevated: 'danger', High: 'danger' };
  const confidenceAssessed = confidenceScore != null && confidenceLevel && confidenceLevel !== 'Not Assessed';
  const stressAssessed = stressScore != null && stressLevel && stressLevel !== 'Not Assessed';
  const typeName = { technical: 'Technical', behavioral: 'HR & Behavioral', situational: 'Situational' }[interview?.type] || 'Technical';
  const summaryText = (() => {
    const text = (interpretation || '').replace(/^[A-Za-z ]+:\s*you scored \d+%\.\s*/i, '').trim();
    return text || `This score combines what you said, how you said it, and how you came across, across ${answeredCount} answered questions.`;
  })();
  const languageReady = languageSummary?.status === 'completed';
  const corrections = (languageSummary?.issue_examples || []).slice(0, 3);

  return (
    <InterviewFlowLayout step="results">
      <div className="max-w-5xl mx-auto py-6 sm:py-10 space-y-6">

        {/* 1. Which interview */}
        <header className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--c-text-muted)' }}>Your results</p>
            {isProcessing && (
              <span className="c-badge c-badge-accent text-[11px] font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 border-2 border-current border-t-transparent rounded-full animate-spin" /> Preparing
              </span>
            )}
            {isFailed && <span className="c-badge c-badge-danger text-[11px] font-bold">Could not be prepared</span>}
          </div>
          <h1 className="c-heading text-3xl sm:text-4xl font-bold tracking-tight" style={{ color: 'var(--c-text)' }}>
            {interview?.role || 'Interview'}
          </h1>
          <div className="flex flex-wrap gap-2">
            {[`${typeName} interview`, `${answeredCount} of ${totalQuestions} questions answered`, formatDate(interview?.completedAt || interview?.createdAt)].map((t) => (
              <span key={t} className="rounded-full border px-3 py-1 text-xs font-medium"
                style={{ borderColor: 'var(--c-border)', color: 'var(--c-text-secondary)', background: 'var(--c-surface)' }}>{t}</span>
            ))}
          </div>
        </header>

        {isFailed && (
          <Card>
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--c-danger)' }} />
              <div className="space-y-2">
                <p className="text-base font-bold" style={{ color: 'var(--c-text)' }}>We could not prepare your results</p>
                <p className="text-sm" style={{ color: 'var(--c-text-secondary)' }}>
                  {evaluation?.failed_reason || 'Something went wrong while scoring this interview.'} Your answers are saved.
                </p>
                {/* NFR 7-03 - retry from the saved answers */}
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await startEvaluation(id);
                      window.location.reload();
                    } catch (err) {
                      setError(err.message || 'Could not restart the evaluation.');
                    }
                  }}
                  className="c-btn c-btn-primary px-5 py-2.5 text-sm font-bold rounded-md inline-flex items-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" /> Try again
                </button>
              </div>
            </div>
          </Card>
        )}

        {!isCompleted && !isFailed && (
          <Card className="text-center">
            <div className="w-12 h-12 mx-auto rounded-full border-4 animate-spin mb-4" style={{ borderColor: 'var(--c-border)', borderTopColor: 'var(--c-accent)' }} />
            <p className="text-lg font-bold" style={{ color: 'var(--c-text)' }}>Preparing your results…</p>
            <p className="text-sm mt-1" style={{ color: 'var(--c-text-secondary)' }}>Your answers are saved. This page updates by itself in a minute or two.</p>
          </Card>
        )}

        {isCompleted && (
          <>
            {/* 2. The answer to "how did I do?" */}
            <Card className="!p-0 overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-5">
                <div className="lg:col-span-2 p-6 sm:p-8 flex flex-col items-center text-center gap-3 border-b lg:border-b-0 lg:border-r" style={{ borderColor: 'var(--c-border)' }}>
                  <ScoreRing value={Math.round(overallScore)} suffix="%" size={168} strokeWidth={14} tone={toneFor(overallScore)} />
                  <div>
                    <p className="c-heading text-3xl font-bold" style={{ color: colorFor(overallScore) }}>{verdictFor(overallScore)}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--c-text-muted)' }}>Overall score out of 100</p>
                  </div>
                  <p className="text-sm leading-relaxed max-w-xs" style={{ color: 'var(--c-text-secondary)' }}>{summaryText}</p>
                </div>

                {/* The three skills that make up the score (FR 21, FR 29) */}
                <div className="lg:col-span-3 p-6 sm:p-8 space-y-5">
                  <div>
                    <h2 className="text-base font-bold" style={{ color: 'var(--c-text)' }}>How the score is made up</h2>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--c-text-muted)' }}>Three things are checked in every answer.</p>
                  </div>
                  {areaRows.map(({ key, icon: Icon, label, score, measured, help, why }) => (
                    <div key={key} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--c-text)' }}>
                          <Icon className="w-4 h-4" style={{ color: 'var(--c-text-muted)' }} /> {label}
                        </span>
                        {measured ? (
                          <span className="text-sm font-bold" style={{ color: colorFor(score ?? 0) }}>
                            {Math.round(score ?? 0)}% <span className="font-medium" style={{ color: 'var(--c-text-muted)' }}>· {verdictFor(score ?? 0)}</span>
                          </span>
                        ) : (
                          <span className="text-xs font-semibold" style={{ color: 'var(--c-text-muted)' }}>Not scored</span>
                        )}
                      </div>
                      <Bar100 value={measured ? score : 0} color={colorFor(score ?? 0)} />
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-xs leading-relaxed" style={{ color: 'var(--c-text-muted)' }}>{help}</p>
                        {why && (
                          <button type="button" onClick={() => setOpenWhy(openWhy === key ? null : key)} aria-expanded={openWhy === key}
                            className="shrink-0 text-[11px] font-semibold hover:underline" style={{ color: 'var(--c-accent)' }}>
                            {openWhy === key ? 'Hide' : 'Why?'}
                          </button>
                        )}
                      </div>
                      {openWhy === key && why && (
                        <p className="text-xs leading-relaxed p-3 rounded-lg" style={{ color: 'var(--c-text)', background: 'var(--c-surface-muted)' }}>{why}</p>
                      )}
                    </div>
                  ))}
                  <p className="text-[11px] flex items-start gap-1.5 pt-1" style={{ color: 'var(--c-text-muted)' }}>
                    <Info className="w-3.5 h-3.5 shrink-0 mt-px" /> Practice feedback from an automated coach, not a hiring decision.
                  </p>
                </div>
              </div>
            </Card>

            {/* 3. What to do next (FR 25, FR 26) */}
            {(topStrengths.length > 0 || topFixes.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <h2 className="text-base font-bold flex items-center gap-2 mb-3" style={{ color: 'var(--c-text)' }}>
                    <span className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'var(--c-badge-success-bg)', color: 'var(--c-success)' }}><ThumbsUp className="w-3.5 h-3.5" /></span>
                    Keep doing
                  </h2>
                  {topStrengths.length ? (
                    <ul className="space-y-2.5">
                      {topStrengths.map((st, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--c-success)' }} /><span>{st}</span>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="text-sm" style={{ color: 'var(--c-text-muted)' }}>Strengths show up here once an answer covers the key points well.</p>}
                </Card>
                <Card>
                  <h2 className="text-base font-bold flex items-center gap-2 mb-3" style={{ color: 'var(--c-text)' }}>
                    <span className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'var(--c-badge-warning-bg)', color: 'var(--c-warning)' }}><Lightbulb className="w-3.5 h-3.5" /></span>
                    Work on next
                  </h2>
                  {topFixes.length ? (
                    <ol className="space-y-2.5">
                      {topFixes.map((fix, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                          <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 mt-px" style={{ background: 'var(--c-surface-muted)', color: 'var(--c-text)' }}>{i + 1}</span>
                          <span>{fix}</span>
                        </li>
                      ))}
                    </ol>
                  ) : <p className="text-sm" style={{ color: 'var(--c-text-muted)' }}>Nothing stood out to fix in this interview.</p>}
                  <Link to={`/interview/${id}/feedback`} className="inline-flex items-center gap-1 text-xs font-semibold mt-4 hover:underline" style={{ color: 'var(--c-accent)' }}>
                    See your practice plan <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </Card>
              </div>
            )}

            {/* 4. Question by question (FR 18, FR 29) */}
            <Card>
              <SectionTitle hint="Tap a question to see your answer and what to add.">Question by question</SectionTitle>

              {(offCameraAnswers.length > 0 || flaggedAnswers.length > 0) && (
                <div className="c-badge-warning rounded-lg p-3 mb-4 flex items-start gap-2 text-xs leading-relaxed">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>
                    {offCameraAnswers.length > 0 && <>You were out of the camera frame for most of answer{offCameraAnswers.length > 1 ? 's' : ''} {offCameraAnswers.join(', ')}. </>}
                    {flaggedAnswers.length > 0 && <>Something unusual was seen on camera in answer{flaggedAnswers.length > 1 ? 's' : ''} {flaggedAnswers.join(', ')}; open {flaggedAnswers.length > 1 ? 'them' : 'it'} for details.</>}
                  </p>
                </div>
              )}

              <ol className="space-y-3">
                {(interview?.questions || []).map((q, idx) => {
                  const resp = (interview?.responses || []).find((r) => (r.question_id || r.questionId) === q.id);
                  const qEval = perQuestionEval.find((item) => (item.question_id || item.questionId) === q.id);
                  const isRecorded = !!resp;
                  const typed = (resp?.response_mode || resp?.responseMode) === 'text';
                  const failed = qEval?.status === 'failed';
                  const questionScore = qEval?.multimodal?.score ?? qEval?.score;
                  const hasScore = isRecorded && !failed && questionScore != null;
                  const transcript = qEval?.asr?.transcript;
                  const covered = qEval?.text_analysis?.covered_concepts || [];
                  const missing = qEval?.text_analysis?.missing_concepts || qEval?.missing_concepts || [];
                  const delivery = qEval?.delivery;
                  const wpm = delivery?.words_per_minute;
                  const fillers = delivery?.filler_count ?? delivery?.filler_words_count;
                  const cameraNotes = qEval?.camera_conduct?.notes || [];
                  const issues = qEval?.text_analysis?.language_analysis?.grammar_issues || [];
                  const feedbackText = cameraNotes.reduce((txt, note) => txt.replace(note, ''), qEval?.feedback || qEval?.nlp?.feedback || '').trim();
                  const isOpen = openQuestion === q.id;
                  const summaryLine = !isRecorded
                    ? 'You skipped this question.'
                    : failed
                    ? 'This answer could not be processed.'
                    : firstSentence(feedbackText).replace(/\s*\(\d+% match[^)]*\)/i, '') || 'Scored.';

                  return (
                    <li key={q.id} className="rounded-xl border overflow-hidden" style={{ borderColor: isOpen ? 'var(--c-accent)' : 'var(--c-border)', background: 'var(--c-surface-muted)' }}>
                      <button type="button" onClick={() => setOpenQuestion(isOpen ? null : q.id)} aria-expanded={isOpen}
                        className="w-full text-left p-4 flex items-start gap-3">
                        <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                          style={{ background: hasScore ? colorFor(questionScore) : 'var(--c-border)', color: hasScore ? '#fff' : 'var(--c-text-muted)' }}>
                          {idx + 1}
                        </span>
                        <span className="flex-1 min-w-0 space-y-2">
                          <span className="block text-sm font-semibold leading-snug" style={{ color: 'var(--c-text)' }}>{q.question_text}</span>
                          {hasScore && <Bar100 value={questionScore} color={colorFor(questionScore)} height="h-1.5" />}
                          <span className="block text-xs leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>{summaryLine}</span>
                        </span>
                        <span className="shrink-0 flex flex-col items-end gap-1">
                          {hasScore ? (
                            <>
                              <span className="text-base font-bold" style={{ color: colorFor(questionScore) }}>{Math.round(questionScore)}%</span>
                              <span className="hidden sm:block text-[11px] font-medium" style={{ color: 'var(--c-text-muted)' }}>{verdictFor(questionScore)}</span>
                            </>
                          ) : (
                            <span className="c-badge c-badge-muted text-[11px]">{failed ? 'Not processed' : 'Skipped'}</span>
                          )}
                          <ChevronDown className={`w-4 h-4 mt-1 transition-transform ${isOpen ? 'rotate-180' : ''}`} style={{ color: 'var(--c-text-muted)' }} />
                        </span>
                      </button>

                      {isOpen && (
                        <div className="px-4 pb-4 sm:pl-[60px] space-y-4">
                          {failed && <p className="text-xs" style={{ color: 'var(--c-danger)' }}>{qEval?.failed_reason || 'The recording for this answer could not be read.'}</p>}
                          {transcript && (
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--c-text-muted)' }}>{typed ? 'Your typed answer' : 'What you said'}</p>
                              <p className="text-sm leading-relaxed p-3 rounded-lg border italic" style={{ color: 'var(--c-text)', borderColor: 'var(--c-border)', background: 'var(--c-surface)' }}>“{transcript}”</p>
                            </div>
                          )}
                          {(covered.length > 0 || missing.length > 0) && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {covered.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--c-success)' }}><CheckCircle2 className="w-3.5 h-3.5" /> You covered</p>
                                  <div className="flex flex-wrap gap-1.5">{covered.map((c) => <span key={c} className="c-badge c-badge-success text-[11px]">{c}</span>)}</div>
                                </div>
                              )}
                              {missing.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--c-warning)' }}><Lightbulb className="w-3.5 h-3.5" /> Try to also mention</p>
                                  <div className="flex flex-wrap gap-1.5">{missing.map((c) => <span key={c} className="c-badge c-badge-warning text-[11px]">{c}</span>)}</div>
                                </div>
                              )}
                            </div>
                          )}
                          {!typed && isRecorded && !failed && (wpm || fillers != null) && (
                            <p className="text-xs flex flex-wrap gap-x-4 gap-y-1" style={{ color: 'var(--c-text-secondary)' }}>
                              {wpm ? <span><Mic className="inline w-3.5 h-3.5 mr-1" />You spoke at {Math.round(wpm)} words a minute, {paceWords(delivery?.pacing, wpm)}.</span> : null}
                              {fillers != null ? <span>{fillers === 0 ? 'No filler words like "um".' : `${fillers} filler word${fillers === 1 ? '' : 's'} like "um".`}</span> : null}
                            </p>
                          )}
                          {issues.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--c-text)' }}>Small language fixes</p>
                              <ul className="space-y-1 text-xs">
                                {issues.slice(0, 3).map((issue, i) => (
                                  <li key={i}>
                                    <span className="line-through" style={{ color: 'var(--c-text-muted)' }}>{issue.excerpt}</span>
                                    <span style={{ color: 'var(--c-text-muted)' }}> → </span>
                                    <span className="font-semibold" style={{ color: 'var(--c-text)' }}>{issue.suggestion}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {cameraNotes.length > 0 && (
                            <div className="c-badge-warning rounded-lg p-3 text-xs space-y-1">
                              <p className="font-semibold flex items-center gap-1.5"><Video className="w-3.5 h-3.5" /> On camera</p>
                              {cameraNotes.map((note, i) => <p key={i}>{note}</p>)}
                            </div>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            </Card>

            {/* 5. How you came across (FR 22, FR 23, FR 17) */}
            <Card>
              <SectionTitle hint="Estimated from your voice and, if the camera was on, your face. It describes what was seen, not how you felt.">How you came across</SectionTitle>
              {confidenceAssessed || stressAssessed || hasVisionSummary ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    {
                      label: 'Confidence', show: true, ok: confidenceAssessed,
                      value: confidenceLevel, tone: levelTone[confidenceLevel] || 'accent', bar: confidenceScore,
                      hint: 'From how steadily you spoke and your expression.',
                    },
                    {
                      label: 'Stress', show: true, ok: stressAssessed,
                      value: stressLevel, tone: stressTone[stressLevel] || 'warning', bar: stressScore,
                      hint: 'From pauses, hesitation and visible tension.',
                    },
                    {
                      label: 'Usual expression', show: true, ok: hasVisionSummary,
                      value: facialSummary?.dominant_expression, tone: 'accent',
                      hint: 'The expression seen most often.',
                    },
                    {
                      label: 'Steadiness', show: true, ok: hasVisionSummary,
                      value: facialSummary?.overall_composure, tone: 'accent',
                      hint: 'How much your expression changed.',
                    },
                  ].map((t) => (
                    <div key={t.label} className="rounded-xl p-4 space-y-2" style={{ background: 'var(--c-surface-muted)' }}>
                      <p className="text-xs font-semibold" style={{ color: 'var(--c-text-muted)' }}>{t.label}</p>
                      {t.ok ? (
                        <>
                          <p className="text-xl font-bold" style={{ color: `var(--c-${t.tone})` }}>{t.value}</p>
                          {t.bar != null && <Bar100 value={t.bar} color={`var(--c-${t.tone})`} height="h-1.5" />}
                        </>
                      ) : (
                        <p className="text-sm font-semibold" style={{ color: 'var(--c-text-muted)' }}>Not enough to judge</p>
                      )}
                      <p className="text-[11px] leading-relaxed" style={{ color: 'var(--c-text-muted)' }}>{t.hint}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm rounded-xl p-4" style={{ color: 'var(--c-text-secondary)', background: 'var(--c-surface-muted)' }}>
                  {spokenCount === 0
                    ? 'Your answers were typed, so confidence and stress could not be judged. Answer by speaking next time to see them.'
                    : 'Your spoken answers were too short to judge confidence and stress. Longer answers (about 30 seconds or more) give a reading.'}
                </p>
              )}

              {languageReady && (
                <div className="mt-5 pt-5 border-t grid grid-cols-1 sm:grid-cols-3 gap-3" style={{ borderColor: 'var(--c-border)' }}>
                  {[
                    { label: 'Grammar', value: languageSummary.avg_grammar_score, hint: languageSummary.total_issues ? `${languageSummary.total_issues} small mistake${languageSummary.total_issues === 1 ? '' : 's'}` : 'No mistakes found' },
                    { label: 'Clarity', value: languageSummary.avg_clarity_score, hint: 'How clear and well-ordered your sentences were' },
                  ].map((m) => (
                    <div key={m.label} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold" style={{ color: 'var(--c-text)' }}>{m.label}</span>
                        <span className="font-bold" style={{ color: colorFor(m.value) }}>{Math.round(m.value)}%</span>
                      </div>
                      <Bar100 value={m.value} color={colorFor(m.value)} height="h-1.5" />
                      <p className="text-[11px]" style={{ color: 'var(--c-text-muted)' }}>{m.hint}</p>
                    </div>
                  ))}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold" style={{ color: 'var(--c-text)' }}>Tone</span>
                      <span className="font-bold" style={{ color: 'var(--c-accent)' }}>{languageSummary.dominant_tone}</span>
                    </div>
                    <p className="text-[11px]" style={{ color: 'var(--c-text-muted)' }}>
                      How sure your answers sounded{languageSummary.common_hedges?.length ? `. Watch phrases like ${languageSummary.common_hedges.slice(0, 2).map((h) => `"${h}"`).join(', ')}` : ''}.
                    </p>
                    {corrections.length > 0 && (
                      <p className="text-[11px]" style={{ color: 'var(--c-text-muted)' }}>
                        Example fix: <span className="line-through">{corrections[0].excerpt}</span> → <strong style={{ color: 'var(--c-text)' }}>{corrections[0].suggestion}</strong>
                      </p>
                    )}
                  </div>
                </div>
              )}
            </Card>

            {/* 6. Questions about your score (FR 24-03) */}
            <Card>
              <SectionTitle icon={HelpCircle}>Questions about your score</SectionTitle>
              <div className="divide-y" style={{ borderColor: 'var(--c-border)' }}>
                {helpTopics.map((t) => {
                  const open = helpTopic === t.id;
                  return (
                    <div key={t.id}>
                      <button type="button" onClick={() => setHelpTopic(open ? null : t.id)} aria-expanded={open}
                        className="w-full flex items-center justify-between gap-3 py-3 text-left text-sm font-semibold" style={{ color: 'var(--c-text)' }}>
                        {t.question}
                        <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} style={{ color: 'var(--c-text-muted)' }} />
                      </button>
                      {open && (
                        <div className="pb-3 space-y-1.5" role="status" aria-live="polite">
                          {t.answer.map((line, i) => <p key={i} className="text-sm leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>{line}</p>)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          </>
        )}

        {/* NFR 11 - the candidate controls their recordings */}
        {showRecordings && (
          <section aria-label="Your recordings" className="rounded-2xl border p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            style={{ borderColor: 'var(--c-border)' }}>
            <div className="text-xs leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
              <p className="font-semibold text-sm" style={{ color: 'var(--c-text)' }}>Your recordings</p>
              {interview?.hasRecordings
                ? <>Stored encrypted and used only for this assessment{interview?.recordingConsent?.research_use ? ' and to improve MockAI, as you allowed' : ''}. Deleting them keeps your scores and feedback.</>
                : <>Deleted. Your scores, transcripts and feedback are kept.</>}
              {recMessage && <p className="font-semibold mt-1" style={{ color: 'var(--c-text)' }} role="status">{recMessage}</p>}
            </div>
            {interview?.hasRecordings && (
              confirmDeleteRec ? (
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <span className="text-xs font-semibold" style={{ color: 'var(--c-text)' }}>This cannot be undone.</span>
                  <button onClick={handleDeleteRecordings} disabled={deletingRec} className="c-btn px-3.5 py-2 text-xs font-bold rounded-md text-white" style={{ background: 'var(--c-danger)' }}>
                    {deletingRec ? 'Deleting…' : 'Yes, delete'}
                  </button>
                  <button onClick={() => setConfirmDeleteRec(false)} disabled={deletingRec} className="c-btn c-btn-secondary px-3.5 py-2 text-xs font-semibold rounded-md">Cancel</button>
                </div>
              ) : (
                <button onClick={() => setConfirmDeleteRec(true)} className="c-btn c-btn-secondary shrink-0 px-3.5 py-2 text-xs font-semibold rounded-md flex items-center gap-1.5">
                  <Trash2 className="w-3.5 h-3.5" /> Delete my recordings
                </button>
              )
            )}
          </section>
        )}

        {/* Next step */}
        <section className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-4 pt-2">
          <div className="flex items-center gap-5 text-xs font-semibold">
            <Link to="/history" className="flex items-center gap-1.5 hover:underline underline-offset-2" style={{ color: 'var(--c-text-secondary)' }}>
              <History className="w-3.5 h-3.5" /> Interview history
            </Link>
            <Link to="/dashboard" className="flex items-center gap-1.5 hover:underline underline-offset-2" style={{ color: 'var(--c-text-secondary)' }}>
              <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
            </Link>
          </div>
          {isCompleted ? (
            <Link to={`/interview/${id}/feedback`} className="c-btn c-btn-primary px-6 py-3.5 text-sm font-bold rounded-md flex items-center justify-center gap-2">
              See your feedback and practice plan <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <Link to="/interview/goal" className="c-btn c-btn-primary px-6 py-3.5 text-sm font-bold rounded-md flex items-center justify-center gap-2">
              <RotateCcw className="w-4 h-4" /> Practice another interview
            </Link>
          )}
        </section>
      </div>
    </InterviewFlowLayout>
  );
};

// Small building blocks for the results page.
const Card = ({ children, className = '', ...rest }) => (
  <section className={`rounded-2xl border p-5 sm:p-6 ${className}`} style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)' }} {...rest}>
    {children}
  </section>
);
const SectionTitle = ({ icon: Icon, children, hint }) => (
  <div className="mb-4">
    <h2 className="c-heading text-lg font-bold flex items-center gap-2" style={{ color: 'var(--c-text)' }}>
      {Icon && <Icon className="w-5 h-5" style={{ color: 'var(--c-accent)' }} />}
      {children}
    </h2>
    {hint && <p className="text-xs mt-1" style={{ color: 'var(--c-text-muted)' }}>{hint}</p>}
  </div>
);
const Bar100 = ({ value, color, height = 'h-2' }) => (
  <div className={`${height} w-full rounded-full overflow-hidden`} style={{ background: 'var(--c-surface-muted)' }}>
    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, Math.max(0, value ?? 0))}%`, background: color }} />
  </div>
);

export default EvaluationResults;
