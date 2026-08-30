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
import { CANDIDATE_IMAGES } from '../assets/images';
import logo from '../../assets/logo.png';

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

  const displayName = session?.name || 'Candidate';
  const hasInterviews = !loading && summary?.recent?.length > 0;
  const hasScore = !loading && summary?.averageScore != null;

  return (
    <div className="candidate-app min-h-screen" style={{ background: 'var(--c-bg)' }}>
      {/* Global Candidate Navigation Bar */}
      <CandidateNav />

      {/* ══════════════════════════════════════════════════════════════════
          CINEMATIC EDITORIAL HERO — Exact Composition from Reference
      ══════════════════════════════════════════════════════════════════ */}
      <section
        aria-label="Practice Workspace Hero"
        className="relative overflow-hidden w-full select-none"
        style={{
          background: '#130f0c',
          color: '#f3ede3',
          minHeight: 'clamp(540px, 68vh, 720px)',
        }}
      >
        {/* Background Photograph — Aligned Right */}
        <div
          className="absolute inset-y-0 right-0 w-full md:w-3/4 lg:w-[68%] bg-no-repeat bg-cover"
          style={{
            backgroundImage: `url(${CANDIDATE_IMAGES.dashboardHero})`,
            backgroundPosition: 'right 20% center',
          }}
          aria-hidden="true"
        >
          {/* Multi-stage horizontal scrim smoothly blending photo into left solid dark tone */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(to right, #130f0c 0%, #130f0c 18%, rgba(19, 15, 12, 0.94) 38%, rgba(19, 15, 12, 0.65) 60%, rgba(19, 15, 12, 0.2) 80%, transparent 100%)',
            }}
          />
          {/* Top subtle fade */}
          <div
            className="absolute inset-x-0 top-0 h-24"
            style={{
              background: 'linear-gradient(180deg, #130f0c 0%, transparent 100%)',
              opacity: 0.5,
            }}
          />
          {/* Bottom fade */}
          <div
            className="absolute inset-x-0 bottom-0 h-28"
            style={{
              background: 'linear-gradient(0deg, #130f0c 0%, transparent 100%)',
            }}
          />
        </div>

        {/* Foreground Content Container */}
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24 flex flex-col justify-center min-h-[clamp(540px,68vh,720px)]">
          
          {/* Main Copy Block */}
          <div className="max-w-xl">
            
            {/* Context Greeting Block */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#d98a72]" />
                <span className="text-[10px] sm:text-[11px] font-bold tracking-[0.18em] uppercase text-neutral-400">
                  PRACTICE WORKSPACE
                </span>
              </div>
              <p className="text-lg sm:text-xl font-medium text-[#f3ede3]">
                Welcome back, {displayName}
              </p>
            </div>

            {/* Dominant Fraunces Display Headline */}
            <h1
              className="c-heading text-4xl sm:text-5xl lg:text-[4.25rem] font-medium leading-[1.03] tracking-[-0.03em] mb-5 text-[#fbf7f1]"
              style={{
                fontFamily: 'var(--c-font-heading)',
              }}
            >
              Practice before<br />it matters.
            </h1>

            {/* Short, Confident Subtitle */}
            <p className="text-sm sm:text-base leading-relaxed mb-8 text-neutral-300 max-w-[40ch]">
              Simulate realistic interviews with timed questions, live speech and camera capture, and objective feedback.
            </p>

            {/* Primary Start Interview CTA */}
            <div className="flex items-center gap-4">
              <Link
                to="/interview/goal"
                className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl text-sm sm:text-base font-bold text-[#1a110e] transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, #df9b85 0%, #cf826c 100%)',
                  boxShadow: '0 8px 24px -6px rgba(207, 130, 108, 0.4)',
                }}
              >
                <PlayCircle className="w-5 h-5 fill-current" />
                <span>Start Interview</span>
              </Link>
            </div>
          </div>

        </div>

        {/* Crisp bottom hairline border */}
        <div className="absolute inset-x-0 bottom-0 h-px bg-white/10" />
      </section>

      {/* ─── WORKSPACE MAIN CONTENT ───────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">

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
          /* ── ZERO INTERVIEW STATE: HOW YOUR PRACTICE WORKS ────────────── */
          <section aria-label="How Practice Works" className="mb-14 sm:mb-20">
            <div className="max-w-2xl mb-10">
              <p className="c-eyebrow mb-2">Methodology</p>
              <h2 className="c-heading text-2xl sm:text-3xl lg:text-4xl mb-3">
                How your practice works.
              </h2>
              <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                MockAI is built for active practice under realistic constraints. Every session follows a deliberate three-step workflow engineered to build interview muscle memory.
              </p>
            </div>

            {/* Open 3-Column Editorial Grid with Hairline Dividers */}
            <div
              className="grid grid-cols-1 md:grid-cols-3 border-t border-b mb-10"
              style={{ borderColor: 'var(--c-border)' }}
            >
              {/* Column 01 */}
              <div
                className="py-8 md:py-10 md:pr-8 flex flex-col justify-between border-b md:border-b-0 md:border-r"
                style={{ borderColor: 'var(--c-border)' }}
              >
                <div>
                  <div className="c-serif-num text-3xl sm:text-4xl font-semibold mb-4" style={{ color: 'var(--c-accent)' }}>
                    01
                  </div>
                  <h3 className="c-heading text-lg sm:text-xl mb-2.5">
                    Target Domain & Role
                  </h3>
                  <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--c-text-secondary)' }}>
                    Select your focus area from technical domains, system design, or leadership behavioral tracks calibrated to real hiring bars.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--c-text-muted)' }}>
                  <Compass className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--c-accent)' }} />
                  <span>Role Calibration</span>
                </div>
              </div>

              {/* Column 02 */}
              <div
                className="py-8 md:py-10 md:px-8 flex flex-col justify-between border-b md:border-b-0 md:border-r"
                style={{ borderColor: 'var(--c-border)' }}
              >
                <div>
                  <div className="c-serif-num text-3xl sm:text-4xl font-semibold mb-4" style={{ color: 'var(--c-accent)' }}>
                    02
                  </div>
                  <h3 className="c-heading text-lg sm:text-xl mb-2.5">
                    Real Interview Environment
                  </h3>
                  <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--c-text-secondary)' }}>
                    Answer timed questions out loud with speech and camera capture, simulating the pressure of a live conversation.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--c-text-muted)' }}>
                  <Mic className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--c-accent)' }} />
                  <span>Live Spoken Flow</span>
                </div>
              </div>

              {/* Column 03 */}
              <div
                className="py-8 md:py-10 md:pl-8 flex flex-col justify-between"
              >
                <div>
                  <div className="c-serif-num text-3xl sm:text-4xl font-semibold mb-4" style={{ color: 'var(--c-accent)' }}>
                    03
                  </div>
                  <h3 className="c-heading text-lg sm:text-xl mb-2.5">
                    In-Depth Evaluation
                  </h3>
                  <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--c-text-secondary)' }}>
                    Receive structured breakdowns on technical accuracy, structure, delivery clarity, and areas for improvement.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--c-text-muted)' }}>
                  <FileText className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--c-accent)' }} />
                  <span>Structured Insights</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Link
                to="/interview/goal"
                className="c-btn c-btn-primary inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl text-sm font-bold shadow-sm transition-transform hover:-translate-y-0.5"
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

        {/* ══════════════════════════════════════════════════════════════════
            PREMIUM EDITORIAL FOOTER
        ══════════════════════════════════════════════════════════════════ */}
        <footer
          className="border-t mt-16 sm:mt-24 pt-12 sm:pt-16 pb-12"
          style={{ borderColor: 'var(--c-border)' }}
        >
          {/* Top footer row: Brand statement + Navigation + Action */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 pb-10">
            
            {/* Brand & Mission Statement */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
              <Link
                to="/dashboard"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="shrink-0 inline-flex items-center hover:opacity-90 transition-opacity select-none"
              >
                <img src={logo} alt="MockAI Logo" className="h-10 sm:h-12 w-auto object-contain" />
              </Link>
              <span className="hidden sm:inline-block w-px h-6" style={{ background: 'var(--c-border)' }} />
              <p className="text-xs sm:text-sm max-w-xs leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                AI-powered interview practice for serious preparation.
              </p>
            </div>

            {/* Navigation Links & Direct Start Action */}
            <div className="flex flex-wrap items-center gap-5 sm:gap-8 text-xs sm:text-sm font-semibold">
              {[
                { label: 'Dashboard', path: '/dashboard' },
                { label: 'History', path: '/history' },
                { label: 'Progress', path: '/progress' },
                { label: 'Profile', path: '/profile' },
              ].map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="transition-colors hover:text-[var(--c-accent)]"
                  style={{ color: 'var(--c-text-secondary)' }}
                >
                  {link.label}
                </Link>
              ))}

              <Link
                to="/interview/goal"
                className="inline-flex items-center gap-1.5 font-bold transition-colors hover:opacity-80 ml-1"
                style={{ color: 'var(--c-accent)' }}
              >
                <span>Start Interview</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Bottom hairline & copyright */}
          <div
            className="pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-xs"
            style={{ borderColor: 'var(--c-border)', color: 'var(--c-text-muted)' }}
          >
            <p>© 2026 MockAI</p>
            <p className="text-[11px] font-medium tracking-wider uppercase">
              Real Question Bank & Evaluation Engine
            </p>
          </div>
        </footer>

      </main>
    </div>
  );
};

export default Dashboard;
