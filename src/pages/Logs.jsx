import React, { useState, useEffect } from 'react';
import { Terminal, Calendar, User, Info, Filter } from 'lucide-react';
import { fetchWithAuth } from '../api';

const Logs = () => {
  const [logsData, setLogsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logFilter, setLogFilter] = useState('All');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await fetchWithAuth('/logs');
      setLogsData(data.map(l => ({
        id: l._id ? l._id.slice(-6).toUpperCase() : Math.random().toString(36).substring(7).toUpperCase(),
        admin: l.admin_email || 'System Admin',
        action: l.action,
        target: l.target || 'System',
        timestamp: l.created_at ? new Date(l.created_at).toLocaleString() : '-'
      })));
    } catch (err) {
      console.error(err);
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

  const filteredLogs = logsData.filter(log => logFilter === 'All' || log.action === logFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Terminal className="w-5 h-5 text-indigo-400" />
          Audit Logs
        </h2>
        <div className="flex items-center gap-3">
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
            Fetch logs
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
              {filteredLogs.map((item, idx) => (
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
                <tr><td colSpan="6" className="py-8 text-center text-slate-400">No data available.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Logs;
