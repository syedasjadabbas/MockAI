import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Users, Briefcase, Award, TrendingUp, Clock, CheckCircle2, AlertCircle, Brain, Sparkles, ArrowRight } from 'lucide-react';
import StatsCard from '../components/StatsCard';
import { ScoreDistributionChart, StatusDistributionChart } from '../components/Charts';
import { CardSkeleton, TableSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import { fetchWithAuth } from '../api';
import { useTheme } from '../context/ThemeContext';

const Dashboard = () => {
  const [stats, setStats] = useState({ totalUsers: 0, totalInterviews: 0, totalResponses: 0, averageScore: 0 });
  const [recentInterviews, setRecentInterviews] = useState([]);
  const [allInterviews, setAllInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isDark } = useTheme();

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchWithAuth('/').then(data => {
        setStats({
          totalUsers: data.total_users || 0,
          totalInterviews: data.total_interviews || 0,
          totalResponses: data.total_interviews || 0,
          averageScore: data.average_score || 0
        });
      }),
      fetchWithAuth('/interviews').then(data => {
        setAllInterviews(data);
        const latest = [...data].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);
        setRecentInterviews(latest.map(interview => ({
          id: `INT-${interview._id.slice(-6).toUpperCase()}`,
          candidate: interview.candidate_name || 'Deleted User',
          type: interview.role || '-',
          score: interview.score,
          status: interview.status || 'Completed',
          time: new Date(interview.created_at).toLocaleDateString()
        })));
      })
    ]).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const chartsData = useMemo(() => {
    const data = allInterviews;
    const completed = data.filter(r => r.score !== null);
    
    let avgScore = 0;
    let avgConfidence = 0;
    let highStressCount = 0;

    if (completed.length > 0) {
      avgScore = completed.reduce((a, b) => a + b.score, 0) / completed.length;
      avgConfidence = completed.reduce((a, b) => a + (b.confidence || 0), 0) / completed.length;
      highStressCount = completed.filter(r => r.stress === 'High').length;
    }

    const scoreBuckets = {
      high: completed.filter(r => r.score >= 80).length,
      medium: completed.filter(r => r.score >= 60 && r.score < 80).length,
      low: completed.filter(r => r.score < 60).length,
      none: data.filter(r => r.score === null).length
    };

    const statusBuckets = {
      completed: data.filter(i => i.status === "Completed").length,
      progress: data.filter(i => i.status === "In Progress").length,
      pending: data.filter(i => i.status === "Pending").length
    };

    let insights = [];

    if (completed.length === 0) {
      insights.push("No completed interviews yet.");
    } else {
      if (avgScore < 60) insights.push("Overall performance is low. Many candidates struggle.");
      if (highStressCount > completed.length * 0.4) insights.push("High stress detected in many interviews.");
    }

    if (statusBuckets.pending > statusBuckets.completed) {
      insights.push("Large number of interviews still pending.");
    }

    if (insights.length === 0) {
      insights.push("System performance looks stable.");
    }

    insights = insights.slice(0, 3);

    return { scoreBuckets, statusBuckets, insights };
  }, [allInterviews]);

  const { totalUsers, totalInterviews, totalResponses, averageScore: avgPerformance } = stats;

  if (loading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="glass-card p-6 rounded-2xl h-80 animate-pulse bg-slate-800/30" />
          <div className="glass-card p-6 rounded-2xl h-80 animate-pulse bg-slate-800/30" />
          <div className="glass-card p-6 rounded-2xl h-80 animate-pulse bg-slate-800/30" />
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
          percentage="12.5%" 
          trend="up" 
        />
        <StatsCard 
          title="Interviews Conducted" 
          value={totalInterviews.toLocaleString()} 
          icon={Briefcase} 
          percentage="8.2%" 
          trend="up" 
        />
        <StatsCard 
          title="Total Responses" 
          value={totalResponses.toLocaleString()} 
          icon={Award} 
          percentage="5.1%" 
          trend="up" 
        />
        <StatsCard 
          title="Avg. Performance" 
          value={`${avgPerformance}%`} 
          icon={TrendingUp} 
          percentage="2.4%" 
          trend="down" 
        />
      </div>

      {/* Charts & AI Insights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ScoreDistributionChart data={chartsData.scoreBuckets} />
        <StatusDistributionChart data={chartsData.statusBuckets} />
        
        {/* AI Insights Panel */}
        <div className="glass-card p-6 rounded-2xl flex flex-col hover:border-indigo-500/20 transition-all duration-300">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
              <Brain className="w-4 h-4 text-indigo-500" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">AI Insights</h3>
          </div>
          <ul className="space-y-3.5 flex-1">
            {chartsData.insights.map((insight, idx) => (
              <li 
                key={idx} 
                className="flex items-start gap-3 p-3.5 rounded-xl border border-[var(--border-table)] bg-[var(--bg-table-header)] transition-all hover:scale-[1.01]"
              >
                <Sparkles className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="glass-card p-6 rounded-2xl hover:border-indigo-500/20 transition-all duration-300">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">Recent Interviews</h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Latest candidate interview submissions</p>
          </div>
          <Link 
            to="/admin/interviews" 
            className="inline-flex items-center gap-1 text-xs font-bold text-indigo-500 hover:text-indigo-600 transition-colors py-1 px-2.5 rounded-lg hover:bg-indigo-500/10"
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
                    <td className="py-3.5 pr-4 font-mono font-semibold text-xs sm:text-sm text-indigo-500">{item.id}</td>
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
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                        item.status === 'Completed' 
                          ? isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : item.status === 'In Progress'
                            ? isDark ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-50 text-amber-700 border-amber-200'
                            : isDark ? 'bg-slate-500/10 text-slate-400 border-slate-500/20' : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {item.status === 'Completed' && <CheckCircle2 className="w-3 h-3" />}
                        {item.status === 'In Progress' && <Clock className="w-3 h-3" />}
                        {item.status === 'Pending' && <Clock className="w-3 h-3" />}
                        {item.status === 'Failed' && <AlertCircle className="w-3 h-3" />}
                        {item.status}
                      </span>
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
