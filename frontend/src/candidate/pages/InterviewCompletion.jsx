import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, CheckCircle2 } from 'lucide-react';
import InterviewFlowLayout from '../layouts/InterviewFlowLayout';
import { getInterviewById } from '../services/candidateApi';

// FR10 - trigger post-interview analysis. This screen is the named
// integration point for the real evaluation pipeline (FR13-FR16, FR34 -
// speech-to-text, NLP, facial analysis, multimodal integration). None of
// that runs yet, so the copy here is deliberately generic about what's
// happening rather than claiming a specific AI step took place.
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
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/30 mb-6">
          {ready ? (
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          ) : (
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          )}
        </div>
        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
          {ready ? 'Your evaluation is ready' : 'Wrapping up your interview'}
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">
          {ready ? 'Taking you to your results…' : STEPS[stepIndex]}
        </p>
      </div>
    </InterviewFlowLayout>
  );
};

export default InterviewCompletion;
