import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, CheckCircle2 } from 'lucide-react';
import InterviewFlowLayout from '../layouts/InterviewFlowLayout';
import { getInterviewById } from '../services/candidateApi';

// FR10 - trigger post-interview analysis. This screen is the named
// integration point for the real evaluation pipeline (FR13-FR16, FR34 -
// speech-to-text, NLP, facial analysis, multimodal integration). Real
// speech-to-text (FR15) already runs per-response during the interview;
// aggregate scoring does not exist yet, so the copy here stays honest
// about "processing" rather than claiming a finished AI result.
const STEPS = [
  'Submitting your responses…',
  'Preparing your evaluation…',
  'Finalizing your report…',
];

const InterviewCompletion = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getInterviewById(id).then((interview) => {
      if (cancelled) return;
      if (!interview) {
        navigate('/dashboard');
        return;
      }

      const stepDelay = 700;
      STEPS.forEach((_, i) => {
        setTimeout(() => {
          if (!cancelled) setStepIndex(i);
        }, stepDelay * i);
      });
      setTimeout(() => {
        if (!cancelled) setReady(true);
      }, stepDelay * STEPS.length);
    });

    return () => { cancelled = true; };
  }, [id, navigate]);

  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => navigate(`/interview/${id}/results`), 600);
    return () => clearTimeout(t);
  }, [ready, id, navigate]);

  return (
    <InterviewFlowLayout step="complete">
      <div className="max-w-md mx-auto flex flex-col items-center text-center py-16">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
          style={{ background: ready ? 'var(--c-success-soft)' : 'var(--c-accent-soft)' }}
        >
          {ready ? (
            <CheckCircle2 className="w-8 h-8" style={{ color: 'var(--c-success)' }} />
          ) : (
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--c-accent)' }} />
          )}
        </div>
        <h1 className="c-heading text-xl mb-2">
          {ready ? 'Interview completed' : 'Wrapping up your interview'}
        </h1>
        <p className="text-sm" style={{ color: 'var(--c-text-secondary)' }}>
          {ready ? 'Your evaluation is still processing — taking you to your results…' : STEPS[stepIndex]}
        </p>
      </div>
    </InterviewFlowLayout>
  );
};

export default InterviewCompletion;
