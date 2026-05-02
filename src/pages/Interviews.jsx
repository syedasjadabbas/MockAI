import React, { useState, useEffect } from 'react';
import { Filter, Calendar, Clock, CheckCircle2, AlertCircle, Eye, X, MoreVertical } from 'lucide-react';
import { fetchWithAuth } from '../api';

const Interviews = () => {
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [interviewsData, setInterviewsData] = useState([]);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const closeDropdown = () => setActiveDropdown(null);
    window.addEventListener('click', closeDropdown);
    return () => window.removeEventListener('click', closeDropdown);
  }, []);

  const handleDeleteInterview = async () => {
    if (!confirmDelete) return;
    setIsSubmitting(true);
    try {
      await fetchWithAuth(`/interviews/${confirmDelete._id || confirmDelete.id}`, { method: 'DELETE' });
      setInterviewsData(interviewsData.filter(i => i.id !== confirmDelete.id));
      setConfirmDelete(null);
      showToast('Interview deleted successfully');
    } catch (err) {
      console.error(err);
      showToast('Failed to delete interview', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    fetchWithAuth('/interviews')
      .then(data => setInterviewsData(data.map(i => ({
        id: i._id.slice(-6).toUpperCase(),
        _id: i._id,
        user: i.candidate_name || 'Deleted User',
        type: i.role || '-',
        status: i.status || (i.score != null ? 'Completed' : 'In Progress'),
        date: i.created_at ? new Date(i.created_at).toISOString().split('T')[0] : '-',
        score: i.score,
        confidence: i.confidence,
        stress: i.stress,
        transcript: i.transcript,
        created_at: i.created_at || ''
      }))))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filteredInterviews = interviewsData.filter(item => {
    const matchStatus = statusFilter === 'All' || item.status === statusFilter;
    const matchType = typeFilter === 'All' || item.type === typeFilter;
    const matchDate = !dateFilter || item.date === dateFilter;
    return matchStatus && matchType && matchDate;
  }).sort((a, b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date));

  const types = ['All', ...new Set(interviewsData.map(i => i.type))];

  if (loading) return <div className="flex items-center justify-center h-full min-h-[400px]"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>;

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

          <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/40 border border-slate-800/40 rounded-xl text-sm text-slate-300">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input 
              type="date" 
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-transparent text-slate-300 focus:outline-none [color-scheme:dark]"
            />
          </div>

          <button onClick={() => { setTypeFilter('All'); setStatusFilter('All'); setDateFilter(''); }} className="flex items-center gap-2 px-3 py-2 bg-slate-800/40 hover:bg-slate-800/60 transition-all border border-slate-800/40 rounded-xl text-sm text-slate-300">
            <X className="w-4 h-4" />
            Clear
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
                  <td className="py-4 px-6 text-sm text-slate-500">{item.date}</td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-2 relative">
                      <button onClick={(e) => { e.stopPropagation(); setSelectedInterview(item); }} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/50 text-slate-400 hover:text-indigo-400 border border-slate-800/40 transition-all text-xs font-medium">
                        <Eye className="w-3.5 h-3.5" />
                        Details
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === item.id ? null : item.id); }} className="p-1.5 rounded-lg bg-slate-800/50 text-slate-400 hover:text-white border border-slate-800/40 transition-all">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {activeDropdown === item.id && (
                        <div className="absolute right-0 top-full mt-1 w-36 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-10 py-1">
                          <button onClick={(e) => { e.stopPropagation(); setSelectedInterview(item); setActiveDropdown(null); }} className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white">View Details</button>
                          <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(item); setActiveDropdown(null); }} className="w-full text-left px-4 py-2 text-sm text-rose-400 hover:bg-slate-700 hover:text-rose-300">Delete</button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredInterviews.length === 0 && (
                <tr><td colSpan="6" className="py-8 text-center text-slate-400">No data available.</td></tr>
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
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-slate-400">Score</p>
                  <p className={`font-bold ${selectedInterview.score != null ? 'text-indigo-400' : 'text-slate-500'}`}>{selectedInterview.score != null ? `${selectedInterview.score}%` : '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Confidence</p>
                  <p className={`font-bold ${selectedInterview.score != null ? 'text-emerald-400' : 'text-slate-500'}`}>{selectedInterview.score != null && selectedInterview.confidence != null ? `${selectedInterview.confidence}%` : '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Stress</p>
                  <p className={`font-bold ${selectedInterview.score != null ? 'text-amber-400' : 'text-slate-500'}`}>{selectedInterview.score != null && selectedInterview.stress ? selectedInterview.stress : '-'}</p>
                </div>
              </div>
              {selectedInterview.transcript && (
                <div>
                  <p className="text-sm text-slate-400 mb-1">Transcript</p>
                  <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800 max-h-40 overflow-y-auto">
                    <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{selectedInterview.transcript}</p>
                  </div>
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

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card p-6 rounded-2xl w-full max-w-sm relative text-center border border-slate-800">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Delete Item</h3>
            <p className="text-slate-400 mb-6">Are you sure you want to delete this item? This action cannot be undone.</p>
            <div className="flex gap-3">
              <button disabled={isSubmitting} onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm transition-all border border-slate-700 disabled:opacity-50">Cancel</button>
              <button disabled={isSubmitting} onClick={handleDeleteInterview} className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg ${isSubmitting ? 'bg-rose-600/50 text-white/50 cursor-not-allowed' : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-500/20'}`}>
                {isSubmitting ? 'Deleting...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-xl shadow-xl z-50 font-medium text-sm flex items-center gap-2 ${toast.type === 'error' ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'}`}>
          {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default Interviews;
