import React, { useState, useEffect } from 'react';
import { Search, Eye, MoreVertical, X, AlertCircle, CheckCircle2, Edit, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchWithAuth } from '../api';
import { useLocation } from 'react-router-dom';
import { exportToCSV } from '../utils/csvExport';
import { formatDateOnly } from '../utils/dateFormat';

const Users = () => {
  const location = useLocation();
  const [search, setSearch] = useState(() => new URLSearchParams(location.search).get('search') || '');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  useEffect(() => {
    const query = new URLSearchParams(location.search).get('search');
    if (query !== null) setSearch(query);
  }, [location.search]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newUserForm, setNewUserForm] = useState({ name: '', email: '' });
  const [editUserForm, setEditUserForm] = useState({ id: '', name: '', email: '' });
  const [errorMsg, setErrorMsg] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setNewUserForm({ name: '', email: '' });
    setErrorMsg(null);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditUserForm({ id: '', name: '', email: '' });
    setErrorMsg(null);
  };

  useEffect(() => {
    const closeDropdown = () => setActiveDropdown(null);
    window.addEventListener('click', closeDropdown);
    return () => window.removeEventListener('click', closeDropdown);
  }, []);

  const handleDeleteUser = async () => {
    if (!confirmDelete) return;
    setIsSubmitting(true);
    try {
      await fetchWithAuth(`/users/${confirmDelete._id || confirmDelete.id}`, { method: 'DELETE' });
      setUsers(users.filter(u => u.id !== confirmDelete.id));
      const deletedName = confirmDelete.name;
      setConfirmDelete(null);
      showToast('User deleted successfully');
      window.dispatchEvent(new CustomEvent('notify', { detail: { message: `User deleted: ${deletedName}`, type: 'warning' } }));
      window.dispatchEvent(new Event('dataUpdated'));
    } catch (err) {
      showToast('Failed to delete user', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    fetchWithAuth('/users')
      .then(data => {
        setUsers(data.map(u => ({ 
          ...u, 
          id: u._id ? u._id.slice(-6).toUpperCase() : u.id,
          interviews: u.interview_count || 0,
          joined: u.created_at ? formatDateOnly(u.created_at) : '-'
        })));
      })
      .catch((err) => setLoadError("Failed to load users. Please try again."))
      .finally(() => setLoading(false));
  }, []);

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(search.toLowerCase()) || 
    user.email.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const pagedUsers = filteredUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleAddUser = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!newUserForm.name || !newUserForm.email) {
      setErrorMsg("All fields required");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newUserForm.email)) {
      setErrorMsg("Invalid email format");
      return;
    }
    setIsSubmitting(true);
    try {
      const data = await fetchWithAuth('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUserForm)
      });
      setUsers([{ ...data, id: data._id.slice(-6).toUpperCase(), interviews: 0, joined: new Date().toISOString().split('T')[0] }, ...users]);
      closeAddModal();
      showToast('User created successfully');
      window.dispatchEvent(new CustomEvent('notify', { detail: { message: `New user created: ${newUserForm.name}`, type: 'success' } }));
      window.dispatchEvent(new Event('dataUpdated'));
    } catch (err) {
      setErrorMsg(err.message || 'User already exists');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!editUserForm.name || !editUserForm.email) {
      setErrorMsg("All fields required");
      return;
    }
    setIsSubmitting(true);
    try {
      const data = await fetchWithAuth(`/users/${editUserForm._id || editUserForm.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editUserForm.name, email: editUserForm.email })
      });
      setUsers(users.map(u => u.id === editUserForm.id ? { ...u, name: data.name, email: data.email } : u));
      closeEditModal();
      showToast('User updated successfully');
      window.dispatchEvent(new CustomEvent('notify', { detail: { message: `User updated: ${data.name}`, type: 'info' } }));
      window.dispatchEvent(new Event('dataUpdated'));
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update user');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-full min-h-[400px]"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>;

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
        <AlertCircle className="w-10 h-10 text-rose-500 mb-3" />
        <h3 className="text-lg font-bold text-white mb-1">Error Loading Data</h3>
        <p className="text-slate-400">{loadError}</p>
      </div>
    );
  }

  const handleExport = () => {
    const dataToExport = filteredUsers.map(u => ({
      Name: u.name,
      Email: u.email,
      'Interviews Count': u.interviews || u.interview_count || 0
    }));
    exportToCSV(dataToExport, 'users_export.csv');
  };

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
        <div className="flex items-center gap-3">
          <button onClick={handleExport} className="px-4 py-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/50 text-slate-300 font-semibold text-sm transition-all flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
          <button onClick={() => setShowAddModal(true)} className="hidden px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-500/20">
            + Add User
          </button>
        </div>
      </div>

      {/* Users Table */}
      {filteredUsers.length === 0 ? (
        <div className="glass-card p-12 rounded-2xl border border-slate-800/40 flex flex-col items-center justify-center text-center">
          <AlertCircle className="w-12 h-12 text-slate-500 mb-3 opacity-50" />
          <h3 className="text-lg font-semibold text-slate-300">No users found</h3>
          <p className="text-sm text-slate-500 mt-1">{search.trim() ? `No results found for "${search.trim()}"` : 'There are no users registered yet.'}</p>
        </div>
      ) : (
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
              {pagedUsers.map((user, idx) => (
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
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-800/40 flex items-center justify-between">
          <p className="text-xs text-slate-400">Showing <span className="text-slate-200 font-medium">{Math.min((page-1)*PAGE_SIZE+1, filteredUsers.length)}–{Math.min(page*PAGE_SIZE, filteredUsers.length)}</span> of <span className="text-slate-200 font-medium">{filteredUsers.length}</span> users</p>
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
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card p-6 rounded-2xl w-full max-w-md relative border border-slate-800">
            <button disabled={isSubmitting} onClick={closeAddModal} className="absolute top-4 right-4 text-slate-400 hover:text-white disabled:opacity-50">
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
              {errorMsg && (
                <p className="text-rose-400 text-xs font-semibold">{errorMsg}</p>
              )}
              <div className="pt-2">
                <button disabled={isSubmitting} type="submit" className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg ${isSubmitting ? 'bg-indigo-600/50 text-white/50 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20'}`}>
                  {isSubmitting ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card p-6 rounded-2xl w-full max-w-md relative border border-slate-800">
            <button disabled={isSubmitting} onClick={closeEditModal} className="absolute top-4 right-4 text-slate-400 hover:text-white disabled:opacity-50">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-white mb-4">Edit User</h3>
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Name</label>
                <input type="text" required value={editUserForm.name} onChange={e => setEditUserForm({...editUserForm, name: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-slate-900/40 border border-slate-800/40 text-slate-200 text-sm focus:outline-none focus:border-indigo-500/40" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Email</label>
                <input type="email" required value={editUserForm.email} onChange={e => setEditUserForm({...editUserForm, email: e.target.value})} className="w-full px-4 py-2.5 rounded-xl bg-slate-900/40 border border-slate-800/40 text-slate-200 text-sm focus:outline-none focus:border-indigo-500/40" />
              </div>
              {errorMsg && (
                <p className="text-rose-400 text-xs font-semibold">{errorMsg}</p>
              )}
              <div className="pt-2">
                <button disabled={isSubmitting} type="submit" className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg ${isSubmitting ? 'bg-indigo-600/50 text-white/50 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20'}`}>
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
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
              <button disabled={isSubmitting} onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm transition-all border border-slate-700 disabled:opacity-50">Cancel</button>
              <button disabled={isSubmitting} onClick={handleDeleteUser} className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg ${isSubmitting ? 'bg-rose-600/50 text-white/50 cursor-not-allowed' : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-500/20'}`}>
                {isSubmitting ? 'Deleting...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-xl shadow-xl z-50 font-medium text-sm flex items-center gap-2 ${toast.type === 'error' ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'}`}>
          {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default Users;
