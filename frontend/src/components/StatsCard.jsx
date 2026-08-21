import React from 'react';
import { useTheme } from '../context/ThemeContext';

const StatsCard = ({ title, value, icon: Icon, subtitle }) => {
  const { isDark } = useTheme();

  return (
    <div className="glass-card p-6 rounded-2xl flex items-start justify-between relative overflow-hidden group hover:shadow-md transition-all duration-200">
      {/* Info Section */}
      <div className="relative z-10">
        <p className="text-xs sm:text-sm font-medium text-[var(--text-secondary)] mb-1">{title}</p>
        <h3 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
          {value}
        </h3>
        {subtitle && (
          <p className="text-[11px] font-medium text-[var(--text-muted)] mt-1.5">{subtitle}</p>
        )}
      </div>

      {/* Icon Section */}
      <div className="relative z-10">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all duration-200 ${
          isDark 
            ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' 
            : 'bg-indigo-50 border-indigo-100 text-indigo-600 shadow-sm'
        }`}>
          {Icon && <Icon className="w-6 h-6" />}
        </div>
      </div>
    </div>
  );
};

export default StatsCard;
