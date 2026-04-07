import React, { useRef, useEffect, useState } from 'react';
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
  Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

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
  const chartRef = useRef(null);
  const [chartData, setChartData] = useState({
    labels: activityData.map(d => d.name),
    datasets: []
  });

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const ctx = chart.ctx;
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.4)');
    gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');

    setChartData({
      labels: activityData.map(d => d.name),
      datasets: [
        {
          label: 'Interviews',
          data: activityData.map(d => d.interviews),
          borderColor: '#6366f1',
          backgroundColor: gradient,
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
        }
      ]
    });
  }, []);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        borderColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        titleColor: '#fff',
        bodyColor: '#818cf8',
        padding: 10,
        displayColors: false,
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#4b5563', font: { size: 12 } },
        border: { display: false }
      },
      y: {
        grid: { display: false },
        ticks: { color: '#4b5563', font: { size: 12 } },
        border: { display: false }
      }
    },
    interaction: {
      mode: 'index',
      intersect: false,
    },
  };

  return (
    <div className="glass-card p-6 rounded-2xl h-80 flex flex-col hover:border-indigo-500/10 transition-all duration-300">
      <h3 className="text-lg font-semibold text-white mb-4">Interview Activity</h3>
      <div className="flex-1 relative">
        <Line ref={chartRef} data={chartData} options={options} />
      </div>
    </div>
  );
};

export const UserGrowthChart = () => {
  const data = {
    labels: growthData.map(d => d.name),
    datasets: [
      {
        label: 'Users',
        data: growthData.map(d => d.users),
        backgroundColor: '#8b5cf6',
        borderRadius: { topLeft: 6, topRight: 6 },
        barThickness: 24,
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        borderColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        titleColor: '#fff',
        bodyColor: '#a78bfa',
        padding: 10,
        displayColors: false,
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#4b5563', font: { size: 12 } },
        border: { display: false }
      },
      y: {
        grid: { display: false },
        ticks: { color: '#4b5563', font: { size: 12 } },
        border: { display: false }
      }
    },
    interaction: {
      mode: 'index',
      intersect: false,
    },
  };

  return (
    <div className="glass-card p-6 rounded-2xl h-80 flex flex-col hover:border-indigo-500/10 transition-all duration-300">
      <h3 className="text-lg font-semibold text-white mb-4">User Growth</h3>
      <div className="flex-1 relative">
        <Bar data={data} options={options} />
      </div>
    </div>
  );
};
