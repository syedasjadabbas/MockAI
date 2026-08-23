import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ThumbsUp, AlertTriangle, Lightbulb, History, RotateCcw, Info } from 'lucide-react';
import InterviewFlowLayout from '../layouts/InterviewFlowLayout';
import { getInterviewById } from '../services/candidateApi';

// FR21 - Identify Strengths, FR22 - Identify Weaknesses, FR23 - Improvement Suggestions
const Feedback = () => {
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
    <InterviewFlowLayout step="feedback">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8 text-center">
          <p className="c-eyebrow mb-2">Coaching Report</p>
          <h1 className="c-heading text-2xl sm:text-3xl">Detailed Feedback</h1>
          <p className="text-sm mt-1.5" style={{ color: 'var(--c-text-secondary)' }}>Notes based on your {interview.role} interview.</p>
        </div>

        {interview.evaluationSource === 'mock' && (
          <div className="c-badge-accent rounded-xl px-4 py-2.5 mb-6 flex items-center justify-center gap-2 text-xs font-semibold">
            <Info className="w-3.5 h-3.5 shrink-0" />
            Preview feedback — full AI evaluation isn't connected yet. This illustrates the feedback layout.
          </div>
        )}

        <div className="space-y-5">
          <FeedbackSection icon={ThumbsUp} tone="success" title="What Went Well" items={interview.strengths} />
          <FeedbackSection icon={AlertTriangle} tone="warning" title="Areas for Improvement" items={interview.weaknesses} />
          <FeedbackSection icon={Lightbulb} tone="accent" title="Actionable Recommendations" items={interview.suggestions} />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
          <Link to="/interview/goal" className="c-btn c-btn-primary px-6 py-3">
            <RotateCcw className="w-4 h-4" /> Practice Again
          </Link>
          <Link to="/history" className="c-btn c-btn-secondary px-6 py-3">
            <History className="w-4 h-4" /> View Interview History
          </Link>
        </div>
      </div>
    </InterviewFlowLayout>
  );
};

const FeedbackSection = ({ icon: Icon, tone, title, items }) => (
  <div className="c-card rounded-2xl p-6">
    <div className="flex items-center gap-2.5 mb-4">
      <Icon className="w-5 h-5" style={{ color: `var(--c-${tone})` }} />
      <h2 className="c-heading text-base">{title}</h2>
    </div>
    <ul className="space-y-2.5">
      {items?.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
          <span className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" style={{ background: `var(--c-${tone})` }} />
          {item}
        </li>
      ))}
    </ul>
  </div>
);

export default Feedback;
