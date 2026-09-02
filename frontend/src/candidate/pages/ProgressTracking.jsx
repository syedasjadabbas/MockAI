import React, { useEffect, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import CandidateLayout from '../layouts/CandidateLayout';
import CandidateEmptyState from '../components/CandidateEmptyState';
import { ScoreTrendChart, CategoryBreakdownChart } from '../components/ProgressCharts';
import { getProgress } from '../services/candidateApi';

const ProgressTracking = () => {
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
          <p className="c-eyebrow mb-1">Telemetry</p>
          <h1 className="c-heading text-2xl sm:text-3xl font-bold" style={{ color: 'var(--c-text)' }}>
            Performance Progress
          </h1>
          <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--c-text-secondary)' }}>
            Score and confidence trajectory across your recorded practice sessions.
          </p>
        </div>

        {loading ? (
          <div className="space-y-6">
            <div className="c-skeleton h-64 rounded-lg" />
            <div className="c-skeleton h-64 rounded-lg" />
          </div>
        ) : !progress || progress.scoreTrend.length === 0 ? (
          <div className="py-16 text-center border-t border-b" style={{ borderColor: 'var(--c-border)' }}>
            <CandidateEmptyState
              icon={TrendingUp}
              title="No progress data yet"
              description="Complete mock interviews to begin visualizing your progress trends and domain breakdown here."
              actionLabel="Start Interview"
              onAction={() => (window.location.href = '/interview/goal')}
            />
          </div>
        ) : (
          <div className="space-y-12">
            {/* Score Trajectory Section (Directly on page with section headers & dividers) */}
            <section aria-label="Score Trajectory" className="border-b pb-10 space-y-4" style={{ borderColor: 'var(--c-border)' }}>
              <div className="flex items-baseline justify-between">
                <div>
                  <p className="c-eyebrow mb-0.5">Trends</p>
                  <h2 className="c-heading text-lg font-bold" style={{ color: 'var(--c-text)' }}>Score Trajectory</h2>
                </div>
                <span className="text-xs font-mono" style={{ color: 'var(--c-text-muted)' }}>Multi-Session</span>
              </div>
              <div className="pt-2">
                <ScoreTrendChart data={progress.scoreTrend.map((s, i) => ({ ...s, confidence: progress.confidenceTrend[i]?.confidence }))} />
              </div>
            </section>

            {/* Average Score by Domain Section */}
            {progress.byCategory.length > 0 && (
              <section aria-label="Average Score by Domain" className="space-y-4">
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="c-eyebrow mb-0.5">Breakdown</p>
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
