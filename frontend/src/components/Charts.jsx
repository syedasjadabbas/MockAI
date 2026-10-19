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
import { Bar, Pie, Line } from 'react-chartjs-2';

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
          'rgba(16, 185, 129, 0.85)',
          'rgba(245, 158, 11, 0.85)',
          'rgba(244, 63, 94, 0.85)',
          'rgba(100, 116, 139, 0.7)',
        ],
        borderColor: [
          'rgba(16, 185, 129, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(244, 63, 94, 1)',
          'rgba(100, 116, 139, 1)',
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
          color: '#cbd5e1', 
          font: { size: 12, weight: '500' },
          padding: 14,
          usePointStyle: true,
          pointStyle: 'circle'
        } 
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
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
    <div className="glass-card p-6 rounded-2xl h-80 flex flex-col hover:border-orange-500/30 transition-all duration-300">
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
  const chartData = {
    labels: ['Completed', 'In Progress', 'Pending'],
    datasets: [
      {
        label: 'Interviews',
        data: [data?.completed || 0, data?.progress || 0, data?.pending || 0],
        backgroundColor: [
          'rgba(16, 185, 129, 0.85)',
          'rgba(245, 158, 11, 0.85)',
          'rgba(255, 107, 53, 0.85)',
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
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
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
        ticks: { color: '#94a3b8', font: { size: 11, weight: '500' } }, 
        border: { display: false } 
      },
      y: { 
        grid: { color: 'rgba(255,255,255,0.06)' }, 
        ticks: { color: '#94a3b8', font: { size: 11 } }, 
        border: { display: false } 
      }
    },
  };

  return (
    <div className="glass-card p-6 rounded-2xl h-80 flex flex-col hover:border-orange-500/30 transition-all duration-300">
      <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)] mb-4">
        Status Distribution
      </h3>
      <div className="flex-1 relative min-h-0">
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
};

// FR 35-01..03 - interview participation trends over time + engagement
export const ParticipationTrendChart = ({ participation }) => {
  const series = participation?.series || [];
  const engagement = participation?.engagement || {};
  const labels = series.map((p) => {
    const d = new Date(`${p.date}T00:00:00Z`);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
  });

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Interviews Started',
        data: series.map((p) => p.interviews_started),
        borderColor: 'rgba(249, 115, 22, 1)',
        backgroundColor: 'rgba(249, 115, 22, 0.15)',
        fill: true,
        tension: 0.35,
        pointRadius: 2,
      },
      {
        label: 'Completed',
        data: series.map((p) => p.interviews_completed),
        borderColor: 'rgba(16, 185, 129, 1)',
        backgroundColor: 'rgba(16, 185, 129, 0.0)',
        tension: 0.35,
        pointRadius: 2,
      },
      {
        label: 'Active Candidates',
        data: series.map((p) => p.active_candidates),
        borderColor: 'rgba(96, 165, 250, 1)',
        backgroundColor: 'rgba(96, 165, 250, 0.0)',
        borderDash: [4, 4],
        tension: 0.35,
        pointRadius: 0,
      },
      {
        label: 'New Sign-ups',
        data: series.map((p) => p.new_candidates),
        borderColor: 'rgba(168, 162, 158, 1)',
        backgroundColor: 'rgba(168, 162, 158, 0.0)',
        borderDash: [2, 3],
        tension: 0.35,
        pointRadius: 0,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: '#cbd5e1', font: { size: 11, weight: '500' }, usePointStyle: true, pointStyle: 'circle', padding: 14 },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#fff',
        bodyColor: '#cbd5e1',
        padding: 12,
        cornerRadius: 10,
      },
    },
    scales: {
      x: { ticks: { color: '#94a3b8', maxTicksLimit: 10, font: { size: 11 } }, grid: { display: false } },
      y: { beginAtZero: true, ticks: { color: '#94a3b8', precision: 0, font: { size: 11 } }, grid: { color: 'rgba(148, 163, 184, 0.1)' } },
    },
  };

  const trendLabel = { up: 'Rising', down: 'Declining', flat: 'Steady' }[engagement.trend_direction] || 'Steady';
  const stats = [
    { label: 'Active (7 days)', value: engagement.active_candidates_7d ?? 0 },
    { label: 'Active (30 days)', value: engagement.active_candidates_30d ?? 0 },
    { label: 'Completion rate', value: `${engagement.completion_rate_30d ?? 0}%` },
    { label: 'Repeat candidates', value: `${engagement.repeat_candidate_rate ?? 0}%` },
    { label: 'Interviews / candidate', value: engagement.avg_interviews_per_candidate ?? 0 },
  ];

  return (
    <div className="glass-card p-6 rounded-2xl flex flex-col hover:border-orange-500/30 transition-all duration-300">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">Participation Trends</h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Daily interview activity over the last {participation?.days || 30} days · {engagement.interviews_30d ?? 0} interviews
          </p>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 font-medium">
          Trend: {trendLabel}
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
        {stats.map((s) => (
          <div key={s.label} className="p-3 rounded-xl border border-[var(--border-table)] bg-[var(--bg-table-header)]">
            <p className="text-[11px] text-[var(--text-muted)]">{s.label}</p>
            <p className="text-lg font-bold text-[var(--text-primary)]">{s.value}</p>
          </div>
        ))}
      </div>
      <div className="relative h-72 min-h-0">
        {series.length ? <Line data={chartData} options={options} /> : (
          <p className="text-sm text-[var(--text-muted)]">No participation data yet.</p>
        )}
      </div>
    </div>
  );
};

// Objective 7 - candidate survey results + score agreement (accuracy testing)
export const SurveySummaryPanel = ({ summary }) => {
  if (!summary) return null;
  const avg = summary.averages || {};
  const agreement = summary.score_agreement || {};
  const ratingRows = [
    { label: 'Feedback usefulness', value: avg.usefulness },
    { label: 'Perceived score accuracy', value: avg.accuracy },
    { label: 'Ease of use', value: avg.ease_of_use },
    { label: 'Interview readiness gain', value: avg.confidence_gain },
  ];

  return (
    <div className="glass-card p-6 rounded-2xl flex flex-col hover:border-orange-500/30 transition-all duration-300">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">Candidate Survey & Accuracy</h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {summary.total_responses} response{summary.total_responses === 1 ? '' : 's'} · {summary.response_rate}% of evaluated interviews
          </p>
        </div>
        {summary.recommend_rate != null && (
          <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
            Would recommend: {summary.recommend_rate}%
          </span>
        )}
      </div>

      {summary.total_responses === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">No survey responses yet. Candidates are asked to rate each session on their results page.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            {ratingRows.map((r) => (
              <div key={r.label}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-[var(--text-secondary)]">{r.label}</span>
                  <span className="font-bold text-[var(--text-primary)]">{r.value != null ? `${r.value} / 5` : '—'}</span>
                </div>
                <div className="h-1.5 rounded-full bg-[var(--bg-table-header)] overflow-hidden">
                  <div className="h-full rounded-full bg-orange-500" style={{ width: `${((r.value || 0) / 5) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold text-[var(--text-secondary)]">MockAI score vs candidate self-rating</p>
            {agreement.n ? (
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Paired ratings', value: agreement.n },
                  { label: 'Correlation (r)', value: agreement.pearson_r ?? '—' },
                  { label: 'Mean abs. error', value: agreement.mae != null ? `${agreement.mae} pts` : '—' },
                  { label: `Within ±${agreement.tolerance} pts`, value: agreement.within_tolerance_pct != null ? `${agreement.within_tolerance_pct}%` : '—' },
                ].map((s) => (
                  <div key={s.label} className="p-3 rounded-xl border border-[var(--border-table)] bg-[var(--bg-table-header)]">
                    <p className="text-[11px] text-[var(--text-muted)]">{s.label}</p>
                    <p className="text-lg font-bold text-[var(--text-primary)]">{s.value}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[var(--text-muted)]">No self-rated scores yet.</p>
            )}
            {(summary.recent_comments || []).slice(0, 3).map((c, i) => (
              <p key={i} className="text-xs text-[var(--text-secondary)] border-l-2 border-orange-500/40 pl-3 italic">
                “{c.comment}” <span className="not-italic text-[var(--text-muted)]">— {c.role || 'Candidate'}</span>
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
