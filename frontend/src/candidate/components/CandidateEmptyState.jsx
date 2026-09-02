import React from 'react';
import { Inbox } from 'lucide-react';

const CandidateEmptyState = ({ icon: Icon = Inbox, title = 'Nothing here yet', description, actionLabel, onAction }) => (
  <div className="flex flex-col items-center justify-center text-center py-12 px-4">
    <div
      className="w-10 h-10 rounded-md flex items-center justify-center mb-3 border"
      style={{ 
        background: 'var(--c-surface-muted)', 
        borderColor: 'var(--c-border)', 
        color: 'var(--c-text-muted)' 
      }}
    >
      <Icon className="w-5 h-5" />
    </div>
    <h4 className="c-heading text-sm font-bold mb-1" style={{ color: 'var(--c-text)' }}>{title}</h4>
    {description && (
      <p className="text-xs max-w-sm mb-4" style={{ color: 'var(--c-text-secondary)' }}>{description}</p>
    )}
    {actionLabel && onAction && (
      <button onClick={onAction} type="button" className="c-btn c-btn-primary px-4 py-2 text-xs font-semibold rounded-md">
        {actionLabel}
      </button>
    )}
  </div>
);

export default CandidateEmptyState;
