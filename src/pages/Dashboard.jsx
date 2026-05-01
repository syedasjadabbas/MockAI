import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Briefcase, Award, TrendingUp, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import StatsCard from '../components/StatsCard';
import { InterviewActivityChart, UserGrowthChart } from '../components/Charts';
import { fetchWithAuth } from '../api';
import { useState, useEffect } from 'react';

const Dashboard = () => {
  const [stats, setStats] = useState({ totalUsers: 0, totalInterviews: 0, totalResponses: 0, averageScore: 0 });
  const [recentInterviews, setRecentInterviews] = useState([]);

  useEffect(() => {
    fetchWithAuth('/stats').then(setStats).catch(console.error);
    fetchWithAuth('/recent-interviews').then(data => {
      setRecentInterviews(data.map(interview => ({
        id: `INT-${interview.id || interview._id}`,
        candidate: interview.user || 'Unknown',
        type: interview.type || 'N/A',
        score: interview.score,
        status: interview.status,
        time: interview.date
      })));
    }).catch(console.error);
  }, []);

  const { totalUsers, totalInterviews, totalResponses, averageScore: avgPerformance } = stats;
  const RecentInterviews = recentInterviews;

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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InterviewActivityChart />
        <UserGrowthChart />
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
                  <td className="py-4 px-4 text-sm font-bold text-slate-200">{item.score ? `${item.score}%` : 'N/A'}</td>
                  <td className="py-4 px-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                      item.status === 'Completed' 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/10'
                        : item.status === 'In Progress' || item.status === 'Scheduled'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/10'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/10'
                    }`}>
                      {item.status === 'Completed' && <CheckCircle2 className="w-3.5 h-3.5" />}
                      {(item.status === 'In Progress' || item.status === 'Scheduled') && <Clock className="w-3.5 h-3.5" />}
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
