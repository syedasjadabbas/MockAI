import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, ArrowRight, LogIn, LayoutDashboard } from 'lucide-react';
import { isAuthenticated, getSession } from '../services/candidateAuth';
import logo from '../../assets/logo.png';

const PUBLIC_NAV_LINKS = [
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Domains', href: '#tracks' },
  { label: 'Evaluation', href: '#evaluation' },
  { label: 'Why MockAI', href: '#why-mockai' },
];

const PublicNav = () => {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const headerRef = useRef(null);
  const authed = isAuthenticated();
  const session = getSession();

  // Track active section on scroll to highlight corresponding nav links
  useEffect(() => {
    const sectionIds = ['how-it-works', 'tracks', 'evaluation', 'why-mockai'];
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 140;
      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const el = document.getElementById(sectionIds[i]);
        if (el) {
          const top = el.offsetTop;
          if (scrollPosition >= top) {
            setActiveSection(sectionIds[i]);
            return;
          }
        }
      }
      if (window.scrollY < 200) {
        setActiveSection('');
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-close mobile drawer on desktop resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close mobile drawer on outside click or Escape key
  useEffect(() => {
    if (!mobileOpen) return;

    const handleClickOutside = (e) => {
      if (headerRef.current && !headerRef.current.contains(e.target)) {
        setMobileOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setMobileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileOpen]);

  const handleScrollTo = (e, href) => {
    e.preventDefault();
    setMobileOpen(false);
    const targetId = href.replace('#', '');
    setActiveSection(targetId);
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-50 border-b backdrop-blur-md transition-colors duration-200"
      style={{
        background: 'var(--c-bg)',
        borderColor: 'var(--c-border)',
      }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* ===================================================================
            1. BRAND IDENTITY
           =================================================================== */}
        <div className="flex items-center gap-8 shrink-0">
          <Link
            to="/"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-2.5 select-none focus:outline-none"
            aria-label="MockAI Home"
          >
            <img
              src={logo}
              alt="MockAI Logo"
              className="h-8 sm:h-9 w-auto object-contain"
            />
          </Link>

          {/* Desktop Public Navigation Links with Active Highlighting */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Public Navigation">
            {PUBLIC_NAV_LINKS.map((link) => {
              const targetId = link.href.replace('#', '');
              const isActive = activeSection === targetId;

              return (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={(e) => handleScrollTo(e, link.href)}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 hover:text-[var(--c-text)] hover:bg-[var(--c-surface-muted)]"
                  style={{
                    color: isActive ? 'var(--c-text)' : 'var(--c-text-secondary)',
                    background: isActive ? 'var(--c-surface-muted)' : 'transparent',
                  }}
                >
                  {isActive && (
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: 'var(--c-accent)' }}
                    />
                  )}
                  <span>{link.label}</span>
                </a>
              );
            })}
          </nav>
        </div>

        {/* ===================================================================
            2. RIGHT UTILITIES (Log In / Dashboard, Start Practicing)
           =================================================================== */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          {authed ? (
            /* Logged in candidate quick dashboard link */
            <Link
              to="/dashboard"
              className="c-btn c-btn-secondary px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-orange-400" />
              <span>Dashboard</span>
            </Link>
          ) : (
            /* Public Visitor Log In */
            <Link
              to="/login"
              className="c-btn c-btn-secondary px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-medium rounded-lg flex items-center gap-1.5 group"
            >
              <LogIn className="w-3.5 h-3.5 text-[var(--c-text-muted)] group-hover:text-[var(--c-text)] transition-colors" />
              <span>Log In</span>
            </Link>
          )}

          {/* Primary CTA */}
          <Link
            to={authed ? '/interview/goal' : '/register'}
            className="c-btn c-btn-primary px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 select-none group"
          >
            <span>Start Practicing</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>

          {/* Mobile Menu Toggle Button: Hidden on desktop via md:!hidden to override .c-btn inline-flex specificity */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="md:!hidden c-btn c-btn-secondary !p-2 !rounded-lg transition-colors"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4 text-[var(--c-text)]" />}
          </button>
        </div>
      </div>

      {/* ===================================================================
          3. MOBILE PUBLIC NAVIGATION DRAWER
         =================================================================== */}
      {mobileOpen && (
        <div
          className="md:hidden border-t px-4 py-4 space-y-2 animate-in slide-in-from-top duration-200"
          style={{
            background: 'var(--c-bg)',
            borderColor: 'var(--c-border)',
          }}
        >
          <div className="space-y-1">
            {PUBLIC_NAV_LINKS.map((link) => {
              const targetId = link.href.replace('#', '');
              const isActive = activeSection === targetId;

              return (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={(e) => handleScrollTo(e, link.href)}
                  className="flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-md transition-colors border"
                  style={{
                    color: isActive ? 'var(--c-text)' : 'var(--c-text-secondary)',
                    background: isActive ? 'var(--c-surface-muted)' : 'transparent',
                    borderColor: isActive ? 'var(--c-border-strong)' : 'transparent',
                  }}
                >
                  <span>{link.label}</span>
                  {isActive && (
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: 'var(--c-accent)' }}
                    />
                  )}
                </a>
              );
            })}
          </div>

          <div className="pt-3 border-t space-y-2" style={{ borderColor: 'var(--c-border)' }}>
            {!authed && (
              <Link
                to="/login"
                onClick={() => setMobileOpen(false)}
                className="c-btn c-btn-secondary w-full py-2 text-xs font-medium rounded-lg flex items-center justify-center gap-2"
              >
                <LogIn className="w-3.5 h-3.5 text-zinc-400" />
                <span>Log In</span>
              </Link>
            )}

            <Link
              to={authed ? '/interview/goal' : '/register'}
              onClick={() => setMobileOpen(false)}
              className="c-btn c-btn-primary w-full py-2.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 select-none group"
            >
              <span>Start Practicing</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};

export default PublicNav;
