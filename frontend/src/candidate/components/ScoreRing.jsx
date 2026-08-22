import React from 'react';
import { useTheme } from '../../context/ThemeContext';

// Circular score gauge used on Dashboard and Evaluation Results (FR18-FR20, FR25).
// Purely presentational — takes whatever number it's given, real or mock.
const ScoreRing = ({ value = 0, label, size = 128, strokeWidth = 10, colorClass = 'text-indigo-500', suffix = '' }) => {
  const { isDark } = useTheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            className={isDark ? 'stroke-slate-800' : 'stroke-slate-200'}
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
            className={`${colorClass} transition-all duration-700 ease-out`}
            stroke="currentColor"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">
            {value === null || value === undefined ? '—' : `${value}${suffix}`}
          </span>
        </div>
      </div>
      {label && <p className="text-xs sm:text-sm font-semibold text-[var(--text-secondary)] text-center">{label}</p>}
    </div>
  );
};

export default ScoreRing;
