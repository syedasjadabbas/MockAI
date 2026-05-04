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
  const chartData = {
    labels: ['High (>=80)', 'Medium (60-79)', 'Low (<60)', 'Not Evaluated'],
    datasets: [
      {
        data: [data?.high || 0, data?.medium || 0, data?.low || 0, data?.none || 0],
        backgroundColor: [
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(244, 63, 94, 0.8)',
          'rgba(100, 116, 139, 0.8)',
        ],
        borderColor: [
          'rgba(16, 185, 129, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(244, 63, 94, 1)',
          'rgba(100, 116, 139, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'right', labels: { color: '#cbd5e1', font: { size: 11 } } },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleColor: '#fff',
        bodyColor: '#cbd5e1',
        padding: 10,
        displayColors: true,
      }
    },
  };

  return (
    <div className="glass-card p-6 rounded-2xl h-80 flex flex-col hover:border-indigo-500/10 transition-all duration-300">
      <h3 className="text-lg font-semibold text-white mb-4">Score Distribution</h3>
      <div className="flex-1 relative flex items-center justify-center pb-2">
        <Pie data={chartData} options={options} />
      </div>
    </div>
  );
};

export const StatusDistributionChart = ({ data }) => {
  const chartData = {
    labels: ['Completed', 'In Progress', 'Pending'],
    datasets: [
      {
        label: 'Interviews',
        data: [data?.completed || 0, data?.progress || 0, data?.pending || 0],
        backgroundColor: [
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(99, 102, 241, 0.8)',
        ],
        borderRadius: { topLeft: 6, topRight: 6 },
        barThickness: 40,
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleColor: '#fff',
        bodyColor: '#cbd5e1',
        padding: 10,
        displayColors: false,
      }
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#94a3b8' }, border: { display: false } },
      y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' }, border: { display: false } }
    },
  };

  return (
    <div className="glass-card p-6 rounded-2xl h-80 flex flex-col hover:border-indigo-500/10 transition-all duration-300">
      <h3 className="text-lg font-semibold text-white mb-4">Status Distribution</h3>
      <div className="flex-1 relative">
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
};
