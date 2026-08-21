import React, { useState, useEffect } from 'react';
import { Filter, Calendar, Clock, CheckCircle2, AlertCircle, Eye, X, Search, Download, ChevronLeft, ChevronRight, Briefcase } from 'lucide-react';
import { fetchWithAuth } from '../api';
import { useLocation } from 'react-router-dom';
import { exportToCSV } from '../utils/csvExport';
import { formatDateOnly } from '../utils/dateFormat';
import { TableSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import { useTheme } from '../context/ThemeContext';

const Interviews = () => {
  const location = useLocation();
  const { isDark } = useTheme();
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
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

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
      .catch(() => setLoadError("Failed to load interviews. Please try again."))
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

  const handleExport = () => {
    const dataToExport = filteredInterviews.map(i => ({
      ID: `INT-${i.id}`,
      Candidate: i.user,
      Role: i.type,
      Status: i.status,
      Score: i.score != null ? `${i.score}%` : 'N/A',
      Date: i.date
    }));
    exportToCSV(dataToExport, 'interviews_export.csv');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="h-10 w-48 rounded-xl bg-slate-800/40 animate-pulse" />
          <div className="h-10 w-96 rounded-xl bg-slate-800/40 animate-pulse" />
        </div>
        <div className="glass-card rounded-2xl p-4">
          <TableSkeleton rows={8} cols={6} />
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="glass-card p-12 rounded-3xl flex flex-col items-center justify-center text-center max-w-md mx-auto my-12">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">Error Loading Data</h3>
        <p className="text-sm text-[var(--text-secondary)] mb-4">{loadError}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-500/20"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Controls & Filter Bar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)]">All Sessions</h2>
          <button 
            onClick={handleExport} 
            className="px-3.5 py-2 rounded-xl border border-[var(--border-card)] hover:bg-[var(--bg-card-hover)] text-[var(--text-primary)] font-semibold text-xs transition-all flex items-center gap-2 shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-indigo-500" />
            Export CSV
          </button>
        </div>
        
        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] sm:w-56">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)]" />
            <input 
              type="text" 
              placeholder="Search candidate, role..." 
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2 rounded-xl text-xs sm:text-sm theme-input border focus:outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1.5 px-3 py-2 border border-[var(--border-card)] rounded-xl bg-[var(--bg-input)] text-xs sm:text-sm">
            <Filter className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <select 
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
              className="bg-transparent text-[var(--text-primary)] focus:outline-none cursor-pointer text-xs"
            >
              {types.map(t => <option key={t} value={t} className="bg-[var(--bg-panel-solid)]">{t === 'All' ? 'All Roles' : t}</option>)}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 px-3 py-2 border border-[var(--border-card)] rounded-xl bg-[var(--bg-input)] text-xs sm:text-sm">
            <Filter className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <select 
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="bg-transparent text-[var(--text-primary)] focus:outline-none cursor-pointer text-xs"
            >
              <option value="All" className="bg-[var(--bg-panel-solid)]">All Statuses</option>
              <option value="Completed" className="bg-[var(--bg-panel-solid)]">Completed</option>
              <option value="In Progress" className="bg-[var(--bg-panel-solid)]">In Progress</option>
              <option value="Pending" className="bg-[var(--bg-panel-solid)]">Pending</option>
            </select>
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-1.5 px-3 py-2 border border-[var(--border-card)] rounded-xl bg-[var(--bg-input)] text-xs">
            <Calendar className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <input 
              type="date" 
              value={dateFilter}
              onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
              className="bg-transparent text-[var(--text-primary)] focus:outline-none cursor-pointer text-xs"
            />
          </div>

          {(typeFilter !== 'All' || statusFilter !== 'All' || dateFilter !== '' || search !== '') && (
            <button 
              onClick={() => { setTypeFilter('All'); setStatusFilter('All'); setDateFilter(''); setSearch(''); setPage(1); }} 
              className="flex items-center gap-1 px-3 py-2 border border-[var(--border-card)] hover:bg-[var(--bg-card-hover)] transition-all rounded-xl text-xs font-semibold text-[var(--text-secondary)]"
            >
              <X className="w-3.5 h-3.5" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Interviews Table */}
      {filteredInterviews.length === 0 ? (
        <div className="glass-card rounded-2xl p-6">
          <EmptyState 
            icon={Briefcase}
            title="No Interviews Found" 
            description="No interviews match your selected filter criteria." 
            actionLabel="Reset Filters"
            onAction={() => { setTypeFilter('All'); setStatusFilter('All'); setDateFilter(''); setSearch(''); setPage(1); }}
          />
        </div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden hover:border-indigo-500/20 transition-all duration-300">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-table)] bg-[var(--bg-table-header)]">
                  <th className="py-4 px-6 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Interview ID</th>
                  <th className="py-4 px-6 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Candidate Name</th>
                  <th className="py-4 px-6 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Interview Type</th>
                  <th className="py-4 px-6 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Score</th>
                  <th className="py-4 px-6 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Status</th>
                  <th className="py-4 px-6 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Date</th>
                  <th className="py-4 px-6 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-table)]">
                {pagedInterviews.map((item, idx) => (
                  <tr 
                    key={idx} 
                    onClick={() => setSelectedInterview(item)} 
                    className="hover:bg-[var(--bg-table-row-hover)] transition-colors cursor-pointer"
                  >
                    <td className="py-4 px-6 font-mono font-semibold text-xs sm:text-sm text-indigo-500">INT-{item.id}</td>
                    <td className="py-4 px-6 font-semibold text-sm text-[var(--text-primary)]">{item.user}</td>
                    <td className="py-4 px-6 text-sm text-[var(--text-secondary)]">{item.type}</td>
                    <td className="py-4 px-6 text-sm">
                      {item.score != null ? (
                        <span className="font-bold text-[var(--text-primary)]">{item.score}%</span>
                      ) : (
                        <span className="text-[var(--text-muted)] font-medium">-</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
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
                    <td className="py-4 px-6 text-sm text-[var(--text-muted)]">{item.date}</td>
                    <td className="py-4 px-6 text-right">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedInterview(item); }} 
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border-card)] text-[var(--text-secondary)] hover:text-indigo-500 hover:bg-[var(--bg-card-hover)] transition-all text-xs font-semibold"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-[var(--border-table)] flex items-center justify-between">
            <p className="text-xs text-[var(--text-muted)]">
              Showing <span className="font-semibold text-[var(--text-primary)]">{Math.min((page-1)*PAGE_SIZE+1, filteredInterviews.length)}–{Math.min(page*PAGE_SIZE, filteredInterviews.length)}</span> of <span className="font-semibold text-[var(--text-primary)]">{filteredInterviews.length}</span> sessions
            </p>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setPage(p => Math.max(1, p-1))} 
                disabled={page === 1} 
                className="p-2 rounded-xl border border-[var(--border-card)] text-[var(--text-secondary)] disabled:opacity-40 hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-[var(--text-secondary)] font-semibold px-2">{page} / {totalPages}</span>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p+1))} 
                disabled={page === totalPages} 
                className="p-2 rounded-xl border border-[var(--border-card)] text-[var(--text-secondary)] disabled:opacity-40 hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selected Interview Details Modal */}
      {selectedInterview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="theme-modal p-6 sm:p-8 rounded-3xl w-full max-w-lg relative border overflow-y-auto max-h-[90vh]">
            <button 
              onClick={() => setSelectedInterview(null)} 
              className="absolute top-4 right-4 p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-5">Interview Details</h3>
            
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[var(--bg-table-header)] border border-[var(--border-table)] space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[var(--text-muted)] font-medium">Session ID</span>
                  <span className="font-mono text-sm font-semibold text-indigo-500">INT-{selectedInterview.id}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[var(--text-muted)] font-medium">Candidate</span>
                  <span className="text-sm font-semibold text-[var(--text-primary)]">{selectedInterview.user}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[var(--text-muted)] font-medium">Role / Track</span>
                  <span className="text-sm font-semibold text-[var(--text-primary)]">{selectedInterview.type}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[var(--text-muted)] font-medium">Status</span>
                  <span className="text-sm font-semibold text-[var(--text-primary)]">{selectedInterview.status}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[var(--text-muted)] font-medium">Date</span>
                  <span className="text-sm font-semibold text-[var(--text-primary)]">{selectedInterview.date}</span>
                </div>
              </div>

              {/* Performance Metrics Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-[var(--bg-table-header)] border border-[var(--border-table)] text-center">
                  <p className="text-xs text-[var(--text-muted)] mb-1">Score</p>
                  <p className="font-extrabold text-lg text-indigo-500">
                    {selectedInterview.score != null ? `${selectedInterview.score}%` : '-'}
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-[var(--bg-table-header)] border border-[var(--border-table)] text-center">
                  <p className="text-xs text-[var(--text-muted)] mb-1">Confidence</p>
                  <p className="font-extrabold text-lg text-emerald-500">
                    {selectedInterview.confidence != null ? `${selectedInterview.confidence}%` : '-'}
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-[var(--bg-table-header)] border border-[var(--border-table)] text-center">
                  <p className="text-xs text-[var(--text-muted)] mb-1">Stress</p>
                  <p className="font-extrabold text-lg text-amber-500">
                    {selectedInterview.stress || '-'}
                  </p>
                </div>
              </div>

              {/* Feedback Summary */}
              {selectedInterview.score != null && (
                <div className="p-4 rounded-2xl bg-[var(--bg-table-header)] border border-[var(--border-table)] space-y-3">
                  <div>
                    <p className="text-xs text-emerald-500 font-bold uppercase tracking-wider mb-1">Strength</p>
                    <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
                      {selectedInterview.score >= 80 ? 'Strong communication & technical accuracy' : selectedInterview.score >= 60 ? 'Good conceptual understanding' : 'Attempted core concepts'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-rose-500 font-bold uppercase tracking-wider mb-1">Area of Improvement</p>
                    <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
                      {selectedInterview.score >= 80 ? 'Fine-tune edge cases' : selectedInterview.score >= 60 ? 'Structure answers with concise examples' : 'Needs reinforcement of fundamentals'}
                    </p>
                  </div>
                </div>
              )}

              {/* Transcript */}
              {selectedInterview.transcript && (
                <div>
                  <p className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Transcript</p>
                  <div className="p-3.5 rounded-2xl bg-[var(--bg-table-header)] border border-[var(--border-table)] max-h-40 overflow-y-auto">
                    <p className="text-xs text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">
                      {selectedInterview.transcript}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6">
              <button 
                onClick={() => setSelectedInterview(null)} 
                className="w-full py-2.5 rounded-xl border border-[var(--border-card)] hover:bg-[var(--bg-card-hover)] text-[var(--text-primary)] font-semibold text-sm transition-all"
              >
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
