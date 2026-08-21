import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import { useTheme } from '../context/ThemeContext';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement
);

export const ScoreDistributionChart = ({ data }) => {
  const { isDark } = useTheme();

  const chartData = {
    labels: ['High (>=80)', 'Medium (60-79)', 'Low (<60)', 'Not Evaluated'],
    datasets: [
      {
        data: [data?.high || 0, data?.medium || 0, data?.low || 0, data?.none || 0],
        backgroundColor: [
          'rgba(16, 185, 129, 0.85)',
          'rgba(245, 158, 11, 0.85)',
          'rgba(244, 63, 94, 0.85)',
          isDark ? 'rgba(100, 116, 139, 0.7)' : 'rgba(148, 163, 184, 0.7)',
        ],
        borderColor: [
          'rgba(16, 185, 129, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(244, 63, 94, 1)',
          isDark ? 'rgba(100, 116, 139, 1)' : 'rgba(148, 163, 184, 1)',
        ],
        borderWidth: 1.5,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        position: 'right', 
        labels: { 
          color: isDark ? '#cbd5e1' : '#475569', 
          font: { size: 12, weight: '500' },
          padding: 14,
          usePointStyle: true,
          pointStyle: 'circle'
        } 
      },
      tooltip: {
        backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(15, 23, 42, 0.9)',
        titleColor: '#fff',
        bodyColor: '#cbd5e1',
        padding: 12,
        cornerRadius: 10,
        boxPadding: 6,
        displayColors: true,
      }
    },
  };

  return (
    <div className="glass-card p-6 rounded-2xl h-80 flex flex-col hover:border-indigo-500/20 transition-all duration-300">
      <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)] mb-4">
        Score Distribution
      </h3>
      <div className="flex-1 relative flex items-center justify-center pb-2 min-h-0">
        <Pie data={chartData} options={options} />
      </div>
    </div>
  );
};

export const StatusDistributionChart = ({ data }) => {
  const { isDark } = useTheme();

  const chartData = {
    labels: ['Completed', 'In Progress', 'Pending'],
    datasets: [
      {
        label: 'Interviews',
        data: [data?.completed || 0, data?.progress || 0, data?.pending || 0],
        backgroundColor: [
          'rgba(16, 185, 129, 0.85)',
          'rgba(245, 158, 11, 0.85)',
          'rgba(99, 102, 241, 0.85)',
        ],
        borderRadius: { topLeft: 8, topRight: 8 },
        barThickness: 36,
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(15, 23, 42, 0.9)',
        titleColor: '#fff',
        bodyColor: '#cbd5e1',
        padding: 12,
        cornerRadius: 10,
        boxPadding: 6,
        displayColors: false,
      }
    },
    scales: {
      x: { 
        grid: { display: false }, 
        ticks: { color: isDark ? '#94a3b8' : '#64748b', font: { size: 11, weight: '500' } }, 
        border: { display: false } 
      },
      y: { 
        grid: { color: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }, 
        ticks: { color: isDark ? '#94a3b8' : '#64748b', font: { size: 11 } }, 
        border: { display: false } 
      }
    },
  };

  return (
    <div className="glass-card p-6 rounded-2xl h-80 flex flex-col hover:border-indigo-500/20 transition-all duration-300">
      <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)] mb-4">
        Status Distribution
      </h3>
      <div className="flex-1 relative min-h-0">
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
};
