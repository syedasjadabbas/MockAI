import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, CheckCircle2, TrendingUp, PlayCircle, ArrowRight, Clock } from 'lucide-react';
import CandidateLayout from '../layouts/CandidateLayout';
import StatsCard from '../../components/StatsCard';
import EmptyState from '../../components/EmptyState';
import { CardSkeleton } from '../../components/Skeleton';
import ScoreRing from '../components/ScoreRing';
import { getDashboardSummary } from '../services/candidateApi';
import { getSession } from '../services/candidateAuth';
import { formatDate } from '../../utils/dateFormat';

const STATUS_STYLES = {
  Completed: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  'In Progress': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
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

  return (
    <CandidateLayout>
      <div className="mb-8">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
          Welcome back{session?.name ? `, ${session.name.split(' ')[0]}` : ''}
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">Here's a snapshot of your interview practice.</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
          <CardSkeleton /><CardSkeleton /><CardSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
          <StatsCard title="Total Interviews" value={summary.totalInterviews} icon={Briefcase} subtitle="All sessions started" />
          <StatsCard title="Completed" value={summary.completedInterviews} icon={CheckCircle2} subtitle="Fully finished sessions" />
          <StatsCard title="Average Score" value={summary.averageScore ?? '—'} icon={TrendingUp} subtitle={summary.averageScore ? 'Across completed interviews' : 'No completed interviews yet'} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Start Interview CTA */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div>
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1.5">Ready for another round?</h3>
            <p className="text-sm text-[var(--text-secondary)] max-w-md">
              Pick an interview goal and MockAI will line up a focused question set — technical, behavioral, or situational.
            </p>
          </div>
          <Link
            to="/interview/goal"
            className="shrink-0 flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-500/20 transition-all active:scale-[0.98]"
          >
            <PlayCircle className="w-4.5 h-4.5" />
            Start New Interview
          </Link>
        </div>

        {/* Average score ring -> progress */}
        <div className="glass-card rounded-2xl p-6 flex flex-col items-center justify-center gap-3">
          <ScoreRing value={summary?.averageScore ?? null} label="Average Score" />
          <Link to="/progress" className="text-xs font-semibold text-indigo-500 hover:text-indigo-600 flex items-center gap-1">
            View progress <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Recent interviews */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[var(--text-primary)]">Recent Interviews</h3>
          <Link to="/history" className="text-xs font-semibold text-indigo-500 hover:text-indigo-600 flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {loading ? (
          <CardSkeleton />
        ) : summary.recent.length === 0 ? (
          <div className="glass-card rounded-2xl">
            <EmptyState
              icon={Briefcase}
              title="No interviews yet"
              description="Start your first mock interview to see your results and progress here."
              actionLabel="Start Interview"
              onAction={() => (window.location.href = '/interview/goal')}
            />
          </div>
        ) : (
          <div className="glass-card rounded-2xl divide-y divide-[var(--border-table)] overflow-hidden">
            {summary.recent.map((interview) => (
              <Link
                key={interview.id}
                to={interview.status === 'Completed' ? `/interview/${interview.id}/results` : `/interview/${interview.id}/session`}
                className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-[var(--bg-table-row-hover)] transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{interview.role}</p>
                  <p className="text-xs text-[var(--text-muted)] flex items-center gap-1.5 mt-0.5">
                    <Clock className="w-3 h-3" /> {formatDate(interview.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {interview.score != null && (
                    <span className="text-sm font-bold text-[var(--text-primary)]">{interview.score}%</span>
                  )}
                  <span className={`text-[11px] font-bold px-2 py-1 rounded-full border ${STATUS_STYLES[interview.status] || ''}`}>
                    {interview.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </CandidateLayout>
  );
};

export default Dashboard;
