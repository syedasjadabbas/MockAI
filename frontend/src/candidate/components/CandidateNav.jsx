import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Menu,
  X,
  User,
  LogOut,
  Plus,
  ChevronDown,
  History,
  TrendingUp,
  Home,
} from 'lucide-react';
import ThemeToggle from '../../components/ThemeToggle';
import { getSession, logout } from '../services/candidateAuth';
import logo from '../../assets/logo.png';

const NAV_LINKS = [
  { label: 'Home', path: '/' },
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
  const dropdownRef = useRef(null);

  useEffect(() => {
    setNavImgError(false);
  }, [session?.avatar]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initialLetter = (session?.name || 'C').trim().charAt(0).toUpperCase();

  return (
    <header
      className="sticky top-0 z-50 border-b transition-colors duration-200"
      style={{
        background: 'var(--c-bg)',
        borderColor: 'var(--c-border)',
      }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* ===================================================================
            1. BRAND LOGO (Navigates to Public Landing Page /)
           =================================================================== */}
        <div className="flex items-center gap-8 shrink-0">
          <Link
            to="/"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-2.5 select-none focus:outline-none group"
            aria-label="MockAI Home"
          >
            <img
              src={logo}
              alt="MockAI Logo"
              className="h-8 sm:h-9 w-auto object-contain transition-opacity group-hover:opacity-85"
            />
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5" aria-label="Main Navigation">
            {NAV_LINKS.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 border"
                  style={{
                    color: isActive ? 'var(--c-text)' : 'var(--c-text-secondary)',
                    background: isActive ? 'var(--c-surface)' : 'transparent',
                    borderColor: isActive ? 'var(--c-border)' : 'transparent',
                  }}
                >
                  {isActive && (
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: 'var(--c-accent)' }}
                    />
                  )}
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* ===================================================================
            2. RIGHT UTILITIES (CTA, Theme Toggle, User Profile)
           =================================================================== */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          
          {/* Solid Orange Primary CTA Button */}
          <Link
            to="/interview/goal"
            className="c-btn c-btn-primary px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs font-bold rounded-md flex items-center gap-1.5 transition-all select-none"
            style={{
              background: 'var(--c-accent)',
              color: 'var(--c-on-accent)',
            }}
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Start Interview</span>
          </Link>

          {/* Theme Toggle */}
          <ThemeToggle className="!p-2 !rounded-md !border-[var(--c-border)] !bg-[var(--c-surface)] hover:!bg-[var(--c-surface-muted)]" />

          {/* User Profile Pill & Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 px-2 py-1.5 sm:px-2.5 sm:py-1.5 rounded-md border transition-colors select-none"
              style={{
                borderColor: menuOpen ? 'var(--c-accent)' : 'var(--c-border)',
                background: 'var(--c-surface)',
              }}
              aria-expanded={menuOpen}
              aria-label="Candidate user menu"
            >
              {/* Avatar / Initial */}
              <div
                className="w-6 h-6 rounded-full overflow-hidden shrink-0 flex items-center justify-center border text-[11px] font-bold"
                style={{
                  borderColor: 'var(--c-border)',
                  background: 'var(--c-surface-muted)',
                  color: 'var(--c-accent)',
                }}
              >
                {session?.avatar && !navImgError ? (
                  <img
                    src={session.avatar}
                    alt={session.name || 'Candidate'}
                    referrerPolicy="no-referrer"
                    onError={() => setNavImgError(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{initialLetter}</span>
                )}
              </div>

              {/* Username text (desktop) */}
              <span
                className="hidden sm:inline text-xs font-semibold max-w-[100px] truncate"
                style={{ color: 'var(--c-text)' }}
              >
                {session?.name || 'Candidate'}
              </span>

              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-150 ${menuOpen ? 'rotate-180' : ''}`}
                style={{ color: 'var(--c-text-muted)' }}
              />
            </button>

            {/* Dropdown Popover */}
            {menuOpen && (
              <div
                className="absolute right-0 mt-2 w-52 rounded-md shadow-xl border py-1.5 z-50 text-xs"
                style={{
                  background: 'var(--c-surface-card)',
                  borderColor: 'var(--c-border)',
                }}
              >
                {/* User Header */}
                <div
                  className="px-3 py-2 border-b mb-1"
                  style={{ borderColor: 'var(--c-border)' }}
                >
                  <p className="font-bold truncate" style={{ color: 'var(--c-text)' }}>
                    {session?.name || 'Candidate'}
                  </p>
                  <p className="text-[11px] truncate" style={{ color: 'var(--c-text-muted)' }}>
                    {session?.email || 'candidate@mockai.com'}
                  </p>
                </div>

                {/* Navigation Items */}
                <Link
                  to="/"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 transition-colors hover:bg-white/[0.04]"
                  style={{ color: 'var(--c-text-secondary)' }}
                >
                  <Home className="w-3.5 h-3.5 text-[#FF6B35]" />
                  <span>Landing Page</span>
                </Link>

                <Link
                  to="/profile"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 transition-colors hover:bg-white/[0.04]"
                  style={{ color: 'var(--c-text-secondary)' }}
                >
                  <User className="w-3.5 h-3.5" style={{ color: 'var(--c-accent)' }} />
                  <span>Candidate Profile</span>
                </Link>

                <Link
                  to="/history"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 transition-colors hover:bg-white/[0.04]"
                  style={{ color: 'var(--c-text-secondary)' }}
                >
                  <History className="w-3.5 h-3.5" style={{ color: 'var(--c-accent-highlight)' }} />
                  <span>Interview History</span>
                </Link>

                <Link
                  to="/progress"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 transition-colors hover:bg-white/[0.04]"
                  style={{ color: 'var(--c-text-secondary)' }}
                >
                  <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                  <span>Progress Analytics</span>
                </Link>

                {/* Sign Out Action */}
                <div
                  className="pt-1 border-t mt-1"
                  style={{ borderColor: 'var(--c-border)' }}
                >
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left transition-colors text-red-500 hover:bg-red-500/10 font-semibold"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden p-2 rounded-md border transition-colors"
            style={{
              borderColor: 'var(--c-border)',
              background: 'var(--c-surface)',
              color: 'var(--c-text)',
            }}
            aria-label="Toggle mobile menu"
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ===================================================================
          3. MOBILE NAVIGATION DRAWER
         =================================================================== */}
      {mobileOpen && (
        <div
          className="md:hidden border-t px-4 py-3 space-y-1"
          style={{
            background: 'var(--c-bg)',
            borderColor: 'var(--c-border)',
          }}
        >
          {NAV_LINKS.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-md border"
                style={{
                  color: isActive ? 'var(--c-text)' : 'var(--c-text-secondary)',
                  background: isActive ? 'var(--c-surface)' : 'transparent',
                  borderColor: isActive ? 'var(--c-border)' : 'transparent',
                }}
              >
                <span>{link.label}</span>
                {isActive && (
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: 'var(--c-accent)' }}
                  />
                )}
              </Link>
            );
          })}

          <div
            className="pt-2 border-t mt-2 space-y-1"
            style={{ borderColor: 'var(--c-border)' }}
          >
            <button
              onClick={() => {
                setMobileOpen(false);
                handleLogout();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-md text-red-500 hover:bg-red-500/10 transition-colors"
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
