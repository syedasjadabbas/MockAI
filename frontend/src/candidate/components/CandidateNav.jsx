import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, User, LogOut, Plus, ChevronDown } from 'lucide-react';
import ThemeToggle from '../../components/ThemeToggle';
import { getSession, logout } from '../services/candidateAuth';
import logo from '../../assets/logo.png';

const NAV_LINKS = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'History', path: '/history' },
  { label: 'Progress', path: '/progress' },
  { label: 'Profile', path: '/profile' },
];

const CandidateNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const session = getSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [navImgError, setNavImgError] = useState(false);

  React.useEffect(() => {
    setNavImgError(false);
  }, [session?.avatar]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 border-b" style={{ background: 'var(--c-bg-subtle)', borderColor: 'var(--c-border)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-15 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6 min-w-0">
          <Link 
            to="/dashboard" 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} 
            className="shrink-0 flex items-center select-none"
          >
            <img src={logo} alt="MockAI Logo" className="c-brand-logo" />
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className="px-3 py-1.5 text-xs font-semibold rounded-md transition-colors"
                  style={{ 
                    color: isActive ? 'var(--c-text)' : 'var(--c-text-secondary)',
                    background: isActive ? 'var(--c-surface-muted)' : 'transparent',
                  }}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/interview/goal"
            className="hidden sm:inline-flex c-btn c-btn-primary px-3.5 py-1.5 text-xs font-semibold rounded-md flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Start Interview</span>
          </Link>

          <ThemeToggle />

          <div className="relative hidden md:block">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 pl-2 pr-2 py-1 rounded-md border"
              style={{ 
                borderColor: 'var(--c-border)',
                background: 'var(--c-surface-card)',
              }}
            >
              {session?.avatar && !navImgError ? (
                <img
                  src={session.avatar}
                  alt={session.name || 'Candidate'}
                  referrerPolicy="no-referrer"
                  onError={() => setNavImgError(true)}
                  className="w-6 h-6 rounded-full object-cover border"
                  style={{ borderColor: 'var(--c-border)' }}
                />
              ) : (
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={{ 
                    background: 'var(--c-surface-muted)', 
                    color: 'var(--c-text)',
                  }}
                >
                  {(session?.name || 'C').trim().charAt(0).toUpperCase()}
                </span>
              )}
              <span className="text-xs font-semibold max-w-[100px] truncate" style={{ color: 'var(--c-text)' }}>
                {session?.name || 'Candidate'}
              </span>
              <ChevronDown className="w-3.5 h-3.5" style={{ color: 'var(--c-text-muted)' }} />
            </button>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setMenuOpen(false)}
                />
                <div
                  className="absolute right-0 mt-2 w-48 rounded-lg shadow-lg border py-1.5 z-50 text-xs"
                  style={{
                    background: 'var(--c-surface-card)',
                    borderColor: 'var(--c-border)',
                  }}
                >
                  <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--c-border)' }}>
                    <p className="font-semibold truncate" style={{ color: 'var(--c-text)' }}>{session?.name || 'Candidate'}</p>
                    <p className="truncate" style={{ color: 'var(--c-text-muted)' }}>{session?.email || ''}</p>
                  </div>

                  <Link
                    to="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 transition-colors hover:bg-slate-500/[0.05]"
                    style={{ color: 'var(--c-text-secondary)' }}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Candidate Profile</span>
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-red-500/10 text-red-500"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="lg:hidden p-2 rounded-md border"
            style={{ 
              borderColor: 'var(--c-border)',
              background: 'var(--c-surface-card)',
              color: 'var(--c-text)'
            }}
            aria-label="Toggle navigation"
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t px-4 py-3 space-y-1" style={{ background: 'var(--c-bg-subtle)', borderColor: 'var(--c-border)' }}>
          {NAV_LINKS.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2 text-xs font-semibold rounded-md"
                style={{
                  color: isActive ? 'var(--c-text)' : 'var(--c-text-secondary)',
                  background: isActive ? 'var(--c-surface-muted)' : 'transparent',
                }}
              >
                {link.label}
              </Link>
            );
          })}

          <div className="pt-2 border-t mt-2" style={{ borderColor: 'var(--c-border)' }}>
            <Link
              to="/interview/goal"
              onClick={() => setMobileOpen(false)}
              className="c-btn c-btn-primary w-full py-2 text-xs font-semibold rounded-md mb-2 flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Start Interview</span>
            </Link>

            <button
              onClick={() => {
                setMobileOpen(false);
                handleLogout();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-md text-red-500 hover:bg-red-500/10"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default CandidateNav;
