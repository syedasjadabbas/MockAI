import React, { useState, useEffect } from 'react';
import { Filter, Calendar, Clock, CheckCircle2, AlertCircle, Eye, X, Search, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchWithAuth } from '../api';
import { useLocation } from 'react-router-dom';
import { exportToCSV } from '../utils/csvExport';
import { formatDateOnly } from '../utils/dateFormat';

const Interviews = () => {
  const location = useLocation();
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');
  const [search, setSearch] = useState(() => new URLSearchParams(location.search).get('search') || '');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  useEffect(() => {
    const query = new URLSearchParams(location.search).get('search');
    if (query !== null) setSearch(query);
  }, [location.search]);
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [interviewsData, setInterviewsData] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [editInterviewData, setEditInterviewData] = useState({ status: '', type: '' });
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
      const deletedId = confirmDelete.id;
      setConfirmDelete(null);
      showToast('Interview deleted successfully');
      window.dispatchEvent(new CustomEvent('notify', { detail: { message: `Interview deleted: INT-${deletedId}`, type: 'warning' } }));
      window.dispatchEvent(new Event('dataUpdated'));
    } catch (err) {
      showToast('Failed to delete interview', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateInterview = async () => {
    setIsSubmitting(true);
    try {
      const updatedData = await fetchWithAuth(`/interviews/${selectedInterview._id || selectedInterview.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: editInterviewData.status, role: editInterviewData.type })
      });
      
      setInterviewsData(interviewsData.map(i => {
        if (i.id === selectedInterview.id) {
          return {
            ...i,
            status: updatedData.status,
            type: updatedData.role,
            score: updatedData.score,
            confidence: updatedData.confidence,
            stress: updatedData.stress
          };
        }
        return i;
      }));
      
      setSelectedInterview({
        ...selectedInterview,
        status: updatedData.status,
        type: updatedData.role,
        score: updatedData.score,
        confidence: updatedData.confidence,
        stress: updatedData.stress
      });
      
      setEditMode(false);
      showToast('Interview updated successfully');
      window.dispatchEvent(new CustomEvent('notify', { detail: { message: `Interview updated: INT-${selectedInterview.id}`, type: 'info' } }));
      window.dispatchEvent(new Event('dataUpdated'));
    } catch (err) {
      showToast('Failed to update interview', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    fetchWithAuth('/interviews')
      .then(data => setInterviewsData(data.map(i => ({
        id: i._id.slice(-6).toUpperCase(),
        _id: i._id,
        user: i.candidate_name || 'Deleted User',
        type: i.role || '-',
        status: i.status || (i.score != null ? 'Completed' : 'In Progress'),
        date: i.created_at ? formatDateOnly(i.created_at) : '-',
        score: i.score,
        confidence: i.confidence,
        stress: i.stress,
        transcript: i.transcript,
        created_at: i.created_at || ''
      }))))
      .catch((err) => setLoadError("Failed to load interviews. Please try again."))
      .finally(() => setLoading(false));
  }, []);

  const filteredInterviews = interviewsData.filter(item => {
    const matchStatus = statusFilter === 'All' || item.status === statusFilter;
    const matchType = typeFilter === 'All' || item.type === typeFilter;
    const matchDate = !dateFilter || item.date === dateFilter;
    const matchSearch = search ? (
      (item.user && item.user.toLowerCase().includes(search.toLowerCase())) ||
      (item.type && item.type.toLowerCase().includes(search.toLowerCase())) ||
      (item.id && item.id.toLowerCase().includes(search.toLowerCase()))
    ) : true;
    return matchStatus && matchType && matchDate && matchSearch;
  }).sort((a, b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date));

  const totalPages = Math.max(1, Math.ceil(filteredInterviews.length / PAGE_SIZE));
  const pagedInterviews = filteredInterviews.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const types = ['All', ...new Set(interviewsData.map(i => i.type))];

  if (loading) return <div className="flex items-center justify-center h-full min-h-[400px]"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>;

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
        <AlertCircle className="w-10 h-10 text-rose-500 mb-3" />
        <h3 className="text-lg font-bold text-white mb-1">Error Loading Data</h3>
        <p className="text-slate-400">{loadError}</p>
      </div>
    );
  }

  const handleExport = () => {
    const dataToExport = filteredInterviews.map(i => ({
      ID: `INT-${i.id}`,
      Candidate: i.candidate,
      Role: i.type,
      Status: i.status,
      Date: i.date
    }));
    exportToCSV(dataToExport, 'interviews_export.csv');
  };

  return (
    <div className="space-y-6">
      {/* Filters Bar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-white">All Sessions</h2>
          <button onClick={handleExport} className="px-3 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/50 text-slate-300 font-semibold text-xs transition-all flex items-center gap-2">
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
        </div>
        
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative w-full md:w-56">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search candidate, role, ID..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-800/40 border border-slate-800/40 text-slate-200 text-sm focus:outline-none focus:border-indigo-500/40"
            />
          </div>

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

          <button onClick={() => { setTypeFilter('All'); setStatusFilter('All'); setDateFilter(''); setSearch(''); }} className="flex items-center gap-2 px-3 py-2 bg-slate-800/40 hover:bg-slate-800/60 transition-all border border-slate-800/40 rounded-xl text-sm text-slate-300">
            <X className="w-4 h-4" />
            Clear
          </button>
        </div>
      </div>

      {/* Interviews Table */}
      {filteredInterviews.length === 0 ? (
        <div className="glass-card p-12 rounded-2xl border border-slate-800/40 flex flex-col items-center justify-center text-center">
          <Clock className="w-12 h-12 text-slate-500 mb-3 opacity-50" />
          <h3 className="text-lg font-semibold text-slate-300">No interviews available</h3>
          <p className="text-sm text-slate-500 mt-1">{search.trim() ? `No results found for "${search.trim()}"` : 'There are no interviews recorded yet.'}</p>
        </div>
      ) : (
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
              {pagedInterviews.map((item, idx) => (
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
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="p-4 border-t border-slate-800/40 flex items-center justify-between">
          <p className="text-xs text-slate-400">Showing <span className="text-slate-200 font-medium">{Math.min((page-1)*PAGE_SIZE+1, filteredInterviews.length)}–{Math.min(page*PAGE_SIZE, filteredInterviews.length)}</span> of <span className="text-slate-200 font-medium">{filteredInterviews.length}</span> interviews</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page === 1} className="p-1.5 rounded-lg bg-slate-800/60 border border-slate-700/50 text-slate-400 disabled:opacity-40 hover:text-white transition-all">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-slate-400 font-medium">{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page === totalPages} className="p-1.5 rounded-lg bg-slate-800/60 border border-slate-700/50 text-slate-400 disabled:opacity-40 hover:text-white transition-all">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      )}

      {selectedInterview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card p-6 rounded-2xl w-full max-w-md relative overflow-y-auto max-h-[90vh]">
            <button onClick={() => { setSelectedInterview(null); setEditMode(false); }} className="absolute top-4 right-4 text-slate-400 hover:text-white">
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
              {editMode ? (
                <>
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Status</p>
                    <select value={editInterviewData.status} onChange={e => setEditInterviewData({...editInterviewData, status: e.target.value})} className="w-full px-3 py-2 rounded-xl bg-slate-900/40 border border-slate-800/40 text-slate-200 text-sm focus:outline-none">
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Type/Role</p>
                    <input type="text" value={editInterviewData.type} onChange={e => setEditInterviewData({...editInterviewData, type: e.target.value})} className="w-full px-3 py-2 rounded-xl bg-slate-900/40 border border-slate-800/40 text-slate-200 text-sm focus:outline-none" />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-sm text-slate-400">Type</p>
                    <p className="font-semibold text-slate-200">{selectedInterview.type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Status</p>
                    <p className="font-semibold text-slate-200">{selectedInterview.status}</p>
                  </div>
                </>
              )}
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
              {selectedInterview.score != null && (
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800/60 mt-2 space-y-3">
                  <div>
                    <p className="text-xs text-emerald-400/80 font-semibold uppercase tracking-wider mb-1">Strength</p>
                    <p className="text-sm text-slate-200">{selectedInterview.score >= 80 ? 'Strong communication' : selectedInterview.score >= 60 ? 'Good understanding' : 'Basic attempt'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-rose-400/80 font-semibold uppercase tracking-wider mb-1">Weakness</p>
                    <p className="text-sm text-slate-200">{selectedInterview.score >= 80 ? 'Minor improvements needed' : selectedInterview.score >= 60 ? 'Lacks clarity in parts' : 'Weak communication'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-indigo-400/80 font-semibold uppercase tracking-wider mb-1">Suggestion</p>
                    <p className="text-sm text-slate-200">{selectedInterview.score >= 80 ? 'Maintain consistency' : selectedInterview.score >= 60 ? 'Improve structured answers' : 'Practice fundamentals'}</p>
                  </div>
                </div>
              )}
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
              <button onClick={() => setSelectedInterview(null)} className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm transition-all border border-slate-700">Close</button>
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
