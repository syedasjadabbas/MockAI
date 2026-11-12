import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';
import CandidateLayout from '../layouts/CandidateLayout';
import CandidateEmptyState from '../components/CandidateEmptyState';
import { ScoreTrendChart, CategoryBreakdownChart, StressTrendChart } from '../components/ProgressCharts';
import { getProgress } from '../services/candidateApi';

// FR 32-02 - point out the trends in words, not only in charts.
function trendHighlights(progress) {
  const out = [];
  const scores = progress.scoreTrend || [];
  if (scores.length >= 2) {
    const first = scores[0].score;
    const last = scores[scores.length - 1].score;
    const diff = Math.round(last - first);
    out.push(diff > 0
      ? `Your score went up ${diff} points, from ${Math.round(first)}% in your first interview to ${Math.round(last)}% in your latest.`
      : diff < 0
      ? `Your latest score (${Math.round(last)}%) is ${Math.abs(diff)} points below your first (${Math.round(first)}%). Look at the feedback of your last interview to see what changed.`
      : `Your latest score matches your first (${Math.round(last)}%).`);
  }
  if (scores.length >= 4) {
    const recent = scores.slice(-3);
    const earlier = scores.slice(0, -3);
    const avg = (arr) => arr.reduce((s, x) => s + x.score, 0) / arr.length;
    const delta = Math.round(avg(recent) - avg(earlier));
    if (delta !== 0) {
      out.push(`Your last three interviews average ${Math.round(avg(recent))}%, ${Math.abs(delta)} points ${delta > 0 ? 'higher' : 'lower'} than before.`);
    }
  }
  const conf = progress.confidenceTrend || [];
  if (conf.length >= 2) {
    const d = Math.round(conf[conf.length - 1].confidence - conf[0].confidence);
    if (d !== 0) out.push(`Your confidence ${d > 0 ? 'rose' : 'fell'} by ${Math.abs(d)} points across your assessed interviews.`);
  }
  const stress = progress.stressTrend || [];
  if (stress.length >= 2) {
    const d = Math.round(stress[stress.length - 1].stress - stress[0].stress);
    if (d !== 0) out.push(d < 0 ? `You came across calmer: stress went down ${Math.abs(d)} points.` : `Stress went up ${d} points; the practice tips on your feedback page can help.`);
  }
  const cats = (progress.byCategory || []).filter((c) => c.count > 0);
  if (cats.length >= 2) {
    const best = [...cats].sort((a, b) => b.avgScore - a.avgScore)[0];
    const weakest = [...cats].sort((a, b) => a.avgScore - b.avgScore)[0];
    out.push(`Your strongest field is ${best.category} (${Math.round(best.avgScore)}%); ${weakest.category} (${Math.round(weakest.avgScore)}%) has the most room to improve.`);
  }
  return out;
}

const ProgressTracking = () => {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProgress().then((data) => {
      setProgress(data);
      setLoading(false);
    });
  }, []);

  return (
    <CandidateLayout>
      <div className="space-y-10 py-2">
        {/* Header directly on page */}
        <div className="border-b pb-6" style={{ borderColor: 'var(--c-border)' }}>
          <h1 className="c-heading text-2xl sm:text-3xl font-bold" style={{ color: 'var(--c-text)' }}>
            Your progress
          </h1>
          <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--c-text-secondary)' }}>
            How your score, confidence and stress have changed across your practice interviews.
          </p>
        </div>

        {loading ? (
          <div className="space-y-6">
            <div className="c-skeleton h-64 rounded-lg" />
            <div className="c-skeleton h-64 rounded-lg" />
          </div>
        ) : !progress || progress.scoreTrend.length === 0 ? (
          <div className="border-t border-b" style={{ borderColor: 'var(--c-border)' }}>
            <CandidateEmptyState
              icon={TrendingUp}
              title="No progress data yet"
              description="Complete mock interviews to begin visualizing your progress trends and domain breakdown here."
              actionLabel="Start Interview"
              onAction={() => navigate('/interview/goal')}
            />
          </div>
        ) : (
          <div className="space-y-12">
            {trendHighlights(progress).length > 0 && (
              <section aria-label="Trend highlights" className="p-5 rounded-lg border space-y-2.5" style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)' }}>
                <h2 className="c-heading text-lg font-bold flex items-center gap-2" style={{ color: 'var(--c-text)' }}>
                  <TrendingUp className="w-4 h-4" style={{ color: 'var(--c-accent)' }} /> What has changed
                </h2>
                <ul className="space-y-1.5">
                  {trendHighlights(progress).map((line, i) => (
                    <li key={i} className="text-sm leading-relaxed flex items-start gap-2" style={{ color: 'var(--c-text-secondary)' }}>
                      <span className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" style={{ background: 'var(--c-accent)' }} />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Score Trajectory Section (Directly on page with section headers & dividers) */}
            <section aria-label="Score Trajectory" className="border-b pb-10 space-y-4" style={{ borderColor: 'var(--c-border)' }}>
              <div className="flex items-baseline justify-between">
                <div>
                  <h2 className="c-heading text-lg font-bold" style={{ color: 'var(--c-text)' }}>Scores over time</h2>
                </div>
                <span className="text-xs font-mono" style={{ color: 'var(--c-text-muted)' }}>Multi-Session</span>
              </div>
              <div className="pt-2">
                <ScoreTrendChart data={progress.scoreTrend.map((s) => ({ ...s, confidence: progress.confidenceTrend.find((c) => c.date === s.date)?.confidence ?? null }))} />
              </div>
            </section>

            {progress.stressTrend.length > 0 && (
              <section aria-label="Stress over time" className="border-b pb-10 space-y-4" style={{ borderColor: 'var(--c-border)' }}>
                <div className="flex items-baseline justify-between">
                  <h2 className="c-heading text-lg font-bold" style={{ color: 'var(--c-text)' }}>Stress over time</h2>
                  <span className="text-xs font-mono" style={{ color: 'var(--c-text-muted)' }}>Assessed interviews only</span>
                </div>
                <div className="pt-2">
                  <StressTrendChart data={progress.stressTrend} />
                </div>
              </section>
            )}

            {/* Average Score by Domain Section */}
            {progress.byCategory.length > 0 && (
              <section aria-label="Average Score by Domain" className="space-y-4">
                <div className="flex items-baseline justify-between">
                  <div>
                    <h2 className="c-heading text-lg font-bold" style={{ color: 'var(--c-text)' }}>Average Score by Domain</h2>
                  </div>
                  <span className="text-xs font-mono" style={{ color: 'var(--c-text-muted)' }}>Domains</span>
                </div>
                <div className="pt-2">
                  <CategoryBreakdownChart data={progress.byCategory} />
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </CandidateLayout>
  );
};

export default ProgressTracking;
