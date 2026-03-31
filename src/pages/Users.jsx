import React, { useState } from 'react';
import { Search, ChevronLeft, ChevronRight, Eye, MoreVertical } from 'lucide-react';

const mockUsers = [
  { id: 'USR-8821', name: 'John Doe', email: 'john@example.com', interviews: 8, joined: 'Mar 12, 2026' },
  { id: 'USR-8820', name: 'Alice Freeman', email: 'alice@example.com', interviews: 3, joined: 'Mar 10, 2026' },
  { id: 'USR-8819', name: 'Robert Fox', email: 'robert@example.com', interviews: 12, joined: 'Mar 09, 2026' },
  { id: 'USR-8818', name: 'Cody Fisher', email: 'cody@example.com', interviews: 0, joined: 'Mar 07, 2026' },
  { id: 'USR-8817', name: 'Arlene McCoy', email: 'arlene@example.com', interviews: 5, joined: 'Mar 05, 2026' },
];

const Users = () => {
  const [search, setSearch] = useState('');

  return (
    <div className="space-y-6">
      {/* Header with search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by name, email, or ID..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/40 border border-slate-800/40 text-slate-200 text-sm focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20"
          />
        </div>
        
        <button className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all">
          + Add User
        </button>
      </div>

      {/* Users Table */}
      <div className="glass-card rounded-2xl overflow-hidden hover:border-indigo-500/10 transition-all duration-300">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/60 bg-slate-800/20">
                <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">User ID</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Name</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Email</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Interviews</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Joined</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {mockUsers.map((user, idx) => (
                <tr key={idx} className="border-b border-slate-800/40 last:border-0 hover:bg-slate-800/10 transition-colors">
                  <td className="py-4 px-6 font-medium text-sm text-indigo-400">{user.id}</td>
                  <td className="py-4 px-6 font-semibold text-sm text-slate-200">{user.name}</td>
                  <td className="py-4 px-6 text-sm text-slate-400">{user.email}</td>
                  <td className="py-4 px-6 text-sm text-slate-200 font-bold">{user.interviews}</td>
                  <td className="py-4 px-6 text-sm text-slate-500">{user.joined}</td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-1.5 rounded-lg bg-slate-800/50 text-slate-400 hover:text-indigo-400 border border-slate-800/40 transition-all">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 rounded-lg bg-slate-800/50 text-slate-400 hover:text-white border border-slate-800/40 transition-all">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination UI */}
        <div className="p-4 border-t border-slate-800/40 flex items-center justify-between">
          <p className="text-xs text-slate-400">Showing <span className="text-slate-200 font-medium">1-5</span> of <span className="text-slate-200 font-medium">120</span> users</p>
          <div className="flex items-center gap-2">
            <button className="p-1.5 rounded-lg bg-slate-800/30 text-slate-500 cursor-not-allowed border border-slate-800/40"><ChevronLeft className="w-4 h-4" /></button>
            <button className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 font-semibold text-sm border border-indigo-500/30 flex items-center justify-center">1</button>
            <button className="w-8 h-8 rounded-lg hover:bg-slate-800/40 text-slate-400 font-semibold text-sm transition-all flex items-center justify-center">2</button>
            <button className="w-8 h-8 rounded-lg hover:bg-slate-800/40 text-slate-400 font-semibold text-sm transition-all flex items-center justify-center">3</button>
            <button className="p-1.5 rounded-lg bg-slate-800/30 text-slate-400 hover:text-white border border-slate-800/40 transition-all"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Users;
