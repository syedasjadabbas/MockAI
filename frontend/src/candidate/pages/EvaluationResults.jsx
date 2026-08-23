import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowRight, Activity, MessageSquareText, Info } from 'lucide-react';
import InterviewFlowLayout from '../layouts/InterviewFlowLayout';
import ScoreRing from '../components/ScoreRing';
import { getInterviewById } from '../services/candidateApi';
import { formatDate } from '../../utils/dateFormat';

const STRESS_TONE = { Low: 'success', Medium: 'warning', High: 'danger' };

// FR17 Aggregate Analysis, FR18 Overall Score, FR19 Confidence Score,
// FR20 Stress Indicator, FR24 Summary Report, FR25 Visual Results, FR35 Score Interpretation
const EvaluationResults = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [interview, setInterview] = useState(null);

  useEffect(() => {
    getInterviewById(id).then((data) => {
      if (!data) {
        navigate('/dashboard');
        return;
      }
      setInterview(data);
    });
  }, [id, navigate]);

  if (!interview) return null;
  const stressTone = STRESS_TONE[interview.stress] || 'accent';

  return (
    <InterviewFlowLayout step="results">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <p className="c-eyebrow mb-2">Evaluation Report</p>
          <h1 className="c-heading text-2xl sm:text-3xl">{interview.role}</h1>
          <p className="text-sm mt-1.5" style={{ color: 'var(--c-text-secondary)' }}>
            Completed {formatDate(interview.completedAt || interview.createdAt)}
          </p>
        </div>

        {/* Honest status: these are preview figures until a real AI
            evaluation exists - never presented as a finished AI result. */}
        {interview.evaluationSource === 'mock' && (
          <div className="c-badge-accent rounded-xl px-4 py-2.5 mb-6 flex items-center justify-center gap-2 text-xs font-semibold">
            <Info className="w-3.5 h-3.5 shrink-0" />
            Preview results — full AI evaluation isn't connected yet. These numbers illustrate the results layout.
          </div>
        )}

        {/* Score gauges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
          <div className="c-card rounded-2xl p-6 flex flex-col items-center">
            <ScoreRing value={interview.score} label="Overall Performance" suffix="%" tone="accent" />
          </div>
          <div className="c-card rounded-2xl p-6 flex flex-col items-center">
            <ScoreRing value={interview.confidence} label="Confidence Score" suffix="%" tone="success" />
          </div>
          <div className="c-card rounded-2xl p-6 flex flex-col items-center justify-center gap-3">
            <div
              className="w-32 h-32 rounded-full border-4 flex items-center justify-center"
              style={{ borderColor: `var(--c-${stressTone})`, color: `var(--c-${stressTone})` }}
            >
              <div className="flex flex-col items-center">
                <Activity className="w-6 h-6 mb-1" />
                <span className="c-serif-num text-lg">{interview.stress || '—'}</span>
              </div>
            </div>
            <p className="text-xs sm:text-sm font-semibold" style={{ color: 'var(--c-text-secondary)' }}>Stress Indicator</p>
          </div>
        </div>

        {/* Score interpretation note (FR35) */}
        <div className="c-card-flat rounded-2xl p-5 mb-8 flex items-start gap-3">
          <MessageSquareText className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--c-accent)' }} />
          <p className="text-sm leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
            Your overall score reflects the combined quality of your answers across all questions. Confidence reflects delivery and
            engagement, while the stress indicator reflects hesitation and behavioral tension observed during your responses.
          </p>
        </div>

        {/* Per-question breakdown */}
        <div className="mb-8">
          <h2 className="c-heading text-lg mb-4">Question Breakdown</h2>
          <div className="c-card rounded-2xl c-divide overflow-hidden">
            {interview.perQuestion?.map((q, i) => (
              <div key={q.questionId} className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="min-w-0">
                  <p className="c-eyebrow mb-0.5">Question {i + 1}</p>
                  <p className="text-sm font-medium truncate">{q.questionText}</p>
                </div>
                <span className="c-serif-num text-sm shrink-0">{q.score}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to={`/interview/${id}/feedback`} className="c-btn c-btn-primary px-6 py-3">
            View Detailed Feedback <ArrowRight className="w-4 h-4" />
          </Link>
          <Link to="/dashboard" className="c-btn c-btn-secondary px-6 py-3">
            Back to Dashboard
          </Link>
        </div>
      </div>
    </InterviewFlowLayout>
  );
};

export default EvaluationResults;
