import React from 'react';
import { Inbox } from 'lucide-react';

// Local replacement for the shared src/components/EmptyState.jsx (also
// used by Admin, hardcodes indigo). Same shape, candidate palette.
const CandidateEmptyState = ({ icon: Icon = Inbox, title = 'Nothing here yet', description, actionLabel, onAction }) => (
  <div className="flex flex-col items-center justify-center text-center py-14 px-4">
    <div
      className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
      style={{ background: 'var(--c-surface-muted)', color: 'var(--c-text-muted)' }}
    >
      <Icon className="w-7 h-7" />
    </div>
    <h4 className="c-heading text-base mb-1.5">{title}</h4>
    {description && (
      <p className="text-sm max-w-sm mb-5" style={{ color: 'var(--c-text-secondary)' }}>{description}</p>
    )}
    {actionLabel && onAction && (
      <button onClick={onAction} type="button" className="c-btn c-btn-primary px-4 py-2 text-xs">
        {actionLabel}
      </button>
    )}
  </div>
);

export default CandidateEmptyState;
