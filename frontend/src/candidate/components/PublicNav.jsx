import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, Plus, ArrowRight, LogIn, LayoutDashboard } from 'lucide-react';
import ThemeToggle from '../../components/ThemeToggle';
import { isAuthenticated, getSession } from '../services/candidateAuth';
import logo from '../../assets/logo.png';

const PUBLIC_NAV_LINKS = [
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Evaluation', href: '#evaluation' },
  { label: 'Why MockAI', href: '#why-mockai' },
];

const PublicNav = () => {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const authed = isAuthenticated();
  const session = getSession();

  const handleScrollTo = (e, href) => {
    e.preventDefault();
    setMobileOpen(false);
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <header
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

          {/* Desktop Public Navigation Links */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Public Navigation">
            {PUBLIC_NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => handleScrollTo(e, link.href)}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors hover:text-white"
                style={{
                  color: 'var(--c-text-secondary)',
                }}
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        {/* ===================================================================
            2. RIGHT UTILITIES (Log In / Dashboard, Start Practicing, Theme)
           =================================================================== */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <ThemeToggle className="!p-2 !rounded-md !border-[var(--c-border)] !bg-[var(--c-surface)] hover:!bg-[var(--c-surface-muted)]" />

          {authed ? (
            /* Logged in candidate quick dashboard link */
            <Link
              to="/dashboard"
              className="c-btn c-btn-secondary px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-semibold rounded-md flex items-center gap-1.5 border"
              style={{
                background: 'var(--c-surface)',
                borderColor: 'var(--c-border)',
                color: 'var(--c-text)',
              }}
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-[#FF6B35]" />
              <span>Dashboard</span>
            </Link>
          ) : (
            /* Public Visitor Log In */
            <Link
              to="/login"
              className="px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-semibold rounded-md transition-colors border flex items-center gap-1.5"
              style={{
                borderColor: 'var(--c-border)',
                background: 'var(--c-surface)',
                color: 'var(--c-text)',
              }}
            >
              <LogIn className="w-3.5 h-3.5 text-[#A3A3A3]" />
              <span>Log In</span>
            </Link>
          )}

          {/* Solid Orange Primary CTA */}
          <Link
            to={authed ? '/interview/goal' : '/register'}
            className="c-btn c-btn-primary px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs font-bold rounded-md flex items-center gap-1.5 transition-all select-none shadow-sm"
            style={{
              background: 'var(--c-accent)',
              color: 'var(--c-on-accent)',
            }}
          >
            <span>Start Practicing</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden p-2 rounded-md border transition-colors"
            style={{
              borderColor: 'var(--c-border)',
              background: 'var(--c-surface)',
              color: 'var(--c-text)',
            }}
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
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
            {PUBLIC_NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => handleScrollTo(e, link.href)}
                className="block px-3 py-2 text-xs font-semibold rounded-md text-[#A3A3A3] hover:text-white hover:bg-[#202020] transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="pt-3 border-t space-y-2" style={{ borderColor: 'var(--c-border)' }}>
            {!authed && (
              <Link
                to="/login"
                onClick={() => setMobileOpen(false)}
                className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-md border text-[#F5F5F5]"
                style={{
                  borderColor: 'var(--c-border)',
                  background: 'var(--c-surface)',
                }}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Log In</span>
              </Link>
            )}

            <Link
              to={authed ? '/interview/goal' : '/register'}
              onClick={() => setMobileOpen(false)}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-md text-white shadow-md select-none"
              style={{ background: 'var(--c-accent)' }}
            >
              <span>Start Practicing</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};

export default PublicNav;
