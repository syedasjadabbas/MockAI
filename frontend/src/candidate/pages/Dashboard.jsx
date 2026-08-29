import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, CheckCircle2, TrendingUp, PlayCircle, ArrowRight, Clock, ChevronRight } from 'lucide-react';
import CandidateLayout from '../layouts/CandidateLayout';
import ScoreRing from '../components/ScoreRing';
import { getDashboardSummary } from '../services/candidateApi';
import { getSession } from '../services/candidateAuth';
import { formatDate } from '../../utils/dateFormat';
import { CANDIDATE_IMAGES } from '../assets/images';

// Status badge tones
const STATUS_TONE = {
  Completed: 'c-badge-success',
  'In Progress': 'c-badge-warning',
};

// Candidate Dashboard - FR04 (profile/activity summary), FR27 (history glance), FR36 (progress awareness)
const Dashboard = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const session = getSession();

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
    <CandidateLayout>
      {/* ── Page hero: greeting + primary CTA ─────────────────────────────── */}
      <section className="relative overflow-hidden rounded-3xl mb-8" style={{ background: 'var(--c-surface)' }}>
        {/* Editorial image strip — right side bleed on desktop */}
        <div
          className="absolute inset-y-0 right-0 w-2/5 bg-cover bg-center hidden md:block"
          style={{ backgroundImage: `url(${CANDIDATE_IMAGES.dashboardHero})` }}
          aria-hidden="true"
        >
          {/* Gradient scrim that blends image into surface */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to right, var(--c-surface) 0%, transparent 40%)',
            }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10 px-7 sm:px-10 py-10 sm:py-14 md:w-3/5">
          <p className="c-eyebrow mb-3">Dashboard</p>
          <h1 className="c-heading text-4xl sm:text-5xl leading-tight mb-4">
            Welcome back{firstName ? `,\u00a0${firstName}` : ''}.
          </h1>
          <p className="text-base mb-8 max-w-sm" style={{ color: 'var(--c-text-secondary)', lineHeight: 1.7 }}>
            Every session sharpens your edge. Pick a focus and MockAI lines up a real question set for you.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/interview/goal"
              className="c-btn c-btn-primary inline-flex items-center gap-2 px-6 py-3 text-sm rounded-xl"
            >
              <PlayCircle className="w-4 h-4" />
              Start New Interview
            </Link>
            {hasInterviews && (
              <Link
                to="/history"
                className="c-btn c-btn-secondary inline-flex items-center gap-2 px-5 py-3 text-sm rounded-xl"
              >
                View History
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ── Inline stats strip ─────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="c-skeleton h-20 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div
          className="grid grid-cols-3 gap-px mb-8 rounded-2xl overflow-hidden"
          style={{ background: 'var(--c-border)', border: '1px solid var(--c-border)' }}
        >
          {/* Total interviews */}
          <div className="flex flex-col justify-center px-6 py-5" style={{ background: 'var(--c-surface)' }}>
            <span className="c-serif-num text-3xl leading-none mb-1">
              {summary.totalInterviews ?? '—'}
            </span>
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--c-text-muted)' }}>
              Sessions
            </span>
          </div>

          {/* Completed */}
          <div className="flex flex-col justify-center px-6 py-5" style={{ background: 'var(--c-surface)' }}>
            <span className="c-serif-num text-3xl leading-none mb-1">
              {summary.completedInterviews ?? '—'}
            </span>
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--c-text-muted)' }}>
              Completed
            </span>
          </div>

          {/* Average score */}
          <div className="flex flex-col justify-center px-6 py-5" style={{ background: 'var(--c-surface)' }}>
            <span className="c-serif-num text-3xl leading-none mb-1">
              {summary.averageScore != null ? `${summary.averageScore}%` : '—'}
            </span>
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--c-text-muted)' }}>
              Avg Score
            </span>
          </div>
        </div>
      )}

      {/* ── Main content grid ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Recent interviews ── */}
        <div className="lg:col-span-2">
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="c-heading text-xl">Recent Sessions</h2>
            {hasInterviews && (
              <Link
                to="/history"
                className="text-xs font-bold uppercase tracking-wider flex items-center gap-1 transition-colors"
                style={{ color: 'var(--c-accent)' }}
              >
                All history <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="c-skeleton h-16 rounded-2xl" />
              ))}
            </div>
          ) : summary.recent.length === 0 ? (
            /* ── Empty state: personality without fabrication ── */
            <div
              className="rounded-3xl overflow-hidden"
              style={{
                background: 'var(--c-surface)',
                border: '1px solid var(--c-border)',
              }}
            >
              <div className="px-8 py-12 flex flex-col items-start gap-5">
                {/* Decorative numeral */}
                <div
                  className="c-serif-num text-[4.5rem] leading-none select-none"
                  style={{ color: 'var(--c-border-strong)', lineHeight: 1 }}
                  aria-hidden="true"
                >
                  0
                </div>
                <div>
                  <h3 className="c-heading text-lg mb-1.5">No interviews yet</h3>
                  <p className="text-sm max-w-xs" style={{ color: 'var(--c-text-secondary)', lineHeight: 1.7 }}>
                    Your sessions, scores, and feedback will appear here once you complete your first mock interview.
                  </p>
                </div>
                <Link
                  to="/interview/goal"
                  className="c-btn c-btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-sm rounded-xl"
                >
                  <PlayCircle className="w-4 h-4" />
                  Begin First Interview
                </Link>
              </div>
            </div>
          ) : (
            /* ── Interview history list ── */
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}
            >
              {summary.recent.map((interview, index) => (
                <Link
                  key={interview.id}
                  to={
                    interview.status === 'Completed'
                      ? `/interview/${interview.id}/results`
                      : `/interview/${interview.id}/session`
                  }
                  className="flex items-center gap-4 px-6 py-4 group transition-colors"
                  style={{
                    borderTop: index > 0 ? '1px solid var(--c-border)' : undefined,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--c-surface-muted)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}
                >
                  {/* Ordinal indicator */}
                  <span
                    className="c-serif-num text-xl shrink-0 w-8 text-center select-none"
                    style={{ color: 'var(--c-border-strong)' }}
                    aria-hidden="true"
                  >
                    {index + 1}
                  </span>

                  {/* Role + date */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{interview.role}</p>
                    <p
                      className="text-xs flex items-center gap-1.5 mt-0.5"
                      style={{ color: 'var(--c-text-muted)' }}
                    >
                      <Clock className="w-3 h-3" />
                      {formatDate(interview.createdAt)}
                    </p>
                  </div>

                  {/* Score + status + chevron */}
                  <div className="flex items-center gap-3 shrink-0">
                    {interview.score != null && (
                      <span className="c-serif-num text-sm font-semibold">
                        {interview.score}%
                      </span>
                    )}
                    <span className={`c-badge ${STATUS_TONE[interview.status] || 'c-badge-muted'}`}>
                      {interview.status}
                    </span>
                    <ChevronRight
                      className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: 'var(--c-text-muted)' }}
                    />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* ── Score & Progress sidebar ── */}
        <div className="space-y-4">
          {/* Average score ring */}
          <div
            className="rounded-2xl p-7 flex flex-col items-center gap-4"
            style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}
          >
            {loading ? (
              <div className="c-skeleton w-32 h-32 rounded-full" />
            ) : (
              <ScoreRing value={summary?.averageScore ?? null} label="Average Score" size={130} strokeWidth={9} />
            )}
            <Link
              to="/progress"
              className="text-xs font-bold uppercase tracking-wider flex items-center gap-1 transition-colors"
              style={{ color: 'var(--c-accent)' }}
            >
              View Progress <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Quick stat: sessions completed */}
          {!loading && (
            <div
              className="rounded-2xl px-6 py-5 flex items-center justify-between"
              style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--c-text-muted)' }}>
                  Completed
                </p>
                <span className="c-serif-num text-3xl">{summary.completedInterviews}</span>
                <span className="text-xs ml-1" style={{ color: 'var(--c-text-muted)' }}>
                  / {summary.totalInterviews}
                </span>
              </div>
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center"
                style={{ background: 'var(--c-accent-soft)' }}
              >
                <CheckCircle2 className="w-5 h-5" style={{ color: 'var(--c-accent)' }} />
              </div>
            </div>
          )}

          {/* Prompt card when no data yet */}
          {!loading && !hasScore && (
            <div
              className="rounded-2xl px-6 py-6"
              style={{ background: 'var(--c-surface-muted)', border: '1px solid var(--c-border)' }}
            >
              <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--c-text-muted)' }}>
                Score Tracking
              </p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                Complete your first interview to start seeing your score trend here.
              </p>
            </div>
          )}
        </div>
      </div>
    </CandidateLayout>
  );
};

export default Dashboard;
