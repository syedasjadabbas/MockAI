import React, { useState, useEffect } from 'react';
import { Terminal, Calendar, User, Info, Filter, Search, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchWithAuth } from '../api';
import { useLocation } from 'react-router-dom';
import { exportToCSV } from '../utils/csvExport';
import { formatDate } from '../utils/dateFormat';

const Logs = () => {
  const location = useLocation();
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

  if (loading) return <div className="flex items-center justify-center h-full min-h-[400px]"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>;

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Terminal className="w-5 h-5 text-indigo-400" />
          Audit Logs
        </h2>
        <div className="flex items-center gap-3">
          <button onClick={handleExport} className="px-3 py-2 rounded-xl bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/50 text-slate-300 font-semibold text-xs transition-all flex items-center gap-2">
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
          <div className="relative w-48 md:w-60">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search logs..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-800/40 border border-slate-800/40 text-slate-200 text-sm focus:outline-none focus:border-indigo-500/40"
            />
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/40 border border-slate-800/40 rounded-xl">
            <Filter className="w-4 h-4 text-slate-400" />
            <select 
              value={logFilter}
              onChange={(e) => setLogFilter(e.target.value)}
              className="bg-transparent text-sm text-slate-300 focus:outline-none"
            >
              <option value="All">All Actions</option>
              <option value="LOGIN">LOGIN</option>
              <option value="CREATE_USER">CREATE_USER</option>
              <option value="DELETE_USER">DELETE_USER</option>
              <option value="DELETE_INTERVIEW">DELETE_INTERVIEW</option>
              <option value="UPDATE">UPDATE</option>
            </select>
          </div>

          <button onClick={fetchLogs} className="px-4 py-2 bg-slate-800/40 hover:bg-slate-800/60 transition-all border border-slate-800/40 rounded-xl text-sm text-slate-300 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            Refresh
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="glass-card rounded-2xl border border-slate-800/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/60 bg-slate-800/20">
                <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Log ID</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Admin Name</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Action</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Target</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Type</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {pagedLogs.map((item, idx) => (
                <tr key={idx} className="border-b border-slate-800/40 last:border-0 hover:bg-slate-800/10 transition-colors">
                  <td className="py-4 px-6 font-medium text-sm text-indigo-400">LOG-{item.id}</td>
                  <td className="py-4 px-6 flex items-center gap-2 font-semibold text-sm text-slate-200">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    {item.admin}
                  </td>
                  <td className="py-4 px-6 text-sm text-slate-300">{item.action}</td>
                  <td className="py-4 px-6 text-sm text-slate-400">{item.target}</td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold border ${
                      getLogType(item.action) === 'Create' 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : getLogType(item.action) === 'Delete'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          : getLogType(item.action) === 'Update' || getLogType(item.action) === 'Read' || getLogType(item.action) === 'View'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                    }`}>
                      <Info className="w-3.5 h-3.5" />
                      {getLogType(item.action)}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-slate-500 text-sm font-medium text-right">{item.timestamp}</td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr><td colSpan="6" className="py-12 text-center">
                  <Terminal className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-400 font-medium">No log entries found</p>
                  <p className="text-slate-500 text-xs mt-1">{search ? `No results for "${search}"` : 'No actions have been logged yet.'}</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="p-4 border-t border-slate-800/40 flex items-center justify-between">
          <p className="text-xs text-slate-400">Showing <span className="text-slate-200 font-medium">{Math.min((page-1)*PAGE_SIZE+1, filteredLogs.length)}–{Math.min(page*PAGE_SIZE, filteredLogs.length)}</span> of <span className="text-slate-200 font-medium">{filteredLogs.length}</span> entries</p>
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
    </div>
  );
};

export default Logs;
