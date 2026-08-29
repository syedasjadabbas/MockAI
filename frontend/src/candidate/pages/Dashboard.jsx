import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  PlayCircle,
  ArrowRight,
  Clock,
  ChevronRight,
  CheckCircle2,
  BarChart2,
} from 'lucide-react';
import CandidateNav from '../components/CandidateNav';
import ScoreRing from '../components/ScoreRing';
import { getDashboardSummary } from '../services/candidateApi';
import { getSession } from '../services/candidateAuth';
import { formatDate } from '../../utils/dateFormat';
import { CANDIDATE_IMAGES } from '../assets/images';

const STATUS_TONE = {
  Completed: 'c-badge-success',
  'In Progress': 'c-badge-warning',
};

/* ─── tiny inline skeleton ──────────────────────────────────────────────── */
const Sk = ({ className = '' }) => (
  <span className={`c-skeleton inline-block rounded ${className}`} />
);

/* ─── Dashboard ─────────────────────────────────────────────────────────── */
// Candidate Dashboard - FR04 (profile/activity summary), FR27 (history glance), FR36 (progress awareness)
const Dashboard = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const session = getSession();
  const navigate = useNavigate();

  useEffect(() => {
    getDashboardSummary().then((data) => {
      setSummary(data);
      setLoading(false);
    });
  }, []);

  const firstName = session?.name ? session.name.split(' ')[0] : '';
  const hasInterviews = !loading && summary?.recent?.length > 0;
  const hasScore = !loading && summary?.averageScore != null;

  return (
    /* The dashboard controls its own layout: no CandidateLayout wrapper
       so the hero can bleed to viewport edges while inner sections re-
       apply a sensible column constraint. Nav is kept exactly as-is. */
    <div className="candidate-app min-h-screen" style={{ background: 'var(--c-bg)' }}>
      <CandidateNav />

      {/* ══════════════════════════════════════════════════════════════════
          HERO — full-viewport-width, image on the right, copy on the left.
          No card border, no rounded container. Bleeds edge-to-edge.
      ══════════════════════════════════════════════════════════════════ */}
      <section
        className="relative overflow-hidden"
        style={{
          borderBottom: '1px solid var(--c-border)',
          minHeight: 'clamp(420px, 55vh, 680px)',
        }}
        aria-label="Welcome"
      >
        {/* Right-side editorial image — clips off the right edge intentionally */}
        <div
          className="absolute inset-y-0 right-0 hidden md:block"
          style={{ width: 'clamp(340px, 45vw, 720px)' }}
          aria-hidden="true"
        >
          <img
            src={CANDIDATE_IMAGES.dashboardHero}
            alt=""
            className="w-full h-full object-cover"
            style={{ objectPosition: 'center 30%' }}
          />
          {/* Left-side gradient: image dissolves into page background */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(to right, var(--c-bg) 0%, var(--c-bg) 6%, transparent 42%)',
            }}
          />
          {/* Optional: subtle bottom scrim so text below doesn't clash */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(to top, var(--c-bg) 0%, transparent 28%)',
            }}
          />
        </div>

        {/* Copy — anchored left, never touches the image on desktop */}
        <div
          className="relative z-10 mx-auto flex flex-col justify-center"
          style={{
            maxWidth: '1152px',
            padding: 'clamp(48px, 8vw, 96px) clamp(16px, 4vw, 40px)',
            minHeight: 'clamp(420px, 55vh, 680px)',
          }}
        >
          {/* Context label */}
          {firstName && (
            <p
              className="text-sm font-semibold mb-5"
              style={{ color: 'var(--c-text-muted)', letterSpacing: '0.01em' }}
            >
              Welcome back, {firstName}
            </p>
          )}

          {/* Primary editorial headline — the brand message, not the greeting */}
          <h1
            className="c-heading"
            style={{
              fontSize: 'clamp(2.4rem, 5.5vw, 4.5rem)',
              lineHeight: 1.04,
              letterSpacing: '-0.025em',
              maxWidth: '16ch',
              marginBottom: '1.5rem',
            }}
          >
            Prepare for the
            <br />
            interview you
            <br />
            actually want to ace.
          </h1>

          {/* Supporting copy */}
          <p
            style={{
              color: 'var(--c-text-secondary)',
              fontSize: '1rem',
              lineHeight: 1.75,
              maxWidth: '38ch',
              marginBottom: '2.25rem',
            }}
          >
            Real question sets. Recorded answers. Honest feedback. Every
            session builds the edge you need.
          </p>

          {/* Primary CTA */}
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/interview/goal"
              className="c-btn c-btn-primary inline-flex items-center gap-2.5 font-bold"
              style={{
                padding: '0.875rem 1.75rem',
                fontSize: '0.9375rem',
                borderRadius: '10px',
              }}
            >
              <PlayCircle style={{ width: '17px', height: '17px' }} />
              Start Interview
            </Link>

            {hasInterviews && (
              <Link
                to="/history"
                className="c-btn c-btn-secondary inline-flex items-center gap-2"
                style={{
                  padding: '0.875rem 1.5rem',
                  fontSize: '0.9375rem',
                  borderRadius: '10px',
                }}
              >
                View History
                <ArrowRight style={{ width: '15px', height: '15px' }} />
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          STATS — large numeral typography, hairline dividers, no cards
      ══════════════════════════════════════════════════════════════════ */}
      <section
        style={{
          borderBottom: '1px solid var(--c-border)',
        }}
        aria-label="Activity overview"
      >
        <div
          className="mx-auto"
          style={{ maxWidth: '1152px', padding: '0 clamp(16px, 4vw, 40px)' }}
        >
          <div
            className="grid"
            style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}
          >
            {/* Stat: Sessions */}
            <div
              className="py-10 pr-8"
              style={{ borderRight: '1px solid var(--c-border)' }}
            >
              <div
                className="c-serif-num"
                style={{
                  fontSize: 'clamp(2.5rem, 4vw, 3.75rem)',
                  lineHeight: 1,
                  letterSpacing: '-0.03em',
                  marginBottom: '0.5rem',
                  color: 'var(--c-text)',
                }}
              >
                {loading ? <Sk className="w-16 h-10" /> : (summary.totalInterviews ?? '—')}
              </div>
              <p
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.14em',
                  color: 'var(--c-text-muted)',
                }}
              >
                Sessions
              </p>
            </div>

            {/* Stat: Completed */}
            <div
              className="py-10 px-8"
              style={{ borderRight: '1px solid var(--c-border)' }}
            >
              <div
                className="c-serif-num"
                style={{
                  fontSize: 'clamp(2.5rem, 4vw, 3.75rem)',
                  lineHeight: 1,
                  letterSpacing: '-0.03em',
                  marginBottom: '0.5rem',
                  color: 'var(--c-text)',
                }}
              >
                {loading ? <Sk className="w-16 h-10" /> : (summary.completedInterviews ?? '—')}
              </div>
              <p
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.14em',
                  color: 'var(--c-text-muted)',
                }}
              >
                Completed
              </p>
            </div>

            {/* Stat: Average Score */}
            <div className="py-10 pl-8">
              <div
                className="c-serif-num"
                style={{
                  fontSize: 'clamp(2.5rem, 4vw, 3.75rem)',
                  lineHeight: 1,
                  letterSpacing: '-0.03em',
                  marginBottom: '0.5rem',
                  color: hasScore ? 'var(--c-text)' : 'var(--c-border-strong)',
                }}
              >
                {loading ? (
                  <Sk className="w-16 h-10" />
                ) : hasScore ? (
                  `${summary.averageScore}%`
                ) : (
                  '—'
                )}
              </div>
              <p
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.14em',
                  color: 'var(--c-text-muted)',
                }}
              >
                Avg Score
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          MAIN BODY — two-column on desktop: history left, progress right
      ══════════════════════════════════════════════════════════════════ */}
      <section
        className="mx-auto"
        style={{
          maxWidth: '1152px',
          padding: 'clamp(48px, 6vw, 80px) clamp(16px, 4vw, 40px)',
        }}
      >
        <div
          className="grid gap-16"
          style={{ gridTemplateColumns: '1fr', alignItems: 'start' }}
        >
          {/* ── Larger viewport: side-by-side ── */}
          <div
            className="grid gap-16"
            style={{
              gridTemplateColumns: 'minmax(0, 1fr)',
              alignItems: 'start',
            }}
          >
            <style>{`
              @media (min-width: 900px) {
                .dash-body-grid {
                  grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr) !important;
                  gap: 4rem !important;
                }
              }
            `}</style>

            <div className="dash-body-grid grid gap-12" style={{ alignItems: 'start' }}>

              {/* ── LEFT: Recent Sessions ─────────────────────────────────── */}
              <div>
                <div
                  className="flex items-baseline justify-between"
                  style={{ marginBottom: '1.75rem' }}
                >
                  <h2
                    className="c-heading"
                    style={{ fontSize: '1.25rem', letterSpacing: '-0.01em' }}
                  >
                    Recent Sessions
                  </h2>
                  {hasInterviews && (
                    <Link
                      to="/history"
                      className="inline-flex items-center gap-1"
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.12em',
                        color: 'var(--c-accent)',
                      }}
                    >
                      All history <ArrowRight style={{ width: '13px', height: '13px' }} />
                    </Link>
                  )}
                </div>

                {/* Loading skeleton */}
                {loading && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        style={{
                          borderTop: i > 0 ? '1px solid var(--c-border)' : undefined,
                          borderBottom: i === 3 ? '1px solid var(--c-border)' : undefined,
                          padding: '1.125rem 0',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '1rem',
                        }}
                      >
                        <Sk className="w-7 h-5" />
                        <div style={{ flex: 1 }}>
                          <Sk className="w-40 h-4 mb-2" />
                          <Sk className="w-24 h-3" />
                        </div>
                        <Sk className="w-16 h-5 rounded-full" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Empty state — no card, just typography */}
                {!loading && summary.recent.length === 0 && (
                  <div style={{ paddingTop: '0.5rem', paddingBottom: '2rem' }}>
                    {/* Decorative large numeral */}
                    <div
                      className="c-serif-num"
                      style={{
                        fontSize: 'clamp(5rem, 10vw, 8rem)',
                        lineHeight: 1,
                        color: 'var(--c-border)',
                        marginBottom: '1.5rem',
                        letterSpacing: '-0.04em',
                        userSelect: 'none',
                      }}
                      aria-hidden="true"
                    >
                      0
                    </div>
                    <h3
                      className="c-heading"
                      style={{ fontSize: '1.125rem', marginBottom: '0.625rem' }}
                    >
                      Your first session starts here.
                    </h3>
                    <p
                      style={{
                        color: 'var(--c-text-secondary)',
                        fontSize: '0.9375rem',
                        lineHeight: 1.7,
                        maxWidth: '36ch',
                        marginBottom: '1.75rem',
                      }}
                    >
                      Sessions, scores, and feedback appear once you complete
                      your first mock interview. It takes less than ten minutes.
                    </p>
                    <Link
                      to="/interview/goal"
                      className="c-btn c-btn-primary inline-flex items-center gap-2"
                      style={{
                        padding: '0.75rem 1.5rem',
                        fontSize: '0.875rem',
                        borderRadius: '10px',
                      }}
                    >
                      <PlayCircle style={{ width: '16px', height: '16px' }} />
                      Begin First Interview
                    </Link>
                  </div>
                )}

                {/* Interview list — editorial rows, no cards */}
                {!loading && summary.recent.length > 0 && (
                  <div
                    role="list"
                    style={{
                      borderTop: '1px solid var(--c-border)',
                    }}
                  >
                    {summary.recent.map((interview, index) => (
                      <Link
                        key={interview.id}
                        role="listitem"
                        to={
                          interview.status === 'Completed'
                            ? `/interview/${interview.id}/results`
                            : `/interview/${interview.id}/session`
                        }
                        className="group"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '1rem',
                          padding: '1.125rem 0',
                          borderBottom: '1px solid var(--c-border)',
                          textDecoration: 'none',
                          transition: 'background 0.15s ease',
                          marginLeft: '-8px',
                          marginRight: '-8px',
                          paddingLeft: '8px',
                          paddingRight: '8px',
                          borderRadius: '6px',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--c-surface-muted)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '';
                        }}
                      >
                        {/* Ordinal index */}
                        <span
                          className="c-serif-num shrink-0"
                          style={{
                            fontSize: '1rem',
                            color: 'var(--c-border-strong)',
                            width: '1.5rem',
                            textAlign: 'right',
                            userSelect: 'none',
                          }}
                          aria-hidden="true"
                        >
                          {index + 1}
                        </span>

                        {/* Role + date */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p
                            style={{
                              fontSize: '0.9375rem',
                              fontWeight: 600,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              color: 'var(--c-text)',
                              marginBottom: '2px',
                            }}
                          >
                            {interview.role}
                          </p>
                          <p
                            className="flex items-center gap-1.5"
                            style={{
                              fontSize: '0.75rem',
                              color: 'var(--c-text-muted)',
                            }}
                          >
                            <Clock style={{ width: '11px', height: '11px', flexShrink: 0 }} />
                            {formatDate(interview.createdAt)}
                          </p>
                        </div>

                        {/* Score */}
                        {interview.score != null && (
                          <span
                            className="c-serif-num shrink-0"
                            style={{
                              fontSize: '0.9375rem',
                              fontWeight: 600,
                              color: 'var(--c-text-secondary)',
                            }}
                          >
                            {interview.score}%
                          </span>
                        )}

                        {/* Status badge */}
                        <span
                          className={`c-badge shrink-0 ${STATUS_TONE[interview.status] || 'c-badge-muted'}`}
                        >
                          {interview.status}
                        </span>

                        {/* Hover chevron */}
                        <ChevronRight
                          style={{
                            width: '15px',
                            height: '15px',
                            color: 'var(--c-text-muted)',
                            flexShrink: 0,
                            opacity: 0,
                            transition: 'opacity 0.15s ease',
                          }}
                          className="group-hover:opacity-100"
                        />
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* ── RIGHT: Score Progress ─────────────────────────────────── */}
              <div>
                <div
                  style={{ marginBottom: '1.75rem' }}
                  className="flex items-baseline justify-between"
                >
                  <h2
                    className="c-heading"
                    style={{ fontSize: '1.25rem', letterSpacing: '-0.01em' }}
                  >
                    Performance
                  </h2>
                  <Link
                    to="/progress"
                    className="inline-flex items-center gap-1"
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.12em',
                      color: 'var(--c-accent)',
                    }}
                  >
                    Full progress <ArrowRight style={{ width: '13px', height: '13px' }} />
                  </Link>
                </div>

                {/* Score Ring — contained, not in a bordered card */}
                {loading ? (
                  <div className="flex flex-col items-center gap-4" style={{ paddingTop: '1rem', paddingBottom: '2rem' }}>
                    <Sk className="w-32 h-32 rounded-full" />
                    <Sk className="w-20 h-3" />
                  </div>
                ) : hasScore ? (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '1.25rem',
                      paddingTop: '1rem',
                      paddingBottom: '2.5rem',
                    }}
                  >
                    <ScoreRing
                      value={summary.averageScore}
                      label="Average Score"
                      size={148}
                      strokeWidth={10}
                    />
                    <p
                      style={{
                        fontSize: '0.8125rem',
                        color: 'var(--c-text-muted)',
                        textAlign: 'center',
                        maxWidth: '22ch',
                        lineHeight: 1.6,
                      }}
                    >
                      Across {summary.completedInterviews} completed session{summary.completedInterviews !== 1 ? 's' : ''}.
                    </p>
                  </div>
                ) : (
                  /* No data yet — editorial typography, no empty-state card */
                  <div style={{ paddingTop: '0.5rem', paddingBottom: '2rem' }}>
                    {/* Decorative ring outline (empty) */}
                    <div
                      style={{
                        width: '96px',
                        height: '96px',
                        borderRadius: '50%',
                        border: '2px solid var(--c-border)',
                        marginBottom: '1.25rem',
                      }}
                      aria-hidden="true"
                    />
                    <h3
                      className="c-heading"
                      style={{ fontSize: '1rem', marginBottom: '0.5rem' }}
                    >
                      No scores yet
                    </h3>
                    <p
                      style={{
                        color: 'var(--c-text-secondary)',
                        fontSize: '0.875rem',
                        lineHeight: 1.7,
                        maxWidth: '28ch',
                        marginBottom: '1.5rem',
                      }}
                    >
                      Complete your first interview to start tracking
                      your score trend.
                    </p>
                    <Link
                      to="/progress"
                      className="inline-flex items-center gap-1.5"
                      style={{
                        fontSize: '0.8125rem',
                        fontWeight: 700,
                        color: 'var(--c-accent)',
                      }}
                    >
                      <BarChart2 style={{ width: '14px', height: '14px' }} />
                      View Progress Page
                    </Link>
                  </div>
                )}

                {/* Divider */}
                <div
                  style={{
                    borderTop: '1px solid var(--c-border)',
                    paddingTop: '1.5rem',
                    marginTop: '0.5rem',
                  }}
                >
                  <p
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.12em',
                      color: 'var(--c-text-muted)',
                      marginBottom: '1rem',
                    }}
                  >
                    Quick actions
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                    {[
                      { label: 'Start New Interview', to: '/interview/goal', icon: PlayCircle },
                      { label: 'Interview History', to: '/history', icon: Clock },
                      { label: 'Progress Tracking', to: '/progress', icon: BarChart2 },
                    ].map(({ label, to, icon: Icon }, i, arr) => (
                      <Link
                        key={to}
                        to={to}
                        className="group flex items-center justify-between"
                        style={{
                          padding: '0.75rem 0',
                          borderBottom: i < arr.length - 1 ? '1px solid var(--c-border)' : undefined,
                          textDecoration: 'none',
                          transition: 'color 0.15s ease',
                          color: 'var(--c-text-secondary)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = 'var(--c-text)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = 'var(--c-text-secondary)';
                        }}
                      >
                        <span
                          className="flex items-center gap-2.5"
                          style={{ fontSize: '0.875rem', fontWeight: 600 }}
                        >
                          <Icon style={{ width: '14px', height: '14px', flexShrink: 0, color: 'var(--c-accent)' }} />
                          {label}
                        </span>
                        <ChevronRight
                          style={{
                            width: '14px',
                            height: '14px',
                            color: 'var(--c-border-strong)',
                            flexShrink: 0,
                          }}
                        />
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
