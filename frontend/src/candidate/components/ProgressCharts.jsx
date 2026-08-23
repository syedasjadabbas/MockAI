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

// Canvas rendering can't resolve CSS custom properties (var(--c-accent)
// means nothing to Chart.js) - these are the literal light/dark values of
// the same candidate design tokens from candidate-theme.css, kept in sync
// by hand since there are only two colors to track here.
const ACCENT = { light: '122, 35, 51', dark: '217, 154, 127' };   // --c-accent
const SUCCESS = { light: '75, 107, 79', dark: '143, 176, 151' };  // --c-success

const gridColor = (isDark) => (isDark ? 'rgba(243, 237, 227, 0.08)' : 'rgba(33, 28, 23, 0.06)');
const tickColor = (isDark) => (isDark ? '#b6a999' : '#6b6055');

// FR36 - Progress Awareness Support: score trend over completed interviews.
export const ScoreTrendChart = ({ data }) => {
  const { isDark } = useTheme();
  const accent = isDark ? ACCENT.dark : ACCENT.light;
  const success = isDark ? SUCCESS.dark : SUCCESS.light;

  const chartData = {
    labels: data.map((d) => formatDateOnly(d.date)),
    datasets: [
      {
        label: 'Overall Score',
        data: data.map((d) => d.score),
        borderColor: `rgba(${accent}, 1)`,
        backgroundColor: `rgba(${accent}, 0.14)`,
        fill: true,
        tension: 0.35,
        pointRadius: 4,
        pointBackgroundColor: `rgba(${accent}, 1)`,
      },
      {
        label: 'Confidence',
        data: data.map((d) => d.confidence),
        borderColor: `rgba(${success}, 1)`,
        backgroundColor: `rgba(${success}, 0.1)`,
        fill: true,
        tension: 0.35,
        pointRadius: 4,
        pointBackgroundColor: `rgba(${success}, 1)`,
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
  const accent = isDark ? ACCENT.dark : ACCENT.light;

  const chartData = {
    labels: data.map((d) => d.category),
    datasets: [
      {
        label: 'Average Score',
        data: data.map((d) => d.avgScore),
        backgroundColor: `rgba(${accent}, 0.8)`,
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
