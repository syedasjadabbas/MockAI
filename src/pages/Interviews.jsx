import React, { useState } from 'react';
import { Filter, Calendar, Clock, CheckCircle2, AlertCircle, Eye, X } from 'lucide-react';
import { interviewsData } from '../data/mockData';

const Interviews = () => {
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [selectedInterview, setSelectedInterview] = useState(null);

  const filteredInterviews = interviewsData.filter(item => {
    const matchStatus = statusFilter === 'All' || item.status === statusFilter;
    const matchType = typeFilter === 'All' || item.type === typeFilter;
    return matchStatus && matchType;
  });

  const types = ['All', ...new Set(interviewsData.map(i => i.type))];

  return (
    <div className="space-y-6">
      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-white">All Sessions</h2>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/40 border border-slate-800/40 rounded-xl">
            <Filter className="w-4 h-4 text-slate-400" />
            <select 
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-transparent text-sm text-slate-300 focus:outline-none"
            >
              {types.map(t => <option key={t} value={t}>{t === 'All' ? 'All Types' : t}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/40 border border-slate-800/40 rounded-xl">
            <Filter className="w-4 h-4 text-slate-400" />
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-sm text-slate-300 focus:outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="Completed">Completed</option>
              <option value="In Progress">In Progress</option>
              <option value="Scheduled">Scheduled</option>
            </select>
          </div>

          <button onClick={() => alert("Date range picker simulation opened!")} className="flex items-center gap-2 px-3 py-2 bg-slate-800/40 hover:bg-slate-800/60 transition-all border border-slate-800/40 rounded-xl text-sm text-slate-300">
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
                <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInterviews.map((item, idx) => (
                <tr key={idx} onClick={() => setSelectedInterview(item)} className="border-b border-slate-800/40 last:border-0 hover:bg-slate-800/10 transition-colors cursor-pointer">
                  <td className="py-4 px-6 font-medium text-sm text-indigo-400">INT-{item.id}</td>
                  <td className="py-4 px-6 font-semibold text-sm text-slate-200">{item.user}</td>
                  <td className="py-4 px-6 text-sm text-slate-400">{item.type}</td>
                  <td className="py-4 px-6">
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
                  <td className="py-4 px-6 text-sm text-slate-500">{item.date}</td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end">
                      <button onClick={(e) => { e.stopPropagation(); setSelectedInterview(item); }} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/50 text-slate-400 hover:text-indigo-400 border border-slate-800/40 transition-all text-xs font-medium">
                        <Eye className="w-3.5 h-3.5" />
                        Details
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredInterviews.length === 0 && (
                <tr><td colSpan="6" className="py-8 text-center text-slate-400">No interviews found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedInterview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card p-6 rounded-2xl w-full max-w-md relative">
            <button onClick={() => setSelectedInterview(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-white mb-4">Interview Details</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-400">ID</p>
                <p className="font-semibold text-slate-200">INT-{selectedInterview.id}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Candidate</p>
                <p className="font-semibold text-slate-200">{selectedInterview.user}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Type</p>
                <p className="font-semibold text-slate-200">{selectedInterview.type}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Status</p>
                <p className="font-semibold text-slate-200">{selectedInterview.status}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Date</p>
                <p className="font-semibold text-slate-200">{selectedInterview.date}</p>
              </div>
              {selectedInterview.score && (
                <div>
                  <p className="text-sm text-slate-400">Score</p>
                  <p className="font-bold text-indigo-400">{selectedInterview.score}%</p>
                </div>
              )}
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={() => alert(`Fetching full logs for Interview INT-${selectedInterview.id}...`)} className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-500/20">
                View Full Logs
              </button>
              <button onClick={() => setSelectedInterview(null)} className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm transition-all border border-slate-700">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Interviews;
