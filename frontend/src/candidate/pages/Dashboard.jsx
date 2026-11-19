import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  ArrowRight,
  ChevronRight,
  ChevronDown,
  Code2,
  Server,
  Cpu,
  Users,
  Database,
  Briefcase,
  Stethoscope,
  HeartPulse,
  GraduationCap,
  Calculator,
  Scale,
  Megaphone,
  Palette,
  HardHat,
  TrendingUp,
  MessageSquare,
  Mic,
  Sparkles,
  PlayCircle,
  Trophy,
  CheckCircle2,
  FileText,
  Eye,
} from 'lucide-react';
import CandidateNav from '../components/CandidateNav';
import AnimatedBackground3D from '../components/AnimatedBackground3D';
import ScoreRing from '../components/ScoreRing';
import { getDashboardSummary, getCategories, startInterview } from '../services/candidateApi';
import { getSession } from '../services/candidateAuth';
import { formatDate } from '../../utils/dateFormat';

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const firstName = (name) => (name || '').trim().split(/\s+/)[0];

// Plain words and colours for a score, the same as on the results page.
const verdictFor = (score) => (score >= 75 ? 'Strong' : score >= 55 ? 'Good' : score >= 35 ? 'Getting there' : 'Needs work');
const toneFor = (score) => (score >= 75 ? 'success' : score >= 40 ? 'accent' : 'danger');
const colorFor = (score) => `var(--c-${toneFor(score)})`;
const TYPE_NAMES = { technical: 'Technical', behavioral: 'HR & Behavioral', situational: 'Situational' };

function getCategoryIcon(categoryName = '') {
  const str = categoryName.toLowerCase();
  if (str.includes('health') || str.includes('medic') || str.includes('doctor')) return Stethoscope;
  if (str.includes('nurs') || str.includes('patient')) return HeartPulse;
  if (str.includes('teach') || str.includes('educat')) return GraduationCap;
  if (str.includes('account') || str.includes('financ')) return Calculator;
  if (str.includes('law') || str.includes('legal')) return Scale;
  if (str.includes('market') || str.includes('brand')) return Megaphone;
  if (str.includes('human') || str.includes('talent') || str.includes('recruit') || str.includes('hr') || str.includes('behav') || str.includes('leader')) return Users;
  if (str.includes('design') || str.includes('graphic')) return Palette;
  if (str.includes('civil') || str.includes('structur') || str.includes('construct')) return HardHat;
  if (str.includes('sale') || str.includes('client') || str.includes('revenue')) return TrendingUp;
  if (str.includes('front') || str.includes('react') || str.includes('web')) return Code2;
  if (str.includes('back') || str.includes('node') || str.includes('server') || str.includes('system')) return Server;
  if (str.includes('ai') || str.includes('ml') || str.includes('learning')) return Cpu;
  if (str.includes('data') || str.includes('sql') || str.includes('database')) return Database;
  return Briefcase;
}

// Fields shown first, so the quick-start list covers many professions.
const PREFERRED_TRACK_ORDER = [
  'Frontend Development',
  'Healthcare & Medicine',
  'Education & Teaching',
  'Accounting & Financial Analysis',
  'Marketing & Brand Management',
  'Behavioral & Leadership',
  'Backend & Distributed Systems',
  'Nursing & Patient Care',
  'Law & Legal Practice',
  'Data Analytics & SQL',
  'Graphic & Visual Design',
  'Human Resources & Talent Management',
  'Civil & Structural Engineering',
  'Business Analysis & Strategy',
  'Sales Leadership & Client Acquisition',
  'AI & Machine Learning',
];
const FIELDS_SHOWN = 6;

const Panel = ({ children, className = '', ...rest }) => (
  <section className={`rounded-2xl border p-5 sm:p-6 ${className}`} style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)' }} {...rest}>
    {children}
  </section>
);

const Bar100 = ({ value, color }) => (
  <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: 'var(--c-surface-muted)' }}>
    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, Math.max(0, value ?? 0))}%`, background: color }} />
  </div>
);

// FR 04 / FR 31 / FR 32 - the candidate's home: start practising, continue,
// see progress at a glance and open recent results.
const Dashboard = () => {
  const navigate = useNavigate();
  const [session] = useState(getSession());
  const [summary, setSummary] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [launchingId, setLaunchingId] = useState(null);
  const [showAllFields, setShowAllFields] = useState(false);

  useEffect(() => {
    let isMounted = true;
    Promise.all([getCategories().catch(() => []), getDashboardSummary().catch(() => null)])
      .then(([cats, summ]) => {
        if (!isMounted) return;
        setCategories(cats || []);
        setSummary(summ);
      })
      .finally(() => { if (isMounted) setLoading(false); });
    return () => { isMounted = false; };
  }, []);

  const orderedCategories = useMemo(() => {
    const map = new Map((categories || []).map((c) => [c.name, c]));
    const list = [];
    PREFERRED_TRACK_ORDER.forEach((name) => {
      if (map.has(name)) { list.push(map.get(name)); map.delete(name); }
    });
    map.forEach((c) => list.push(c));
    return list;
  }, [categories]);

  const handleLaunchCategory = async (category) => {
    setLaunchingId(category.id);
    try {
      const interviewType = /behav|leadership/i.test(category.name) ? 'behavioral' : 'technical';
      const newInterview = await startInterview({ role: category.name, categoryId: category.id, interviewType });
      navigate(`/interview/${newInterview.id}/prepare`);
    } catch (err) {
      console.error('Could not start the interview:', err);
      setLaunchingId(null);
    }
  };

  const recent = summary?.recent || [];
  const hasInterviews = (summary?.totalInterviews ?? 0) > 0;
  const hasScore = summary?.averageScore != null;
  const unfinished = recent.find((i) => i.status !== 'Completed');
  const lastResult = recent.find((i) => i.status === 'Completed' && i.score != null);
  const dims = summary?.dimensionAverages || {};
  const skills = [
    { label: 'What you say', Icon: FileText, value: dims.technical_content },
    { label: 'How you say it', Icon: Mic, value: dims.communication_fluency },
    { label: 'On camera', Icon: Eye, value: dims.behavioral_composure },
  ];
  const fields = showAllFields ? orderedCategories : orderedCategories.slice(0, FIELDS_SHOWN);

  return (
    <div className="candidate-app min-h-screen flex flex-col font-sans relative" style={{ background: 'var(--c-bg)' }}>
      <AnimatedBackground3D />
      <div className="relative z-10">
        <CandidateNav />
      </div>

      <main className="c-page py-8 sm:py-12 space-y-6 relative z-[1] w-full">

        {/* 1. Welcome + progress at a glance */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <Panel className="lg:col-span-7 flex flex-col justify-center !p-6 sm:!p-10">
            <p className="text-sm font-medium" style={{ color: 'var(--c-text-secondary)' }}>
              {greeting()}{firstName(session?.name) ? `, ${firstName(session?.name)}` : ''} 👋
            </p>
            <h1 className="c-heading text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.1] mt-2" style={{ color: 'var(--c-text)' }}>
              Practice before it matters.
            </h1>
            <p className="text-sm sm:text-base leading-relaxed max-w-xl mt-3" style={{ color: 'var(--c-text-secondary)' }}>
              Pick a field, answer three easy questions by voice, camera or typing, and get feedback on every answer.
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-6">
              <Link to="/interview/goal" className="c-btn c-btn-primary px-6 py-3 font-bold text-sm rounded-md flex items-center gap-2">
                <Plus className="w-4 h-4" /> Start an interview
              </Link>
              {hasInterviews && (
                <Link to="/progress" className="c-btn c-btn-secondary px-5 py-3 font-semibold text-sm rounded-md flex items-center gap-2">
                  See my progress <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          </Panel>

          <Panel className="lg:col-span-5">
            {loading ? (
              <div className="space-y-3" aria-busy="true">
                <div className="c-skeleton h-6 w-1/2 rounded" />
                <div className="c-skeleton h-32 rounded-xl" />
                <div className="c-skeleton h-4 rounded" />
              </div>
            ) : hasScore ? (
              <>
                <h2 className="text-base font-bold" style={{ color: 'var(--c-text)' }}>Your progress</h2>
                <div className="flex items-center gap-5 mt-4">
                  <ScoreRing value={Math.round(summary.averageScore)} suffix="%" size={112} strokeWidth={10} tone={toneFor(summary.averageScore)} />
                  <div className="space-y-2 min-w-0">
                    <div>
                      <p className="text-xs" style={{ color: 'var(--c-text-muted)' }}>Average score</p>
                      <p className="text-xl font-bold" style={{ color: colorFor(summary.averageScore) }}>{verdictFor(summary.averageScore)}</p>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: 'var(--c-text-secondary)' }}>
                      {summary.bestScore != null && (
                        <span className="flex items-center gap-1"><Trophy className="w-3.5 h-3.5" style={{ color: 'var(--c-warning)' }} /> Best {Math.round(summary.bestScore)}%</span>
                      )}
                      <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'var(--c-success)' }} /> {summary.completedInterviews} completed</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-3 mt-5">
                  {skills.map(({ label, Icon, value }) => (
                    <div key={label} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 font-semibold" style={{ color: 'var(--c-text)' }}>
                          <Icon className="w-3.5 h-3.5" style={{ color: 'var(--c-text-muted)' }} /> {label}
                        </span>
                        <span className="font-bold" style={{ color: value != null ? colorFor(value) : 'var(--c-text-muted)' }}>
                          {value != null ? `${Math.round(value)}%` : 'Not yet'}
                        </span>
                      </div>
                      <Bar100 value={value} color={colorFor(value ?? 0)} />
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <h2 className="text-base font-bold" style={{ color: 'var(--c-text)' }}>How it works</h2>
                <ol className="space-y-4 mt-4">
                  {[
                    { Icon: MessageSquare, title: 'Tell us your goal', text: 'Type the job you are preparing for, or pick a field.' },
                    { Icon: Mic, title: 'Answer 3 easy questions', text: 'Speak on camera, use only your voice, or type.' },
                    { Icon: Sparkles, title: 'Get your feedback', text: 'A score, what went well, and what to practise next.' },
                  ].map(({ Icon, title, text }, i) => (
                    <li key={title} className="flex items-start gap-3">
                      <span className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--c-badge-accent-bg)', color: 'var(--c-accent)' }}>
                        <Icon className="w-4 h-4" />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold" style={{ color: 'var(--c-text)' }}>{i + 1}. {title}</span>
                        <span className="block text-xs mt-0.5" style={{ color: 'var(--c-text-muted)' }}>{text}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </Panel>
        </div>

        {/* 2. Pick up where you left off */}
        {!loading && (unfinished || lastResult) && (
          <div className={`grid grid-cols-1 gap-4 ${unfinished && lastResult ? 'md:grid-cols-2' : ''}`}>
            {unfinished && (
              <Link to={`/interview/${unfinished.id}/session`} className="rounded-2xl border p-5 flex items-center gap-4 group transition-colors hover:border-orange-500/60"
                style={{ background: 'var(--c-badge-accent-bg)', borderColor: 'var(--c-accent)' }}>
                <PlayCircle className="w-10 h-10 shrink-0" style={{ color: 'var(--c-accent)' }} />
                <span className="flex-1 min-w-0">
                  <span className="block text-xs font-semibold" style={{ color: 'var(--c-text-muted)' }}>Unfinished interview</span>
                  <span className="block text-base font-bold truncate" style={{ color: 'var(--c-text)' }}>{unfinished.role}</span>
                  <span className="block text-xs" style={{ color: 'var(--c-text-secondary)' }}>Started {formatDate(unfinished.createdAt)}</span>
                </span>
                <span className="c-btn c-btn-primary px-4 py-2 text-xs font-bold rounded-md shrink-0">Continue</span>
              </Link>
            )}
            {lastResult && (
              <Link to={`/interview/${lastResult.id}/results`} className="rounded-2xl border p-5 flex items-center gap-4 group transition-colors hover:border-orange-500/60"
                style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)' }}>
                <span className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shrink-0 text-white" style={{ background: colorFor(lastResult.score) }}>
                  {Math.round(lastResult.score)}%
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-xs font-semibold" style={{ color: 'var(--c-text-muted)' }}>Your last result</span>
                  <span className="block text-base font-bold truncate" style={{ color: 'var(--c-text)' }}>{lastResult.role}</span>
                  <span className="block text-xs" style={{ color: colorFor(lastResult.score) }}>{verdictFor(lastResult.score)}</span>
                </span>
                <span className="text-xs font-semibold flex items-center gap-1 shrink-0" style={{ color: 'var(--c-accent)' }}>
                  View <ChevronRight className="w-4 h-4" />
                </span>
              </Link>
            )}
          </div>
        )}

        {/* 3. Quick start by field */}
        {orderedCategories.length > 0 && (
          <Panel aria-label="Choose a field">
            <div className="flex flex-wrap items-end justify-between gap-2 mb-4">
              <div>
                <h2 className="c-heading text-lg font-bold" style={{ color: 'var(--c-text)' }}>Quick start: pick a field</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--c-text-muted)' }}>One click starts a 3-question interview in that field.</p>
              </div>
              <Link to="/interview/goal" className="text-xs font-semibold flex items-center gap-1 hover:underline" style={{ color: 'var(--c-accent)' }}>
                Not listed? Describe your job <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {fields.map((cat) => {
                const Icon = getCategoryIcon(cat.name);
                const isLaunching = launchingId === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => handleLaunchCategory(cat)}
                    disabled={launchingId !== null}
                    className="text-left rounded-xl border p-4 flex items-center gap-3 group transition-colors hover:border-orange-500/60 disabled:opacity-60"
                    style={{ background: 'var(--c-surface-muted)', borderColor: 'var(--c-border)' }}
                  >
                    <span className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--c-badge-accent-bg)', color: 'var(--c-accent)' }}>
                      <Icon className="w-5 h-5" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold truncate group-hover:text-orange-500 transition-colors" style={{ color: 'var(--c-text)' }}>{cat.name}</span>
                      <span className="block text-xs truncate" style={{ color: 'var(--c-text-muted)' }}>{cat.description}</span>
                    </span>
                    <span className="text-xs font-semibold shrink-0 flex items-center" style={{ color: 'var(--c-accent)' }}>
                      {isLaunching ? 'Starting…' : <ChevronRight className="w-4 h-4" />}
                    </span>
                  </button>
                );
              })}
            </div>
            {orderedCategories.length > FIELDS_SHOWN && (
              <button type="button" onClick={() => setShowAllFields((v) => !v)} aria-expanded={showAllFields}
                className="mt-4 w-full sm:w-auto text-xs font-semibold flex items-center justify-center gap-1 px-4 py-2 rounded-md border"
                style={{ borderColor: 'var(--c-border)', color: 'var(--c-text-secondary)' }}>
                {showAllFields ? 'Show fewer fields' : `Show all ${orderedCategories.length} fields`}
                <ChevronDown className={`w-4 h-4 transition-transform ${showAllFields ? 'rotate-180' : ''}`} />
              </button>
            )}
          </Panel>
        )}

        {/* 4. Recent interviews */}
        <Panel aria-label="Recent interviews">
          <div className="flex items-center justify-between mb-4">
            <h2 className="c-heading text-lg font-bold" style={{ color: 'var(--c-text)' }}>Recent interviews</h2>
            {hasInterviews && (
              <Link to="/history" className="text-xs font-semibold flex items-center gap-1 hover:underline" style={{ color: 'var(--c-accent)' }}>
                See all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>

          {loading ? (
            <div className="space-y-2" aria-busy="true">
              {[0, 1, 2].map((i) => <div key={i} className="c-skeleton h-14 rounded-xl" />)}
            </div>
          ) : !hasInterviews ? (
            <div className="rounded-xl p-6 text-center" style={{ background: 'var(--c-surface-muted)' }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--c-text)' }}>No interviews yet</p>
              <p className="text-xs mt-1 mb-4" style={{ color: 'var(--c-text-muted)' }}>Your scores and feedback appear here after your first interview.</p>
              <Link to="/interview/goal" className="c-btn c-btn-primary px-5 py-2.5 text-xs font-bold rounded-md inline-flex items-center gap-2">
                <Plus className="w-4 h-4" /> Start your first interview
              </Link>
            </div>
          ) : (
            <ul className="space-y-2">
              {recent.map((interview) => {
                const done = interview.status === 'Completed';
                const scored = interview.score != null;
                const Icon = getCategoryIcon(interview.role || '');
                return (
                  <li key={interview.id}>
                    <Link
                      to={done ? `/interview/${interview.id}/results` : `/interview/${interview.id}/session`}
                      className="rounded-xl p-3 sm:p-4 flex items-center gap-3 group transition-colors hover:bg-white/[0.03]"
                      style={{ background: 'var(--c-surface-muted)' }}
                    >
                      <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--c-surface)', color: 'var(--c-text-secondary)' }}>
                        <Icon className="w-4 h-4" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold truncate group-hover:text-orange-500 transition-colors" style={{ color: 'var(--c-text)' }}>{interview.role}</span>
                        <span className="block text-xs truncate" style={{ color: 'var(--c-text-muted)' }}>
                          {TYPE_NAMES[interview.type] || 'Technical'} · {formatDate(interview.createdAt || interview.created_at)}
                        </span>
                      </span>
                      {done && scored ? (
                        <span className="text-right shrink-0">
                          <span className="block text-sm font-bold" style={{ color: colorFor(interview.score) }}>{Math.round(interview.score)}%</span>
                          <span className="hidden sm:block text-[11px]" style={{ color: 'var(--c-text-muted)' }}>{verdictFor(interview.score)}</span>
                        </span>
                      ) : done ? (
                        <span className="c-badge c-badge-accent text-[11px] shrink-0">Analysing</span>
                      ) : (
                        <span className="c-badge c-badge-warning text-[11px] shrink-0">Unfinished</span>
                      )}
                      <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'var(--c-text-muted)' }} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </main>

      <footer className="border-t py-8 text-xs relative z-[1]" style={{ borderColor: 'var(--c-border)', color: 'var(--c-text-muted)', background: 'var(--c-bg-subtle)' }}>
        <div className="c-page flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} MockAI · Mock interview practice</p>
          <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2" aria-label="Footer">
            <Link to="/interview/goal" className="hover:text-[var(--c-text)] transition-colors">New interview</Link>
            <Link to="/history" className="hover:text-[var(--c-text)] transition-colors">History</Link>
            <Link to="/progress" className="hover:text-[var(--c-text)] transition-colors">Progress</Link>
            <Link to="/profile" className="hover:text-[var(--c-text)] transition-colors">Profile</Link>
            <Link to="/terms" className="hover:text-[var(--c-text)] transition-colors">Terms</Link>
            <Link to="/privacy" className="hover:text-[var(--c-text)] transition-colors">Privacy</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;
