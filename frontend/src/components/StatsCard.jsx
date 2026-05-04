import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

const StatsCard = ({ title, value, icon: Icon, percentage, trend }) => {
  const isPositive = trend === 'up';

  return (
    <div className="glass-card p-6 rounded-2xl flex items-start justify-between relative overflow-hidden group hover:border-indigo-500/20 hover:shadow-indigo-500/5 transition-all duration-300">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

      {/* Info Section */}
      <div className="relative">
        <p className="text-sm font-medium text-slate-400 mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-white tracking-tight mb-3">{value}</h3>
        
        {/* Trend badges */}
        {percentage && (
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[11px] font-semibold text-slate-500 px-2 py-0.5 rounded-full bg-slate-800/50 border border-slate-700/50">
              Based on current data
            </span>
          </div>
        )}
      </div>

      {/* Icon Section */}
      <div className="relative">
        <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 group-hover:bg-indigo-500/20 transition-all duration-300">
          {Icon && <Icon className="w-6 h-6 text-indigo-400" />}
        </div>
      </div>
    </div>
  );
};

export default StatsCard;
