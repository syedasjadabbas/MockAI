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
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

import InterviewFlowLayout from '../layouts/InterviewFlowLayout';
import { getActiveInterview, getRealEvaluation, startEvaluation, endInterview } from '../services/candidateApi';
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
  const evaluation = realEval?.evaluation || interview.evaluation || (interview.evaluationSource === 'real' ? interview : null);
  const isCompleted = (evaluationStatus === 'completed' && !!evaluation) || !!evaluation?.overall_score || !!interview.score;
  const isProcessing = evaluationStatus === 'processing' || evaluationStatus === 'pending_evaluation';
  const isFailed = evaluationStatus === 'failed';

  const overallScore = evaluation?.overall_score ?? interview.score ?? 0;
  const confidenceScore = evaluation?.confidence_score ?? interview.confidence ?? null;
  const confidenceLevel = evaluation?.confidence_level ?? interview.confidenceLevel ?? null;
  const stressScore = evaluation?.stress_score ?? interview.stressScore ?? null;
  const stressLevel = evaluation?.stress_level ?? interview.stress ?? null;
  const interpretation = evaluation?.interpretation ?? interview.interpretation ?? '';
  const strengths = evaluation?.strengths ?? interview.strengths ?? [];
  const weaknesses = evaluation?.weaknesses ?? interview.weaknesses ?? [];
  const suggestions = evaluation?.suggestions ?? interview.suggestions ?? [];
  const insights = evaluation?.insights ?? interview.insights ?? null;
  const scoreRationale = insights?.score_explanation?.score_rationale ?? null;
  const summaryReport = evaluation?.summary_report ?? interview.summaryReport ?? null;
  const performanceRating = summaryReport?.performance_overview?.performance_rating || (overallScore >= 70 ? 'Proficient Performance' : (overallScore >= 55 ? 'Competent Performance' : 'Developing'));
  const dimensionScores = evaluation?.dimension_scores ?? interview.dimensionScores ?? {
    technical_content: 0,
    communication_fluency: 0,
    behavioral_composure: 0,
  };
  const perQuestionEval = evaluation?.per_question ?? [];
  const facialSummary = evaluation?.facial_summary;
  const hasVisionSummary = facialSummary?.status === 'completed';

  const answeredCount = (interview.responses || []).length;
  const totalQuestions = (interview.questions || []).length;

  // FR29-01: Performance Dimensions Breakdown Chart
  const dimensionChartData = {
    labels: ['Technical Content', 'Communication Fluency', 'Behavioral Composure'],
    datasets: [
      {
        label: 'Score (%)',
        data: [
          Math.min(100, Math.max(0, Math.round(dimensionScores?.technical_content ?? 0))),
          Math.min(100, Math.max(0, Math.round(dimensionScores?.communication_fluency ?? 0))),
          Math.min(100, Math.max(0, Math.round(dimensionScores?.behavioral_composure ?? 0))),
        ],
        backgroundColor: [
          'rgba(255, 107, 53, 0.85)',
          'rgba(255, 159, 28, 0.85)',
          hasVisionSummary ? 'rgba(6, 182, 212, 0.85)' : 'rgba(100, 116, 139, 0.35)',
        ],
        borderColor: [
          '#FF6B35',
          '#FF9F1C',
          hasVisionSummary ? '#06B6D4' : '#64748B',
        ],
        borderWidth: 1.5,
        borderRadius: 4,
      },
    ],
  };

  const dimensionChartOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => {
            const val = context.raw;
            if (context.dataIndex === 2 && !hasVisionSummary) {
              return 'Behavioral Composure: Unassessed (Vision Offline)';
            }
            return `${context.label}: ${val}%`;
          },
        },
      },
    },
    scales: {
      x: {
        min: 0,
        max: 100,
        ticks: {
          stepSize: 25,
          callback: (value) => `${value}%`,
          color: '#94A3B8',
          font: { size: 10 },
        },
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      y: {
        ticks: {
          color: '#E2E8F0',
          font: { size: 11, weight: '500' },
        },
        grid: { display: false },
      },
    },
  };

  // FR29-01: Per-Question Performance Trajectory Chart
  const questionLabels = (interview.questions || []).map((_, i) => `Q${(i + 1).toString().padStart(2, '0')}`);
  const questionScores = (interview.questions || []).map((q) => {
    const resp = (interview.responses || []).find((r) => (r.question_id || r.questionId) === q.id);
    const qEval = perQuestionEval.find((item) => (item.question_id || item.questionId) === q.id);
    if (!resp) return 0;
    if (qEval?.status === 'failed') return 0;
    return Math.min(100, Math.max(0, Math.round(qEval?.multimodal?.score ?? qEval?.score ?? 0)));
  });

  const questionColors = (interview.questions || []).map((q) => {
    const resp = (interview.responses || []).find((r) => (r.question_id || r.questionId) === q.id);
    const qEval = perQuestionEval.find((item) => (item.question_id || item.questionId) === q.id);
    if (!resp) return 'rgba(100, 116, 139, 0.35)'; // Skipped
    if (qEval?.status === 'failed') return 'rgba(239, 68, 68, 0.7)'; // Failed
    return 'rgba(255, 107, 53, 0.85)'; // Evaluated
  });

  const questionBorderColors = (interview.questions || []).map((q) => {
    const resp = (interview.responses || []).find((r) => (r.question_id || r.questionId) === q.id);
    const qEval = perQuestionEval.find((item) => (item.question_id || item.questionId) === q.id);
    if (!resp) return '#64748B';
    if (qEval?.status === 'failed') return '#EF4444';
    return '#FF6B35';
  });

  const trajectoryChartData = {
    labels: questionLabels,
    datasets: [
      {
        label: 'Question Score (%)',
        data: questionScores,
        backgroundColor: questionColors,
        borderColor: questionBorderColors,
        borderWidth: 1.5,
        borderRadius: 4,
      },
    ],
  };

  const trajectoryChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => {
            const idx = context.dataIndex;
            const q = (interview.questions || [])[idx];
            const resp = (interview.responses || []).find((r) => (r.question_id || r.questionId) === q?.id);
            const qEval = perQuestionEval.find((item) => (item.question_id || item.questionId) === q?.id);
            if (!resp) return `Prompt ${(idx + 1).toString().padStart(2, '0')}: Skipped (0%)`;
            if (qEval?.status === 'failed') return `Prompt ${(idx + 1).toString().padStart(2, '0')}: Processing Failed`;
            return `Prompt ${(idx + 1).toString().padStart(2, '0')}: ${context.raw}%`;
          },
        },
      },
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        ticks: {
          stepSize: 25,
          callback: (value) => `${value}%`,
          color: '#94A3B8',
          font: { size: 10 },
        },
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      x: {
        ticks: {
          color: '#E2E8F0',
          font: { size: 11, weight: '600' },
        },
        grid: { display: false },
      },
    },
  };

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
                  <span className="block c-tech-annotation text-[10px] text-orange-400 mb-1">[ASSESSMENT ANALYTICS]</span>
                  <span className="c-serif-num text-5xl sm:text-7xl font-bold tracking-tight" style={{ color: 'var(--c-text)' }}>
                    {Math.round(overallScore)}%
                  </span>
                  <div className="w-32 bg-slate-500/20 h-1 rounded-full overflow-hidden mt-2">
                    <div
                      className="h-full bg-orange-500 rounded-full transition-all duration-1000"
                      style={{ width: `${Math.min(100, Math.max(0, overallScore))}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="absolute bottom-2 right-2">
                <span className="c-tech-annotation px-1.5 py-0.5 rounded bg-black/60 text-orange-400 border border-white/10 text-[10px]">[COMPOSITE SCORE]</span>
              </div>
            </div>
            <p className="text-xs sm:text-sm mt-4 leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
              {interpretation || 
                `This composite score is computed from response delivery, technical depth, and domain concept coverage across ${answeredCount} evaluated prompt takes.`}
            </p>

            {/* FR24: Score Interpretation & Behavioral Rationale */}
            {scoreRationale && (
              <div
                className="mt-4 p-3.5 rounded-lg border text-xs leading-relaxed space-y-1.5"
                style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)' }}
              >
                <div className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-wider text-orange-400">
                  <span>Score Rationale & Behavioral Attribution</span>
                </div>
                <p style={{ color: 'var(--c-text-secondary)' }}>{scoreRationale}</p>
              </div>
            )}

            {/* FR 29-01: Visual Performance Analytics Graphs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
              {/* Graph A: Performance Dimensions Breakdown */}
              <div
                className="p-4 rounded-lg border space-y-3"
                style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)' }}
              >
                <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--c-border)' }}>
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-orange-400 block">[FR 29-01 GRAPH]</span>
                    <h3 className="c-heading text-xs font-bold" style={{ color: 'var(--c-text)' }}>Performance Dimensions Breakdown</h3>
                  </div>
                  <span className="text-[10px] font-mono text-neutral-400">Scale 0-100%</span>
                </div>
                <div className="h-44 w-full">
                  <Bar data={dimensionChartData} options={dimensionChartOptions} />
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 pt-1 border-t" style={{ borderColor: 'var(--c-border)' }}>
                  <span>Technical: {Math.round(dimensionScores?.technical_content ?? 0)}%</span>
                  <span>Fluency: {Math.round(dimensionScores?.communication_fluency ?? 0)}%</span>
                  <span>Composure: {hasVisionSummary ? `${Math.round(dimensionScores?.behavioral_composure ?? 0)}%` : 'Offline'}</span>
                </div>
              </div>

              {/* Graph B: Per-Question Performance Trajectory */}
              <div
                className="p-4 rounded-lg border space-y-3"
                style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)' }}
              >
                <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--c-border)' }}>
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-orange-400 block">[FR 29-01 GRAPH]</span>
                    <h3 className="c-heading text-xs font-bold" style={{ color: 'var(--c-text)' }}>Per-Question Performance Trajectory</h3>
                  </div>
                  <span className="text-[10px] font-mono text-neutral-400">{answeredCount}/{totalQuestions} Takes</span>
                </div>
                <div className="h-44 w-full">
                  <Bar data={trajectoryChartData} options={trajectoryChartOptions} />
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 pt-1 border-t" style={{ borderColor: 'var(--c-border)' }}>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#FF6B35]" />
                    <span>Evaluated</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-500" />
                    <span>Skipped / Unassessed</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span>Failed</span>
                  </span>
                </div>
              </div>
            </div>

            {/* FR 28-03: Structured Performance Overview (Audit Summary) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6">
              <div className="p-3 rounded-lg border space-y-1" style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)' }}>
                <span className="text-[10px] uppercase font-mono tracking-wider block" style={{ color: 'var(--c-text-muted)' }}>Total Prompts</span>
                <span className="font-mono text-lg font-bold" style={{ color: 'var(--c-text)' }}>{totalQuestions}</span>
              </div>
              <div className="p-3 rounded-lg border space-y-1" style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)' }}>
                <span className="text-[10px] uppercase font-mono tracking-wider block" style={{ color: 'var(--c-text-muted)' }}>Evaluated Takes</span>
                <span className="font-mono text-lg font-bold text-emerald-400">{answeredCount}</span>
              </div>
              <div className="p-3 rounded-lg border space-y-1" style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)' }}>
                <span className="text-[10px] uppercase font-mono tracking-wider block" style={{ color: 'var(--c-text-muted)' }}>Skipped Takes</span>
                <span className="font-mono text-lg font-bold text-amber-400">
                  {summaryReport?.performance_overview?.skipped_questions ?? Math.max(0, totalQuestions - answeredCount)}
                </span>
              </div>
              <div className="p-3 rounded-lg border space-y-1" style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)' }}>
                <span className="text-[10px] uppercase font-mono tracking-wider block" style={{ color: 'var(--c-text-muted)' }}>Completion Rate</span>
                <span className="font-mono text-lg font-bold text-cyan-400">
                  {summaryReport?.performance_overview?.completion_rate ?? (totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0)}%
                </span>
              </div>
            </div>
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
            3. MULTIMODAL EVALUATION FRAMEWORK (Triad Signal Architecture)
           =================================================================== */}
        {isCompleted && (
          <section aria-label="Multimodal Triad Framework" className="border-b pb-10 space-y-4" style={{ borderColor: 'var(--c-border)' }}>
            <div>
              <p className="c-eyebrow mb-1">Architecture</p>
              <h2 className="c-heading text-xl font-bold" style={{ color: 'var(--c-text)' }}>
                Multimodal Assessment Framework
              </h2>
              <p className="text-xs mt-1" style={{ color: 'var(--c-text-secondary)' }}>
                MockAI synthesizes natural language content, acoustic speech dynamics, and computer-vision behavioral indicators into an integrated assessment.
              </p>
            </div>

            {/* Triad Signal Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {/* Pillar 1: NLP Content */}
              <div
                className="p-4 rounded-lg border space-y-2.5"
                style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)' }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#FF6B35]" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Content & NLP</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/25">
                    ACTIVE
                  </span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                  BERT/DistilBERT semantic alignment against rubrics, question relevance, key technical concept coverage, and response completeness.
                </p>
              </div>

              {/* Pillar 2: Speech & Delivery */}
              <div
                className="p-4 rounded-lg border space-y-2.5"
                style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)' }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mic className="w-4 h-4 text-[#FF9F1C]" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Speech & Fluency</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/25">
                    ACTIVE
                  </span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                  Acoustic speech rate (WPM), articulation pacing, speech pause duration, and disfluency/filler-word minimization.
                </p>
              </div>

              {/* Pillar 3: Computer Vision & Facial Analysis */}
              <div
                className="p-4 rounded-lg border space-y-2.5"
                style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)' }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className={`w-4 h-4 ${hasVisionSummary ? 'text-cyan-400' : 'text-neutral-400'}`} />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Vision & Behavior</span>
                  </div>
                  {hasVisionSummary ? (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border bg-cyan-500/10 text-cyan-400 border-cyan-500/25">
                      ACTIVE
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border bg-neutral-800 text-neutral-400 border-neutral-700">
                      OFFLINE
                    </span>
                  )}
                </div>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                  {hasVisionSummary
                    ? `Observable facial composure: ${facialSummary.overall_composure}. Dominant expression: ${facialSummary.dominant_expression}.`
                    : 'Facial expression valence, eye gaze attentiveness, head pose composure, and observable micro-hesitations.'}
                </p>
              </div>
            </div>

            {/* Technical Footnote / Signal Disclosure */}
            <div
              className="p-3.5 rounded-lg border text-xs flex items-start gap-2.5"
              style={{ background: 'var(--c-surface-muted)', borderColor: 'var(--c-border)' }}
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#FF9F1C]" />
              <span style={{ color: 'var(--c-text-secondary)' }}>
                <strong className="font-semibold" style={{ color: 'var(--c-text)' }}>Evaluation Signal Notice: </strong>
                {hasVisionSummary
                  ? `Multimodal signals integrated from active NLP semantic analysis, speech delivery metrics, and real computer-vision facial composure analysis (${facialSummary.evaluated_takes} takes evaluated).`
                  : `The composite overall score (${Math.round(overallScore)}%) is computed strictly from active NLP content and acoustic speech signals. Computer-vision facial analysis is unmounted; vision metrics will be integrated upon vision model deployment.`}
              </span>
            </div>
          </section>
        )}

        {/* ===================================================================
            4. PERFORMANCE & BEHAVIORAL DIMENSIONS
           =================================================================== */}
        {isCompleted && (
          <section aria-label="Performance Breakdown" className="border-b pb-10 space-y-4" style={{ borderColor: 'var(--c-border)' }}>
            <div>
              <p className="c-eyebrow mb-1">Dimensions</p>
              <h2 className="c-heading text-xl font-bold" style={{ color: 'var(--c-text)' }}>Behavioral & Delivery Indicators</h2>
              <p className="text-xs mt-1" style={{ color: 'var(--c-text-secondary)' }}>
                Multidimensional assessment signals across acoustic composure and observable non-verbal behavior.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-2">
              {/* Confidence Indicator */}
              {/* Confidence Indicator (FR 29-02 Visual Indicator) */}
              <div className="p-4 rounded-lg border space-y-2" style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)' }}>
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--c-text-muted)' }}>
                    Confidence Indicator
                  </p>
                  <span className="text-[10px] font-mono text-emerald-400">
                    {hasVisionSummary ? 'MULTIMODAL' : 'ACOUSTIC'}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="c-serif-num text-3xl font-bold" style={{ color: 'var(--c-text)' }}>
                    {confidenceScore != null && confidenceLevel !== 'Not Assessed' ? `${Math.round(confidenceScore)}%` : 'Active'}
                  </p>
                  {confidenceLevel && confidenceLevel !== 'Not Assessed' && (
                    <span className="text-xs font-sans font-semibold text-emerald-400">
                      ({confidenceLevel})
                    </span>
                  )}
                </div>
                {/* Visual Level Meter Bar */}
                <div className="pt-1 space-y-1">
                  <div className="h-2 w-full rounded-full bg-slate-800/80 overflow-hidden relative border border-white/5">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{
                        width: `${confidenceScore != null && confidenceLevel !== 'Not Assessed' ? Math.min(100, Math.max(0, confidenceScore)) : 0}%`,
                        background: (confidenceScore ?? 0) >= 80 ? '#10B981' : ((confidenceScore ?? 0) >= 60 ? '#FF9F1C' : '#F59E0B'),
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] font-mono text-neutral-500">
                    <span>0% Dev</span>
                    <span>60% Mod</span>
                    <span>80% High</span>
                  </div>
                </div>
                <p className="text-[11px] leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                  Synthesized from vocal pacing, articulation fluency, and non-verbal poise.
                </p>
              </div>

              {/* Stress / Composure Indicator (FR 29-02 Visual Indicator) */}
              <div className="p-4 rounded-lg border space-y-2" style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)' }}>
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--c-text-muted)' }}>
                    Composure Indicator
                  </p>
                  <span className="text-[10px] font-mono text-emerald-400">
                    {hasVisionSummary ? 'MULTIMODAL' : 'BEHAVIORAL'}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="c-serif-num text-3xl font-bold" style={{ color: 'var(--c-text)' }}>
                    {stressLevel || 'Stable'}
                  </p>
                  {stressScore != null && stressLevel !== 'Not Assessed' && (
                    <span className="text-xs font-sans font-semibold text-neutral-400">
                      ({Math.round(stressScore)}% stress)
                    </span>
                  )}
                </div>
                {/* Visual Level Meter Bar */}
                <div className="pt-1 space-y-1">
                  <div className="h-2 w-full rounded-full bg-slate-800/80 overflow-hidden relative border border-white/5">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{
                        width: `${stressScore != null && stressLevel !== 'Not Assessed' ? Math.min(100, Math.max(0, stressScore)) : 0}%`,
                        background: (stressScore ?? 0) >= 65 ? '#F43F5E' : ((stressScore ?? 0) >= 35 ? '#FF9F1C' : '#10B981'),
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] font-mono text-neutral-500">
                    <span className="text-emerald-400">0% Low</span>
                    <span className="text-amber-400">35% Mod</span>
                    <span className="text-rose-400">65% Elev</span>
                  </div>
                </div>
                <p className="text-[11px] leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                  Observable stability and tension minimization across sequential prompt takes.
                </p>
              </div>

              {/* Facial Expression Analysis */}
              <div className={`p-4 rounded-lg border space-y-1.5 ${hasVisionSummary ? '' : 'opacity-85'}`} style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)' }}>
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                    Facial Expression
                  </p>
                  <span className={`text-[10px] font-mono ${hasVisionSummary ? 'text-cyan-400' : 'text-neutral-500'}`}>VISION</span>
                </div>
                {hasVisionSummary ? (
                  <p className="c-serif-num text-2xl font-bold text-white pt-0.5">
                    {facialSummary.dominant_expression}
                  </p>
                ) : (
                  <p className="text-xs font-bold text-neutral-400 pt-1 font-mono">
                    [Vision Offline]
                  </p>
                )}
                <p className="text-[11px] leading-relaxed text-neutral-400">
                  {hasVisionSummary
                    ? 'Model-derived primary facial expression observed across interview takes.'
                    : 'Camera was unmounted; facial expression cues omitted without fabrication.'}
                </p>
              </div>

              {/* Engagement Level */}
              <div className={`p-4 rounded-lg border space-y-1.5 ${hasVisionSummary ? '' : 'opacity-85'}`} style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)' }}>
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                    Attentive Engagement
                  </p>
                  <span className={`text-[10px] font-mono ${hasVisionSummary ? 'text-cyan-400' : 'text-neutral-500'}`}>VISION</span>
                </div>
                {hasVisionSummary ? (
                  <p className="c-serif-num text-2xl font-bold text-white pt-0.5">
                    {facialSummary.overall_composure}
                  </p>
                ) : (
                  <p className="text-xs font-bold text-neutral-400 pt-1 font-mono">
                    [Vision Offline]
                  </p>
                )}
                <p className="text-[11px] leading-relaxed text-neutral-400">
                  {hasVisionSummary
                    ? 'Eye presence consistency and observable non-verbal composure.'
                    : 'Attentiveness and head pose cues unrecorded; non-verbal analysis omitted.'}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ===================================================================
            5. QUESTION-BY-QUESTION REVIEW (Editorial Multi-Signal Stream)
           =================================================================== */}
        <section aria-label="Question Review" className="border-b pb-10 space-y-6" style={{ borderColor: 'var(--c-border)' }}>
          <div className="flex items-baseline justify-between">
            <div>
              <p className="c-eyebrow mb-1">Audit</p>
              <h2 className="c-heading text-xl font-bold" style={{ color: 'var(--c-text)' }}>Question Review & Multi-Signal Audit</h2>
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

              // NLP real metrics
              const textAnalysis = qEval?.text_analysis;
              const coveredConcepts = textAnalysis?.covered_concepts || [];
              const missingConcepts = textAnalysis?.missing_concepts || qEval?.missing_concepts || [];
              const contentScore = textAnalysis?.content_score;
              const semanticSimScore = textAnalysis?.semantic_similarity_score;
              const nlpModel = textAnalysis?.model;

              // Delivery real metrics
              const delivery = qEval?.delivery;
              const fillerCount = delivery?.filler_count ?? delivery?.filler_words_count;
              const fluencyIndicator = delivery?.fluency_indicator;

              // Facial real metrics
              const facial = qEval?.facial_analysis;
              const hasRealVision = facial && facial.status === 'completed';

              return (
                <div key={q.id} className="py-6 space-y-4">
                  {/* Header Row */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold" style={{ color: 'var(--c-text-muted)' }}>
                          Question {(idx + 1).toString().padStart(2, '0')}
                        </span>
                        <span className="text-[11px]" style={{ color: 'var(--c-border)' }}>•</span>
                        <span className="text-[11px] capitalize font-medium" style={{ color: 'var(--c-text-secondary)' }}>
                          {q.type || 'Technical'} ({q.difficulty || 'Medium'})
                        </span>
                        {wpm != null && (
                          <>
                            <span className="text-[11px]" style={{ color: 'var(--c-border)' }}>•</span>
                            <span className="text-[11px] font-mono" style={{ color: 'var(--c-text-muted)' }}>
                              {Math.round(wpm)} WPM ({pacing || 'Standard'})
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
                      {qEval?.status === 'failed' ? (
                        <span className="c-badge c-badge-danger text-[10px] py-0.5 px-1.5 font-bold">
                          Failed
                        </span>
                      ) : isRecorded ? (
                        <span className="c-badge c-badge-success text-[10px] py-0.5 px-1.5 font-bold">
                          Evaluated
                        </span>
                      ) : (
                        <span className="c-badge c-badge-muted text-[10px] py-0.5 px-1.5">
                          Skipped
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status Disclosures */}
                  {qEval?.status === 'failed' && (
                    <div className="p-2.5 rounded border text-xs bg-rose-500/10 border-rose-500/20 text-rose-300">
                      <span className="font-bold">Take Processing Note: </span>
                      {qEval?.failed_reason || 'Media processing error encountered for this response take.'}
                    </div>
                  )}
                  {!isRecorded && (
                    <div className="p-2.5 rounded border text-xs bg-slate-800/40 border-slate-700/40 text-neutral-400 italic">
                      Question was skipped by candidate; no response take submitted for evaluation.
                    </div>
                  )}

                  {/* Multi-Signal Assessment Strip */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Signal A: NLP Content */}
                    <div
                      className="p-3 rounded-lg border space-y-1.5 text-xs"
                      style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)' }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold flex items-center gap-1.5 text-neutral-300">
                          <FileText className="w-3.5 h-3.5 text-[#FF6B35]" />
                          <span>NLP Content</span>
                          {nlpModel && nlpModel.includes('bert') && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#FF6B35]/10 text-[#FF6B35] border border-[#FF6B35]/20">
                              BERT
                            </span>
                          )}
                        </span>
                        {contentScore != null && (
                          <span className="font-mono text-[#FF6B35] font-bold">
                            {Math.round(contentScore)}%
                          </span>
                        )}
                      </div>
                      <div className="space-y-1">
                        {semanticSimScore != null && semanticSimScore > 0 && (
                          <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400">
                            <span>Semantic Alignment:</span>
                            <span className="text-neutral-200 font-semibold">{Math.round(semanticSimScore)}%</span>
                          </div>
                        )}
                        {coveredConcepts.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap text-[10px] font-mono">
                            <span className="text-neutral-400">Covered:</span>
                            {coveredConcepts.slice(0, 3).map((c, i) => (
                              <span key={i} className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                {c}
                              </span>
                            ))}
                          </div>
                        )}
                        {missingConcepts.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap text-[10px] font-mono">
                            <span className="text-neutral-400">Missing:</span>
                            {missingConcepts.slice(0, 2).map((c, i) => (
                              <span key={i} className="px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                {c}
                              </span>
                            ))}
                          </div>
                        )}
                        {!coveredConcepts.length && !missingConcepts.length && (
                          <p className="text-[11px] text-neutral-400">Evaluated against domain answer criteria.</p>
                        )}
                      </div>
                    </div>

                    {/* Signal B: Speech Delivery */}
                    <div
                      className="p-3 rounded-lg border space-y-1.5 text-xs"
                      style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)' }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold flex items-center gap-1.5 text-neutral-300">
                          <Mic className="w-3.5 h-3.5 text-[#FF9F1C]" />
                          <span>Speech Delivery</span>
                        </span>
                        {wpm != null && (
                          <span className="font-mono text-[#FF9F1C] font-bold">
                            {Math.round(wpm)} WPM
                          </span>
                        )}
                      </div>
                      <div className="space-y-1 text-[11px] text-neutral-400">
                        <div>
                          <span>Pacing: </span>
                          <span className="text-white font-medium">{pacing || 'Standard'}</span>
                        </div>
                        <div>
                          <span>Fluency: </span>
                          <span className="text-white font-medium">{fluencyIndicator || (wpm > 0 ? 'Fluent' : 'None')}</span>
                          {fillerCount != null && fillerCount > 0 && (
                            <span className="text-neutral-500 ml-1">({fillerCount} fillers)</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Signal C: Vision / Behavioral */}
                    <div
                      className={`p-3 rounded-lg border space-y-1.5 text-xs ${hasRealVision ? '' : 'opacity-75'}`}
                      style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)' }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold flex items-center gap-1.5 text-neutral-300">
                          <Eye className={`w-3.5 h-3.5 ${hasRealVision ? 'text-cyan-400' : 'text-neutral-400'}`} />
                          <span>Vision & Facial</span>
                        </span>
                        {hasRealVision ? (
                          <span className="text-[10px] font-mono text-cyan-400 font-bold">[ACTIVE]</span>
                        ) : (
                          <span className="text-[10px] font-mono text-neutral-500">[OFFLINE]</span>
                        )}
                      </div>
                      {hasRealVision ? (
                        <div className="space-y-1 text-[11px] text-neutral-300">
                          <div>
                            <span className="text-neutral-400">Expression: </span>
                            <span className="text-white font-medium">{facial.dominant_expression}</span>
                            {facial.expression_distribution && (
                              <span className="text-neutral-400 ml-1">({facial.expression_distribution[facial.dominant_expression.toLowerCase()] ?? ''}%)</span>
                            )}
                          </div>
                          <div>
                            <span className="text-neutral-400">Composure: </span>
                            <span className="text-white font-medium">{facial.behavioral_indicators?.composure_index || 'Stable'}</span>
                          </div>
                          <div>
                            <span className="text-neutral-400">Engagement: </span>
                            <span className="text-white font-medium">{facial.behavioral_indicators?.engagement_level || 'High'}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[11px] text-neutral-500 leading-relaxed">
                          Vision analysis unavailable. Facial analysis will appear here when vision evaluation is enabled.
                        </p>
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
            5. STRENGTHS, WEAKNESSES & COACHING STRATEGIES (FR25, FR26, FR27)
           =================================================================== */}
        {(strengths.length > 0 || weaknesses.length > 0 || suggestions.length > 0) && (
          <section aria-label="Strengths and Recommendations" className="border-b pb-10 space-y-6" style={{ borderColor: 'var(--c-border)' }}>
            <div>
              <p className="c-eyebrow mb-1">Qualitative Insights</p>
              <h2 className="c-heading text-xl font-bold" style={{ color: 'var(--c-text)' }}>Assessment Highlights & Coaching</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Demonstrated Strengths (FR25) */}
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

              {/* Areas for Improvement / Weaknesses (FR26) */}
              {weaknesses.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 border-b pb-2" style={{ borderColor: 'var(--c-border)' }}>
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    <h3 className="c-heading text-sm font-bold" style={{ color: 'var(--c-text)' }}>Key Areas for Improvement</h3>
                  </div>
                  <ul className="space-y-2.5 text-xs">
                    {weaknesses.map((wk, i) => (
                      <li key={i} className="flex items-start gap-2.5 leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                        <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 bg-amber-500" />
                        <span>{wk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Personalized Coaching & Preparation Strategies (FR27) */}
            {suggestions.length > 0 && (
              <div
                className="mt-6 p-4 rounded-lg border space-y-3"
                style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)' }}
              >
                <div className="flex items-center gap-2 border-b pb-2" style={{ borderColor: 'var(--c-border)' }}>
                  <Lightbulb className="w-4 h-4 text-orange-400" />
                  <h3 className="c-heading text-sm font-bold" style={{ color: 'var(--c-text)' }}>
                    Personalized Coaching & Preparation Strategies
                  </h3>
                </div>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {suggestions.map((sug, i) => (
                    <li key={i} className="flex items-start gap-2 leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                      <span className="font-mono text-orange-400 font-bold shrink-0 mt-0.5">0{i + 1}.</span>
                      <span>{sug}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
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


