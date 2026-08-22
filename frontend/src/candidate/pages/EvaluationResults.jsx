import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowRight, Activity, MessageSquareText } from 'lucide-react';
import InterviewFlowLayout from '../layouts/InterviewFlowLayout';
import ScoreRing from '../components/ScoreRing';
import { getInterviewById } from '../services/candidateApi';
import { formatDate } from '../../utils/dateFormat';

const STRESS_STYLES = {
  Low: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
  Medium: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
  High: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
};

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

  return (
    <InterviewFlowLayout step="results">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">Your Evaluation Results</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {interview.role} · Completed {formatDate(interview.completedAt || interview.createdAt)}
          </p>
        </div>

        {/* Score gauges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
          <div className="glass-card rounded-2xl p-6 flex flex-col items-center">
            <ScoreRing value={interview.score} label="Overall Performance Score" suffix="%" colorClass="text-indigo-500" />
          </div>
          <div className="glass-card rounded-2xl p-6 flex flex-col items-center">
            <ScoreRing value={interview.confidence} label="Confidence Score" suffix="%" colorClass="text-emerald-500" />
          </div>
          <div className="glass-card rounded-2xl p-6 flex flex-col items-center justify-center gap-3">
            <div className={`w-32 h-32 rounded-full border-4 flex items-center justify-center ${STRESS_STYLES[interview.stress] || ''}`}>
              <div className="flex flex-col items-center">
                <Activity className="w-6 h-6 mb-1" />
                <span className="text-lg font-extrabold">{interview.stress || '—'}</span>
              </div>
            </div>
            <p className="text-xs sm:text-sm font-semibold text-[var(--text-secondary)]">Stress Indicator</p>
          </div>
        </div>

        {/* Score interpretation note (FR35) */}
        <div className="glass-card rounded-2xl p-5 mb-8 flex items-start gap-3">
          <MessageSquareText className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
          <p className="text-sm text-[var(--text-secondary)]">
            Your overall score reflects the combined quality of your answers across all questions. Confidence reflects delivery and
            engagement, while the stress indicator reflects hesitation and behavioral tension observed during your responses.
          </p>
        </div>

        {/* Per-question breakdown */}
        <div className="mb-8">
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">Question Breakdown</h3>
          <div className="glass-card rounded-2xl divide-y divide-[var(--border-table)] overflow-hidden">
            {interview.perQuestion?.map((q, i) => (
              <div key={q.questionId} className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-indigo-500 mb-0.5">Question {i + 1}</p>
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">{q.questionText}</p>
                </div>
                <span className="text-sm font-bold text-[var(--text-primary)] shrink-0">{q.score}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to={`/interview/${id}/feedback`}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-500/20 transition-all active:scale-[0.98]"
          >
            View Detailed Feedback <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/dashboard"
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-[var(--text-secondary)] border border-[var(--border-card)] hover:bg-[var(--bg-card-hover)] transition-all"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </InterviewFlowLayout>
  );
};

export default EvaluationResults;
