import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Briefcase, ArrowRight, Clock } from 'lucide-react';
import CandidateLayout from '../layouts/CandidateLayout';
import EmptyState from '../../components/EmptyState';
import { TableSkeleton } from '../../components/Skeleton';
import { getHistory } from '../services/candidateApi';
import { formatDate } from '../../utils/dateFormat';

const STATUS_STYLES = {
  Completed: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  'In Progress': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
};

// FR26 - Store Interview Records (already persisted by candidateApi),
// FR27 - View Interview History
const InterviewHistory = () => {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    getHistory().then((data) => {
      setInterviews(data);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    return interviews.filter((i) => {
      const matchesSearch = i.role.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'All' || i.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [interviews, search, statusFilter]);

  return (
    <CandidateLayout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">Interview History</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Every mock interview you've taken, in one place.</p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by role..."
              className="pl-10 pr-4 py-2.5 rounded-xl text-sm theme-input border focus:outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 transition-all w-full sm:w-56"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl text-sm theme-input border focus:outline-none focus:border-indigo-500/60 transition-all"
          >
            <option value="All">All Statuses</option>
            <option value="Completed">Completed</option>
            <option value="In Progress">In Progress</option>
          </select>
        </div>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        {loading ? (
          <TableSkeleton rows={6} cols={4} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="No interviews found"
            description="Try adjusting your search or filters, or start a new interview."
            actionLabel="Start Interview"
            onAction={() => (window.location.href = '/interview/goal')}
          />
        ) : (
          <>
            {/* Card list below sm: - a 6-column table has no room on narrow
                screens without clipping the Status/Score/action columns
                off-screen, so mobile gets a stacked layout instead. */}
            <div className="sm:hidden divide-y divide-[var(--border-table)]">
              {filtered.map((i) => (
                <Link
                  key={i.id}
                  to={i.status === 'Completed' ? `/interview/${i.id}/results` : `/interview/${i.id}/session`}
                  className="block px-5 py-4 hover:bg-[var(--bg-table-row-hover)] transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{i.role}</p>
                    <span className={`shrink-0 text-[11px] font-bold px-2 py-1 rounded-full border ${STATUS_STYLES[i.status] || ''}`}>
                      {i.status}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] capitalize mb-1">{i.type} interview</p>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-[var(--text-muted)] flex items-center gap-1.5">
                      <Clock className="w-3 h-3" /> {formatDate(i.createdAt)}
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                      {i.score != null && <span className="text-sm font-bold text-[var(--text-primary)]">{i.score}%</span>}
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-500">
                        {i.status === 'Completed' ? 'View' : 'Resume'} <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Full table from sm: up */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[var(--bg-table-header)] text-[var(--text-muted)] text-xs uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-5 py-3 font-semibold">Role / Category</th>
                    <th className="text-left px-5 py-3 font-semibold">Type</th>
                    <th className="text-left px-5 py-3 font-semibold">Date</th>
                    <th className="text-left px-5 py-3 font-semibold">Status</th>
                    <th className="text-left px-5 py-3 font-semibold">Score</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-table)]">
                  {filtered.map((i) => (
                    <tr key={i.id} className="hover:bg-[var(--bg-table-row-hover)] transition-colors">
                      <td className="px-5 py-4 font-semibold text-[var(--text-primary)]">{i.role}</td>
                      <td className="px-5 py-4 text-[var(--text-secondary)] capitalize">{i.type}</td>
                      <td className="px-5 py-4 text-[var(--text-secondary)]">{formatDate(i.createdAt)}</td>
                      <td className="px-5 py-4">
                        <span className={`text-[11px] font-bold px-2 py-1 rounded-full border ${STATUS_STYLES[i.status] || ''}`}>
                          {i.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-bold text-[var(--text-primary)]">{i.score != null ? `${i.score}%` : '—'}</td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          to={i.status === 'Completed' ? `/interview/${i.id}/results` : `/interview/${i.id}/session`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-500 hover:text-indigo-600"
                        >
                          {i.status === 'Completed' ? 'View Results' : 'Resume'} <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </CandidateLayout>
  );
};

export default InterviewHistory;
