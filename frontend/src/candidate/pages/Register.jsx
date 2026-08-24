import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User as UserIcon, AlertCircle, Eye, EyeOff } from 'lucide-react';
import ThemeToggle from '../../components/ThemeToggle';
import { register } from '../services/candidateAuth';
import AuthVisualPanel from '../components/AuthVisualPanel';

// FR01 - User Registration
const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await register({ name, email, password });
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[1.2fr_1fr]">
      <AuthVisualPanel />

      <div className="flex items-center justify-center px-4 sm:px-8 py-12 relative">
        <div className="absolute top-6 right-6">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-sm">
          <p className="c-eyebrow mb-3 lg:hidden">MockAI</p>
          <h2 className="c-heading text-3xl mb-1.5">Create your account</h2>
          <p className="text-sm mb-8" style={{ color: 'var(--c-text-secondary)' }}>
            Start practicing interviews and tracking your progress.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="c-label block mb-1.5">Full Name</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--c-text-muted)' }} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                  required
                  className="c-input w-full pl-10 pr-4 py-2.5 rounded-xl text-sm"
                />
              </div>
            </div>

            <div>
              <label className="c-label block mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--c-text-muted)' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@example.com"
                  required
                  className="c-input w-full pl-10 pr-4 py-2.5 rounded-xl text-sm"
                />
              </div>
            </div>

            <div>
              <label className="c-label block mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--c-text-muted)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  className="c-input w-full pl-10 pr-11 py-2.5 rounded-xl text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--c-text-muted)' }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="c-label block mb-1.5">Confirm Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--c-text-muted)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  required
                  className="c-input w-full pl-10 pr-4 py-2.5 rounded-xl text-sm"
                />
              </div>
            </div>

            {error && (
              <div className="c-badge-danger rounded-xl px-3.5 py-3 flex items-center gap-2 text-xs font-semibold w-full">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="c-btn c-btn-cta w-full py-2.5 mt-2">
              {loading ? <span className="w-4.5 h-4.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Create Account'}
            </button>
          </form>

          <p className="text-sm mt-7 text-center" style={{ color: 'var(--c-text-secondary)' }}>
            Already have an account?{' '}
            <Link to="/login" className="font-semibold" style={{ color: 'var(--c-accent)' }}>
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
