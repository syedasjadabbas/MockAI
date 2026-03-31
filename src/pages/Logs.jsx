import React from 'react';
import { Terminal, Calendar, User, Info } from 'lucide-react';

const mockLogs = [
  { id: 'LOG-4091', admin: 'Super Admin', action: 'Created user USR-8821', timestamp: 'Mar 15, 2026 14:32:10', type: 'Create' },
  { id: 'LOG-4090', admin: 'Super Admin', action: 'Updated result INT-3041', timestamp: 'Mar 15, 2026 12:45:00', type: 'Update' },
  { id: 'LOG-4089', admin: 'Sub Admin 1', action: 'Deleted log item LOG-3981', timestamp: 'Mar 14, 2026 11:20:15', type: 'Delete' },
  { id: 'LOG-4088', admin: 'Super Admin', action: 'Logged out', timestamp: 'Mar 13, 2026 18:00:22', type: 'Access' },
  { id: 'LOG-4087', admin: 'Sub Admin 2', action: 'Exported results list', timestamp: 'Mar 12, 2026 09:15:30', type: 'Export' },
];

const Logs = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Terminal className="w-5 h-5 text-indigo-400" />
          Audit Logs
        </h2>
        
        <button className="px-4 py-2 bg-slate-800/40 hover:bg-slate-800/60 transition-all border border-slate-800/40 rounded-xl text-sm text-slate-300 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          Fetch logs
        </button>
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
                <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Type</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {mockLogs.map((item, idx) => (
                <tr key={idx} className="border-b border-slate-800/40 last:border-0 hover:bg-slate-800/10 transition-colors">
                  <td className="py-4 px-6 font-medium text-sm text-indigo-400">{item.id}</td>
                  <td className="py-4 px-6 flex items-center gap-2 font-semibold text-sm text-slate-200">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    {item.admin}
                  </td>
                  <td className="py-4 px-6 text-sm text-slate-300">{item.action}</td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold border ${
                      item.type === 'Create' 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : item.type === 'Delete'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          : item.type === 'Update'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                    }`}>
                      <Info className="w-3.5 h-3.5" />
                      {item.type}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-slate-500 text-sm font-medium text-right">{item.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Logs;
