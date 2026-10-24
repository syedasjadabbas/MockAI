import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import logo from '../../assets/logo.png';
import { isAuthenticated } from '../services/candidateAuth';

const NotFound = () => {
  const signedIn = isAuthenticated();

  return (
    <div className="candidate-app min-h-screen flex flex-col" style={{ background: 'var(--c-bg)' }}>
      <header className="c-page h-16 flex items-center">
        <Link to="/" aria-label="MockAI Home" className="shrink-0 select-none">
          <img src={logo} alt="MockAI Logo" className="c-brand-logo" />
        </Link>
      </header>

      <main className="c-page flex-1 flex flex-col justify-center py-16">
        <p className="c-serif-num text-6xl sm:text-7xl font-bold" style={{ color: 'var(--c-accent)' }}>404</p>
        <h1 className="c-heading text-2xl sm:text-3xl font-bold mt-4" style={{ color: 'var(--c-text)' }}>
          This page doesn't exist.
        </h1>
        <p className="text-sm mt-2 max-w-md" style={{ color: 'var(--c-text-secondary)' }}>
          The link may be old or mistyped. Head back and carry on from there.
        </p>
        <div className="flex flex-wrap gap-3 mt-8">
          <Link
            to={signedIn ? '/dashboard' : '/'}
            className="c-btn c-btn-primary px-5 py-2.5 text-sm font-semibold rounded-md flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {signedIn ? 'Back to dashboard' : 'Back to home'}
          </Link>
          {!signedIn && (
            <Link to="/login" className="c-btn c-btn-secondary px-5 py-2.5 text-sm font-semibold rounded-md">
              Sign in
            </Link>
          )}
        </div>
      </main>
    </div>
  );
};

export default NotFound;
