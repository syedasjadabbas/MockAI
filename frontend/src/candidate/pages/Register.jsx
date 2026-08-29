import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User as UserIcon, AlertCircle, Eye, EyeOff } from 'lucide-react';
import ThemeToggle from '../../components/ThemeToggle';
import { register } from '../services/candidateAuth';
import AuthVisualPanel from '../components/AuthVisualPanel';
import workspaceBg from '../../assets/workspace_bg.jpg';
import logo from '../../assets/logo.png';

const GoogleIcon = () => (
  <svg className="w-4 h-4 mr-2.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
  </svg>
);

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

      {/* Form column with workspace background */}
      <div 
        className="flex items-center justify-center px-6 sm:px-10 py-16 relative bg-cover bg-center"
        style={{ backgroundImage: `url(${workspaceBg})` }}
      >
        {/* Dynamic Dark/Warm Theme Matching Overlay */}
        <div className="absolute inset-0 bg-[var(--c-bg)]/90 sm:bg-[var(--c-bg)]/88 backdrop-blur-[1px] transition-colors duration-300 pointer-events-none" />

        <div className="absolute top-6 right-6 z-20">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-[26rem] px-2 sm:px-4 relative z-10">
          {/* Elegant Mobile Logo */}
          <div className="mb-4 lg:hidden select-none">
            <img src={logo} alt="MockAI Logo" className="h-12 w-auto object-contain" />
          </div>
          
          <h2 className="c-heading text-3xl mb-1.5">Create your account</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--c-text-secondary)' }}>
            Start practicing interviews and tracking your progress.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="c-label block mb-1.5">Full Name</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--c-text-muted)' }} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                  required
                  className="c-input w-full pl-11 pr-4 py-3 rounded-xl text-sm"
                />
              </div>
            </div>

            <div>
              <label className="c-label block mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--c-text-muted)' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@example.com"
                  required
                  className="c-input w-full pl-11 pr-4 py-3 rounded-xl text-sm"
                />
              </div>
            </div>

            <div>
              <label className="c-label block mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--c-text-muted)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  className="c-input w-full pl-11 pr-11 py-3 rounded-xl text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2"
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
                <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--c-text-muted)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  required
                  className="c-input w-full pl-11 pr-4 py-3 rounded-xl text-sm"
                />
              </div>
            </div>

            {error && (
              <div className="c-badge-danger rounded-xl px-3.5 py-3 flex items-center gap-2 text-xs font-semibold w-full">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="c-btn c-btn-cta w-full py-3 mt-2">
              {loading ? <span className="w-4.5 h-4.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Create Account'}
            </button>
          </form>

          {/* OR Divider */}
          <div className="flex items-center my-5 select-none">
            <div className="flex-1 border-t" style={{ borderColor: 'var(--c-input-border)' }} />
            <span className="px-3.5 text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--c-text-muted)' }}>or</span>
            <div className="flex-1 border-t" style={{ borderColor: 'var(--c-input-border)' }} />
          </div>

          {/* Continue with Google button */}
          <button
            type="button"
            onClick={() => setError('Google sign-up is not configured yet. Please use email and password.')}
            className="w-full flex items-center justify-center py-3 px-4 rounded-xl text-sm font-semibold border transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
            style={{
              backgroundColor: 'var(--c-input-bg)',
              borderColor: 'var(--c-input-border)',
              color: 'var(--c-text)'
            }}
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <p className="text-sm mt-7 text-center" style={{ color: 'var(--c-text-secondary)' }}>
            Already have an account?{' '}
            <Link to="/login" className="font-semibold hover:opacity-85 transition-opacity" style={{ color: 'var(--c-accent)' }}>
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
