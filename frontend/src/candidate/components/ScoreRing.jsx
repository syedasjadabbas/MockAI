import React from 'react';

const TONE_VAR = {
  accent: '--c-accent',
  success: '--c-success',
  warning: '--c-warning',
  danger: '--c-danger',
};

// Circular score gauge used on Dashboard and Evaluation Results (FR18-FR20, FR25).
// Purely presentational - takes whatever number it's given, real or mock.
const ScoreRing = ({ value = 0, label, size = 128, strokeWidth = 10, tone = 'accent', suffix = '' }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const hasValue = value !== null && value !== undefined;
  const clamped = Math.max(0, Math.min(100, hasValue ? value : 0));
  const offset = circumference - (clamped / 100) * circumference;
  const colorVar = `var(${TONE_VAR[tone] || TONE_VAR.accent})`;

  return (
    <div className="flex flex-col items-center gap-2.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            stroke="var(--c-border)"
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            fill="none"
            stroke={colorVar}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="c-serif-num text-2xl">
            {hasValue ? `${value}${suffix}` : '—'}
          </span>
        </div>
      </div>
      {label && <p className="text-xs sm:text-sm font-semibold text-center" style={{ color: 'var(--c-text-secondary)' }}>{label}</p>}
    </div>
  );
};

export default ScoreRing;
