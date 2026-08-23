import React from 'react';

// Local replacement for the shared src/components/StatsCard.jsx - that
// component is also used by the Admin Panel and hardcodes indigo, so it
// can't pick up the Candidate Panel's own accent without touching Admin.
// This is the same idea (label, big number, subtitle, icon) restyled with
// the candidate design tokens.
const CandidateStat = ({ label, value, icon: Icon, hint }) => (
  <div className="c-card rounded-2xl p-5 flex items-start justify-between gap-4">
    <div className="min-w-0">
      <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--c-text-secondary)' }}>{label}</p>
      <p className="c-serif-num text-3xl">{value}</p>
      {hint && <p className="text-xs mt-1.5" style={{ color: 'var(--c-text-muted)' }}>{hint}</p>}
    </div>
    {Icon && (
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: 'var(--c-accent-soft)', color: 'var(--c-accent)' }}
      >
        <Icon className="w-5 h-5" />
      </div>
    )}
  </div>
);

export default CandidateStat;
