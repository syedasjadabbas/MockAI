import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ThumbsUp, Lightbulb, History, RotateCcw, ArrowLeft, LayoutDashboard, Info, Check } from 'lucide-react';
import InterviewFlowLayout from '../layouts/InterviewFlowLayout';
import InterviewSurvey from '../components/InterviewSurvey';
import { getInterviewById } from '../services/candidateApi';

// Step 6 of the interview flow: plain-language feedback (FR25-FR27), then
// the optional session survey (Objective 7).
const Feedback = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [interview, setInterview] = useState(null);
  // "Before your next interview" items the candidate has ticked on this visit.
  const [done, setDone] = useState({});

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
  const strengths = interview.strengths || [];
  const weaknesses = interview.weaknesses || [];
  const plan = interview.insights?.coaching_guidance || [];
  const tips = [...new Set([...(interview.suggestions || []), ...(interview.insights?.preparation_strategies || [])])];
  const hasFeedback = strengths.length || weaknesses.length || plan.length || tips.length;
  const doneCount = tips.filter((_, i) => done[i]).length;

  return (
    <InterviewFlowLayout step="feedback">
      <div className="py-6 sm:py-10">

        <header className="pb-8 border-b space-y-3" style={{ borderColor: 'var(--c-border)' }}>
          <Link to={`/interview/${id}/results`} className="inline-flex items-center gap-1.5 text-xs font-semibold hover:underline" style={{ color: 'var(--c-text-muted)' }}>
            <ArrowLeft className="w-3.5 h-3.5" /> Back to results
          </Link>
          <h1 className="c-heading text-3xl sm:text-4xl font-bold tracking-tight" style={{ color: 'var(--c-text)' }}>Your feedback</h1>
          <p className="text-sm max-w-2xl" style={{ color: 'var(--c-text-secondary)' }}>
            What went well in your {interview.role} interview, what to improve, and a short plan for your next practice.
          </p>
        </header>

        {!(ready && hasFeedback) ? (
          <p className="py-10 text-sm" style={{ color: 'var(--c-text-secondary)' }}>
            {ready ? 'There is no written feedback for this interview.' : 'Your feedback is still being prepared. Check your results page in a minute.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 pt-8">

            {/* Main column */}
            <div className="lg:col-span-8 space-y-12 min-w-0">

              {/* FR 27-02 - what to practise, how, and the goal */}
              {plan.length > 0 && (
                <section aria-label="Your practice plan">
                  <SectionHeading hint="Work on these in order. Each one has a simple way to practise and a goal.">Your practice plan</SectionHeading>
                  <ol className="border-t" style={{ borderColor: 'var(--c-border)' }}>
                    {plan.map((g, i) => (
                      <li key={i} className="py-5 border-b flex gap-5" style={{ borderColor: 'var(--c-border)' }}>
                        <span className="c-heading text-3xl font-bold leading-none w-8 shrink-0" style={{ color: 'var(--c-accent)' }}>{i + 1}</span>
                        <div className="space-y-1.5 min-w-0">
                          <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--c-text-muted)' }}>{g.domain}</p>
                          <p className="text-base font-bold" style={{ color: 'var(--c-text)' }}>{g.action}</p>
                          <p className="text-sm leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>{g.practice_strategy}</p>
                          {g.target_metric && (
                            <p className="text-xs pt-0.5" style={{ color: 'var(--c-text-muted)' }}>
                              <span className="font-semibold" style={{ color: 'var(--c-text)' }}>Goal:</span> {g.target_metric}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              {/* FR 27 - preparation checklist */}
              {tips.length > 0 && (
                <section aria-label="Before your next interview">
                  <div className="flex items-end justify-between gap-3">
                    <SectionHeading hint="Tick them off as you go.">Before your next interview</SectionHeading>
                    <span className="text-xs font-semibold mb-4 shrink-0" style={{ color: 'var(--c-text-muted)' }}>{doneCount} of {tips.length} done</span>
                  </div>
                  <ul className="border-t" style={{ borderColor: 'var(--c-border)' }}>
                    {tips.map((tip, i) => (
                      <li key={i} className="border-b" style={{ borderColor: 'var(--c-border)' }}>
                        <label className="flex items-start gap-3 py-3.5 cursor-pointer">
                          <input type="checkbox" className="sr-only" checked={!!done[i]} onChange={() => setDone((d) => ({ ...d, [i]: !d[i] }))} />
                          <span className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-px transition-colors"
                            style={{ borderColor: done[i] ? 'var(--c-accent)' : 'var(--c-border)', background: done[i] ? 'var(--c-accent)' : 'transparent' }}>
                            {done[i] && <Check className="w-3 h-3 text-white" />}
                          </span>
                          <span className={`text-sm leading-relaxed ${done[i] ? 'line-through' : ''}`} style={{ color: done[i] ? 'var(--c-text-muted)' : 'var(--c-text-secondary)' }}>{tip}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>

            {/* Side column */}
            <aside className="lg:col-span-4 space-y-8 lg:border-l lg:pl-10 self-start lg:sticky lg:top-6" style={{ borderColor: 'var(--c-border)' }}>
              {strengths.length > 0 && (
                <section aria-label="What you did well">
                  <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--c-text)' }}>
                    <ThumbsUp className="w-4 h-4" style={{ color: 'var(--c-success)' }} /> What you did well
                  </h2>
                  <ul className="space-y-2.5">
                    {strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                        <Check className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--c-success)' }} /><span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {weaknesses.length > 0 && (
                <section aria-label="What to work on">
                  <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--c-text)' }}>
                    <Lightbulb className="w-4 h-4" style={{ color: 'var(--c-accent)' }} /> What to work on
                  </h2>
                  <ol className="space-y-2.5">
                    {weaknesses.map((w, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                        <span className="text-xs font-bold w-4 shrink-0 mt-0.5" style={{ color: 'var(--c-accent)' }}>{i + 1}.</span><span>{w}</span>
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              <section aria-label="Next step" className="pt-6 border-t space-y-3" style={{ borderColor: 'var(--c-border)' }}>
                <p className="text-sm font-bold" style={{ color: 'var(--c-text)' }}>Ready for another round?</p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--c-text-muted)' }}>
                  Each new interview brings new questions, so you can practise the points above straight away.
                </p>
                <Link to="/interview/goal" className="c-btn c-btn-primary w-full px-6 py-3.5 text-sm font-bold rounded-md flex items-center justify-center gap-2">
                  <RotateCcw className="w-4 h-4" /> Practice again
                </Link>
                <div className="flex items-center justify-center gap-5 text-xs font-semibold pt-1">
                  <Link to="/history" className="flex items-center gap-1.5 hover:underline underline-offset-2" style={{ color: 'var(--c-text-secondary)' }}>
                    <History className="w-3.5 h-3.5" /> History
                  </Link>
                  <Link to="/dashboard" className="flex items-center gap-1.5 hover:underline underline-offset-2" style={{ color: 'var(--c-text-secondary)' }}>
                    <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
                  </Link>
                </div>
              </section>

              <p className="text-[11px] flex items-start gap-1.5 leading-relaxed" style={{ color: 'var(--c-text-muted)' }}>
                <Info className="w-3.5 h-3.5 shrink-0 mt-px" />
                Practice feedback from an automated coach to help you improve. It is not a hiring decision or a prediction of any employer's decision.
              </p>
            </aside>

            {/* Objective 7 - optional survey (last on phones, under the main column on desktop) */}
            <section aria-label="Rate this session" className="lg:col-span-8 pt-2">
              <InterviewSurvey interviewId={id} />
            </section>
          </div>
        )}
      </div>
    </InterviewFlowLayout>
  );
};

const SectionHeading = ({ children, hint }) => (
  <div className="mb-4">
    <h2 className="c-heading text-xl font-bold" style={{ color: 'var(--c-text)' }}>{children}</h2>
    {hint && <p className="text-xs mt-1" style={{ color: 'var(--c-text-muted)' }}>{hint}</p>}
  </div>
);

export default Feedback;
