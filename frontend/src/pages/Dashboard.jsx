import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Briefcase, Award, TrendingUp, Clock, CheckCircle2, AlertCircle, Activity, ArrowRight, Info } from 'lucide-react';
import StatsCard from '../components/StatsCard';
import { ScoreDistributionChart, StatusDistributionChart, ParticipationTrendChart, SurveySummaryPanel } from '../components/Charts';
import { CardSkeleton, TableSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import { fetchWithAuth, getCachedData } from '../api';

const Dashboard = () => {
  const cachedStats = getCachedData('/');
  const cachedInterviews = getCachedData('/interviews?limit=5');
  const hasCached = Boolean(cachedStats);

  const [stats, setStats] = useState(() => ({
    totalUsers: cachedStats?.total_users || 0,
    totalInterviews: cachedStats?.total_interviews || 0,
    totalResponses: cachedStats?.total_responses || 0,
    averageScore: cachedStats?.average_score || 0,
    averageStress: cachedStats?.average_stress || 0,
    averageConfidence: cachedStats?.average_confidence || 0
  }));

  const [recentInterviews, setRecentInterviews] = useState(() => {
    if (Array.isArray(cachedInterviews)) {
      return cachedInterviews.map(interview => ({
        id: `INT-${String(interview._id || '').slice(-6).toUpperCase()}`,
        candidate: interview.candidate_name || 'Deleted User',
        type: interview.role || '-',
        score: interview.score,
        status: interview.status || 'Completed',
        time: interview.created_at ? new Date(interview.created_at).toLocaleDateString() : '-'
      }));
    }
    return [];
  });

  const [chartsData, setChartsData] = useState(() => ({
    scoreBuckets: cachedStats?.score_buckets || { high: 0, medium: 0, low: 0, none: 0 },
    statusBuckets: cachedStats?.status_buckets || { completed: 0, progress: 0, pending: 0 },
    insights: cachedStats?.insights || ["Overall candidate evaluation metrics are stable."],
    participation: cachedStats?.participation || null,
    behavioral: cachedStats?.behavioral_summary || null
  }));

  const [loading, setLoading] = useState(!hasCached);
  const [surveySummary, setSurveySummary] = useState(() => getCachedData('/surveys/summary') || null);

  useEffect(() => {
    let isMounted = true;
    if (!hasCached) {
      setLoading(true);
    }

    const loadDashboardData = async () => {
      try {
        const [statsData, interviewsData, surveyData] = await Promise.all([
          fetchWithAuth('/').catch(() => ({})),
          fetchWithAuth('/interviews?limit=5').catch(() => []),
          fetchWithAuth('/surveys/summary').catch(() => null)
        ]);

        if (!isMounted) return;

        if (surveyData) setSurveySummary(surveyData);

        if (statsData && statsData.total_users !== undefined) {
          setStats({
            totalUsers: statsData.total_users || 0,
            totalInterviews: statsData.total_interviews || 0,
            totalResponses: statsData.total_responses || 0,
            averageScore: statsData.average_score || 0,
            averageStress: statsData.average_stress || 0,
            averageConfidence: statsData.average_confidence || 0
          });
          setChartsData({
            scoreBuckets: statsData.score_buckets || { high: 0, medium: 0, low: 0, none: 0 },
            statusBuckets: statsData.status_buckets || { completed: 0, progress: 0, pending: 0 },
            insights: statsData.insights || ["Overall candidate evaluation metrics are stable."],
            participation: statsData.participation || null,
            behavioral: statsData.behavioral_summary || null
          });
        }

        if (Array.isArray(interviewsData)) {
          setRecentInterviews(
            interviewsData.map(interview => ({
              id: `INT-${String(interview._id || '').slice(-6).toUpperCase()}`,
              candidate: interview.candidate_name || 'Deleted User',
              type: interview.role || '-',
              score: interview.score,
              status: interview.status || 'Completed',
              time: interview.created_at ? new Date(interview.created_at).toLocaleDateString() : '-'
            }))
          );
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadDashboardData();

    return () => {
      isMounted = false;
    };
  }, []);

  const { totalUsers, totalInterviews, totalResponses, averageScore: avgPerformance, averageStress, averageConfidence } = stats;

  if (loading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="glass-card p-6 rounded-2xl h-80 animate-pulse" />
          <div className="glass-card p-6 rounded-2xl h-80 animate-pulse" />
          <div className="glass-card p-6 rounded-2xl h-80 animate-pulse" />
        </div>
        <div className="glass-card rounded-2xl p-4">
          <TableSkeleton rows={5} cols={6} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
        <StatsCard 
          title="Total Users" 
          value={totalUsers.toLocaleString()} 
          icon={Users} 
        />
        <StatsCard 
          title="Interviews Conducted" 
          value={totalInterviews.toLocaleString()} 
          icon={Briefcase} 
        />
        <StatsCard 
          title="Total Responses" 
          value={totalResponses.toLocaleString()} 
          icon={Award} 
        />
        <StatsCard 
          title="Avg. Performance" 
          value={`${avgPerformance}%`} 
          icon={TrendingUp} 
          subtitle={`Avg. Confidence: ${averageConfidence}% · Avg. Stress: ${averageStress}%`}
        />
      </div>

      {/* Charts & Highlights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ScoreDistributionChart data={chartsData.scoreBuckets} />
        <StatusDistributionChart data={chartsData.statusBuckets} />
        
        {/* Performance Highlights Panel */}
        <div className="glass-card p-6 rounded-2xl flex flex-col hover:border-orange-500/30 transition-all duration-300">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                <Activity className="w-4 h-4 text-orange-500" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">Performance Highlights</h3>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 font-medium">
              Avg. Stress: {averageStress}%
            </span>
          </div>
          <ul className="space-y-3.5 flex-1">
            {chartsData.insights.map((insight, idx) => (
              <li 
                key={idx} 
                className="flex items-start gap-3 p-3.5 rounded-xl border border-[var(--border-table)] bg-[var(--bg-table-header)] transition-all"
              >
                <Info className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                <span className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* FR 36-02 - behavioural insights across candidates */}
      {chartsData.behavioral && chartsData.behavioral.evaluated_interviews > 0 && (
        <BehavioralSummaryPanel summary={chartsData.behavioral} />
      )}

      {/* Participation Trends (FR 35) */}
      {chartsData.participation && <ParticipationTrendChart participation={chartsData.participation} />}

      {/* Candidate Survey & Accuracy (Objective 7) */}
      <SurveySummaryPanel summary={surveySummary} />

      {/* Recent Activity Table */}
      <div className="glass-card p-6 rounded-2xl hover:border-orange-500/30 transition-all duration-300">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">Recent Interviews</h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Latest candidate interview submissions</p>
          </div>
          <Link 
            to="/admin/interviews" 
            className="inline-flex items-center gap-1 text-xs font-bold text-orange-500 hover:text-orange-600 transition-colors py-1 px-2.5 rounded-lg hover:bg-orange-500/10"
          >
            View All <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentInterviews.length === 0 ? (
          <EmptyState 
            title="No Recent Interviews" 
            description="Interviews conducted by candidates will appear here." 
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-table)]">
                  <th className="pb-3 pr-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Interview ID</th>
                  <th className="pb-3 px-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Candidate</th>
                  <th className="pb-3 px-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Role/Type</th>
                  <th className="pb-3 px-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Score</th>
                  <th className="pb-3 px-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Status</th>
                  <th className="pb-3 pl-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-table)]">
                {recentInterviews.map((item, idx) => (
                  <tr key={idx} className="hover:bg-[var(--bg-table-row-hover)] transition-colors">
                    <td className="py-3.5 pr-4 font-mono font-semibold text-xs sm:text-sm text-orange-400">{item.id}</td>
                    <td className="py-3.5 px-4 font-semibold text-xs sm:text-sm text-[var(--text-primary)]">{item.candidate}</td>
                    <td className="py-3.5 px-4 text-xs sm:text-sm text-[var(--text-secondary)]">{item.type}</td>
                    <td className="py-3.5 px-4 text-xs sm:text-sm">
                      {item.score != null ? (
                        <span className="font-bold text-[var(--text-primary)]">{item.score}%</span>
                      ) : (
                        <span className="text-[var(--text-muted)] font-medium">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="inline-flex items-center gap-2">
                        <span 
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            item.status === 'Completed'
                              ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]'
                              : item.status === 'In Progress'
                                ? 'bg-amber-500 animate-pulse'
                                : item.status === 'Failed'
                                  ? 'bg-rose-500'
                                  : 'bg-slate-400'
                          }`} 
                        />
                        <span className="text-xs font-medium text-[var(--text-secondary)]">
                          {item.status}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 pl-4 text-xs text-[var(--text-muted)] text-right">{item.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

const LevelBars = ({ title, levels, order }) => {
  const total = order.reduce((sum, k) => sum + (levels?.[k] || 0), 0) || 1;
  return (
    <div className="space-y-2">
      <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">{title}</p>
      {order.map((k) => (
        <div key={k} className="flex items-center gap-2 text-xs">
          <span className="w-24 shrink-0 text-[var(--text-secondary)]">{k}</span>
          <div className="flex-1 h-2 rounded-full bg-[var(--bg-table-header)] overflow-hidden">
            <div className="h-full rounded-full bg-orange-500" style={{ width: `${Math.round(((levels?.[k] || 0) / total) * 100)}%` }} />
          </div>
          <span className="w-8 text-right font-mono text-[var(--text-primary)]">{levels?.[k] || 0}</span>
        </div>
      ))}
    </div>
  );
};

const BehavioralSummaryPanel = ({ summary }) => {
  const dims = summary.dimension_averages || {};
  const counts = summary.dimension_counts || {};
  const area = (label, key) => (
    <div className="p-3 rounded-xl border border-[var(--border-table)] bg-[var(--bg-table-header)]">
      <p className="text-xs text-[var(--text-muted)]">{label}</p>
      <p className="text-lg font-bold text-[var(--text-primary)]">{dims[key] != null ? `${dims[key]}%` : '-'}</p>
      <p className="text-[11px] text-[var(--text-muted)]">{counts[key] || 0} interviews measured</p>
    </div>
  );
  return (
    <div className="glass-card p-6 rounded-2xl space-y-5 hover:border-orange-500/30 transition-all duration-300">
      <div>
        <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">Behavioural Insights Across Candidates</h3>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">
          From {summary.evaluated_interviews} evaluated interviews. Parts that could not be assessed are left out, not counted as zero.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {area('What candidates said', 'technical_content')}
        {area('How they said it', 'communication_fluency')}
        {area('On camera', 'behavioral_composure')}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <LevelBars title="Confidence" levels={summary.confidence_levels} order={['High', 'Moderate', 'Developing', 'Low', 'Not Assessed']} />
        <LevelBars title="Stress" levels={summary.stress_levels} order={['Low', 'Moderate', 'Elevated', 'Not Assessed']} />
        <div className="space-y-2 text-xs">
          <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Speaking & expression</p>
          <p className="text-[var(--text-secondary)]">Average pace: <span className="font-bold text-[var(--text-primary)]">{summary.average_wpm != null ? `${summary.average_wpm} WPM` : '-'}</span></p>
          <p className="text-[var(--text-secondary)]">Average hesitation: <span className="font-bold text-[var(--text-primary)]">{summary.average_hesitation_rate != null ? `${summary.average_hesitation_rate}%` : '-'}</span></p>
          <p className="text-[var(--text-secondary)]">
            Most common expression:{' '}
            <span className="font-bold text-[var(--text-primary)]">
              {(summary.common_expressions || []).length ? summary.common_expressions.map(([e, n]) => `${e} (${n})`).join(', ') : '-'}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};
