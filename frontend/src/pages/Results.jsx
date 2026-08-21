import React, { useState, useEffect, useMemo } from 'react';
import { Award, ShieldAlert, Sparkles, AlertCircle, Search, Filter, ChevronLeft, ChevronRight, TrendingUp, Download, CheckCircle2 } from 'lucide-react';
import { fetchWithAuth } from '../api';
import { useLocation } from 'react-router-dom';
import { exportToCSV } from '../utils/csvExport';
import { formatDateOnly } from '../utils/dateFormat';
import { TableSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import { useTheme } from '../context/ThemeContext';

const ScoreIndicator = ({ scoreStr }) => {
  const { isDark } = useTheme();
  if (!scoreStr || scoreStr === '-') return <span className="text-[var(--text-muted)] font-medium text-xs">-</span>;
  
  const score = parseInt(scoreStr.replace('%', ''));
  if (score < 60) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
        isDark ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' : 'bg-rose-50 text-rose-700 border-rose-200'
      }`}>
        <AlertCircle className="w-3.5 h-3.5" />
        Needs Improvement ({score}%)
      </span>
    );
  }

  const isHigh = score >= 80;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
      isHigh
        ? isDark ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : isDark ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'bg-amber-50 text-amber-700 border-amber-200'
    }`}>
      <Sparkles className="w-3.5 h-3.5" />
      {score}%
    </span>
  );
};

const Results = () => {
  const location = useLocation();
  const { isDark } = useTheme();
  const [mappedResults, setMappedResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(() => new URLSearchParams(location.search).get('search') || '');
  const [scoreFilter, setScoreFilter] = useState('All Scores');
  const [errorMsg, setErrorMsg] = useState(null);
  const [sortBy, setSortBy] = useState('date_desc');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  useEffect(() => {
    const query = new URLSearchParams(location.search).get('search');
    if (query !== null) setSearch(query);
  }, [location.search]);

  useEffect(() => {
    fetchWithAuth('/results')
      .then(data => {
        const completedOnly = data.filter(r => {
          const status = r.status || (r.score != null ? 'Completed' : 'In Progress');
          return status === 'Completed' && r.score !== null && r.score !== undefined;
        });
        setMappedResults(completedOnly.map(r => {
          const hasScore = true;
          return {
            id: r._id.slice(-6).toUpperCase(),
            interviewId: r._id.slice(-6).toUpperCase(),
            user: r.candidate_name || 'Deleted User',
            overallScore: hasScore ? `${r.score}%` : '-',
            scoreValue: hasScore ? r.score : null,
            confidenceScore: hasScore && r.confidence != null ? `${r.confidence}%` : '-',
            stressIndicator: hasScore && r.stress ? r.stress : '-',
            date: r.created_at ? formatDateOnly(r.created_at) : '-'
          };
        }).sort((a, b) => {
          if (a.date === '-' && b.date === '-') return 0;
          if (a.date === '-') return 1;
          if (b.date === '-') return -1;
          return new Date(b.date) - new Date(a.date);
        }));
      })
      .catch(() => {
        setErrorMsg("Failed to load evaluation results. Please try again.");
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredResults = mappedResults.filter(item => {
    const matchSearch = search ? (
      (item.user && item.user.toLowerCase().includes(search.toLowerCase())) ||
      (item.interviewId && item.interviewId.toLowerCase().includes(search.toLowerCase()))
    ) : true;

    let matchScore = true;
    if (scoreFilter === 'High') matchScore = item.scoreValue >= 80;
    else if (scoreFilter === 'Medium') matchScore = item.scoreValue >= 60 && item.scoreValue < 80;
    else if (scoreFilter === 'Low') matchScore = item.scoreValue < 60 && item.scoreValue !== null;
    else if (scoreFilter === 'Not Evaluated') matchScore = item.scoreValue === null;

    return matchSearch && matchScore;
  });

  const sortedResults = [...filteredResults].sort((a, b) => {
    if (sortBy === 'score_desc') return (b.scoreValue ?? -1) - (a.scoreValue ?? -1);
    if (sortBy === 'score_asc') return (a.scoreValue ?? 9999) - (b.scoreValue ?? 9999);
    if (sortBy === 'name_asc') return a.user.localeCompare(b.user);
    if (sortBy === 'name_desc') return b.user.localeCompare(a.user);
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sortedResults.length / PAGE_SIZE));
  const pagedResults = sortedResults.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const insightData = useMemo(() => {
    const completed = mappedResults.filter(r => r.scoreValue !== null);
    const totalCompleted = completed.length;
    
    if (totalCompleted === 0) {
      return { avg: 0, highPct: 0, lowPct: 0, empty: true };
    }
    
    const avg = Math.round(completed.reduce((a, b) => a + b.scoreValue, 0) / totalCompleted);
    const high = completed.filter(r => r.scoreValue >= 80).length;
    const low = completed.filter(r => r.scoreValue < 60).length;
    
    return {
      avg,
      highPct: Math.round((high / totalCompleted) * 100),
      lowPct: Math.round((low / totalCompleted) * 100),
      empty: false
    };
  }, [mappedResults]);

  const topPerformers = useMemo(() => {
    return [...mappedResults]
      .filter(r => r.scoreValue !== null)
      .sort((a, b) => b.scoreValue - a.scoreValue)
      .slice(0, 3);
  }, [mappedResults]);

  const lowPerformers = useMemo(() => {
    return [...mappedResults]
      .filter(r => r.scoreValue !== null)
      .sort((a, b) => a.scoreValue - b.scoreValue)
      .slice(0, 3);
  }, [mappedResults]);

  const handleExport = () => {
    const dataToExport = filteredResults.map(r => ({
      'Result ID': `RES-${r.id}`,
      'Interview ID': `INT-${r.interviewId}`,
      Candidate: r.user,
      'Overall Score': r.overallScore,
      'Confidence Score': r.confidenceScore,
      'Stress Indicator': r.stressIndicator,
      Date: r.date
    }));
    exportToCSV(dataToExport, 'mockai_evaluation_results.csv');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="h-10 w-48 rounded-xl bg-slate-800/40 animate-pulse" />
          <div className="h-10 w-96 rounded-xl bg-slate-800/40 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass-card p-4 h-20 animate-pulse rounded-2xl" />
          ))}
        </div>
        <div className="glass-card rounded-2xl p-4">
          <TableSkeleton rows={8} cols={7} />
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="glass-card p-12 rounded-3xl flex flex-col items-center justify-center text-center max-w-md mx-auto my-12">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">Error Loading Data</h3>
        <p className="text-sm text-[var(--text-secondary)] mb-4">{errorMsg}</p>
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
      {/* Top Header and Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)]">Evaluation Results</h2>
          <button 
            onClick={handleExport} 
            className="px-3.5 py-2 rounded-xl border border-[var(--border-card)] hover:bg-[var(--bg-card-hover)] text-[var(--text-primary)] font-semibold text-xs transition-all flex items-center gap-2 shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-indigo-500" />
            Export CSV
          </button>
        </div>
        
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] sm:w-48">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)]" />
            <input 
              type="text" 
              placeholder="Search candidate, ID..." 
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2 rounded-xl text-xs sm:text-sm theme-input border focus:outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
          </div>
          
          {/* Score Filter */}
          <div className="flex items-center gap-1.5 px-3 py-2 border border-[var(--border-card)] rounded-xl bg-[var(--bg-input)] text-xs">
            <Filter className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <select 
              value={scoreFilter}
              onChange={(e) => { setScoreFilter(e.target.value); setPage(1); }}
              className="bg-transparent text-[var(--text-primary)] focus:outline-none cursor-pointer"
            >
              <option value="All Scores" className="bg-[var(--bg-panel-solid)]">All Scores</option>
              <option value="High" className="bg-[var(--bg-panel-solid)]">High (&ge; 80%)</option>
              <option value="Medium" className="bg-[var(--bg-panel-solid)]">Medium (60-79%)</option>
              <option value="Low" className="bg-[var(--bg-panel-solid)]">Low (&lt; 60%)</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-1.5 px-3 py-2 border border-[var(--border-card)] rounded-xl bg-[var(--bg-input)] text-xs">
            <TrendingUp className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
              className="bg-transparent text-[var(--text-primary)] focus:outline-none cursor-pointer"
            >
              <option value="date_desc" className="bg-[var(--bg-panel-solid)]">Newest First</option>
              <option value="score_desc" className="bg-[var(--bg-panel-solid)]">Score: High→Low</option>
              <option value="score_asc" className="bg-[var(--bg-panel-solid)]">Score: Low→High</option>
              <option value="name_asc" className="bg-[var(--bg-panel-solid)]">Name: A→Z</option>
              <option value="name_desc" className="bg-[var(--bg-panel-solid)]">Name: Z→A</option>
            </select>
          </div>
        </div>
      </div>

      {/* Mini Performance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-4 rounded-2xl flex items-center justify-between">
          <span className="text-xs sm:text-sm text-[var(--text-secondary)] font-semibold">Average Score</span>
          <span className="text-xl font-extrabold text-[var(--text-primary)]">
            {insightData.empty ? '-' : `${insightData.avg}%`}
          </span>
        </div>
        <div className={`glass-card p-4 rounded-2xl flex items-center justify-between border ${
          isDark ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-emerald-200 bg-emerald-50/50'
        }`}>
          <span className="text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 font-semibold">High Performers</span>
          <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {insightData.empty ? '-' : `${insightData.highPct}%`}
          </span>
        </div>
        <div className={`glass-card p-4 rounded-2xl flex items-center justify-between border ${
          isDark ? 'border-rose-500/20 bg-rose-500/5' : 'border-rose-200 bg-rose-50/50'
        }`}>
          <span className="text-xs sm:text-sm text-rose-600 dark:text-rose-400 font-semibold">Low Performers</span>
          <span className="text-xl font-extrabold text-rose-600 dark:text-rose-400">
            {insightData.empty ? '-' : `${insightData.lowPct}%`}
          </span>
        </div>
      </div>

      {/* Top & Low Performers Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card p-5 rounded-2xl">
          <h3 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] mb-3 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            Top Performers
          </h3>
          <div className="space-y-2">
            {topPerformers.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">No data available</p>
            ) : topPerformers.map((p, i) => (
              <div key={i} className="flex justify-between items-center text-xs sm:text-sm p-2 rounded-xl bg-[var(--bg-table-header)] border border-[var(--border-table)]">
                <span className="text-[var(--text-primary)] font-semibold">{p.user}</span>
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{p.scoreValue}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl">
          <h3 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] mb-3 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-rose-500" />
            Needs Attention (Under 60%)
          </h3>
          <div className="space-y-2">
            {lowPerformers.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">No data available</p>
            ) : lowPerformers.map((p, i) => (
              <div key={i} className="flex justify-between items-center text-xs sm:text-sm p-2 rounded-xl bg-[var(--bg-table-header)] border border-[var(--border-table)]">
                <span className="text-[var(--text-primary)] font-semibold">{p.user}</span>
                <span className="font-extrabold text-rose-600 dark:text-rose-400">{p.scoreValue}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Results Table */}
      {filteredResults.length === 0 ? (
        <div className="glass-card rounded-2xl p-6">
          <EmptyState 
            icon={Award}
            title="No Evaluation Results Found" 
            description={search.trim() ? `No results match "${search.trim()}".` : 'Evaluation results will appear here once candidates complete their interviews.'}
          />
        </div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden hover:border-indigo-500/20 transition-all duration-300">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-table)] bg-[var(--bg-table-header)]">
                  <th className="py-4 px-6 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Result ID</th>
                  <th className="py-4 px-6 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Interview ID</th>
                  <th className="py-4 px-6 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Candidate</th>
                  <th className="py-4 px-6 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Overall Score</th>
                  <th className="py-4 px-6 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Confidence</th>
                  <th className="py-4 px-6 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Stress Level</th>
                  <th className="py-4 px-6 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-table)]">
                {pagedResults.map((item, idx) => (
                  <tr key={idx} className="hover:bg-[var(--bg-table-row-hover)] transition-colors">
                    <td className="py-4 px-6 font-mono font-semibold text-xs sm:text-sm text-indigo-500">RES-{item.id}</td>
                    <td className="py-4 px-6 font-mono text-xs sm:text-sm text-[var(--text-secondary)]">INT-{item.interviewId}</td>
                    <td className="py-4 px-6 font-semibold text-sm text-[var(--text-primary)]">{item.user}</td>
                    <td className="py-4 px-6">
                      <ScoreIndicator scoreStr={item.overallScore} />
                    </td>
                    <td className="py-4 px-6">
                      {item.confidenceScore !== '-' ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 max-w-20 h-2 rounded-full bg-[var(--bg-table-header)] border border-[var(--border-table)] overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: item.confidenceScore }}></div>
                          </div>
                          <span className="text-xs font-bold text-[var(--text-secondary)]">{item.confidenceScore}</span>
                        </div>
                      ) : (
                        <span className="text-[var(--text-muted)] font-medium text-xs">-</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      {item.stressIndicator !== '-' ? (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${
                          item.stressIndicator === 'Low' 
                            ? isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : item.stressIndicator === 'Medium'
                              ? isDark ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-50 text-amber-700 border-amber-200'
                              : isDark ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {item.stressIndicator === 'High' && <ShieldAlert className="w-3.5 h-3.5" />}
                          {item.stressIndicator === 'Medium' && <AlertCircle className="w-3.5 h-3.5" />}
                          {item.stressIndicator}
                        </span>
                      ) : (
                        <span className="text-[var(--text-muted)] font-medium text-xs">-</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-[var(--text-muted)] text-sm text-right">{item.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-[var(--border-table)] flex items-center justify-between">
            <p className="text-xs text-[var(--text-muted)]">
              Showing <span className="font-semibold text-[var(--text-primary)]">{Math.min((page-1)*PAGE_SIZE+1, sortedResults.length)}–{Math.min(page*PAGE_SIZE, sortedResults.length)}</span> of <span className="font-semibold text-[var(--text-primary)]">{sortedResults.length}</span> results
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
    </div>
  );
};

export default Results;
