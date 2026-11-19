import React, { useState } from 'react';
import { ChevronDown, BarChart3, ListOrdered, Layers, Cpu, FileText, Mic, Eye, Gauge, Languages } from 'lucide-react';

// FR 28-29 / NFR 17 - the technical detail behind a result, for reviewers and
// curious candidates. Collapsed by default so the main page stays simple.

const TABS = [
  { id: 'breakdown', label: 'Score breakdown', icon: BarChart3 },
  { id: 'answers', label: 'Answer by answer', icon: ListOrdered },
  { id: 'interview', label: 'Whole interview', icon: Layers },
  { id: 'method', label: 'How it was measured', icon: Cpu },
];

const PARTS = [
  { key: 'nlp_contribution', label: 'Content', color: 'var(--c-accent)' },
  { key: 'speech_contribution', label: 'Speaking', color: 'var(--c-success)' },
  { key: 'vision_contribution', label: 'Camera', color: '#60a5fa' },
];

const DIFFICULTY_WEIGHT = { Easy: 1.0, Medium: 1.25, Hard: 1.5 };

const fmt = (value, digits = 1, suffix = '') => {
  if (value === null || value === undefined || value === '' || Number.isNaN(Number(value))) return '—';
  return `${Number(value).toFixed(digits).replace(/\.0+$/, '')}${suffix}`;
};
const pct = (ratio) => (ratio === null || ratio === undefined ? '—' : `${Math.round(ratio * 100)}%`);

const FullAnalysis = ({ interview, evaluation, perQuestion, overallScore }) => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('breakdown');
  const questions = interview?.questions || [];
  const evalFor = (qid) => perQuestion.find((item) => (item.question_id || item.questionId) === qid);
  const respondedIds = new Set((interview?.responses || []).map((r) => r.question_id || r.questionId));
  const answered = questions
    .map((q, i) => ({ q, i, ev: evalFor(q.id) }))
    .filter((x) => x.ev && respondedIds.has(x.q.id));
  const [selected, setSelected] = useState(answered[0]?.q.id ?? null);

  return (
    <section aria-label="Full analysis" className="mt-12 rounded-xl border overflow-hidden" style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface)' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-4 px-5 sm:px-6 py-5 text-left group"
      >
        <span className="flex items-center gap-3 min-w-0">
          <span className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--c-surface-muted)', color: 'var(--c-accent)' }}>
            <Gauge className="w-5 h-5" />
          </span>
          <span className="min-w-0">
            <span className="block c-heading text-lg font-bold" style={{ color: 'var(--c-text)' }}>Full analysis</span>
            <span className="block text-xs mt-0.5" style={{ color: 'var(--c-text-muted)' }}>
              Every number behind your score: per-answer metrics, how each part was weighted, and the models used.
            </span>
          </span>
        </span>
        <span className="shrink-0 flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--c-accent)' }}>
          <span className="hidden sm:inline">{open ? 'Hide' : 'Show'}</span>
          <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {open && (
        <div className="border-t" style={{ borderColor: 'var(--c-border)' }}>
          <div role="tablist" aria-label="Full analysis views" className="flex gap-1 px-3 sm:px-4 pt-3 overflow-x-auto border-b" style={{ borderColor: 'var(--c-border)' }}>
            {TABS.map(({ id, label, icon: Icon }) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  role="tab"
                  type="button"
                  aria-selected={active}
                  onClick={() => setTab(id)}
                  className="flex items-center gap-1.5 px-3 py-2.5 text-xs sm:text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors"
                  style={{ borderColor: active ? 'var(--c-accent)' : 'transparent', color: active ? 'var(--c-text)' : 'var(--c-text-muted)' }}
                >
                  <Icon className="w-4 h-4" /> {label}
                </button>
              );
            })}
          </div>

          <div role="tabpanel" className="p-5 sm:p-6">
            {tab === 'breakdown' && <Breakdown answered={answered} evaluation={evaluation} overallScore={overallScore} total={questions.length} />}
            {tab === 'answers' && <Answers answered={answered} selected={selected} setSelected={setSelected} />}
            {tab === 'interview' && <Interview evaluation={evaluation} />}
            {tab === 'method' && <Method answered={answered} evaluation={evaluation} />}
          </div>
        </div>
      )}
    </section>
  );
};

// --- Score breakdown: stacked contribution bars + the aggregation formula ---
const Breakdown = ({ answered, evaluation, overallScore, total }) => {
  const formula = evaluation?.scoring_formula || {};
  const weights = formula.weights_mapping || DIFFICULTY_WEIGHT;
  return (
    <div className="space-y-6">
      <Legend />
      {answered.length === 0 && <Empty>No answers were recorded, so there is nothing to break down.</Empty>}
      <div className="space-y-4">
        {answered.map(({ q, i, ev }) => {
          const mm = ev.multimodal || {};
          const score = mm.score ?? ev.score;
          return (
            <div key={q.id} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-3 text-xs">
                <span className="font-semibold truncate" style={{ color: 'var(--c-text)' }}>
                  Q{i + 1} <span className="font-normal" style={{ color: 'var(--c-text-muted)' }}>· {ev.difficulty || q.difficulty} ×{fmt(ev.difficulty_weight ?? weights[ev.difficulty] ?? 1, 2)}</span>
                </span>
                <span className="font-mono font-bold" style={{ color: 'var(--c-text)' }}>{fmt(score)}%</span>
              </div>
              <div className="h-3 w-full rounded-full overflow-hidden flex" style={{ background: 'var(--c-surface-muted)' }} title={mm.rationale || ''}>
                {PARTS.map((p) => {
                  const part = mm[p.key];
                  const width = part?.weighted_contribution ?? 0;
                  return width > 0 ? <div key={p.key} style={{ width: `${Math.min(100, width)}%`, background: p.color }} /> : null;
                })}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] font-mono" style={{ color: 'var(--c-text-muted)' }}>
                {PARTS.map((p) => {
                  const part = mm[p.key];
                  if (!part || !part.weight) return <span key={p.key}>{p.label}: not used</span>;
                  return <span key={p.key}>{p.label} {fmt(part.raw_score)}% × {fmt(part.weight, 2)} = {fmt(part.weighted_contribution)}</span>;
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border p-4 space-y-2" style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface-muted)' }}>
        <p className="text-xs font-semibold" style={{ color: 'var(--c-text)' }}>Overall score</p>
        <p className="font-mono text-sm" style={{ color: 'var(--c-text)' }}>
          Σ(difficulty × answer score) / Σ difficulty = {fmt(formula.accumulated_weighted_score)} / {fmt(formula.total_difficulty_weight, 2)} = <strong>{fmt(formula.total_difficulty_weight ? formula.accumulated_weighted_score / formula.total_difficulty_weight : overallScore)}%</strong>
        </p>
        <p className="text-[11px]" style={{ color: 'var(--c-text-muted)' }}>
          Difficulty weights: {Object.entries(weights).map(([k, v]) => `${k} ×${v}`).join(', ')}. {answered.length < total ? `${total - answered.length} unanswered question(s) count as 0 but keep their weight.` : 'All questions were answered.'}
        </p>
      </div>
    </div>
  );
};

const Legend = () => (
  <div className="flex flex-wrap gap-4 text-xs" style={{ color: 'var(--c-text-secondary)' }}>
    {PARTS.map((p) => (
      <span key={p.key} className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-sm" style={{ background: p.color }} /> {p.label}
      </span>
    ))}
    <span style={{ color: 'var(--c-text-muted)' }}>Bar length = points each part added to the answer's score.</span>
  </div>
);

// --- Answer by answer: every metric for one selected answer ---
const Answers = ({ answered, selected, setSelected }) => {
  const current = answered.find((a) => a.q.id === selected) || answered[0];
  if (!current) return <Empty>No answers were evaluated.</Empty>;
  const { q, i, ev } = current;
  const ta = ev.text_analysis || {};
  const lang = ta.language_analysis || {};
  const dl = ev.delivery || {};
  const fa = ev.facial_analysis || {};
  const cs = ev.confidence_and_stress || {};
  const typed = ev.response_mode === 'text';
  const dist = fa.expression_distribution || {};

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {answered.map((a) => {
          const active = a.q.id === current.q.id;
          const s = a.ev.multimodal?.score ?? a.ev.score;
          return (
            <button key={a.q.id} type="button" onClick={() => setSelected(a.q.id)} aria-pressed={active}
              className="px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors"
              style={{ borderColor: active ? 'var(--c-accent)' : 'var(--c-border)', background: active ? 'var(--c-accent)' : 'transparent', color: active ? '#fff' : 'var(--c-text-secondary)' }}>
              Q{a.i + 1} · {fmt(s, 0)}%
            </button>
          );
        })}
      </div>
      <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--c-text)' }}>{i + 1}. {q.question_text}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Group icon={FileText} title="Content" note={ta.model}>
          <Metric label="Content score" value={fmt(ta.content_score, 1, '%')} strong />
          <Metric label="Match to a strong answer" value={fmt(ta.semantic_similarity_score, 1, '%')} />
          <Metric label="Key concepts covered" value={fmt(ta.concept_coverage_score, 1, '%')} />
          <Metric label="Relevance to the question" value={fmt(ta.relevance_score, 1, '%')} />
          <Metric label="Completeness" value={fmt(ta.completeness_score, 1, '%')} />
        </Group>

        <Group icon={Languages} title="Language" note={lang.method}>
          <Metric label="Language quality" value={fmt(lang.language_quality_score ?? ta.language_quality_score, 1, '%')} strong />
          <Metric label="Grammar" value={fmt(lang.grammar_score ?? ta.grammar_score, 1, '%')} />
          <Metric label="BERT acceptability" value={fmt(lang.bert_acceptability, 1, '%')} />
          <Metric label="Clarity" value={fmt(lang.clarity_score ?? ta.clarity_score, 1, '%')} />
          <Metric label="Vocabulary" value={fmt(lang.vocabulary_score, 1, '%')} />
          <Metric label="Tone" value={lang.tone?.label || ta.tone || '—'} />
        </Group>

        <Group icon={Mic} title="Speaking" note={typed ? 'Typed answer - not measured' : null}>
          {typed ? <Empty>Speaking is only measured for spoken answers.</Empty> : (
            <>
              <Metric label="Fluency score" value={fmt(dl.fluency_score, 1, '%')} strong />
              <Metric label="Words / duration" value={`${fmt(dl.word_count, 0)} words · ${fmt(dl.duration_seconds, 1, ' s')}`} />
              <Metric label="Pace" value={`${fmt(dl.words_per_minute, 0)} wpm (${dl.pacing || '—'})`} />
              <Metric label="Pace while speaking" value={fmt(dl.articulation_wpm, 0, ' wpm')} />
              <Metric label="Filler words" value={`${fmt(dl.filler_count, 0)}${dl.filler_words?.length ? ` (${dl.filler_words.slice(0, 3).join(', ')})` : ''}`} />
              <Metric label="Pauses" value={`${fmt(dl.pause_count, 0)} · ${fmt(dl.pause_duration_seconds, 1, ' s')}`} />
              <Metric label="Hesitation" value={`${fmt(dl.hesitation_rate, 1)} (${dl.hesitation_level || '—'})`} />
            </>
          )}
        </Group>

        <Group icon={Eye} title="Camera" note={fa.model}>
          {fa.status !== 'completed' ? <Empty>{typed && !fa.status ? 'No video for this answer.' : 'Face could not be assessed for this answer.'}</Empty> : (
            <>
              <Metric label="In frame" value={`${pct(fa.camera_presence_ratio ?? fa.face_presence_ratio)} (${fmt(fa.frames_with_face, 0)}/${fmt(fa.total_frames_sampled, 0)} frames)`} />
              <Metric label="Usual / secondary expression" value={`${fa.baseline_expression || fa.dominant_expression || '—'} / ${fa.secondary_expression || '—'}`} />
              <Metric label="Strongest moment" value={fa.peak_moment ? `${fa.peak_moment.expression} at ${fmt(fa.peak_moment.timestamp_seconds, 1, ' s')}` : '—'} />
              <Metric label="Steadiness" value={fa.behavioral_indicators?.composure_index || '—'} />
              <Metric label="Visible tension" value={fa.behavioral_indicators?.observable_tension || '—'} />
              <Metric label="Expression changes" value={fmt(fa.temporal_dynamics?.label_changes, 0)} />
              {Object.keys(dist).length > 0 && <Distribution dist={dist} />}
            </>
          )}
        </Group>
      </div>

      <Group icon={Gauge} title="Confidence and stress" note={cs.method}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
          <Metric label="Confidence" value={cs.confidence_level === 'Not Assessed' ? 'Not assessed' : `${fmt(cs.confidence_score, 1)} (${cs.confidence_level || '—'})`} strong />
          <Metric label="Stress" value={cs.stress_level === 'Not Assessed' ? 'Not assessed' : `${fmt(cs.stress_score, 1)} (${cs.stress_level || '—'})`} strong />
        </div>
        {cs.rationale && <p className="text-[11px] leading-relaxed pt-2" style={{ color: 'var(--c-text-muted)' }}>{cs.rationale}</p>}
      </Group>
    </div>
  );
};

const Distribution = ({ dist }) => {
  const entries = Object.entries(dist).sort((a, b) => b[1] - a[1]);
  return (
    <div className="pt-2 space-y-1">
      {entries.map(([name, value]) => (
        <div key={name} className="flex items-center gap-2 text-[11px]">
          <span className="w-16 capitalize shrink-0" style={{ color: 'var(--c-text-muted)' }}>{name}</span>
          <span className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--c-surface-muted)' }}>
            <span className="block h-full rounded-full" style={{ width: `${Math.min(100, value)}%`, background: '#60a5fa' }} />
          </span>
          <span className="w-10 text-right font-mono" style={{ color: 'var(--c-text-secondary)' }}>{fmt(value, 1)}%</span>
        </div>
      ))}
    </div>
  );
};

// --- Whole interview: compiled metrics across all answers ---
const Interview = ({ evaluation }) => {
  const agg = evaluation?.aggregate_analysis || {};
  const m = agg.compiled_metrics || {};
  const t = m.technical || {};
  const c = m.communication || {};
  const b = m.behavioral || {};
  const cam = evaluation?.camera_conduct || evaluation?.facial_summary?.camera_conduct || {};
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Questions" value={fmt(agg.total_questions, 0)} />
        <Stat label="Answered" value={fmt(agg.answered_questions, 0)} />
        <Stat label="Skipped" value={fmt(agg.skipped_questions, 0)} />
        <Stat label="Completion" value={fmt(agg.completion_rate, 0, '%')} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Group icon={FileText} title="Content">
          <Metric label="Average content score" value={fmt(t.avg_content_score, 1, '%')} strong />
          <Metric label="Average match" value={fmt(t.avg_semantic_similarity, 1, '%')} />
          <Chips label="Covered" items={t.covered_concepts} />
          <Chips label="Missed" items={t.missing_concepts} />
        </Group>
        <Group icon={Mic} title="Speaking">
          <Metric label="Average fluency" value={fmt(c.avg_fluency_score, 1, '%')} strong />
          <Metric label="Average pace" value={fmt(c.avg_wpm, 0, ' wpm')} />
          <Metric label="Pace while speaking" value={fmt(c.avg_articulation_wpm, 0, ' wpm')} />
          <Metric label="Filler words" value={fmt(c.total_fillers, 0)} />
          <Metric label="Pauses" value={`${fmt(c.total_pause_count, 0)} · ${fmt(c.total_pause_duration_seconds, 1, ' s')}`} />
        </Group>
        <Group icon={Eye} title="Camera">
          <Metric label="Answers with video" value={fmt(b.evaluated_takes, 0)} />
          <Metric label="Usual expression" value={b.dominant_expression || '—'} />
          <Metric label="Steadiness" value={b.overall_composure || '—'} />
          <Metric label="Average time in frame" value={pct(cam.average_presence_ratio)} />
          <Metric label="Mostly off camera" value={cam.off_camera_answers?.length ? `Q${cam.off_camera_answers.join(', Q')}` : 'None'} />
          <Metric label="Flagged expressions" value={cam.flagged_answers?.length ? `Q${cam.flagged_answers.join(', Q')}` : 'None'} />
        </Group>
      </div>
    </div>
  );
};

// --- How it was measured: models and weights actually used ---
const Method = ({ answered, evaluation }) => {
  const first = (path) => answered.map(({ ev }) => path(ev)).find(Boolean);
  const rows = [
    ['Speech to text', first((ev) => ev.asr?.provider) || 'Google Speech-to-Text'],
    ['Answer content', first((ev) => ev.text_analysis?.model) || '—'],
    ['Grammar and language', first((ev) => ev.text_analysis?.language_analysis?.method) || '—'],
    ['Facial expression', first((ev) => ev.facial_analysis?.model) || '—'],
    ['Combining the parts', first((ev) => ev.multimodal?.fusion_method) || '—'],
    ['Confidence and stress', first((ev) => ev.confidence_and_stress?.method) || '—'],
    ['Overall score', evaluation?.scoring_formula?.method || '—'],
  ];
  return (
    <div className="space-y-5">
      <dl className="divide-y rounded-lg border" style={{ borderColor: 'var(--c-border)' }}>
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-1 sm:grid-cols-3 gap-1 px-4 py-2.5 text-xs" style={{ borderColor: 'var(--c-border)' }}>
            <dt className="font-semibold" style={{ color: 'var(--c-text)' }}>{k}</dt>
            <dd className="sm:col-span-2 font-mono break-words" style={{ color: 'var(--c-text-secondary)' }}>{v}</dd>
          </div>
        ))}
      </dl>
      <div className="text-xs leading-relaxed space-y-2" style={{ color: 'var(--c-text-secondary)' }}>
        <p><strong style={{ color: 'var(--c-text)' }}>Weights.</strong> Each answer is 50% content, 30% speaking and 20% camera. If a part could not be measured (typed answer, no camera), its weight is shared among the parts that were. A silent answer keeps the camera at 20% at most, so looking calm without answering cannot score well.</p>
        <p><strong style={{ color: 'var(--c-text)' }}>Limits.</strong> Confidence, stress and expression indicators are behavioural heuristics that have not yet been calibrated against human ratings. The face models only recognise eight expression classes; they cannot tell intent, sarcasm or how you felt.</p>
      </div>
    </div>
  );
};

// --- Small building blocks ---
const Group = ({ icon: Icon, title, note, children }) => (
  <div className="rounded-lg border p-4" style={{ borderColor: 'var(--c-border)' }}>
    <div className="flex items-center justify-between gap-2 mb-2">
      <p className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--c-text)' }}>
        <Icon className="w-3.5 h-3.5" style={{ color: 'var(--c-accent)' }} /> {title}
      </p>
      {note && <span className="text-[10px] font-mono truncate max-w-[55%]" title={note} style={{ color: 'var(--c-text-muted)' }}>{note}</span>}
    </div>
    <div>{children}</div>
  </div>
);

const Metric = ({ label, value, strong }) => (
  <div className="flex items-baseline justify-between gap-3 py-1 text-xs">
    <span style={{ color: 'var(--c-text-muted)' }}>{label}</span>
    <span className={`font-mono text-right ${strong ? 'font-bold' : ''}`} style={{ color: 'var(--c-text)' }}>{value}</span>
  </div>
);

const Stat = ({ label, value }) => (
  <div className="rounded-lg border p-3" style={{ borderColor: 'var(--c-border)' }}>
    <p className="text-[11px]" style={{ color: 'var(--c-text-muted)' }}>{label}</p>
    <p className="font-mono text-lg font-bold" style={{ color: 'var(--c-text)' }}>{value}</p>
  </div>
);

const Chips = ({ label, items }) => (
  <div className="pt-1.5">
    <p className="text-[11px] mb-1" style={{ color: 'var(--c-text-muted)' }}>{label}</p>
    {items?.length ? (
      <div className="flex flex-wrap gap-1">
        {items.slice(0, 8).map((c) => (
          <span key={c} className="rounded-full border px-2 py-0.5 text-[11px]" style={{ borderColor: 'var(--c-border)', color: 'var(--c-text-secondary)' }}>{c}</span>
        ))}
      </div>
    ) : <p className="text-[11px]" style={{ color: 'var(--c-text-muted)' }}>—</p>}
  </div>
);

const Empty = ({ children }) => <p className="text-xs py-1" style={{ color: 'var(--c-text-muted)' }}>{children}</p>;

export default FullAnalysis;
