import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Filter,
  ArrowRight,
  ChevronRight,
  Clock,
  Briefcase,
  Code2,
  Server,
  Cpu,
  Users,
  Layers,
  Sparkles,
  Plus,
  X,
} from 'lucide-react';
import CandidateNav from '../components/CandidateNav';
import CandidateEmptyState from '../components/CandidateEmptyState';
import { getHistory } from '../services/candidateApi';
import { formatDate } from '../../utils/dateFormat';

// Map tracks/roles to specific domain icons
function getCategoryIcon(role = '', type = '') {
  const str = `${role} ${type}`.toLowerCase();
  if (str.includes('front') || str.includes('react') || str.includes('web') || str.includes('ui')) return Code2;
  if (str.includes('back') || str.includes('node') || str.includes('api') || str.includes('server') || str.includes('database')) return Server;
  if (str.includes('ai') || str.includes('ml') || str.includes('machine') || str.includes('data science')) return Cpu;
  if (str.includes('system') || str.includes('arch') || str.includes('infra')) return Layers;
  if (str.includes('behavioral') || str.includes('hr') || str.includes('leadership') || str.includes('culture')) return Users;
  return Briefcase;
}

// FR31 - Comprehensive Candidate Interview History Ledger
const InterviewHistory = () => {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Completed' | 'In Progress'
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest' | 'highest_score' | 'lowest_score'

  useEffect(() => {
    let isMounted = true;
    getHistory()
      .then((data) => {
        if (!isMounted) return;
        setInterviews(data || []);
      })
      .catch((err) => {
        console.error('Failed to load interview history ledger:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Compute telemetry summary counts
  const stats = useMemo(() => {
    const total = interviews.length;
    const completed = interviews.filter((i) => i.status === 'Completed').length;
    const inProgress = interviews.filter((i) => i.status === 'In Progress').length;
    const scoredList = interviews.filter((i) => i.score != null);
    const avgScore = scoredList.length > 0
      ? Math.round(scoredList.reduce((acc, curr) => acc + curr.score, 0) / scoredList.length)
      : null;

    return { total, completed, inProgress, avgScore };
  }, [interviews]);

  // Apply filters and sorting
  const filtered = useMemo(() => {
    return interviews
      .filter((item) => {
        // Status Filter
        if (statusFilter !== 'All' && item.status !== statusFilter) {
          return false;
        }
        // Search Query (matches role, type, ID, or status)
        if (search.trim()) {
          const q = search.toLowerCase();
          const matchRole = (item.role || '').toLowerCase().includes(q);
          const matchType = (item.type || '').toLowerCase().includes(q);
          const matchStatus = (item.status || '').toLowerCase().includes(q);
          const matchId = (item.id || '').toLowerCase().includes(q);
          return matchRole || matchType || matchStatus || matchId;
        }
        return true;
      })
      .sort((a, b) => {
        const dateA = new Date(a.created_at || a.createdAt || a.completedAt || 0).getTime();
        const dateB = new Date(b.created_at || b.createdAt || b.completedAt || 0).getTime();
        const scoreA = a.score ?? -1;
        const scoreB = b.score ?? -1;

        if (sortBy === 'newest') return dateB - dateA;
        if (sortBy === 'oldest') return dateA - dateB;
        if (sortBy === 'highest_score') return scoreB - scoreA;
        if (sortBy === 'lowest_score') return scoreA - scoreB;
        return 0;
      });
  }, [interviews, search, statusFilter, sortBy]);

  return (
    <div className="candidate-app min-h-screen" style={{ background: 'var(--c-bg)' }}>
      <CandidateNav />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
        
        {/* Page Header (Directly on page) */}
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 border-b pb-6" style={{ borderColor: 'var(--c-border)' }}>
          <div>
            <p className="c-eyebrow mb-1">Archive & Sessions</p>
            <h1 className="c-heading text-2xl sm:text-3xl font-bold" style={{ color: 'var(--c-text)' }}>
              Interview History
            </h1>
            <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--c-text-secondary)' }}>
              Review your recorded takes, structured evaluation scoring dossiers, and timeline.
            </p>
          </div>

          <Link
            to="/interview/goal"
            className="c-btn c-btn-primary px-4 py-2.5 text-xs font-semibold rounded-md flex items-center gap-1.5 self-start sm:self-auto shrink-0"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Start Interview</span>
          </Link>
        </div>

        {/* LEVEL 1 — Telemetry Metrics (Directly on page with clean typography and dividers) */}
        <section aria-label="History Telemetry" className="border-b pb-8" style={{ borderColor: 'var(--c-border)' }}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-10">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--c-text-muted)' }}>
                Total Sessions
              </p>
              <p className="c-serif-num text-3xl font-bold" style={{ color: 'var(--c-text)' }}>
                {stats.total}
              </p>
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--c-text-muted)' }}>
                Completed
              </p>
              <p className="c-serif-num text-3xl font-bold text-emerald-500">
                {stats.completed}
              </p>
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--c-text-muted)' }}>
                In Progress
              </p>
              <p className="c-serif-num text-3xl font-bold text-amber-500">
                {stats.inProgress}
              </p>
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--c-text-muted)' }}>
                Average Score
              </p>
              <p className="c-serif-num text-3xl font-bold" style={{ color: 'var(--c-text)' }}>
                {stats.avgScore != null ? `${stats.avgScore}%` : '—'}
              </p>
            </div>
          </div>
        </section>

        {/* LEVEL 2 — Filter Controls & Search Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-1">
          {/* Segmented Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
            {[
              { label: 'All Sessions', value: 'All', count: stats.total },
              { label: 'Completed', value: 'Completed', count: stats.completed },
              { label: 'In Progress', value: 'In Progress', count: stats.inProgress },
            ].map((tab) => {
              const active = statusFilter === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => setStatusFilter(tab.value)}
                  className="px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5"
                  style={{
                    background: active ? 'var(--c-surface-muted)' : 'transparent',
                    color: active ? 'var(--c-text)' : 'var(--c-text-secondary)',
                    border: active ? '1px solid var(--c-border)' : '1px solid transparent',
                  }}
                >
                  <span>{tab.label}</span>
                  <span
                    className="text-[10px] font-mono px-1.5 py-0.2 rounded"
                    style={{
                      background: active ? 'var(--c-surface)' : 'var(--c-surface-muted)',
                      color: active ? 'var(--c-text)' : 'var(--c-text-muted)',
                    }}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search & Sort Controls */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 md:w-60">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--c-text-muted)' }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tracks, roles..."
                className="c-input pl-9 pr-7 py-1.5 rounded-md text-xs w-full"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:opacity-80"
                  style={{ color: 'var(--c-text-muted)' }}
                  aria-label="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="c-input px-2.5 py-1.5 rounded-md text-xs shrink-0"
              aria-label="Sort by"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="highest_score">Highest Score</option>
              <option value="lowest_score">Lowest Score</option>
            </select>
          </div>
        </div>

        {/* LEVEL 2 — Main Data Ledger Table (Open, structured table with dividers) */}
        {loading ? (
          <div className="space-y-2">
            <div className="c-skeleton h-14 rounded-lg" />
            <div className="c-skeleton h-14 rounded-lg" />
            <div className="c-skeleton h-14 rounded-lg" />
          </div>
        ) : filtered.length === 0 ? (
          <div
            className="py-14 border-t border-b text-center"
            style={{ borderColor: 'var(--c-border)' }}
          >
            {interviews.length === 0 ? (
              <CandidateEmptyState
                icon={Briefcase}
                title="No interview sessions recorded"
                description="Start your first simulated interview to begin capturing speech recordings and evaluation dossiers."
                actionLabel="Start Interview"
                onAction={() => (window.location.href = '/interview/goal')}
              />
            ) : (
              <div className="space-y-3">
                <div
                  className="w-10 h-10 rounded-md mx-auto flex items-center justify-center border"
                  style={{
                    background: 'var(--c-surface-muted)',
                    borderColor: 'var(--c-border)',
                    color: 'var(--c-text-muted)',
                  }}
                >
                  <Search className="w-5 h-5" />
                </div>
                <h3 className="c-heading text-sm font-bold" style={{ color: 'var(--c-text)' }}>
                  No matching sessions found
                </h3>
                <p className="text-xs max-w-sm mx-auto" style={{ color: 'var(--c-text-secondary)' }}>
                  No records matched your search query or filter criteria.
                </p>
                <button
                  onClick={() => {
                    setSearch('');
                    setStatusFilter('All');
                  }}
                  className="c-btn c-btn-secondary px-3.5 py-1.5 text-xs font-semibold rounded-md"
                >
                  Reset Filters
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="border-t border-b" style={{ borderColor: 'var(--c-border)' }}>
            {/* Structured Table Ledger Header */}
            <div
              className="grid grid-cols-12 px-2 py-3 border-b text-[11px] font-bold uppercase tracking-wider select-none hidden md:grid"
              style={{
                borderColor: 'var(--c-border)',
                color: 'var(--c-text-muted)',
              }}
            >
              <div className="col-span-5">Track & Role</div>
              <div className="col-span-2">Domain</div>
              <div className="col-span-2">Date & Time</div>
              <div className="col-span-1 text-center">Score</div>
              <div className="col-span-1 text-center">Status</div>
              <div className="col-span-1 text-right">Action</div>
            </div>

            {/* Table Rows */}
            <div className="divide-y" style={{ borderColor: 'var(--c-border)' }}>
              {filtered.map((session) => {
                const IconComponent = getCategoryIcon(session.role, session.type);
                const isCompleted = session.status === 'Completed';
                const targetUrl = isCompleted 
                  ? `/interview/${session.id}/results` 
                  : `/interview/${session.id}/session`;
                const dateStr = formatDate(session.created_at || session.createdAt || session.completedAt);
                const refId = session.id ? session.id.slice(-6).toUpperCase() : '';

                return (
                  <div
                    key={session.id}
                    className="py-4 px-2 hover:bg-slate-500/[0.03] transition-colors group rounded"
                  >
                    {/* Desktop Grid Layout */}
                    <div className="hidden md:grid grid-cols-12 items-center gap-3">
                      {/* 1. Track & Role (5 cols) */}
                      <div className="col-span-5 flex items-center gap-3 min-w-0 pr-2">
                        <div
                          className="w-8 h-8 rounded flex items-center justify-center shrink-0 border transition-colors group-hover:border-blue-500/40"
                          style={{
                            background: 'var(--c-surface-muted)',
                            borderColor: 'var(--c-border)',
                            color: 'var(--c-text)',
                          }}
                        >
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <Link
                            to={targetUrl}
                            className="text-xs font-bold truncate block group-hover:text-blue-500 transition-colors"
                            style={{ color: 'var(--c-text)' }}
                          >
                            {session.role || 'Practice Session'}
                          </Link>
                          <span
                            className="text-[10px] font-mono block mt-0.5"
                            style={{ color: 'var(--c-text-muted)' }}
                          >
                            REF: {refId}
                          </span>
                        </div>
                      </div>

                      {/* 2. Domain / Type (2 cols) */}
                      <div className="col-span-2 min-w-0">
                        <span className="c-badge c-badge-muted text-[10px] py-0.5 px-2 font-medium capitalize truncate inline-block max-w-full">
                          {session.type || 'Technical'}
                        </span>
                      </div>

                      {/* 3. Date & Time (2 cols) */}
                      <div className="col-span-2 min-w-0">
                        <p className="text-xs font-medium" style={{ color: 'var(--c-text-secondary)' }}>
                          {dateStr}
                        </p>
                      </div>

                      {/* 4. Score (1 col) */}
                      <div className="col-span-1 text-center">
                        {session.score != null ? (
                          <span className="c-badge c-badge-accent font-mono text-xs font-bold px-2 py-0.5 rounded">
                            {Math.round(session.score)}%
                          </span>
                        ) : (
                          <span className="text-xs font-mono" style={{ color: 'var(--c-text-muted)' }}>
                            —
                          </span>
                        )}
                      </div>

                      {/* 5. Status (1 col) */}
                      <div className="col-span-1 text-center">
                        <span
                          className={`c-badge text-[10px] font-semibold ${
                            isCompleted ? 'c-badge-success' : 'c-badge-warning'
                          }`}
                        >
                          {session.status || 'In Progress'}
                        </span>
                      </div>

                      {/* 6. Action (1 col) */}
                      <div className="col-span-1 text-right">
                        <Link
                          to={targetUrl}
                          className="inline-flex items-center gap-0.5 text-xs font-bold transition-opacity hover:opacity-80 group-hover:text-blue-500"
                          style={{ color: isCompleted ? 'var(--c-accent)' : 'var(--c-accent)' }}
                        >
                          <span>{isCompleted ? 'Results' : 'Resume'}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>

                    {/* Mobile Card-Free Row Layout */}
                    <div className="md:hidden space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="w-7 h-7 rounded flex items-center justify-center shrink-0 border"
                            style={{
                              background: 'var(--c-surface-muted)',
                              borderColor: 'var(--c-border)',
                              color: 'var(--c-text)',
                            }}
                          >
                            <IconComponent className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <Link to={targetUrl} className="text-xs font-bold truncate block" style={{ color: 'var(--c-text)' }}>
                              {session.role || 'Practice Session'}
                            </Link>
                            <span className="text-[10px] font-mono" style={{ color: 'var(--c-text-muted)' }}>
                              REF: {refId}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`c-badge text-[10px] font-semibold ${
                            isCompleted ? 'c-badge-success' : 'c-badge-warning'
                          }`}
                        >
                          {session.status || 'In Progress'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1 border-t" style={{ borderColor: 'var(--c-border)' }}>
                        <span style={{ color: 'var(--c-text-secondary)' }}>{dateStr}</span>
                        <div className="flex items-center gap-3">
                          {session.score != null ? (
                            <span className="c-badge c-badge-accent font-mono text-xs font-bold">
                              {Math.round(session.score)}%
                            </span>
                          ) : (
                            <span className="text-xs font-mono" style={{ color: 'var(--c-text-muted)' }}>—</span>
                          )}
                          <Link
                            to={targetUrl}
                            className="text-xs font-bold flex items-center gap-0.5"
                            style={{ color: 'var(--c-accent)' }}
                          >
                            <span>{isCompleted ? 'Results' : 'Resume'}</span>
                            <ChevronRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="flex items-center justify-between text-xs pt-2" style={{ color: 'var(--c-text-muted)' }}>
          <span>Showing {filtered.length} of {interviews.length} sessions</span>
          <span className="font-mono text-[11px]">All Records</span>
        </div>

      </main>
    </div>
  );
};

export default InterviewHistory;
