import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Briefcase, ArrowRight, Clock } from 'lucide-react';
import CandidateLayout from '../layouts/CandidateLayout';
import CandidateEmptyState from '../components/CandidateEmptyState';
import { getHistory } from '../services/candidateApi';
import { formatDate } from '../../utils/dateFormat';

const STATUS_TONE = {
  Completed: 'c-badge-success',
  'In Progress': 'c-badge-warning',
};

// FR26 - Store Interview Records (already persisted by candidateApi),
// FR27 - View Interview History. A polished row list rather than a
// generic admin-style data table - every row carries the same
// information a table column would, laid out for scanning, not auditing.
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
          <p className="c-eyebrow mb-2">History</p>
          <h1 className="c-heading text-2xl sm:text-3xl">Interview History</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--c-text-secondary)' }}>Every mock interview you've taken, in one place.</p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--c-text-muted)' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by role..."
              className="c-input pl-10 pr-4 py-2.5 rounded-xl text-sm w-full sm:w-56"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="c-input px-3.5 py-2.5 rounded-xl text-sm"
          >
            <option value="All">All Statuses</option>
            <option value="Completed">Completed</option>
            <option value="In Progress">In Progress</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="c-skeleton h-20 rounded-2xl" />
          <div className="c-skeleton h-20 rounded-2xl" />
          <div className="c-skeleton h-20 rounded-2xl" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="c-card rounded-2xl">
          <CandidateEmptyState
            icon={Briefcase}
            title="No interviews found"
            description="Try adjusting your search or filters, or start a new interview."
            actionLabel="Start Interview"
            onAction={() => (window.location.href = '/interview/goal')}
          />
        </div>
      ) : (
        <div className="c-card rounded-2xl c-divide overflow-hidden">
          {filtered.map((i) => (
            <Link
              key={i.id}
              to={i.status === 'Completed' ? `/interview/${i.id}/results` : `/interview/${i.id}/session`}
              className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-[var(--c-surface-muted)]"
            >
              <div className="min-w-0 flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 hidden sm:flex"
                  style={{ background: 'var(--c-accent-soft)', color: 'var(--c-accent)' }}
                >
                  <Briefcase className="w-4.5 h-4.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{i.role}</p>
                  <p className="text-xs mt-0.5 flex items-center gap-1.5" style={{ color: 'var(--c-text-muted)' }}>
                    <span className="capitalize">{i.type}</span>
                    <span>·</span>
                    <Clock className="w-3 h-3" /> {formatDate(i.createdAt)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {i.score != null && <span className="c-serif-num text-sm hidden sm:inline">{i.score}%</span>}
                <span className={`c-badge ${STATUS_TONE[i.status] || 'c-badge-muted'}`}>{i.status}</span>
                <span className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--c-accent)' }}>
                  {i.status === 'Completed' ? 'View' : 'Resume'} <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </CandidateLayout>
  );
};

export default InterviewHistory;
