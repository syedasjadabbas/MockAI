import React from 'react';

// FR16-01 / Objective 3 - language quality, grammar and tone, produced by
// backend/services/language_analyzer.py. Rendered on the Results page.

const TONE_COLORS = {
  Confident: 'var(--c-success)',
  Balanced: 'var(--c-accent)',
  Tentative: 'var(--c-warning, #f59e0b)',
  Uncertain: 'var(--c-danger)',
};

const Meter = ({ label, value, hint }) => (
  <div className="p-4 rounded-lg border space-y-2" style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)' }}>
    <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--c-text-muted)' }}>{label}</p>
    <p className="c-serif-num text-3xl font-bold" style={{ color: 'var(--c-text)' }}>
      {value != null ? `${Math.round(value)}%` : '—'}
    </p>
    <div className="h-1.5 rounded-sm overflow-hidden" style={{ background: 'var(--c-surface-muted)' }}>
      <div className="h-full rounded-sm" style={{ width: `${Math.max(0, Math.min(100, value || 0))}%`, background: 'var(--c-accent)' }} />
    </div>
    {hint && <p className="text-[11px] leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>{hint}</p>}
  </div>
);

export const LanguageSummarySection = ({ summary }) => {
  if (!summary || summary.status !== 'completed') return null;
  const tone = summary.dominant_tone;
  const examples = summary.issue_examples || [];

  return (
    <section aria-label="Language and Tone" className="border-b pb-10 space-y-4" style={{ borderColor: 'var(--c-border)' }}>
      <div>
        <h2 className="c-heading text-xl font-bold" style={{ color: 'var(--c-text)' }}>Grammar, Clarity & Tone</h2>
        <p className="text-xs mt-1" style={{ color: 'var(--c-text-secondary)' }}>
          How well your answers were expressed, across {summary.evaluated_answers} answered question{summary.evaluated_answers === 1 ? '' : 's'}.
          Reported alongside your content score; it does not change the overall score.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-2">
        <Meter label="Language Quality" value={summary.avg_language_quality} hint="Combined grammar, clarity and vocabulary." />
        <Meter label="Grammar" value={summary.avg_grammar_score} hint={`${summary.total_issues} issue${summary.total_issues === 1 ? '' : 's'} detected.`} />
        <Meter label="Clarity" value={summary.avg_clarity_score} hint="Sentence length, structure and signposting." />
        <div className="p-4 rounded-lg border space-y-2" style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)' }}>
          <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--c-text-muted)' }}>Tone</p>
          <p className="c-heading text-2xl font-bold" style={{ color: TONE_COLORS[tone] || 'var(--c-text)' }}>{tone}</p>
          <p className="text-[11px] leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
            Assertiveness {Math.round(summary.avg_assertiveness)}%.
            {summary.common_hedges?.length > 0 && <> Frequent hedges: {summary.common_hedges.map((h) => `“${h}”`).join(', ')}.</>}
          </p>
        </div>
      </div>

      {examples.length > 0 && (
        <div className="space-y-2 pt-2">
          <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--c-text-muted)' }}>Corrections</h3>
          <ul className="divide-y text-xs border-t border-b" style={{ borderColor: 'var(--c-border)' }}>
            {examples.map((issue, i) => (
              <li key={i} className="py-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="c-badge c-badge-muted text-[10px]">{issue.type}</span>
                <span className="line-through" style={{ color: 'var(--c-text-muted)' }}>{issue.excerpt}</span>
                <span style={{ color: 'var(--c-text-muted)' }}>→</span>
                <span className="font-semibold" style={{ color: 'var(--c-text)' }}>{issue.suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
};

export const QuestionLanguageNotes = ({ textAnalysis }) => {
  const lang = textAnalysis?.language_analysis;
  if (!lang || lang.status !== 'completed') return null;
  const issues = lang.grammar_issues || [];
  return (
    <div className="flex flex-wrap items-center gap-2 text-[11px]" style={{ color: 'var(--c-text-secondary)' }}>
      <span className="c-badge c-badge-muted text-[10px]">Grammar {Math.round(lang.grammar_score)}%</span>
      <span className="c-badge c-badge-muted text-[10px]">Clarity {Math.round(lang.clarity_score)}%</span>
      <span className="c-badge c-badge-muted text-[10px]" style={{ color: TONE_COLORS[lang.tone?.label] }}>
        Tone: {lang.tone?.label}
      </span>
      {issues.slice(0, 3).map((issue, i) => (
        <span key={i}>
          <span className="line-through" style={{ color: 'var(--c-text-muted)' }}>{issue.excerpt}</span>
          {' → '}
          <span className="font-semibold" style={{ color: 'var(--c-text)' }}>{issue.suggestion}</span>
        </span>
      ))}
    </div>
  );
};
