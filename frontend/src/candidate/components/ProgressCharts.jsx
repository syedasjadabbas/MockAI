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

// Solid Electric Blue (#0066FF) & Solid Emerald (#10B981) tokens
const ACCENT = '0, 102, 255';
const SUCCESS = '16, 185, 129';

const gridColor = () => '#243044';
const tickColor = () => '#94A3B8';

// Progress Awareness Support: score trend over completed interviews.
export const ScoreTrendChart = ({ data }) => {
  const { isDark } = useTheme();

  const chartData = {
    labels: data.map((d) => formatDateOnly(d.date)),
    datasets: [
      {
        label: 'Overall Score',
        data: data.map((d) => d.score),
        borderColor: `rgba(${ACCENT}, 1)`,
        backgroundColor: `rgba(${ACCENT}, 0.1)`,
        fill: true,
        tension: 0.2,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: `rgba(${ACCENT}, 1)`,
        pointBorderColor: '#FFFFFF',
        pointBorderWidth: 1,
      },
      {
        label: 'Confidence',
        data: data.map((d) => d.confidence),
        borderColor: `rgba(${SUCCESS}, 1)`,
        backgroundColor: `rgba(${SUCCESS}, 0.05)`,
        fill: true,
        tension: 0.2,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: `rgba(${SUCCESS}, 1)`,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        labels: { 
          color: tickColor(), 
          font: { size: 11, weight: '600', family: 'Inter' } 
        } 
      },
      tooltip: {
        backgroundColor: '#111827',
        titleColor: '#FFFFFF',
        bodyColor: '#94A3B8',
        borderColor: '#243044',
        borderWidth: 1,
        padding: 8,
        cornerRadius: 6,
      }
    },
    scales: {
      x: { grid: { color: gridColor() }, ticks: { color: tickColor(), font: { size: 11, family: 'Inter' } } },
      y: { min: 0, max: 100, grid: { color: gridColor() }, ticks: { color: tickColor(), font: { size: 11, family: 'Inter' } } },
    },
  };

  return <div style={{ height: 260 }}><Line data={chartData} options={options} /></div>;
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
        backgroundColor: `rgba(${ACCENT}, 0.85)`,
        hoverBackgroundColor: `rgba(${ACCENT}, 1)`,
        borderRadius: 4,
        maxBarThickness: 36,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { 
      legend: { display: false },
      tooltip: {
        backgroundColor: '#111827',
        titleColor: '#FFFFFF',
        bodyColor: '#94A3B8',
        borderColor: '#243044',
        borderWidth: 1,
        padding: 8,
        cornerRadius: 6,
      }
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: tickColor(), font: { size: 11, family: 'Inter' } } },
      y: { min: 0, max: 100, grid: { color: gridColor() }, ticks: { color: tickColor(), font: { size: 11, family: 'Inter' } } },
    },
  };

  return <div style={{ height: 260 }}><Bar data={chartData} options={options} /></div>;
};
