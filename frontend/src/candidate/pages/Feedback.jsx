import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ThumbsUp, AlertTriangle, Lightbulb, History, RotateCcw } from 'lucide-react';
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
          <h2 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">Detailed Feedback</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Coaching notes based on your {interview.role} interview.</p>
        </div>

        <div className="space-y-5">
          <FeedbackSection
            icon={ThumbsUp}
            iconClass="text-emerald-500"
            title="Strengths"
            items={interview.strengths}
          />
          <FeedbackSection
            icon={AlertTriangle}
            iconClass="text-amber-500"
            title="Areas for Improvement"
            items={interview.weaknesses}
          />
          <FeedbackSection
            icon={Lightbulb}
            iconClass="text-indigo-500"
            title="Suggestions for Next Time"
            items={interview.suggestions}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
          <Link
            to="/interview/goal"
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-500/20 transition-all active:scale-[0.98]"
          >
            <RotateCcw className="w-4 h-4" /> Practice Again
          </Link>
          <Link
            to="/history"
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-[var(--text-secondary)] border border-[var(--border-card)] hover:bg-[var(--bg-card-hover)] transition-all"
          >
            <History className="w-4 h-4" /> View Interview History
          </Link>
        </div>
      </div>
    </InterviewFlowLayout>
  );
};

const FeedbackSection = ({ icon: Icon, iconClass, title, items }) => (
  <div className="glass-card rounded-2xl p-6">
    <div className="flex items-center gap-2.5 mb-4">
      <Icon className={`w-5 h-5 ${iconClass}`} />
      <h3 className="text-base font-bold text-[var(--text-primary)]">{title}</h3>
    </div>
    <ul className="space-y-2.5">
      {items?.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5 text-sm text-[var(--text-secondary)] leading-relaxed">
          <span className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${iconClass.replace('text-', 'bg-')}`} />
          {item}
        </li>
      ))}
    </ul>
  </div>
);

export default Feedback;
