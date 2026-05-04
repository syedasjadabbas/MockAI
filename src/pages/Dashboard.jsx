import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Briefcase, Award, TrendingUp, Clock, CheckCircle2, AlertCircle, Brain, Sparkles } from 'lucide-react';
import StatsCard from '../components/StatsCard';
import { ScoreDistributionChart, StatusDistributionChart } from '../components/Charts';
import { fetchWithAuth } from '../api';
import { useState, useEffect, useMemo } from 'react';

const Dashboard = () => {
  const [stats, setStats] = useState({ totalUsers: 0, totalInterviews: 0, totalResponses: 0, averageScore: 0 });
  const [recentInterviews, setRecentInterviews] = useState([]);
  const [allInterviews, setAllInterviews] = useState([]);
  const [loading, setLoading] = useState(true);

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
    ]).catch(console.error).finally(() => setLoading(false));
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
  const RecentInterviews = recentInterviews;

  if (loading) return <div className="flex items-center justify-center h-full min-h-[400px]"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="space-y-8">
      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ScoreDistributionChart data={chartsData.scoreBuckets} />
        <StatusDistributionChart data={chartsData.statusBuckets} />
        
        {/* AI Insights Panel */}
        <div className="glass-card p-6 rounded-2xl flex flex-col hover:border-indigo-500/10 transition-all duration-300">
          <div className="flex items-center gap-2 mb-6">
            <Brain className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-semibold text-white">AI Insights</h3>
          </div>
          <ul className="space-y-4 flex-1">
            {chartsData.insights.map((insight, idx) => (
              <li key={idx} className="flex items-start gap-3 bg-slate-900/30 p-3 rounded-xl border border-slate-800/40">
                <Sparkles className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-slate-300 leading-snug">{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="glass-card p-6 rounded-2xl hover:border-indigo-500/10 transition-all duration-300">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Recent Interviews</h3>
          <Link to="/admin/interviews" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">View All</Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/60">
                <th className="pb-3 pr-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Interview ID</th>
                <th className="pb-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Candidate</th>
                <th className="pb-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Role/Type</th>
                <th className="pb-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Score</th>
                <th className="pb-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="pb-3 pl-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Time</th>
              </tr>
            </thead>
            <tbody>
              {RecentInterviews.map((item, idx) => (
                <tr key={idx} className="border-b border-slate-800/40 last:border-0 hover:bg-slate-800/10 transition-colors">
                  <td className="py-4 pr-4 font-medium text-sm text-indigo-400">{item.id}</td>
                  <td className="py-4 px-4 font-semibold text-sm text-slate-200">{item.candidate}</td>
                  <td className="py-4 px-4 text-sm text-slate-400">{item.type}</td>
                  <td className="py-4 px-4 text-sm">
                    {item.score != null ? <span className="font-bold text-slate-200">{item.score}%</span> : <span className="text-slate-500 font-medium">-</span>}
                  </td>
                  <td className="py-4 px-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                      item.status === 'Completed' 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/10'
                        : item.status === 'In Progress'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/10'
                          : 'bg-slate-500/10 text-slate-400 border-slate-500/10'
                    }`}>
                      {item.status === 'Completed' && <CheckCircle2 className="w-3.5 h-3.5" />}
                      {item.status === 'In Progress' && <Clock className="w-3.5 h-3.5" />}
                      {item.status === 'Pending' && <Clock className="w-3.5 h-3.5" />}
                      {item.status === 'Failed' && <AlertCircle className="w-3.5 h-3.5" />}
                      {item.status}
                    </span>
                  </td>
                  <td className="py-4 pl-4 text-sm text-slate-500 text-right">{item.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
