import React, { useState } from 'react';
import { Filter, Calendar, Clock, CheckCircle2, AlertCircle, Eye } from 'lucide-react';

const mockInterviews = [
  { id: 'INT-2021', name: 'John Doe', type: 'Frontend React', status: 'Completed', date: 'Mar 15, 2026', duration: '45m' },
  { id: 'INT-2020', name: 'Alice Freeman', type: 'Data Structures', status: 'In-Progress', date: 'Mar 15, 2026', duration: '12m' },
  { id: 'INT-2019', name: 'Robert Fox', type: 'System Design', status: 'Completed', date: 'Mar 14, 2026', duration: '60m' },
  { id: 'INT-2018', name: 'Cody Fisher', type: 'Node.js Backend', status: 'Failed', date: 'Mar 12, 2026', duration: '5m' },
  { id: 'INT-2017', name: 'Arlene McCoy', type: 'HR Behavioral', status: 'Completed', date: 'Mar 11, 2026', duration: '30m' },
];

const Interviews = () => {
  const [statusFilter, setStatusFilter] = useState('All');

  const filteredInterviews = statusFilter === 'All' 
    ? mockInterviews 
    : mockInterviews.filter(item => item.status === statusFilter);

  return (
    <div className="space-y-6">
      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-white">All Sessions</h2>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/40 border border-slate-800/40 rounded-xl">
            <Filter className="w-4 h-4 text-slate-400" />
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-sm text-slate-300 focus:outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="Completed">Completed</option>
              <option value="In-Progress">In-Progress</option>
              <option value="Failed">Failed</option>
            </select>
          </div>

          <button className="flex items-center gap-2 px-3 py-2 bg-slate-800/40 hover:bg-slate-800/60 transition-all border border-slate-800/40 rounded-xl text-sm text-slate-300">
            <Calendar className="w-4 h-4" />
            Date Range
          </button>
        </div>
      </div>

      {/* Interviews Table */}
      <div className="glass-card rounded-2xl border border-slate-800/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/60 bg-slate-800/20">
                <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Interview ID</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Candidate Name</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Interview Type</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Duration</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInterviews.map((item, idx) => (
                <tr key={idx} className="border-b border-slate-800/40 last:border-0 hover:bg-slate-800/10 transition-colors">
                  <td className="py-4 px-6 font-medium text-sm text-indigo-400">{item.id}</td>
                  <td className="py-4 px-6 font-semibold text-sm text-slate-200">{item.name}</td>
                  <td className="py-4 px-6 text-sm text-slate-400">{item.type}</td>
                  <td className="py-4 px-6 text-sm text-slate-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    {item.duration}
                  </td>
                  <td className="py-4 px-6">
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
                  <td className="py-4 px-6 text-sm text-slate-500">{item.date}</td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end">
                      <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/50 text-slate-400 hover:text-indigo-400 border border-slate-800/40 transition-all text-xs font-medium">
                        <Eye className="w-3.5 h-3.5" />
                        Details
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Interviews;
