import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ThumbsUp, AlertTriangle, Lightbulb, History, RotateCcw, ArrowLeft, LayoutDashboard, Target, CalendarCheck, Info } from 'lucide-react';
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
  const tips = [...(interview.suggestions || []), ...(interview.insights?.preparation_strategies || [])];

  return (
    <InterviewFlowLayout step="feedback">
      <div className="py-6 sm:py-10 space-y-6">

        <div className="space-y-3">
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
            <p className="text-sm mt-1" style={{ color: 'var(--c-text-secondary)' }}>
              What went well in your {interview.role} interview, what to improve, and how to practise for next time.
            </p>
          </div>
        </div>

        {ready && hasFeedback ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FeedbackCard icon={ThumbsUp} tone="success" title="What you did well" items={interview.strengths}
                empty="Keep practising: strengths appear here once an answer covers the key points well." />
              <FeedbackCard icon={AlertTriangle} tone="warning" title="What to work on" items={interview.weaknesses}
                empty="Nothing stood out to fix in this interview." />
            </div>

            <PracticePlan items={interview.insights?.coaching_guidance} />

            {tips.length > 0 && (
              <FeedbackCard icon={Lightbulb} tone="accent" title="Before your next interview" items={[...new Set(tips)]} />
            )}
          </>
        ) : (
          <div className="rounded-xl border p-6 text-sm" style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)', color: 'var(--c-text-secondary)' }}>
            {ready ? 'There is no written feedback for this interview.' : 'Your feedback is still being prepared. Check your results page in a minute.'}
          </div>
        )}

        <p className="text-xs flex items-start gap-2 leading-relaxed" style={{ color: 'var(--c-text-muted)' }}>
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          This is practice feedback from an automated coach to help you improve. It is not a hiring decision or a prediction of any employer's decision.
        </p>

        {/* Next step */}
        <section className="rounded-xl border p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          style={{ background: 'var(--c-badge-accent-bg)', borderColor: 'var(--c-accent)' }}>
          <div className="flex items-start gap-3">
            <CalendarCheck className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--c-accent)' }} />
            <div>
              <p className="text-base font-bold" style={{ color: 'var(--c-text)' }}>Ready for another round?</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--c-text-secondary)' }}>
                Each new interview brings new questions, so you can practise the points above straight away.
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            <Link to="/interview/goal" className="c-btn c-btn-primary px-6 py-3 text-sm font-bold rounded-md flex items-center justify-center gap-1.5">
              <RotateCcw className="w-4 h-4" /> Practice again
            </Link>
          </div>
        </section>

        <div className="flex items-center gap-5 text-xs font-semibold">
          <Link to="/history" className="flex items-center gap-1.5 hover:underline underline-offset-2" style={{ color: 'var(--c-text-secondary)' }}>
            <History className="w-3.5 h-3.5" /> Interview history
          </Link>
          <Link to="/dashboard" className="flex items-center gap-1.5 hover:underline underline-offset-2" style={{ color: 'var(--c-text-secondary)' }}>
            <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
          </Link>
        </div>

        {ready && (
          <section className="rounded-xl border p-5 sm:p-6" style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)' }}>
            <InterviewSurvey interviewId={id} />
          </section>
        )}
      </div>
    </InterviewFlowLayout>
  );
};

// FR 27-02 - coaching guidance: what to practise, how, and the target.
const PracticePlan = ({ items }) => {
  if (!items?.length) return null;
  return (
    <section className="rounded-xl border p-5 sm:p-6 space-y-4" style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)' }}>
      <div className="flex items-center gap-2">
        <Target className="w-4 h-4" style={{ color: 'var(--c-accent)' }} />
        <h2 className="c-heading text-base font-bold" style={{ color: 'var(--c-text)' }}>Your practice plan</h2>
      </div>
      <ol className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((g, i) => (
          <li key={i} className="p-4 rounded-lg border space-y-2" style={{ background: 'var(--c-surface-muted)', borderColor: 'var(--c-border)' }}>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: 'var(--c-accent)', color: '#fff' }}>{i + 1}</span>
              <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--c-text-muted)' }}>{g.domain}</p>
            </div>
            <p className="text-sm font-bold" style={{ color: 'var(--c-text)' }}>{g.action}</p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>{g.practice_strategy}</p>
            {g.target_metric && (
              <p className="text-[11px] font-semibold" style={{ color: 'var(--c-accent)' }}>Goal: {g.target_metric}</p>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
};

const FeedbackCard = ({ icon: Icon, tone, title, items, empty }) => {
  if (!items?.length && !empty) return null;
  return (
    <section className="rounded-xl border p-5 sm:p-6 space-y-3" style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)' }}>
      <div className="flex items-center gap-2">
        <span className="w-8 h-8 rounded-md flex items-center justify-center shrink-0" style={{ background: `var(--c-badge-${tone}-bg)`, color: `var(--c-${tone})` }}>
          <Icon className="w-4 h-4" />
        </span>
        <h2 className="c-heading text-base font-bold" style={{ color: 'var(--c-text)' }}>{title}</h2>
      </div>
      {items?.length ? (
        <ul className="space-y-2.5">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
              <span className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" style={{ background: `var(--c-${tone})` }} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm" style={{ color: 'var(--c-text-muted)' }}>{empty}</p>
      )}
    </section>
  );
};

export default Feedback;
