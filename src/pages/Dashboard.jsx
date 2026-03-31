import React from 'react';
import { Users, Briefcase, Award, TrendingUp, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import StatsCard from '../components/StatsCard';
import { InterviewActivityChart, UserGrowthChart } from '../components/Charts';

const RecentInterviews = [
  { id: 'INT-1082', candidate: 'Sarah Jenkins', type: 'Frontend Engineer', score: 88, status: 'Completed', time: '10 mins ago' },
  { id: 'INT-1081', candidate: 'Michael Chen', type: 'Product Manager', score: null, status: 'In-Progress', time: '23 mins ago' },
  { id: 'INT-1080', candidate: 'Alex Rodriguez', type: 'Data Scientist', score: 92, status: 'Completed', time: '1 hour ago' },
  { id: 'INT-1079', candidate: 'Emily Taylor', type: 'UX Designer', score: 76, status: 'Completed', time: '3 hours ago' },
  { id: 'INT-1078', candidate: 'James Wilson', type: 'DevOps Engineer', score: null, status: 'Failed', time: '5 hours ago' },
];

const Dashboard = () => {
  return (
    <div className="space-y-8">
      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard 
          title="Total Users" 
          value="2,845" 
          icon={Users} 
          percentage="12.5%" 
          trend="up" 
        />
        <StatsCard 
          title="Interviews Conducted" 
          value="14,204" 
          icon={Briefcase} 
          percentage="8.2%" 
          trend="up" 
        />
        <StatsCard 
          title="Total Responses" 
          value="85,120" 
          icon={Award} 
          percentage="5.1%" 
          trend="up" 
        />
        <StatsCard 
          title="Avg. Performance" 
          value="78.4%" 
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
          <button className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">View All</button>
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
                        : item.status === 'In-Progress'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/10'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/10'
                    }`}>
                      {item.status === 'Completed' && <CheckCircle2 className="w-3.5 h-3.5" />}
                      {item.status === 'In-Progress' && <Clock className="w-3.5 h-3.5" />}
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
