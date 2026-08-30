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
  Radio,
} from 'lucide-react';
import CandidateNav from '../components/CandidateNav';
import { getDashboardSummary, getCategories, startInterview } from '../services/candidateApi';
import { getSession } from '../services/candidateAuth';
import { formatDate } from '../../utils/dateFormat';
import { CANDIDATE_IMAGES } from '../assets/images';

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
        
        {/* ══════════════════════════════════════════════════════════════════
            FLAGSHIP EDITORIAL HERO — Asymmetric, Integrated Visual Studio
        ══════════════════════════════════════════════════════════════════ */}
        <section
          aria-label="Interview Practice Studio"
          className="relative overflow-hidden rounded-3xl mb-12 sm:mb-16"
          style={{
            background: 'var(--c-surface)',
            border: '1px solid var(--c-border)',
            minHeight: '480px',
          }}
        >
          {/* Integrated Editorial Visual Background */}
          <div
            className="absolute inset-y-0 right-0 w-full lg:w-3/5 select-none pointer-events-none hidden md:block overflow-hidden"
            aria-hidden="true"
          >
            <img
              src={CANDIDATE_IMAGES.dashboardHero}
              alt=""
              className="w-full h-full object-cover object-center scale-105 opacity-90 transition-transform duration-1000"
            />
            
            {/* Multi-layered directional scrim to melt photograph into page surface */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(to right, var(--c-surface) 0%, var(--c-surface) 18%, rgba(28, 23, 19, 0.4) 70%, transparent 100%)',
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(to top, var(--c-surface) 0%, transparent 40%)',
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(to bottom, var(--c-surface) 0%, transparent 20%)',
              }}
            />

            {/* Subtle practice telemetry tag overlay on photography */}
            <div
              className="absolute bottom-6 right-6 hidden lg:flex items-center gap-3 px-4 py-2.5 rounded-xl border backdrop-blur-md"
              style={{
                background: 'rgba(28, 23, 19, 0.75)',
                borderColor: 'rgba(231, 221, 204, 0.2)',
                color: '#f3ede3',
              }}
            >
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] font-bold tracking-wider uppercase text-neutral-300">
                  Live Simulation Ready
                </span>
              </div>
              <span className="text-neutral-500">•</span>
              <span className="text-xs text-neutral-300">5 Questions • Video & Mic</span>
            </div>
          </div>

          {/* Hero Foreground Content */}
          <div className="relative z-10 p-7 sm:p-10 lg:p-14 flex flex-col justify-between max-w-2xl">
            <div>
              {/* Practice Eyebrow */}
              <div className="flex items-center gap-2.5 mb-4">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: 'var(--c-accent)' }}
                />
                <span className="c-eyebrow">
                  Practice Studio
                </span>
                {firstName && (
                  <>
                    <span style={{ color: 'var(--c-border-strong)' }}>•</span>
                    <span className="text-xs font-semibold" style={{ color: 'var(--c-text-muted)' }}>
                      Welcome back, {firstName}
                    </span>
                  </>
                )}
              </div>

              {/* Confident Large Display Headline */}
              <h1
                className="c-heading text-3xl sm:text-4xl lg:text-[3.25rem] leading-[1.08] tracking-[-0.025em] mb-4"
              >
                Prepare for the interview you actually want to ace.
              </h1>

              {/* Short, refined supporting copy */}
              <p
                className="text-sm sm:text-base leading-relaxed mb-8"
                style={{ color: 'var(--c-text-secondary)', maxWidth: '38ch' }}
              >
                Simulate authentic interview pressure with timed prompts, camera and spoken recording, and structured evaluation.
              </p>

              {/* Primary Launch Action */}
              <div className="flex flex-wrap items-center gap-3.5 mb-8">
                <Link
                  to="/interview/goal"
                  className="c-btn c-btn-primary inline-flex items-center justify-center gap-2.5 px-7 py-3.5 text-base font-bold rounded-xl shadow-md transition-transform hover:-translate-y-0.5"
                  style={{
                    boxShadow: '0 8px 20px -6px rgba(122, 35, 51, 0.35)',
                  }}
                >
                  <PlayCircle className="w-5 h-5" />
                  Start Interview
                </Link>

                {hasInterviews && (
                  <Link
                    to="/history"
                    className="c-btn c-btn-secondary inline-flex items-center justify-center gap-2 px-5 py-3.5 text-sm font-semibold rounded-xl"
                  >
                    View History
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            </div>

            {/* Focus Domain Quick Jump */}
            {categories.length > 0 && (
              <div className="pt-6 border-t" style={{ borderColor: 'var(--c-border)' }}>
                <p className="text-[11px] font-bold uppercase tracking-widest mb-2.5" style={{ color: 'var(--c-text-muted)' }}>
                  Or pick a focus track:
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {categories.slice(0, 4).map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => handleLaunchCategory(cat)}
                      disabled={launchingId === cat.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all hover:border-[var(--c-accent)] hover:text-[var(--c-accent)]"
                      style={{
                        background: 'var(--c-surface-muted)',
                        borderColor: 'var(--c-border)',
                        color: 'var(--c-text)',
                      }}
                    >
                      <Layers className="w-3 h-3 shrink-0" style={{ color: 'var(--c-accent)' }} />
                      <span>{cat.name}</span>
                      {launchingId === cat.id ? (
                        <span className="w-2.5 h-2.5 border-2 border-t-transparent rounded-full animate-spin ml-0.5" />
                      ) : (
                        <ChevronRight className="w-3 h-3 opacity-50" />
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
