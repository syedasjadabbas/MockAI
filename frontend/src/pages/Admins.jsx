import React, { useState, useEffect } from 'react';
import { Shield, Mail, UserCheck, ShieldCheck } from 'lucide-react';
import { fetchWithAuth } from '../api';
import StatsCard from '../components/StatsCard';
import { TableSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import { useTheme } from '../context/ThemeContext';

const Admins = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isDark } = useTheme();

  useEffect(() => {
    fetchWithAuth('/all-admins')
      .then(data => {
        setAdmins(data || []);
      })
      .catch(err => {
        console.error("Failed to fetch admins:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="max-w-xs">
          <div className="h-24 rounded-2xl bg-slate-800/40 animate-pulse" />
        </div>
        <div className="glass-card rounded-2xl p-4">
          <TableSkeleton rows={4} cols={3} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stat Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatsCard 
          title="Total Admins" 
          value={admins.length.toString()} 
          icon={ShieldCheck} 
        />
      </div>

      {/* Admins Table */}
      <div className="glass-card rounded-2xl overflow-hidden hover:border-indigo-500/20 transition-all duration-300">
        <div className="p-5 border-b border-[var(--border-table)] flex items-center justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">System Administrators</h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Users with administrative privileges to manage MockAI</p>
          </div>
        </div>

        {admins.length === 0 ? (
          <EmptyState 
            icon={Shield}
            title="No Admins Found" 
            description="No administrator accounts found in the database." 
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-table)] bg-[var(--bg-table-header)]">
                  <th className="py-4 px-6 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Administrator</th>
                  <th className="py-4 px-6 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Email Address</th>
                  <th className="py-4 px-6 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-table)]">
                {admins.map((admin, idx) => (
                  <tr key={idx} className="hover:bg-[var(--bg-table-row-hover)] transition-colors">
                    <td className="py-4 px-6 font-semibold text-sm text-[var(--text-primary)]">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 font-bold text-xs border border-indigo-500/20">
                          {admin.name ? admin.name.charAt(0).toUpperCase() : 'A'}
                        </div>
                        <span>{admin.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-[var(--text-secondary)]">
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                        {admin.email}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        isDark ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      }`}>
                        <UserCheck className="w-3 h-3" />
                        {admin.role || 'Admin'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {admins.length > 0 && (
          <div className="p-4 border-t border-[var(--border-table)] flex items-center justify-between">
            <p className="text-xs text-[var(--text-muted)]">
              Showing <span className="font-semibold text-[var(--text-primary)]">1–{admins.length}</span> of <span className="font-semibold text-[var(--text-primary)]">{admins.length}</span> admins
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admins;
