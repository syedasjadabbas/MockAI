import React, { useState, useEffect } from 'react';
import { Users as UsersIcon } from 'lucide-react';
import { fetchWithAuth } from '../api';

const Admins = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <div className="flex items-center justify-center h-full min-h-[400px]"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="space-y-6">
      {/* Header Stat */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="glass-card p-6 rounded-2xl w-full max-w-sm flex items-center gap-4 border border-slate-800">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
            <UsersIcon className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-400">Total Admins</p>
            <h3 className="text-2xl font-bold text-white mt-1">{admins.length}</h3>
          </div>
        </div>
      </div>

      {/* Admins Table */}
      <div className="glass-card rounded-2xl overflow-hidden hover:border-indigo-500/10 transition-all duration-300">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/60 bg-slate-800/20">
                <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Name</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Email</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin, idx) => (
                <tr key={idx} className="border-b border-slate-800/40 last:border-0 hover:bg-slate-800/10 transition-colors">
                  <td className="py-4 px-6 font-semibold text-sm text-slate-200">{admin.name}</td>
                  <td className="py-4 px-6 text-sm text-slate-400">{admin.email}</td>
                </tr>
              ))}
              {admins.length === 0 && (
                <tr>
                  <td colSpan="2" className="py-8 text-center text-slate-400 text-sm">
                    No admins found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {admins.length > 0 && (
          <div className="p-4 border-t border-slate-800/40 flex items-center justify-between">
            <p className="text-xs text-slate-400">Showing <span className="text-slate-200 font-medium">1-{admins.length}</span> of <span className="text-slate-200 font-medium">{admins.length}</span> admins</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admins;
