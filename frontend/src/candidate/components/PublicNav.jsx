import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, ArrowRight, LogIn, LayoutDashboard } from 'lucide-react';
import { isAuthenticated } from '../services/candidateAuth';
import logo from '../../assets/logo.png';

// Same order as the sections on the homepage.
const PUBLIC_NAV_LINKS = [
  { label: 'How it works', id: 'how-it-works' },
  { label: 'Feedback', id: 'evaluation' },
  { label: 'Fields', id: 'tracks' },
  { label: 'Why MockAI', id: 'why-mockai' },
  { label: 'FAQ', id: 'faq' },
];

const PublicNav = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const headerRef = useRef(null);
  const authed = isAuthenticated();
  const ctaTo = authed ? '/interview/goal' : '/register';

  // Glass background once the page scrolls, reading progress, and the
  // section currently in view (the last one whose top has passed the bar).
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 8);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, y / max) : 0);
      let current = '';
      for (const { id } of PUBLIC_NAV_LINKS) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 120) current = id;
      }
      // At the very bottom the last section may be too short to reach the bar.
      if (max > 0 && y >= max - 4) current = PUBLIC_NAV_LINKS[PUBLIC_NAV_LINKS.length - 1].id;
      setActiveSection(current);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 1024) setMobileOpen(false); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return undefined;
    const onClick = (e) => { if (headerRef.current && !headerRef.current.contains(e.target)) setMobileOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setMobileOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey); };
  }, [mobileOpen]);

  const goTo = (e, id) => {
    e.preventDefault();
    setMobileOpen(false);
    const target = document.getElementById(id);
    if (target) {
      const top = target.getBoundingClientRect().top + window.scrollY - 64;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  const solid = scrolled || mobileOpen;

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-50 transition-[background-color,box-shadow,border-color] duration-300"
      style={{
        background: solid ? 'rgba(17, 17, 17, 0.82)' : 'transparent',
        backdropFilter: solid ? 'blur(14px) saturate(140%)' : 'none',
        WebkitBackdropFilter: solid ? 'blur(14px) saturate(140%)' : 'none',
        borderBottom: `1px solid ${solid ? 'var(--c-border)' : 'transparent'}`,
        boxShadow: solid ? '0 8px 24px rgba(0, 0, 0, 0.35)' : 'none',
      }}
    >
      <div className={`c-page flex items-center justify-between gap-4 transition-[height] duration-300 ${scrolled ? 'h-16' : 'h-[72px]'}`}>
        <Link
          to="/"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex items-center shrink-0 select-none focus:outline-none"
          aria-label="MockAI home"
        >
          <img src={logo} alt="MockAI" className="h-9 sm:h-10 w-auto object-contain" />
        </Link>

        {/* Desktop links, centred */}
        <nav className="hidden lg:flex items-center gap-1 absolute left-1/2 -translate-x-1/2" aria-label="Page sections">
          {PUBLIC_NAV_LINKS.map(({ label, id }) => {
            const active = activeSection === id;
            return (
              <a
                key={id}
                href={`#${id}`}
                onClick={(e) => goTo(e, id)}
                aria-current={active ? 'true' : undefined}
                className="relative px-3.5 py-2 text-sm font-medium transition-colors hover:text-[var(--c-text)]"
                style={{ color: active ? 'var(--c-text)' : 'var(--c-text-secondary)' }}
              >
                {label}
                <span
                  className="absolute left-3.5 right-3.5 -bottom-0.5 h-0.5 rounded-full transition-all duration-300"
                  style={{ background: 'var(--c-accent)', opacity: active ? 1 : 0, transform: active ? 'scaleX(1)' : 'scaleX(0.4)' }}
                  aria-hidden="true"
                />
              </a>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {authed ? (
            <Link to="/dashboard" className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors hover:text-[var(--c-text)]" style={{ color: 'var(--c-text-secondary)' }}>
              <LayoutDashboard className="w-4 h-4" /> Dashboard
            </Link>
          ) : (
            <Link to="/login" className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors hover:text-[var(--c-text)]" style={{ color: 'var(--c-text-secondary)' }}>
              <LogIn className="w-4 h-4" /> Log in
            </Link>
          )}
          <Link to={ctaTo} className="c-btn c-btn-primary max-sm:!hidden px-4 py-2.5 text-sm font-semibold rounded-lg flex items-center gap-1.5 select-none group">
            Start practising
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="lg:!hidden c-btn c-btn-secondary !p-0 h-10 w-10 !rounded-lg"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Reading progress */}
      <div className="absolute left-0 bottom-0 h-0.5 transition-opacity duration-300" aria-hidden="true"
        style={{ width: `${progress * 100}%`, background: 'var(--c-accent)', opacity: scrolled ? 1 : 0 }} />

      {/* Phone menu */}
      {mobileOpen && (
        <div className="lg:hidden border-t px-4 py-4 space-y-1" style={{ borderColor: 'var(--c-border)' }}>
          {PUBLIC_NAV_LINKS.map(({ label, id }) => {
            const active = activeSection === id;
            return (
              <a
                key={id}
                href={`#${id}`}
                onClick={(e) => goTo(e, id)}
                className="flex items-center justify-between px-3 py-3 text-base font-medium rounded-lg"
                style={{ color: active ? 'var(--c-text)' : 'var(--c-text-secondary)', background: active ? 'var(--c-surface-muted)' : 'transparent' }}
              >
                {label}
                {active && <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--c-accent)' }} />}
              </a>
            );
          })}
          <div className="pt-3 mt-2 border-t grid grid-cols-2 gap-2" style={{ borderColor: 'var(--c-border)' }}>
            <Link
              to={authed ? '/dashboard' : '/login'}
              onClick={() => setMobileOpen(false)}
              className="c-btn c-btn-secondary py-3 text-sm font-medium rounded-lg flex items-center justify-center gap-2"
            >
              {authed ? <><LayoutDashboard className="w-4 h-4" /> Dashboard</> : <><LogIn className="w-4 h-4" /> Log in</>}
            </Link>
            <Link to={ctaTo} onClick={() => setMobileOpen(false)} className="c-btn c-btn-primary py-3 text-sm font-semibold rounded-lg flex items-center justify-center gap-2">
              Start practising <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};

export default PublicNav;
