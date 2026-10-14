import React from 'react';

export const Skeleton = ({ className = '', variant = 'text', width, height }) => {
  const baseBg = 'bg-[#202020]';

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
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: rows }).map((_, rIdx) => (
        <div key={rIdx} className="flex items-center gap-4 py-3">
          {Array.from({ length: cols }).map((_, cIdx) => (
            <div 
              key={cIdx} 
              className={`h-4 rounded-md animate-pulse bg-[#202020] ${cIdx === 0 ? 'w-24' : cIdx === 1 ? 'w-40 flex-1' : 'w-20'}`} 
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export const CardSkeleton = () => {
  return (
    <div className="p-6 rounded-2xl border animate-pulse bg-[#202020] border-[#2A2A2A]">
      <div className="flex items-start justify-between">
        <div className="space-y-2.5">
          <div className="h-3.5 w-24 rounded bg-[#2A2A2A]" />
          <div className="h-7 w-32 rounded bg-[#2A2A2A]" />
          <div className="h-4 w-28 rounded-full bg-[#2A2A2A]/60" />
        </div>
        <div className="w-12 h-12 rounded-xl bg-[#2A2A2A]" />
      </div>
    </div>
  );
};

export default Skeleton;
