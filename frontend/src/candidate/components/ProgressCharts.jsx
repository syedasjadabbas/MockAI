import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { useTheme } from '../../context/ThemeContext';
import { formatDateOnly } from '../../utils/dateFormat';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler);

const gridColor = (isDark) => (isDark ? 'rgba(148, 163, 184, 0.08)' : 'rgba(100, 116, 139, 0.08)');
const tickColor = (isDark) => (isDark ? '#94a3b8' : '#475569');

// FR36 - Progress Awareness Support: score trend over completed interviews.
export const ScoreTrendChart = ({ data }) => {
  const { isDark } = useTheme();

  const chartData = {
    labels: data.map((d) => formatDateOnly(d.date)),
    datasets: [
      {
        label: 'Overall Score',
        data: data.map((d) => d.score),
        borderColor: 'rgba(99, 102, 241, 1)',
        backgroundColor: 'rgba(99, 102, 241, 0.15)',
        fill: true,
        tension: 0.35,
        pointRadius: 4,
        pointBackgroundColor: 'rgba(99, 102, 241, 1)',
      },
      {
        label: 'Confidence',
        data: data.map((d) => d.confidence),
        borderColor: 'rgba(16, 185, 129, 1)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.35,
        pointRadius: 4,
        pointBackgroundColor: 'rgba(16, 185, 129, 1)',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: tickColor(isDark), font: { size: 11, weight: '600' } } },
    },
    scales: {
      x: { grid: { color: gridColor(isDark) }, ticks: { color: tickColor(isDark) } },
      y: { min: 0, max: 100, grid: { color: gridColor(isDark) }, ticks: { color: tickColor(isDark) } },
    },
  };

  return <div style={{ height: 280 }}><Line data={chartData} options={options} /></div>;
};

// Category breakdown - average score per interview category practiced.
export const CategoryBreakdownChart = ({ data }) => {
  const { isDark } = useTheme();

  const chartData = {
    labels: data.map((d) => d.category),
    datasets: [
      {
        label: 'Average Score',
        data: data.map((d) => d.avgScore),
        backgroundColor: 'rgba(99, 102, 241, 0.75)',
        borderRadius: 8,
        maxBarThickness: 40,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { color: tickColor(isDark), font: { size: 11 } } },
      y: { min: 0, max: 100, grid: { color: gridColor(isDark) }, ticks: { color: tickColor(isDark) } },
    },
  };

  return <div style={{ height: 280 }}><Bar data={chartData} options={options} /></div>;
};
