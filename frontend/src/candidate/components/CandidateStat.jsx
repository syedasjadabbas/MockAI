import React from 'react';

const CandidateStat = ({ label, value, icon: Icon, hint }) => (
  <div className="py-2 flex items-start justify-between gap-3">
    <div className="min-w-0">
      <p className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--c-text-muted)' }}>{label}</p>
      <p className="c-serif-num text-2xl sm:text-3xl font-bold" style={{ color: 'var(--c-text)' }}>{value}</p>
      {hint && <p className="text-[11px] mt-1 leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>{hint}</p>}
    </div>
    {Icon && (
      <div
        className="w-8 h-8 rounded flex items-center justify-center shrink-0 border"
        style={{ 
          background: 'var(--c-surface-muted)', 
          borderColor: 'var(--c-border)', 
          color: 'var(--c-text)' 
        }}
      >
        <Icon className="w-4 h-4" />
      </div>
    )}
  </div>
);

export default CandidateStat;
