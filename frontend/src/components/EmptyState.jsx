import React from 'react';
import { Inbox } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const EmptyState = ({ 
  icon: Icon = Inbox, 
  title = 'No Data Found', 
  description = 'There are no records matching your criteria.', 
  actionLabel, 
  onAction,
  className = ''
}) => {
  const { isDark } = useTheme();

  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 border transition-colors ${
        isDark 
          ? 'bg-slate-800/40 border-slate-700/50 text-slate-400' 
          : 'bg-slate-100 border-slate-200 text-slate-500'
      }`}>
        <Icon className="w-7 h-7" />
      </div>
      <h4 className={`text-base font-semibold mb-1 ${
        isDark ? 'text-slate-200' : 'text-slate-800'
      }`}>
        {title}
      </h4>
      <p className={`text-sm max-w-sm mb-5 ${
        isDark ? 'text-slate-400' : 'text-slate-500'
      }`}>
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          type="button"
          className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-500/20 transition-all active:scale-[0.98]"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
