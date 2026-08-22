import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, User, LogOut } from 'lucide-react';
import ThemeToggle from '../../components/ThemeToggle';
import { useTheme } from '../../context/ThemeContext';
import { getSession, logout } from '../services/candidateAuth';

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/history': 'Interview History',
  '/progress': 'Progress Tracking',
  '/profile': 'Profile',
};

const CandidateHeader = ({ onToggleMobileMenu }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [showMenu, setShowMenu] = useState(false);
  const session = getSession();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-64 h-16 glass-panel border-b z-30 px-4 sm:px-6 flex items-center justify-between transition-all duration-200">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 rounded-xl border border-[var(--border-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-all"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-lg sm:text-xl font-bold tracking-tight text-[var(--text-primary)]">
          {PAGE_TITLES[location.pathname] || 'MockAI'}
        </h1>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-3.5">
        <ThemeToggle />

        <div className="relative">
          <button
            onClick={() => setShowMenu((v) => !v)}
            className="flex items-center gap-2.5 pl-2 sm:pl-3 border-l border-[var(--border-panel)]"
          >
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
              <User className="w-4 h-4 text-indigo-500" />
            </div>
            <span className="hidden sm:block text-sm font-semibold text-[var(--text-primary)]">
              {session?.name || 'Candidate'}
            </span>
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className="absolute top-12 right-0 w-56 theme-modal rounded-2xl shadow-2xl z-50 overflow-hidden border">
                <div className="px-4 py-3 border-b border-[var(--border-table)]">
                  <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{session?.name}</p>
                  <p className="text-xs text-[var(--text-muted)] truncate">{session?.email}</p>
                </div>
                <button
                  onClick={() => { setShowMenu(false); navigate('/profile'); }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-table-row-hover)] transition-colors"
                >
                  <User className="w-4 h-4" /> View Profile
                </button>
                <button
                  onClick={handleLogout}
                  className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
                    isDark ? 'text-rose-400 hover:bg-rose-500/10' : 'text-rose-600 hover:bg-rose-50'
                  }`}
                >
                  <LogOut className="w-4 h-4" /> Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default CandidateHeader;
