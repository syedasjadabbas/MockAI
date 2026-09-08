import React from 'react';
import { useTheme } from '../context/ThemeContext';

export const Skeleton = ({ className = '', variant = 'text', width, height }) => {
  const { isDark } = useTheme();
  
  const baseBg = isDark 
    ? 'bg-[#202020]' 
    : 'bg-neutral-200/80';

  const style = {};
  if (width) style.width = width;
  if (height) style.height = height;

  return (
    <div 
      className={`animate-pulse rounded-lg ${baseBg} ${className}`}
      style={style}
    />
  );
};

export const TableSkeleton = ({ rows = 5, cols = 5 }) => {
  const { isDark } = useTheme();
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: rows }).map((_, rIdx) => (
        <div key={rIdx} className="flex items-center gap-4 py-3">
          {Array.from({ length: cols }).map((_, cIdx) => (
            <div 
              key={cIdx} 
              className={`h-4 rounded-md animate-pulse ${
                isDark ? 'bg-[#202020]' : 'bg-neutral-200/70'
              } ${cIdx === 0 ? 'w-24' : cIdx === 1 ? 'w-40 flex-1' : 'w-20'}`} 
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export const CardSkeleton = () => {
  const { isDark } = useTheme();
  return (
    <div className={`p-6 rounded-2xl border animate-pulse ${
      isDark ? 'bg-[#202020] border-[#2A2A2A]' : 'bg-white/80 border-[#E5E0D8] shadow-sm'
    }`}>
      <div className="flex items-start justify-between">
        <div className="space-y-2.5">
          <div className={`h-3.5 w-24 rounded ${isDark ? 'bg-[#2A2A2A]' : 'bg-neutral-200'}`} />
          <div className={`h-7 w-32 rounded ${isDark ? 'bg-[#2A2A2A]' : 'bg-neutral-200'}`} />
          <div className={`h-4 w-28 rounded-full ${isDark ? 'bg-[#2A2A2A]/60' : 'bg-neutral-200/60'}`} />
        </div>
        <div className={`w-12 h-12 rounded-xl ${isDark ? 'bg-[#2A2A2A]' : 'bg-neutral-200'}`} />
      </div>
    </div>
  );
};

export default Skeleton;
