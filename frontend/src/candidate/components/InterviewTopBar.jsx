import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Terminal, Check, X } from 'lucide-react';
import ThemeToggle from '../../components/ThemeToggle';
import { useTheme } from '../../context/ThemeContext';

export const FLOW_STEPS = [
  { key: 'goal', label: 'Goal' },
  { key: 'prepare', label: 'Prepare' },
  { key: 'session', label: 'Interview' },
  { key: 'complete', label: 'Processing' },
  { key: 'results', label: 'Results' },
  { key: 'feedback', label: 'Feedback' },
];

// Minimal top bar for the immersive interview journey (Goal Selection through
// Feedback). Deliberately has no sidebar/nav clutter — this mirrors how a
// real interview tool keeps a candidate focused during the session itself.
const InterviewTopBar = ({ activeStep, onExit }) => {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const activeIndex = FLOW_STEPS.findIndex((s) => s.key === activeStep);

  return (
    <header className="sticky top-0 z-30 glass-panel border-b">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <Link to="/dashboard" className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/30">
            <Terminal className="w-4.5 h-4.5 text-indigo-500" />
          </div>
          <span className="font-extrabold text-lg tracking-tight grad-text hidden sm:inline">MockAI</span>
        </Link>

        <div className="hidden lg:flex items-center gap-1.5 flex-1 min-w-0 justify-center overflow-x-auto">
          {FLOW_STEPS.map((step, idx) => {
            const isDone = idx < activeIndex;
            const isActive = idx === activeIndex;
            return (
              <React.Fragment key={step.key}>
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border ${
                    isDone
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : isActive
                        ? 'border-indigo-500 text-indigo-500'
                        : isDark ? 'border-slate-700 text-slate-500' : 'border-slate-300 text-slate-400'
                  }`}>
                    {isDone ? <Check className="w-3 h-3" /> : idx + 1}
                  </div>
                  <span className={`text-xs font-semibold ${
                    isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'
                  }`}>
                    {step.label}
                  </span>
                </div>
                {idx < FLOW_STEPS.length - 1 && (
                  <div className={`w-6 h-px shrink-0 ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <ThemeToggle />
          <button
            onClick={() => (onExit ? onExit() : navigate('/dashboard'))}
            className="p-2.5 rounded-xl border border-[var(--border-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-all"
            title="Exit to Dashboard"
            aria-label="Exit to Dashboard"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default InterviewTopBar;
