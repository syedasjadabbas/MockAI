import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ThumbsUp, AlertTriangle, Lightbulb, History, RotateCcw, ArrowLeft, LayoutDashboard } from 'lucide-react';
import InterviewFlowLayout from '../layouts/InterviewFlowLayout';
import InterviewSurvey from '../components/InterviewSurvey';
import { getInterviewById } from '../services/candidateApi';

// Step 6 of the interview flow: plain-language feedback (FR25-FR27), then
// the optional session survey (Objective 7).
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

  if (!interview) {
    return (
      <InterviewFlowLayout step="feedback">
        <div className="py-20 flex justify-center">
          <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--c-accent)', borderTopColor: 'transparent' }} />
        </div>
      </InterviewFlowLayout>
    );
  }

  const ready = interview.evaluationStatus === 'completed';
  const hasFeedback = [interview.strengths, interview.weaknesses, interview.suggestions].some((items) => items?.length);

  return (
    <InterviewFlowLayout step="feedback">
      <div className="space-y-10 py-6 sm:py-10">

        <div className="border-b pb-6 space-y-3" style={{ borderColor: 'var(--c-border)' }}>
          <Link
            to={`/interview/${id}/results`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold transition-colors hover:text-[var(--c-text)]"
            style={{ color: 'var(--c-text-muted)' }}
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to results
          </Link>
          <div>
            <h1 className="c-heading text-2xl sm:text-3xl font-bold" style={{ color: 'var(--c-text)' }}>
              Your feedback
            </h1>
            <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--c-text-secondary)' }}>
              What went well in your {interview.role} interview, what to improve, and how to prepare next time.
            </p>
          </div>
        </div>

        {ready && hasFeedback ? (
          <div className="space-y-8">
            <FeedbackSection icon={ThumbsUp} tone="success" title="What you did well" items={interview.strengths} />
            <FeedbackSection icon={AlertTriangle} tone="warning" title="What to work on" items={interview.weaknesses} />
            <FeedbackSection icon={Lightbulb} tone="accent" title="Tips for your next interview" items={interview.suggestions} />
          </div>
        ) : (
          <p className="text-sm" style={{ color: 'var(--c-text-secondary)' }}>
            {ready ? 'There is no written feedback for this interview.' : 'Your feedback is still being prepared. Check your results page in a minute.'}
          </p>
        )}

        {ready && <InterviewSurvey interviewId={id} />}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="grid grid-cols-2 sm:flex gap-3">
            <Link to="/history" className="c-btn c-btn-secondary px-4 py-2.5 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5">
              <History className="w-3.5 h-3.5" /> Interview history
            </Link>
            <Link to="/dashboard" className="c-btn c-btn-secondary px-4 py-2.5 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5">
              <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
            </Link>
          </div>
          <Link to="/interview/goal" className="c-btn c-btn-primary px-5 py-3 sm:py-2.5 text-xs font-bold rounded-md flex items-center justify-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5" /> Practice again
          </Link>
        </div>
      </div>
    </InterviewFlowLayout>
  );
};

const FeedbackSection = ({ icon: Icon, tone, title, items }) => {
  if (!items?.length) return null;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 border-b pb-2" style={{ borderColor: 'var(--c-border)' }}>
        <Icon className="w-4 h-4" style={{ color: `var(--c-${tone})` }} />
        <h2 className="c-heading text-base font-bold" style={{ color: 'var(--c-text)' }}>{title}</h2>
      </div>
      <ul className="space-y-2.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
            <span className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" style={{ background: `var(--c-${tone})` }} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Feedback;
