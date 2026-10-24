import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { getSurvey, submitSurvey } from '../services/candidateApi';

// Objective 7 - user survey. Ratings feed usability evaluation; the
// self-rated score is compared with MockAI's score for accuracy testing.

const QUESTIONS = [
  { key: 'usefulness', label: 'How useful was the feedback?' },
  { key: 'accuracy', label: 'How accurate did your score feel?' },
  { key: 'ease_of_use', label: 'How easy was MockAI to use?' },
  { key: 'confidence_gain', label: 'Do you feel better prepared for real interviews?' },
];

const EMPTY = { usefulness: 0, accuracy: 0, ease_of_use: 0, confidence_gain: 0, would_recommend: null, self_rated_score: '', comments: '' };

const InterviewSurvey = ({ interviewId }) => {
  const [form, setForm] = useState(EMPTY);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [skipped, setSkipped] = useState(false);

  useEffect(() => {
    let mounted = true;
    getSurvey(interviewId)
      .then((s) => {
        if (!mounted || !s) return;
        setForm({
          usefulness: s.usefulness || 0,
          accuracy: s.accuracy || 0,
          ease_of_use: s.ease_of_use || 0,
          confidence_gain: s.confidence_gain || 0,
          would_recommend: s.would_recommend,
          self_rated_score: s.self_rated_score ?? '',
          comments: s.comments || '',
        });
        setSubmitted(true);
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, [interviewId]);

  const complete = QUESTIONS.every((q) => form[q.key] > 0) && form.would_recommend !== null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!complete) {
      setError('Please answer all rating questions.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await submitSurvey(interviewId, {
        ...form,
        self_rated_score: form.self_rated_score === '' ? null : Number(form.self_rated_score),
        comments: form.comments || null,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Could not submit the survey.');
    } finally {
      setSaving(false);
    }
  };

  const set = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setSubmitted(false);
  };

  if (skipped) {
    return (
      <section aria-label="Feedback Survey" className="border-b pb-8" style={{ borderColor: 'var(--c-border)' }}>
        <p className="text-xs" style={{ color: 'var(--c-text-secondary)' }}>
          Survey skipped.{' '}
          <button type="button" onClick={() => setSkipped(false)} className="font-semibold underline underline-offset-2" style={{ color: 'var(--c-text)' }}>
            Rate this session
          </button>
        </p>
      </section>
    );
  }

  return (
    <section aria-label="Feedback Survey" className="border-b pb-10 space-y-4" style={{ borderColor: 'var(--c-border)' }}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="c-heading text-xl font-bold" style={{ color: 'var(--c-text)' }}>Rate this session</h2>
          <p className="text-xs mt-1" style={{ color: 'var(--c-text-secondary)' }}>
            Optional, takes under a minute. Your answers help us measure how accurate and useful MockAI is.
          </p>
        </div>
        {!submitted && (
          <button type="button" onClick={() => setSkipped(true)} className="c-btn c-btn-secondary shrink-0 px-3.5 py-2 text-xs font-semibold rounded-md">
            Skip survey
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="divide-y border-t border-b text-xs" style={{ borderColor: 'var(--c-border)' }}>
          {QUESTIONS.map((q) => (
            <div key={q.key} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="font-semibold" style={{ color: 'var(--c-text)' }}>{q.label}</span>
              <div className="flex items-center gap-1.5" role="radiogroup" aria-label={q.label}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={form[q.key] === n}
                    onClick={() => set(q.key, n)}
                    className="w-10 h-10 sm:w-8 sm:h-8 rounded-md border text-xs font-bold transition-colors"
                    style={{
                      borderColor: form[q.key] === n ? 'var(--c-accent)' : 'var(--c-border)',
                      background: form[q.key] === n ? 'var(--c-accent)' : 'var(--c-surface)',
                      color: form[q.key] === n ? '#fff' : 'var(--c-text-secondary)',
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="font-semibold" style={{ color: 'var(--c-text)' }}>Would you recommend MockAI to a friend?</span>
            <div className="flex items-center gap-1.5">
              {[{ v: true, l: 'Yes' }, { v: false, l: 'No' }].map(({ v, l }) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => set('would_recommend', v)}
                  className="px-4 h-8 rounded-md border text-xs font-bold"
                  style={{
                    borderColor: form.would_recommend === v ? 'var(--c-accent)' : 'var(--c-border)',
                    background: form.would_recommend === v ? 'var(--c-accent)' : 'var(--c-surface)',
                    color: form.would_recommend === v ? '#fff' : 'var(--c-text-secondary)',
                  }}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label htmlFor="self-score" className="font-semibold" style={{ color: 'var(--c-text)' }}>
              What score would you give your own performance? <span className="font-normal" style={{ color: 'var(--c-text-muted)' }}>(0–100, optional)</span>
            </label>
            <input
              id="self-score"
              type="number"
              min={0}
              max={100}
              value={form.self_rated_score}
              onChange={(e) => set('self_rated_score', e.target.value === '' ? '' : Math.max(0, Math.min(100, Number(e.target.value))))}
              className="w-24 h-8 rounded-md border px-2 text-xs"
              style={{ background: 'var(--c-surface-muted)', borderColor: 'var(--c-border)', color: 'var(--c-text)' }}
            />
          </div>
        </div>

        <textarea
          value={form.comments}
          onChange={(e) => set('comments', e.target.value)}
          maxLength={1000}
          rows={3}
          placeholder="Anything we should improve? (optional)"
          className="w-full rounded-md border p-3 text-xs leading-relaxed"
          style={{ background: 'var(--c-surface-muted)', borderColor: 'var(--c-border)', color: 'var(--c-text)' }}
        />

        {error && (
          <p className="text-xs flex items-center gap-1.5" style={{ color: 'var(--c-danger)' }}>
            <AlertCircle className="w-3.5 h-3.5" /> {error}
          </p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving || !complete}
            className="c-btn c-btn-primary px-5 py-2.5 text-xs font-bold rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Submitting…' : submitted ? 'Update response' : 'Submit'}
          </button>
          {submitted && !saving && (
            <span className="text-xs flex items-center gap-1.5" style={{ color: 'var(--c-success)' }}>
              <CheckCircle2 className="w-3.5 h-3.5" /> Thank you, your response is saved.
            </span>
          )}
        </div>
      </form>
    </section>
  );
};

export default InterviewSurvey;
