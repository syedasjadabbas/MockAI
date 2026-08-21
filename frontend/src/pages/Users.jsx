import React, { useState, useEffect } from 'react';
import { Search, Eye, MoreVertical, X, AlertCircle, CheckCircle2, Download, ChevronLeft, ChevronRight, UserPlus, Users as UsersIcon } from 'lucide-react';
import { fetchWithAuth } from '../api';
import { useLocation } from 'react-router-dom';
import { exportToCSV } from '../utils/csvExport';
import { formatDateOnly } from '../utils/dateFormat';
import { TableSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import { useTheme } from '../context/ThemeContext';

const Users = () => {
  const location = useLocation();
  const { isDark } = useTheme();
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
  const [loadError, setLoadError] = useState(null);

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
      .catch(() => setLoadError("Failed to load users. Please try again."))
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

  const handleExport = () => {
    const dataToExport = filteredUsers.map(u => ({
      Name: u.name,
      Email: u.email,
      'Interviews Count': u.interviews || u.interview_count || 0
    }));
    exportToCSV(dataToExport, 'users_export.csv');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-10 w-72 rounded-xl bg-slate-800/40 animate-pulse" />
          <div className="h-10 w-32 rounded-xl bg-slate-800/40 animate-pulse" />
        </div>
        <div className="glass-card rounded-2xl p-4">
          <TableSkeleton rows={8} cols={6} />
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="glass-card p-12 rounded-3xl flex flex-col items-center justify-center text-center max-w-md mx-auto my-12">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">Error Loading Data</h3>
        <p className="text-sm text-[var(--text-secondary)] mb-4">{loadError}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-500/20"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Search and Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)]" />
          <input 
            type="text" 
            placeholder="Search by name or email..." 
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm theme-input border focus:outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 transition-all"
          />
          {search && (
            <button 
              onClick={() => setSearch('')} 
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExport} 
            className="px-4 py-2.5 rounded-xl border border-[var(--border-card)] hover:bg-[var(--bg-card-hover)] text-[var(--text-primary)] font-semibold text-xs sm:text-sm transition-all flex items-center gap-2 shadow-sm"
          >
            <Download className="w-4 h-4 text-indigo-500" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Users Table */}
      {filteredUsers.length === 0 ? (
        <div className="glass-card rounded-2xl p-6">
          <EmptyState 
            icon={UsersIcon}
            title="No Users Found" 
            description={search.trim() ? `No matching users found for "${search.trim()}".` : 'There are no users registered in the system yet.'}
            actionLabel={search.trim() ? "Clear Search" : undefined}
            onAction={search.trim() ? () => setSearch('') : undefined}
          />
        </div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden hover:border-indigo-500/20 transition-all duration-300">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-table)] bg-[var(--bg-table-header)]">
                  <th className="py-4 px-6 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">User ID</th>
                  <th className="py-4 px-6 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Name</th>
                  <th className="py-4 px-6 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Email</th>
                  <th className="py-4 px-6 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider text-center">Interviews</th>
                  <th className="py-4 px-6 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Joined</th>
                  <th className="py-4 px-6 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-table)]">
                {pagedUsers.map((user, idx) => (
                  <tr 
                    key={idx} 
                    onClick={() => setSelectedUser(user)} 
                    className="hover:bg-[var(--bg-table-row-hover)] transition-colors cursor-pointer"
                  >
                    <td className="py-4 px-6 font-mono font-semibold text-xs sm:text-sm text-indigo-500">USR-{user.id}</td>
                    <td className="py-4 px-6 font-semibold text-sm text-[var(--text-primary)]">{user.name}</td>
                    <td className="py-4 px-6 text-sm text-[var(--text-secondary)]">{user.email}</td>
                    <td className="py-4 px-6 text-sm text-center">
                      <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                        {user.interviews}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm text-[var(--text-muted)]">{user.joined}</td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2 relative">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setSelectedUser(user); }} 
                          className="p-2 rounded-xl border border-[var(--border-card)] text-[var(--text-secondary)] hover:text-indigo-500 hover:bg-[var(--bg-card-hover)] transition-all"
                          title="View user details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-[var(--border-table)] flex items-center justify-between">
            <p className="text-xs text-[var(--text-muted)]">
              Showing <span className="font-semibold text-[var(--text-primary)]">{Math.min((page-1)*PAGE_SIZE+1, filteredUsers.length)}–{Math.min(page*PAGE_SIZE, filteredUsers.length)}</span> of <span className="font-semibold text-[var(--text-primary)]">{filteredUsers.length}</span> users
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

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="theme-modal p-6 sm:p-8 rounded-3xl w-full max-w-md relative border">
            <button 
              onClick={() => setSelectedUser(null)} 
              className="absolute top-4 right-4 p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-5">User Details</h3>
            <div className="space-y-3.5 p-4 rounded-2xl bg-[var(--bg-table-header)] border border-[var(--border-table)]">
              <div>
                <p className="text-xs text-[var(--text-muted)] font-medium">User ID</p>
                <p className="font-mono text-sm font-semibold text-indigo-500">USR-{selectedUser.id}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)] font-medium">Full Name</p>
                <p className="font-semibold text-sm text-[var(--text-primary)]">{selectedUser.name}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)] font-medium">Email Address</p>
                <p className="font-semibold text-sm text-[var(--text-primary)] break-all">{selectedUser.email}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)] font-medium">Interviews Conducted</p>
                <p className="font-semibold text-sm text-[var(--text-primary)]">{selectedUser.interviews}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)] font-medium">Joined Date</p>
                <p className="font-semibold text-sm text-[var(--text-primary)]">{selectedUser.joined}</p>
              </div>
            </div>
            <div className="mt-5">
              <button 
                onClick={() => setSelectedUser(null)} 
                className="w-full py-2.5 rounded-xl border border-[var(--border-card)] hover:bg-[var(--bg-card-hover)] text-[var(--text-primary)] font-semibold text-sm transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-5 right-5 px-5 py-3 rounded-2xl shadow-xl z-50 font-semibold text-xs sm:text-sm flex items-center gap-2.5 transition-all ${
          toast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default Users;
