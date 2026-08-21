import React, { useState, useEffect } from 'react';
import { Terminal, Calendar, User, Info, Filter, Search, Download, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { fetchWithAuth } from '../api';
import { useLocation } from 'react-router-dom';
import { exportToCSV } from '../utils/csvExport';
import { formatDate } from '../utils/dateFormat';
import { TableSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import { useTheme } from '../context/ThemeContext';

const Logs = () => {
  const location = useLocation();
  const { isDark } = useTheme();
  const [logsData, setLogsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logFilter, setLogFilter] = useState('All');
  const [search, setSearch] = useState(() => new URLSearchParams(location.search).get('search') || '');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  useEffect(() => {
    const query = new URLSearchParams(location.search).get('search');
    if (query !== null) setSearch(query);
  }, [location.search]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await fetchWithAuth('/logs');
      setLogsData(data.map(l => ({
        id: l._id ? l._id.slice(-6).toUpperCase() : Math.random().toString(36).substring(7).toUpperCase(),
        admin: l.admin_email || 'System Admin',
        action: l.action,
        target: l.target || 'System',
        timestamp: l.created_at ? formatDate(l.created_at) : '-'
      })));
    } catch (err) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getLogType = (action) => {
    if (action === 'LOGIN') return 'Access';
    if (action === 'DELETE_USER' || action === 'DELETE_INTERVIEW') return 'Delete';
    if (action === 'UPDATE') return 'Update';
    if (action === 'CREATE_USER') return 'Create';
    return 'Action';
  };

  const filteredLogs = logsData.filter(log => {
    const matchFilter = logFilter === 'All' || log.action === logFilter;
    const matchSearch = search ? (
      (log.admin && log.admin.toLowerCase().includes(search.toLowerCase())) ||
      (log.action && log.action.toLowerCase().includes(search.toLowerCase())) ||
      (log.target && log.target.toLowerCase().includes(search.toLowerCase())) ||
      (log.id && log.id.toLowerCase().includes(search.toLowerCase()))
    ) : true;
    return matchFilter && matchSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const pagedLogs = filteredLogs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleExport = () => {
    const dataToExport = filteredLogs.map(log => ({
      'Log ID': `LOG-${log.id}`,
      'Admin Email': log.admin,
      Action: log.action,
      Target: log.target,
      Timestamp: log.timestamp
    }));
    exportToCSV(dataToExport, 'audit_logs_export.csv');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="h-10 w-48 rounded-xl bg-slate-800/40 animate-pulse" />
          <div className="h-10 w-80 rounded-xl bg-slate-800/40 animate-pulse" />
        </div>
        <div className="glass-card rounded-2xl p-4">
          <TableSkeleton rows={10} cols={6} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Search/Filter Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Terminal className="w-5 h-5 text-indigo-500" />
            Audit Logs
          </h2>
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
          <div className="relative flex-1 min-w-[200px] sm:w-56">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)]" />
            <input 
              type="text" 
              placeholder="Search logs..." 
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2 rounded-xl text-xs sm:text-sm theme-input border focus:outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
          </div>

          {/* Action Filter */}
          <div className="flex items-center gap-1.5 px-3 py-2 border border-[var(--border-card)] rounded-xl bg-[var(--bg-input)] text-xs">
            <Filter className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <select 
              value={logFilter}
              onChange={(e) => { setLogFilter(e.target.value); setPage(1); }}
              className="bg-transparent text-[var(--text-primary)] focus:outline-none cursor-pointer"
            >
              <option value="All" className="bg-[var(--bg-panel-solid)]">All Actions</option>
              <option value="LOGIN" className="bg-[var(--bg-panel-solid)]">LOGIN</option>
              <option value="CREATE_USER" className="bg-[var(--bg-panel-solid)]">CREATE_USER</option>
              <option value="DELETE_USER" className="bg-[var(--bg-panel-solid)]">DELETE_USER</option>
              <option value="DELETE_INTERVIEW" className="bg-[var(--bg-panel-solid)]">DELETE_INTERVIEW</option>
              <option value="UPDATE" className="bg-[var(--bg-panel-solid)]">UPDATE</option>
            </select>
          </div>

          {/* Refresh Button */}
          <button 
            onClick={fetchLogs} 
            className="flex items-center gap-1.5 px-3.5 py-2 border border-[var(--border-card)] hover:bg-[var(--bg-card-hover)] transition-all rounded-xl text-xs font-semibold text-[var(--text-primary)]"
            title="Refresh logs"
          >
            <RotateCcw className="w-3.5 h-3.5 text-indigo-500" />
            Refresh
          </button>
        </div>
      </div>

      {/* Logs Table */}
      {filteredLogs.length === 0 ? (
        <div className="glass-card rounded-2xl p-6">
          <EmptyState 
            icon={Terminal}
            title="No Log Entries Found" 
            description={search.trim() ? `No audit logs match "${search.trim()}".` : 'No administrative actions have been logged yet.'}
          />
        </div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden hover:border-indigo-500/20 transition-all duration-300">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-table)] bg-[var(--bg-table-header)]">
                  <th className="py-4 px-6 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Log ID</th>
                  <th className="py-4 px-6 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Admin Name</th>
                  <th className="py-4 px-6 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Action</th>
                  <th className="py-4 px-6 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Target</th>
                  <th className="py-4 px-6 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Type</th>
                  <th className="py-4 px-6 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-table)]">
                {pagedLogs.map((item, idx) => {
                  const logType = getLogType(item.action);
                  return (
                    <tr key={idx} className="hover:bg-[var(--bg-table-row-hover)] transition-colors">
                      <td className="py-4 px-6 font-mono font-semibold text-xs sm:text-sm text-indigo-500">LOG-{item.id}</td>
                      <td className="py-4 px-6 font-semibold text-sm text-[var(--text-primary)]">
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                          {item.admin}
                        </div>
                      </td>
                      <td className="py-4 px-6 font-mono text-xs sm:text-sm text-[var(--text-primary)]">{item.action}</td>
                      <td className="py-4 px-6 text-xs sm:text-sm text-[var(--text-secondary)]">{item.target}</td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          logType === 'Create' 
                            ? isDark ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : logType === 'Delete'
                              ? isDark ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' : 'bg-rose-50 text-rose-700 border-rose-200'
                              : logType === 'Update'
                                ? isDark ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'bg-amber-50 text-amber-700 border-amber-200'
                                : isDark ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30' : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        }`}>
                          <Info className="w-3 h-3" />
                          {logType}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-[var(--text-muted)] text-xs sm:text-sm font-medium text-right">{item.timestamp}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-[var(--border-table)] flex items-center justify-between">
            <p className="text-xs text-[var(--text-muted)]">
              Showing <span className="font-semibold text-[var(--text-primary)]">{Math.min((page-1)*PAGE_SIZE+1, filteredLogs.length)}–{Math.min(page*PAGE_SIZE, filteredLogs.length)}</span> of <span className="font-semibold text-[var(--text-primary)]">{filteredLogs.length}</span> entries
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

export default Logs;
