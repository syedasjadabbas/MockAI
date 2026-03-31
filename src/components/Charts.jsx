import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const activityData = [
  { name: 'Mon', interviews: 24, candidates: 18 },
  { name: 'Tue', interviews: 35, candidates: 28 },
  { name: 'Wed', interviews: 60, candidates: 48 },
  { name: 'Thu', interviews: 42, candidates: 36 },
  { name: 'Fri', interviews: 68, candidates: 54 },
  { name: 'Sat', interviews: 32, candidates: 24 },
  { name: 'Sun', interviews: 20, candidates: 14 },
];

const growthData = [
  { name: 'Jan', users: 120 },
  { name: 'Feb', users: 240 },
  { name: 'Mar', users: 380 },
  { name: 'Apr', users: 512 },
  { name: 'May', users: 760 },
  { name: 'Jun', users: 920 },
];

export const InterviewActivityChart = () => {
  return (
    <div className="glass-card p-6 rounded-2xl h-80 flex flex-col hover:border-indigo-500/10 transition-all duration-300">
      <h3 className="text-lg font-semibold text-white mb-4">Interview Activity</h3>
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={activityData}>
            <defs>
              <linearGradient id="colorInterviews" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="name" stroke="#4b5563" fontSize={12} tickLine={false} />
            <YAxis stroke="#4b5563" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip 
              contentStyle={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px' }} 
              labelStyle={{ color: '#fff', fontWeight: 600 }}
              itemStyle={{ color: '#818cf8' }}
            />
            <Area type="monotone" dataKey="interviews" stroke="#6366f1" fillOpacity={1} fill="url(#colorInterviews)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export const UserGrowthChart = () => {
  return (
    <div className="glass-card p-6 rounded-2xl h-80 flex flex-col hover:border-indigo-500/10 transition-all duration-300">
      <h3 className="text-lg font-semibold text-white mb-4">User Growth</h3>
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={growthData}>
            <XAxis dataKey="name" stroke="#4b5563" fontSize={12} tickLine={false} />
            <YAxis stroke="#4b5563" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip 
              contentStyle={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px' }} 
              labelStyle={{ color: '#fff', fontWeight: 600 }}
              itemStyle={{ color: '#a78bfa' }}
            />
            <Bar dataKey="users" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
