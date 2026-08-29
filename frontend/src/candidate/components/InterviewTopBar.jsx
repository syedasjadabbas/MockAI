import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import ThemeToggle from '../../components/ThemeToggle';
import logo from '../../assets/logo.png';

export const FLOW_STEPS = [
  { key: 'goal', label: 'Goal' },
  { key: 'prepare', label: 'Prepare' },
  { key: 'session', label: 'Interview' },
  { key: 'complete', label: 'Processing' },
  { key: 'results', label: 'Results' },
  { key: 'feedback', label: 'Feedback' },
];

// Minimal top bar for the immersive interview journey (Goal Selection
// through Feedback). Deliberately has no nav/menu clutter - this mirrors
// how a real interview tool keeps a candidate focused during the session.
const InterviewTopBar = ({ activeStep, onExit }) => {
  const navigate = useNavigate();
  const activeIndex = FLOW_STEPS.findIndex((s) => s.key === activeStep);

  return (
    <header className="sticky top-0 z-30 c-panel">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <Link 
          to="/dashboard" 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} 
          className="shrink-0 flex items-center select-none hover:opacity-95 transition-opacity"
        >
          <img src={logo} alt="MockAI Logo" className="h-10 w-auto object-contain" />
        </Link>

        <div className="hidden lg:flex items-center gap-1.5 flex-1 min-w-0 justify-center overflow-x-auto">
          {FLOW_STEPS.map((step, idx) => {
            const isDone = idx < activeIndex;
            const isActive = idx === activeIndex;
            return (
              <React.Fragment key={step.key}>
                <div className="flex items-center gap-1.5 shrink-0">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border"
                    style={{
                      background: isDone ? 'var(--c-accent)' : 'transparent',
                      borderColor: isDone ? 'var(--c-accent)' : isActive ? 'var(--c-accent)' : 'var(--c-border-strong)',
                      color: isDone ? 'var(--c-on-accent)' : isActive ? 'var(--c-accent)' : 'var(--c-text-muted)',
                    }}
                  >
                    {isDone ? <Check className="w-3 h-3" /> : idx + 1}
                  </div>
                  <span
                    className="text-xs font-semibold"
                    style={{ color: isActive ? 'var(--c-text)' : 'var(--c-text-muted)' }}
                  >
                    {step.label}
                  </span>
                </div>
                {idx < FLOW_STEPS.length - 1 && (
                  <div className="w-6 h-px shrink-0" style={{ background: 'var(--c-border)' }} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <ThemeToggle />
          <button
            onClick={() => (onExit ? onExit() : navigate('/dashboard'))}
            className="c-btn c-btn-secondary p-2.5"
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
