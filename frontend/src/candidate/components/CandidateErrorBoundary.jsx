import React from 'react';
import { AlertCircle, RotateCcw, LayoutDashboard } from 'lucide-react';
import { Link } from 'react-router-dom';

class CandidateErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Candidate portal caught exception:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <div
            className="max-w-md w-full p-6 rounded-lg border space-y-4 text-center"
            style={{
              background: 'var(--c-surface, #181B20)',
              borderColor: 'var(--c-border, rgba(255, 255, 255, 0.1))',
              color: 'var(--c-text, #F1F5F9)',
            }}
          >
            <div
              className="w-12 h-12 rounded-full mx-auto flex items-center justify-center border"
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                borderColor: 'rgba(239, 68, 68, 0.3)',
                color: '#EF4444',
              }}
            >
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-bold">Something went wrong</h2>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--c-text-secondary, #94A3B8)' }}>
                An unexpected interface error occurred. You can refresh the view or navigate back to the dashboard.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                className="px-4 py-2 rounded text-xs font-bold flex items-center gap-1.5 transition-colors"
                style={{
                  background: 'var(--c-accent, #FF6B35)',
                  color: '#FFFFFF',
                }}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reload Page</span>
              </button>

              <Link
                to="/dashboard"
                onClick={() => this.setState({ hasError: false, error: null })}
                className="px-4 py-2 rounded text-xs font-semibold flex items-center gap-1.5 border transition-colors"
                style={{
                  background: 'transparent',
                  borderColor: 'var(--c-border, rgba(255, 255, 255, 0.1))',
                  color: 'var(--c-text, #F1F5F9)',
                }}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default CandidateErrorBoundary;
