import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ThumbsUp, AlertTriangle, Lightbulb, History, RotateCcw, Info } from 'lucide-react';
import InterviewFlowLayout from '../layouts/InterviewFlowLayout';
import { getInterviewById } from '../services/candidateApi';

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
      <div className="max-w-3xl mx-auto space-y-10 py-4 sm:py-6">
        
        {/* Header directly on page */}
        <div className="border-b pb-6" style={{ borderColor: 'var(--c-border)' }}>
          <p className="c-eyebrow mb-1">Coaching Report</p>
          <h1 className="c-heading text-2xl sm:text-3xl font-bold" style={{ color: 'var(--c-text)' }}>
            Detailed Feedback
          </h1>
          <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--c-text-secondary)' }}>
            Performance notes for your {interview.role} interview.
          </p>
        </div>

        {interview.evaluationSource === 'mock' && (
          <div className="c-badge-accent rounded-md px-3.5 py-2.5 flex items-center gap-2 text-xs font-semibold">
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>Preview feedback — full evaluation processing active.</span>
          </div>
        )}

        {/* Editorial Feedback Stream directly on page */}
        <div className="space-y-8">
          <FeedbackSection icon={ThumbsUp} tone="success" title="Demonstrated Strengths" items={interview.strengths} />
          <FeedbackSection icon={AlertTriangle} tone="warning" title="Areas for Improvement" items={interview.weaknesses} />
          <FeedbackSection icon={Lightbulb} tone="accent" title="Actionable Recommendations" items={interview.suggestions} />
        </div>

        {/* Action controls */}
        <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t" style={{ borderColor: 'var(--c-border)' }}>
          <Link to="/interview/goal" className="c-btn c-btn-primary px-5 py-2.5 text-xs font-bold rounded-md flex items-center justify-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5" /> Practice Again
          </Link>
          <Link to="/history" className="c-btn c-btn-secondary px-5 py-2.5 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5">
            <History className="w-3.5 h-3.5" /> View History
          </Link>
        </div>
      </div>
    </InterviewFlowLayout>
  );
};

const FeedbackSection = ({ icon: Icon, tone, title, items }) => (
  <div className="space-y-3">
    <div className="flex items-center gap-2 border-b pb-2" style={{ borderColor: 'var(--c-border)' }}>
      <Icon className="w-4 h-4" style={{ color: `var(--c-${tone})` }} />
      <h2 className="c-heading text-base font-bold" style={{ color: 'var(--c-text)' }}>{title}</h2>
    </div>
    <ul className="space-y-2.5">
      {items?.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5 text-xs leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
          <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: `var(--c-${tone})` }} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  </div>
);

export default Feedback;
