import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, CheckCircle2, TrendingUp, PlayCircle, ArrowRight, Clock } from 'lucide-react';
import CandidateLayout from '../layouts/CandidateLayout';
import CandidateStat from '../components/CandidateStat';
import CandidateEmptyState from '../components/CandidateEmptyState';
import ScoreRing from '../components/ScoreRing';
import { getDashboardSummary } from '../services/candidateApi';
import { getSession } from '../services/candidateAuth';
import { formatDate } from '../../utils/dateFormat';
import { CANDIDATE_IMAGES } from '../assets/images';

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

  return (
    <CandidateLayout>
      <div className="mb-8">
        <p className="c-eyebrow mb-2">Dashboard</p>
        <h1 className="c-heading text-3xl sm:text-4xl">
          Welcome back{firstName ? `, ${firstName}` : ''}.
        </h1>
        <p className="text-sm mt-2" style={{ color: 'var(--c-text-secondary)' }}>
          Here's where your interview practice stands today.
        </p>
      </div>

      {/* Hero: primary CTA + contextual visual */}
      <div className="c-card rounded-3xl overflow-hidden grid grid-cols-1 md:grid-cols-5 mb-6">
        <div className="md:col-span-3 p-7 sm:p-9 flex flex-col justify-center gap-4">
          <p className="c-eyebrow">Ready for another round?</p>
          <h2 className="c-heading text-2xl sm:text-[1.7rem] leading-snug max-w-md">
            Pick a focus and MockAI will line up a real question set for you.
          </h2>
          <p className="text-sm max-w-md" style={{ color: 'var(--c-text-secondary)' }}>
            Technical, behavioral, or situational — every session is recorded, transcribed, and added to your history.
          </p>
          <Link to="/interview/goal" className="c-btn c-btn-primary w-fit px-5 py-3 mt-1">
            <PlayCircle className="w-4.5 h-4.5" />
            Start New Interview
          </Link>
        </div>
        <div className="hidden md:block md:col-span-2 relative min-h-[220px]">
          <img src={CANDIDATE_IMAGES.dashboardHero} alt="" className="absolute inset-0 w-full h-full object-cover" />
        </div>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="c-skeleton h-[104px] rounded-2xl" />
          <div className="c-skeleton h-[104px] rounded-2xl" />
          <div className="c-skeleton h-[104px] rounded-2xl" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <CandidateStat label="Total Interviews" value={summary.totalInterviews} icon={Briefcase} hint="All sessions started" />
          <CandidateStat label="Completed" value={summary.completedInterviews} icon={CheckCircle2} hint="Fully finished sessions" />
          <CandidateStat label="Average Score" value={summary.averageScore ?? '—'} icon={TrendingUp} hint={summary.averageScore ? 'Across completed interviews' : 'No completed interviews yet'} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent interviews */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="c-heading text-lg">Recent Interviews</h3>
            <Link to="/history" className="text-xs font-semibold flex items-center gap-1" style={{ color: 'var(--c-accent)' }}>
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {loading ? (
            <div className="c-skeleton h-40 rounded-2xl" />
          ) : summary.recent.length === 0 ? (
            <div className="c-card rounded-2xl">
              <CandidateEmptyState
                icon={Briefcase}
                title="No interviews yet"
                description="Start your first mock interview to see your results and progress here."
                actionLabel="Start Interview"
                onAction={() => (window.location.href = '/interview/goal')}
              />
            </div>
          ) : (
            <div className="c-card rounded-2xl c-divide overflow-hidden">
              {summary.recent.map((interview) => (
                <Link
                  key={interview.id}
                  to={interview.status === 'Completed' ? `/interview/${interview.id}/results` : `/interview/${interview.id}/session`}
                  className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-[var(--c-surface-muted)]"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{interview.role}</p>
                    <p className="text-xs flex items-center gap-1.5 mt-0.5" style={{ color: 'var(--c-text-muted)' }}>
                      <Clock className="w-3 h-3" /> {formatDate(interview.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {interview.score != null && <span className="c-serif-num text-sm">{interview.score}%</span>}
                    <span className={`c-badge ${STATUS_TONE[interview.status] || 'c-badge-muted'}`}>{interview.status}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Score ring -> progress */}
        <div className="c-card rounded-2xl p-6 flex flex-col items-center justify-center gap-3">
          <ScoreRing value={summary?.averageScore ?? null} label="Average Score" />
          <Link to="/progress" className="text-xs font-semibold flex items-center gap-1" style={{ color: 'var(--c-accent)' }}>
            View progress <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </CandidateLayout>
  );
};

export default Dashboard;
