import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, User, LogOut, PlayCircle, ChevronDown } from 'lucide-react';
import ThemeToggle from '../../components/ThemeToggle';
import { getSession, logout } from '../services/candidateAuth';
import logo from '../../assets/logo.png';

const NAV_LINKS = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'History', path: '/history' },
  { label: 'Progress', path: '/progress' },
  { label: 'Profile', path: '/profile' },
];

// Single elegant top bar, replacing the sidebar+header "admin portal"
// composition. A candidate only ever needs four destinations plus one
// action (start an interview) - that fits comfortably in one slim bar,
// which also reads far less like a dashboard/back-office tool.
const CandidateNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const session = getSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 c-panel">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-8 min-w-0">
          <Link to="/dashboard" className="shrink-0 flex items-center select-none">
            <img src={logo} alt="MockAI Logo" className="h-11 w-auto object-contain" />
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className="relative px-3.5 py-2 text-sm font-semibold rounded-lg transition-colors"
                  style={{ color: isActive ? 'var(--c-text)' : 'var(--c-text-secondary)' }}
                >
                  {link.label}
                  {isActive && (
                    <span
                      className="absolute left-3.5 right-3.5 -bottom-[1px] h-[2px] rounded-full"
                      style={{ background: 'var(--c-accent)' }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/interview/goal"
            className="hidden sm:inline-flex c-btn c-btn-primary px-4 py-2"
          >
            <PlayCircle className="w-4 h-4" />
            Start Interview
          </Link>

          <ThemeToggle />

          <div className="relative hidden md:block">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 pl-2.5 pr-1 py-1.5 rounded-full border transition-colors"
              style={{ borderColor: 'var(--c-border)' }}
            >
              <span
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: 'var(--c-accent-soft)', color: 'var(--c-accent)' }}
              >
                {(session?.name || 'C').trim().charAt(0).toUpperCase()}
              </span>
              <ChevronDown className="w-3.5 h-3.5" style={{ color: 'var(--c-text-muted)' }} />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute top-12 right-0 w-60 c-card rounded-2xl shadow-xl z-50 overflow-hidden">
                  <div className="px-4 py-3.5" style={{ borderBottom: '1px solid var(--c-border)' }}>
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--c-text)' }}>{session?.name}</p>
                    <p className="text-xs truncate mt-0.5" style={{ color: 'var(--c-text-muted)' }}>{session?.email}</p>
                  </div>
                  <button
                    onClick={() => { setMenuOpen(false); navigate('/profile'); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition-colors"
                    style={{ color: 'var(--c-text-secondary)' }}
                  >
                    <User className="w-4 h-4" /> View Profile
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold transition-colors"
                    style={{ color: 'var(--c-danger)' }}
                  >
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="lg:hidden p-2 rounded-lg border"
            style={{ borderColor: 'var(--c-border)', color: 'var(--c-text-secondary)' }}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden c-panel border-t" style={{ borderColor: 'var(--c-border)' }}>
          <nav className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileOpen(false)}
                className="px-3 py-2.5 rounded-lg text-sm font-semibold"
                style={{
                  color: location.pathname === link.path ? 'var(--c-accent)' : 'var(--c-text-secondary)',
                  background: location.pathname === link.path ? 'var(--c-accent-soft)' : 'transparent',
                }}
              >
                {link.label}
              </Link>
            ))}
            <Link
              to="/interview/goal"
              onClick={() => setMobileOpen(false)}
              className="c-btn c-btn-primary w-full py-2.5 mt-2 sm:hidden"
            >
              <PlayCircle className="w-4 h-4" /> Start Interview
            </Link>
            <button
              onClick={() => { setMobileOpen(false); handleLogout(); }}
              className="flex items-center gap-2.5 px-3 py-2.5 mt-1 rounded-lg text-sm font-semibold text-left md:hidden"
              style={{ color: 'var(--c-danger)' }}
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </nav>
        </div>
      )}
    </header>
  );
};

export default CandidateNav;
