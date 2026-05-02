import React, { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, Eye, MoreVertical, X, AlertCircle } from 'lucide-react';
import { fetchWithAuth } from '../api';

const Users = () => {
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUserForm, setNewUserForm] = useState({ name: '', email: '' });

  useEffect(() => {
    const closeDropdown = () => setActiveDropdown(null);
    window.addEventListener('click', closeDropdown);
    return () => window.removeEventListener('click', closeDropdown);
  }, []);

  const handleDeleteUser = async () => {
    if (!confirmDelete) return;
    try {
      await fetchWithAuth(`/users/${confirmDelete._id || confirmDelete.id}`, { method: 'DELETE' });
      setUsers(users.filter(u => u.id !== confirmDelete.id));
      alert('User deleted successfully');
    } catch (err) {
      console.error(err);
      alert('Failed to delete user');
    }
    setConfirmDelete(null);
  };

  useEffect(() => {
    fetchWithAuth('/users')
      .then(data => {
        setUsers(data.map(u => ({ 
          ...u, 
          id: u._id ? u._id.slice(-6).toUpperCase() : u.id,
          interviews: u.interview_count || 0,
          joined: u.created_at ? new Date(u.created_at).toISOString().split('T')[0] : 'N/A'
        })));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(search.toLowerCase()) || 
    user.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newUserForm.name || !newUserForm.email) return;
    try {
      const data = await fetchWithAuth('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUserForm)
      });
      setUsers([{ ...data, id: data._id.slice(-6).toUpperCase(), interviews: 0, joined: new Date().toISOString().split('T')[0] }, ...users]);
      setShowAddModal(false);
      setNewUserForm({ name: '', email: '' });
      alert('User created successfully');
    } catch (err) {
      console.error(err);
      alert('Failed to create user');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-full min-h-[400px]"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="space-y-6">
      {/* Header with search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by name or email..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/40 border border-slate-800/40 text-slate-200 text-sm focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20"
          />
        </div>
        
        <button onClick={() => setShowAddModal(true)} className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-500/20">
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
              {filteredUsers.map((user, idx) => (
                <tr key={idx} onClick={() => setSelectedUser(user)} className="border-b border-slate-800/40 last:border-0 hover:bg-slate-800/10 transition-colors cursor-pointer">
                  <td className="py-4 px-6 font-medium text-sm text-indigo-400">USR-{user.id}</td>
                  <td className="py-4 px-6 font-semibold text-sm text-slate-200">{user.name}</td>
                  <td className="py-4 px-6 text-sm text-slate-400">{user.email}</td>
                  <td className="py-4 px-6 text-sm text-slate-200 font-bold">{user.interviews}</td>
                  <td className="py-4 px-6 text-sm text-slate-500">{user.joined}</td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-2 relative">
                      <button onClick={(e) => { e.stopPropagation(); setSelectedUser(user); }} className="p-1.5 rounded-lg bg-slate-800/50 text-slate-400 hover:text-indigo-400 border border-slate-800/40 transition-all">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === user.id ? null : user.id); }} className="p-1.5 rounded-lg bg-slate-800/50 text-slate-400 hover:text-white border border-slate-800/40 transition-all">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {activeDropdown === user.id && (
                        <div className="absolute right-0 top-full mt-1 w-36 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-10 py-1">
                          <button onClick={(e) => { e.stopPropagation(); setSelectedUser(user); setActiveDropdown(null); }} className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white">View Details</button>
                          <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(user); setActiveDropdown(null); }} className="w-full text-left px-4 py-2 text-sm text-rose-400 hover:bg-slate-700 hover:text-rose-300">Delete</button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr><td colSpan="6" className="py-8 text-center text-slate-400">No data available.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination UI */}
        <div className="p-4 border-t border-slate-800/40 flex items-center justify-between">
          <p className="text-xs text-slate-400">Showing <span className="text-slate-200 font-medium">1-{filteredUsers.length}</span> of <span className="text-slate-200 font-medium">{filteredUsers.length}</span> users</p>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card p-6 rounded-2xl w-full max-w-md relative border border-slate-800">
            <button onClick={() => setShowAddModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-white mb-4">Add New User</h3>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Name</label>
                <input type="text" required value={newUserForm.name} onChange={e => setNewUserForm({...newUserForm, name: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-slate-900/40 border border-slate-800/40 text-slate-200 text-sm focus:outline-none focus:border-indigo-500/40" placeholder="John Doe" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Email</label>
                <input type="email" required value={newUserForm.email} onChange={e => setNewUserForm({...newUserForm, email: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-slate-900/40 border border-slate-800/40 text-slate-200 text-sm focus:outline-none focus:border-indigo-500/40" placeholder="john@example.com" />
              </div>
              <div className="pt-2">
                <button type="submit" className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-500/20">
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card p-6 rounded-2xl w-full max-w-md relative">
            <button onClick={() => setSelectedUser(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-white mb-4">User Details</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-400">Name</p>
                <p className="font-semibold text-slate-200">{selectedUser.name}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Email</p>
                <p className="font-semibold text-slate-200">{selectedUser.email}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Interviews Conducted</p>
                <p className="font-semibold text-slate-200">{selectedUser.interviews}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Role</p>
                <p className="font-semibold text-slate-200">{selectedUser.role}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Joined</p>
                <p className="font-semibold text-slate-200">{selectedUser.joined}</p>
              </div>
            </div>
            <div className="mt-6">
              <button onClick={() => setSelectedUser(null)} className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm transition-all border border-slate-700">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card p-6 rounded-2xl w-full max-w-sm relative text-center border border-slate-800">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Delete Item</h3>
            <p className="text-slate-400 mb-6">Are you sure you want to delete this item? This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm transition-all border border-slate-700">Cancel</button>
              <button onClick={handleDeleteUser} className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm transition-all shadow-lg shadow-rose-500/20">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
