import React, { useEffect, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import CandidateLayout from '../layouts/CandidateLayout';
import CandidateEmptyState from '../components/CandidateEmptyState';
import { ScoreTrendChart, CategoryBreakdownChart } from '../components/ProgressCharts';
import { getProgress } from '../services/candidateApi';

// FR36 - Progress Awareness Support
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
      <div className="mb-6">
        <p className="c-eyebrow mb-2">Progress</p>
        <h1 className="c-heading text-2xl sm:text-3xl">Your Development Over Time</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--c-text-secondary)' }}>
          How your performance and confidence trend across every session.
        </p>
      </div>

      {loading ? (
        <div className="space-y-5">
          <div className="c-skeleton h-72 rounded-2xl" />
          <div className="c-skeleton h-72 rounded-2xl" />
        </div>
      ) : progress.scoreTrend.length === 0 ? (
        <div className="c-card rounded-2xl">
          <CandidateEmptyState
            icon={TrendingUp}
            title="Not enough data yet"
            description="Complete a few mock interviews to start seeing your progress trends here."
            actionLabel="Start Interview"
            onAction={() => (window.location.href = '/interview/goal')}
          />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="c-card rounded-2xl p-6">
            <h2 className="c-heading text-base mb-4">Score & Confidence Over Time</h2>
            <ScoreTrendChart data={progress.scoreTrend.map((s, i) => ({ ...s, confidence: progress.confidenceTrend[i]?.confidence }))} />
          </div>

          {progress.byCategory.length > 0 && (
            <div className="c-card rounded-2xl p-6">
              <h2 className="c-heading text-base mb-4">Average Score by Category</h2>
              <CategoryBreakdownChart data={progress.byCategory} />
            </div>
          )}
        </div>
      )}
    </CandidateLayout>
  );
};

export default ProgressTracking;
