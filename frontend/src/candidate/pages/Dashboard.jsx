import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  PlayCircle,
  ArrowRight,
  Clock,
  ChevronRight,
  CheckCircle2,
  Layers,
  Mic,
  FileText,
  BarChart2,
  Compass,
} from 'lucide-react';
import CandidateNav from '../components/CandidateNav';
import { getDashboardSummary, getCategories, startInterview } from '../services/candidateApi';
import { getSession } from '../services/candidateAuth';
import { formatDate } from '../../utils/dateFormat';

const STATUS_TONE = {
  Completed: 'c-badge-success',
  'In Progress': 'c-badge-warning',
};

const Dashboard = () => {
  const [summary, setSummary] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [launchingId, setLaunchingId] = useState(null);
  const session = getSession();
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      getDashboardSummary().catch(() => ({
        totalInterviews: 0,
        completedInterviews: 0,
        averageScore: null,
        lastInterview: null,
        recent: [],
      })),
      getCategories().catch(() => []),
    ]).then(([sumData, catData]) => {
      setSummary(sumData);
      setCategories(catData || []);
      setLoading(false);
    });
  }, []);

  const handleLaunchCategory = async (category) => {
    if (launchingId) return;
    setLaunchingId(category.id);
    try {
      const type = /behav/i.test(category.name) ? 'behavioral' : 'technical';
      const interview = await startInterview({
        categoryId: category.id,
        interviewType: type,
      });
      navigate(`/interview/${interview.id}/prepare`);
    } catch {
      navigate('/interview/goal');
    } finally {
      setLaunchingId(null);
    }
  };

  const firstName = session?.name ? session.name.split(' ')[0] : '';
  const hasInterviews = !loading && summary?.recent?.length > 0;
  const hasScore = !loading && summary?.averageScore != null;

  return (
    <div className="candidate-app min-h-screen" style={{ background: 'var(--c-bg)' }}>
      {/* Global Candidate Navigation Bar */}
      <CandidateNav />

      {/* ─── WORKSPACE CONTAINER ─────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        
        {/* ─── SECTION 1: PRIMARY PRACTICE STAGE (THE WORKSPACE) ─────────── */}
        <section
          aria-label="Interview Practice Stage"
          className="relative rounded-3xl overflow-hidden mb-12 sm:mb-16"
          style={{
            background: 'var(--c-surface)',
            border: '1px solid var(--c-border)',
            boxShadow: 'var(--c-shadow-sm)',
          }}
        >
          {/* Subtle top accent highlight */}
          <div
            className="h-1.5 w-full"
            style={{
              background: 'linear-gradient(90deg, var(--c-accent) 0%, transparent 60%)',
            }}
          />

          <div className="p-6 sm:p-10 lg:p-12">
            {/* Context meta bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-5 border-b" style={{ borderColor: 'var(--c-border)' }}>
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: 'var(--c-accent)' }}
                />
                <span
                  className="text-xs font-bold uppercase tracking-widest"
                  style={{ color: 'var(--c-text-muted)' }}
                >
                  Candidate Practice Workspace
                </span>
              </div>
              {firstName && (
                <span
                  className="text-xs font-semibold"
                  style={{ color: 'var(--c-text-secondary)' }}
                >
                  Signed in as <strong style={{ color: 'var(--c-text)' }}>{session?.name}</strong>
                </span>
              )}
            </div>

            {/* Stage Hero Content */}
            <div className="max-w-3xl mb-8">
              <h1
                className="c-heading text-3xl sm:text-4xl lg:text-5xl leading-tight mb-4"
                style={{ letterSpacing: '-0.02em' }}
              >
                Prepare for the interview you actually want to ace.
              </h1>
              <p
                className="text-base sm:text-lg leading-relaxed"
                style={{ color: 'var(--c-text-secondary)', maxWidth: '42ch' }}
              >
                Real question sets calibrated for technical, behavioral, and leadership domains. Practice spoken answers on camera and calibrate under authentic pressure.
              </p>
            </div>

            {/* Launchpad Actions & Session Specs */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
              <Link
                to="/interview/goal"
                className="c-btn c-btn-primary inline-flex items-center justify-center gap-2.5 px-7 py-3.5 text-base font-bold rounded-xl"
                style={{
                  boxShadow: '0 4px 14px -2px rgba(122, 35, 51, 0.25)',
                }}
              >
                <PlayCircle className="w-5 h-5" />
                Start New Interview
              </Link>

              {hasInterviews && (
                <Link
                  to="/history"
                  className="c-btn c-btn-secondary inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold rounded-xl"
                >
                  View All Sessions
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>

            {/* Practice Format Specifications */}
            <div
              className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t"
              style={{ borderColor: 'var(--c-border)' }}
            >
              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--c-text-muted)' }}>
                  Questions
                </span>
                <span className="text-sm font-semibold" style={{ color: 'var(--c-text)' }}>
                  5 Calibrated Prompts
                </span>
              </div>

              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--c-text-muted)' }}>
                  Response Mode
                </span>
                <span className="text-sm font-semibold" style={{ color: 'var(--c-text)' }}>
                  Camera & Voice
                </span>
              </div>

              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--c-text-muted)' }}>
                  Estimated Time
                </span>
                <span className="text-sm font-semibold" style={{ color: 'var(--c-text)' }}>
                  ~12–15 Minutes
                </span>
              </div>

              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--c-text-muted)' }}>
                  Feedback
                </span>
                <span className="text-sm font-semibold" style={{ color: 'var(--c-text)' }}>
                  Structured Evaluation
                </span>
              </div>
            </div>

            {/* Available Tracks Direct Launchpad */}
            {categories.length > 0 && (
              <div className="mt-8 pt-6 border-t" style={{ borderColor: 'var(--c-border)' }}>
                <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--c-text-muted)' }}>
                  Choose Focus Domain
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => handleLaunchCategory(cat)}
                      disabled={launchingId === cat.id}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold border transition-all hover:border-[var(--c-accent)] hover:text-[var(--c-accent)]"
                      style={{
                        background: 'var(--c-surface-muted)',
                        borderColor: 'var(--c-border)',
                        color: 'var(--c-text)',
                      }}
                    >
                      <Layers className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--c-accent)' }} />
                      <span>{cat.name}</span>
                      {launchingId === cat.id ? (
                        <span className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin ml-1" />
                      ) : (
                        <ArrowRight className="w-3 h-3 opacity-60 ml-0.5" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ─── SECTION 2: PRACTICE TELEMETRY & PROGRESS OVERVIEW ───────────── */}
        <section
          aria-label="Practice Telemetry"
          className="mb-12 sm:mb-16 pb-8 border-b"
          style={{ borderColor: 'var(--c-border)' }}
        >
          <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-6">
            <div>
              <p className="c-eyebrow mb-1">Telemetry</p>
              <h2 className="c-heading text-xl sm:text-2xl">
                Practice Record
              </h2>
            </div>

            {/* Restrained horizontal metrics */}
            <div className="flex flex-wrap items-center gap-6 sm:gap-10">
              <div>
                <span className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--c-text-muted)' }}>
                  Total Sessions
                </span>
                <div className="c-serif-num text-2xl sm:text-3xl font-semibold" style={{ color: 'var(--c-text)' }}>
                  {loading ? '—' : (summary?.totalInterviews ?? 0)}
                </div>
              </div>

              <div className="h-8 w-px" style={{ background: 'var(--c-border)' }} />

              <div>
                <span className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--c-text-muted)' }}>
                  Completed
                </span>
                <div className="c-serif-num text-2xl sm:text-3xl font-semibold" style={{ color: 'var(--c-text)' }}>
                  {loading ? '—' : (summary?.completedInterviews ?? 0)}
                </div>
              </div>

              <div className="h-8 w-px" style={{ background: 'var(--c-border)' }} />

              <div>
                <span className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--c-text-muted)' }}>
                  Average Score
                </span>
                <div
                  className="c-serif-num text-2xl sm:text-3xl font-semibold"
                  style={{ color: hasScore ? 'var(--c-text)' : 'var(--c-text-muted)' }}
                >
                  {loading ? '—' : hasScore ? `${summary.averageScore}%` : '—'}
                </div>
              </div>

              {hasScore && (
                <Link
                  to="/progress"
                  className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ml-auto md:ml-4"
                  style={{ color: 'var(--c-accent)' }}
                >
                  <BarChart2 className="w-4 h-4" />
                  Full Breakdown
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* ─── SECTION 3: RECENT SESSIONS OR FIRST-SESSION ARCHITECTURE ────── */}
        {loading ? (
          <div className="space-y-4 py-8">
            <div className="c-skeleton h-20 rounded-2xl" />
            <div className="c-skeleton h-20 rounded-2xl" />
          </div>
        ) : summary.recent.length === 0 ? (
          /* ── ZERO INTERVIEW STATE: HOW PRACTICE WORKS ─────────────────── */
          <section aria-label="First Interview Onboarding" className="mb-12">
            <div className="mb-8">
              <p className="c-eyebrow mb-1">Getting Started</p>
              <h2 className="c-heading text-2xl sm:text-3xl mb-2">
                Your first session starts here.
              </h2>
              <p className="text-sm sm:text-base max-w-xl" style={{ color: 'var(--c-text-secondary)' }}>
                MockAI is built for active practice, not passive reading. Here is what happens when you begin your first round:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Step 1 */}
              <div
                className="p-6 sm:p-7 rounded-2xl flex flex-col justify-between"
                style={{
                  background: 'var(--c-surface)',
                  border: '1px solid var(--c-border)',
                }}
              >
                <div>
                  <div className="c-serif-num text-2xl font-bold mb-3" style={{ color: 'var(--c-accent)' }}>
                    01
                  </div>
                  <h3 className="c-heading text-lg mb-2">Target Domain & Role</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                    Select your focus area from technical domains, system design, or leadership behavioral tracks.
                  </p>
                </div>
                <div className="mt-6 flex items-center gap-2 text-xs font-semibold" style={{ color: 'var(--c-text-muted)' }}>
                  <Compass className="w-4 h-4" /> Role Calibration
                </div>
              </div>

              {/* Step 2 */}
              <div
                className="p-6 sm:p-7 rounded-2xl flex flex-col justify-between"
                style={{
                  background: 'var(--c-surface)',
                  border: '1px solid var(--c-border)',
                }}
              >
                <div>
                  <div className="c-serif-num text-2xl font-bold mb-3" style={{ color: 'var(--c-accent)' }}>
                    02
                  </div>
                  <h3 className="c-heading text-lg mb-2">Real Interview Environment</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                    Answer timed questions out loud with speech and camera capture, simulating a live hiring interview.
                  </p>
                </div>
                <div className="mt-6 flex items-center gap-2 text-xs font-semibold" style={{ color: 'var(--c-text-muted)' }}>
                  <Mic className="w-4 h-4" /> Live Spoken Flow
                </div>
              </div>

              {/* Step 3 */}
              <div
                className="p-6 sm:p-7 rounded-2xl flex flex-col justify-between"
                style={{
                  background: 'var(--c-surface)',
                  border: '1px solid var(--c-border)',
                }}
              >
                <div>
                  <div className="c-serif-num text-2xl font-bold mb-3" style={{ color: 'var(--c-accent)' }}>
                    03
                  </div>
                  <h3 className="c-heading text-lg mb-2">In-Depth Evaluation</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                    Receive actionable feedback on technical accuracy, structure, clarity, and pacing.
                  </p>
                </div>
                <div className="mt-6 flex items-center gap-2 text-xs font-semibold" style={{ color: 'var(--c-text-muted)' }}>
                  <FileText className="w-4 h-4" /> Structured Insights
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Link
                to="/interview/goal"
                className="c-btn c-btn-primary inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold"
              >
                <PlayCircle className="w-4 h-4" />
                Launch First Session
              </Link>
            </div>
          </section>
        ) : (
          /* ── ACTIVE HISTORY STATE: REFINED RECENT ACTIVITY LIST ────────── */
          <section aria-label="Recent Interview Activity" className="mb-12">
            <div className="flex items-baseline justify-between mb-6">
              <div>
                <p className="c-eyebrow mb-1">Activity</p>
                <h2 className="c-heading text-2xl">Recent Sessions</h2>
              </div>
              <Link
                to="/history"
                className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider"
                style={{ color: 'var(--c-accent)' }}
              >
                Full History <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: 'var(--c-surface)',
                border: '1px solid var(--c-border)',
              }}
            >
              {summary.recent.map((interview, index) => (
                <Link
                  key={interview.id}
                  to={
                    interview.status === 'Completed'
                      ? `/interview/${interview.id}/results`
                      : `/interview/${interview.id}/session`
                  }
                  className="group flex items-center justify-between gap-4 px-6 py-5 transition-colors"
                  style={{
                    borderTop: index > 0 ? '1px solid var(--c-border)' : undefined,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--c-surface-muted)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '';
                  }}
                >
                  {/* Left: Role & Date */}
                  <div className="min-w-0 flex items-center gap-4">
                    <span
                      className="c-serif-num text-lg font-semibold shrink-0 w-6 text-center select-none"
                      style={{ color: 'var(--c-border-strong)' }}
                    >
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-base font-semibold truncate" style={{ color: 'var(--c-text)' }}>
                        {interview.role}
                      </p>
                      <p className="text-xs flex items-center gap-2 mt-1" style={{ color: 'var(--c-text-muted)' }}>
                        <span className="capitalize">{interview.type}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(interview.createdAt)}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Right: Score, Badge & Action link */}
                  <div className="flex items-center gap-4 shrink-0">
                    {interview.score != null && (
                      <span className="c-serif-num text-sm sm:text-base font-bold" style={{ color: 'var(--c-text)' }}>
                        {interview.score}%
                      </span>
                    )}
                    <span className={`c-badge ${STATUS_TONE[interview.status] || 'c-badge-muted'}`}>
                      {interview.status}
                    </span>
                    <span
                      className="hidden sm:inline-flex items-center gap-1 text-xs font-bold transition-transform group-hover:translate-x-0.5"
                      style={{ color: 'var(--c-accent)' }}
                    >
                      {interview.status === 'Completed' ? 'View Results' : 'Resume'}
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ─── FOOTER TELEMETRY NOTE ───────────────────────────────────────── */}
        <footer
          className="pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs"
          style={{ borderColor: 'var(--c-border)', color: 'var(--c-text-muted)' }}
        >
          <p>MockAI Interview Practice Workspace</p>
          <p>Real Question Banks & Evaluation Pipeline</p>
        </footer>

      </main>
    </div>
  );
};

export default Dashboard;
