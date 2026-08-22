import React, { useEffect, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import CandidateLayout from '../layouts/CandidateLayout';
import EmptyState from '../../components/EmptyState';
import { CardSkeleton } from '../../components/Skeleton';
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
        <h2 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">Progress Tracking</h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">See how your performance and confidence trend over time.</p>
      </div>

      {loading ? (
        <div className="space-y-5">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : progress.scoreTrend.length === 0 ? (
        <div className="glass-card rounded-2xl">
          <EmptyState
            icon={TrendingUp}
            title="Not enough data yet"
            description="Complete a few mock interviews to start seeing your progress trends here."
            actionLabel="Start Interview"
            onAction={() => (window.location.href = '/interview/goal')}
          />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-base font-bold text-[var(--text-primary)] mb-4">Score & Confidence Over Time</h3>
            <ScoreTrendChart data={progress.scoreTrend.map((s, i) => ({ ...s, confidence: progress.confidenceTrend[i]?.confidence }))} />
          </div>

          {progress.byCategory.length > 0 && (
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-base font-bold text-[var(--text-primary)] mb-4">Average Score by Category</h3>
              <CategoryBreakdownChart data={progress.byCategory} />
            </div>
          )}
        </div>
      )}
    </CandidateLayout>
  );
};

export default ProgressTracking;
