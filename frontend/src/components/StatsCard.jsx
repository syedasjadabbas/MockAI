import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const StatsCard = ({ title, value, icon: Icon, percentage, trend }) => {
  const isPositive = trend === 'up';
  const { isDark } = useTheme();

  return (
    <div className="glass-card p-6 rounded-2xl flex items-start justify-between relative overflow-hidden group hover:scale-[1.01] hover:shadow-lg transition-all duration-300">
      {/* Subtle Background Glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      {/* Info Section */}
      <div className="relative z-10">
        <p className="text-xs sm:text-sm font-medium text-[var(--text-secondary)] mb-1">{title}</p>
        <h3 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight mb-2">
          {value}
        </h3>
        
        {/* Trend badges */}
        {percentage && (
          <div className="flex items-center gap-1.5 mt-1">
            <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
              isPositive 
                ? isDark 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : isDark
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {percentage}
            </span>
            <span className="text-[11px] font-medium text-[var(--text-muted)]">
              vs last month
            </span>
          </div>
        )}
      </div>

      {/* Icon Section */}
      <div className="relative z-10">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all duration-300 ${
          isDark 
            ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400 group-hover:bg-indigo-500/20 group-hover:scale-105' 
            : 'bg-indigo-50 border-indigo-100 text-indigo-600 group-hover:bg-indigo-100 group-hover:scale-105 shadow-sm'
        }`}>
          {Icon && <Icon className="w-6 h-6" />}
        </div>
      </div>
    </div>
  );
};

export default StatsCard;
