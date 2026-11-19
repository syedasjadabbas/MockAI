import React, { Suspense, lazy, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ChevronRight,
  Code2,
  Mic,
  Video,
  FileCheck2,
  TrendingUp,
  Server,
  Users,
  Briefcase,
  Stethoscope,
  HeartPulse,
  GraduationCap,
  Calculator,
  Scale,
  Megaphone,
  Palette,
  HardHat,
  Database,
  Cpu,
  MessageSquareText,
  SpellCheck,
  ScanFace,
  Gauge,
  ShieldCheck,
  Timer,
  Check,
  Sparkles,
  ChevronDown,
  PlayCircle,
  X,
} from 'lucide-react';
import PublicNav from '../components/PublicNav';
import AnimatedBackground3D from '../components/AnimatedBackground3D';
import ScoreRing from '../components/ScoreRing';
import { CANDIDATE_IMAGES } from '../assets/images';
import { CornerReticles, LiveAudioWaveform, LiveVideoIndicator } from '../components/TechnicalDoodles';
import { isAuthenticated } from '../services/candidateAuth';
import { getCategories, getSampleQuestion } from '../services/candidateApi';

const HeroScene3D = lazy(() => import('../components/HeroScene3D'));

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
  if (str.includes('ai') || str.includes('machine') || str.includes('learning')) return Cpu;
  if (str.includes('data') || str.includes('sql')) return Database;
  return Briefcase;
}

const PREFERRED_TRACK_ORDER = [
  'Frontend Development',
  'Healthcare & Medicine',
  'Education & Teaching',
  'Accounting & Financial Analysis',
  'Marketing & Brand Management',
  'Law & Legal Practice',
  'Nursing & Patient Care',
  'Backend & Distributed Systems',
  'Human Resources & Talent Management',
  'Graphic & Visual Design',
  'Civil & Structural Engineering',
  'Behavioral & Leadership',
];

// Shown if the server cannot be reached.
const FALLBACK_FIELDS = PREFERRED_TRACK_ORDER.map((name) => ({ name }));

const STEPS = [
  {
    image: null,
    title: 'Tell us the job',
    body: 'Type the job you are preparing for, or pick one of 16 fields. Choose a technical, HR or situational interview.',
  },
  {
    image: 'studioMic',
    title: 'Answer three questions',
    body: 'One question at a time. Answer on camera, with your voice only, or by typing, whichever you are comfortable with.',
  },
  {
    image: 'evalChart',
    title: 'Get your feedback',
    body: 'In about a minute you see your score, what you did well, what to add, and a practice plan for next time.',
  },
];

const DIMENSIONS = [
  { icon: FileCheck2, title: 'What you said', body: 'Your answer is compared with a strong answer. You see the points you covered and the ones you missed.' },
  { icon: Mic, title: 'How you said it', body: 'Your speaking pace, long pauses and filler words like "um", measured from your recording.' },
  { icon: ScanFace, title: 'How you came across', body: 'Whether you stayed in frame and faced the camera, and how steady your expression was.' },
  { icon: SpellCheck, title: 'Language', body: 'Grammar, clarity and tone, with the sentences worth fixing.' },
  { icon: Gauge, title: 'Confidence and stress', body: 'Estimated from your voice and face, and only shown when there is enough to judge.' },
  { icon: MessageSquareText, title: 'What to practise next', body: 'Your strengths, what to work on and a short practice plan.' },
];

const VALUES = [
  { icon: Timer, title: 'Feels like the real thing', body: 'Questions are asked one at a time and you answer out loud, up to three minutes each, just like in an interview.' },
  { icon: Sparkles, title: 'Easy to start', body: 'Three easy questions, about five minutes. New questions every time you practise a field.' },
  { icon: ShieldCheck, title: 'Private by design', body: 'Nothing is recorded until you agree. Recordings are encrypted and you can delete them at any time.' },
  { icon: TrendingUp, title: 'See yourself improve', body: 'Every interview is saved, so you can watch your scores change over time.' },
];

// Step 1 picture: what choosing a field looks like.
const FieldPickerPreview = () => (
  <div className="relative aspect-video rounded-lg overflow-hidden border p-3 flex flex-col justify-center gap-1.5 select-none" style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface-muted)' }}>
    <div className="p-2 rounded-md border flex items-center gap-2" style={{ borderColor: 'var(--c-accent)', background: 'var(--c-badge-accent-bg)' }}>
      <Stethoscope className="w-3.5 h-3.5" style={{ color: 'var(--c-accent)' }} />
      <p className="text-[11px] font-bold leading-none" style={{ color: 'var(--c-text)' }}>Healthcare & Medicine</p>
    </div>
    <div className="grid grid-cols-2 gap-1.5">
      {['Marketing', 'Frontend Development', 'Law', 'Teaching'].map((t) => (
        <div key={t} className="p-1.5 rounded-md border flex items-center gap-1.5" style={{ borderColor: 'var(--c-border)' }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--c-text-muted)' }} />
          <span className="text-[11px] font-medium truncate" style={{ color: 'var(--c-text-secondary)' }}>{t}</span>
        </div>
      ))}
    </div>
  </div>
);

// A sample of the results page, in plain words (no code).
const SampleResult = () => (
  <div className="rounded-2xl border p-6 space-y-5 shadow-2xl" style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)' }} aria-label="Example result">
    <div className="flex items-center justify-between">
      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--c-text-muted)' }}>Example result</p>
      <span className="text-xs" style={{ color: 'var(--c-text-muted)' }}>Nursing interview</span>
    </div>
    <div className="flex items-center gap-5">
      <ScoreRing value={78} suffix="%" size={104} strokeWidth={9} tone="accent" />
      <div>
        <p className="text-2xl font-bold" style={{ color: 'var(--c-text)' }}>Strong</p>
        <p className="text-sm mt-1" style={{ color: 'var(--c-text-secondary)' }}>Clear answers with good examples. Add more on patient safety.</p>
      </div>
    </div>
    <div className="space-y-3">
      {[
        ['What you said', 74],
        ['How you said it', 85],
        ['How you came across', 80],
      ].map(([label, value]) => (
        <div key={label} className="space-y-1">
          <div className="flex justify-between text-xs">
            <span style={{ color: 'var(--c-text-secondary)' }}>{label}</span>
            <span className="font-semibold" style={{ color: 'var(--c-text)' }}>{value}%</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--c-surface-muted)' }}>
            <div className="h-full rounded-full" style={{ width: `${value}%`, background: 'var(--c-accent)' }} />
          </div>
        </div>
      ))}
    </div>
    <div className="pt-4 border-t space-y-2 text-sm" style={{ borderColor: 'var(--c-border)', color: 'var(--c-text-secondary)' }}>
      <p className="flex items-start gap-2"><Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--c-accent)' }} /> Kept a steady pace with few filler words.</p>
      <p className="flex items-start gap-2"><ArrowRight className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--c-text-muted)' }} /> Next time, mention how you would check the patient's ID.</p>
    </div>
  </div>
);

// Small screens get the static hero picture instead of the 3D scene, so the
// page loads fast on phones.
function useIsSmallScreen() {
  const query = '(max-width: 767px)';
  const [small, setSmall] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setSmall(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return small;
}

const TRY_EXAMPLES = ['Nurse', 'Teacher', 'Accountant', 'Web developer'];

// "Try it" box: a visitor types a job and sees one real easy question for it.
const TryQuestion = ({ ctaDestination }) => {
  const [job, setJob] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const ask = async (text) => {
    const goal = (text ?? job).trim();
    if (!goal) { setError('Type a job first'); return; }
    setError('');
    setLoading(true);
    try {
      setResult(await getSampleQuestion(goal));
    } catch (err) {
      setResult(null);
      setError(err?.status === 429 ? err.message : 'Could not load a question right now. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border p-4 sm:p-5 max-w-xl" style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)' }}>
      <p className="text-sm font-semibold mb-3" style={{ color: 'var(--c-text)' }}>Try it: what job are you preparing for?</p>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); ask(); }}>
        <input
          type="text"
          value={job}
          onChange={(e) => { setJob(e.target.value); if (error) setError(''); }}
          placeholder="e.g. Nurse"
          maxLength={120}
          aria-label="Your job"
          className="c-input flex-1 min-w-0 px-3.5 py-2.5 rounded-lg text-sm"
        />
        <button type="submit" disabled={loading} className="c-btn c-btn-primary shrink-0 px-4 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-60">
          {loading ? 'Finding…' : 'Show me a question'}
        </button>
      </form>
      <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
        {TRY_EXAMPLES.map((ex) => (
          <button key={ex} type="button" onClick={() => { setJob(ex); ask(ex); }} disabled={loading}
            className="rounded-full border px-2.5 py-0.5 text-xs transition-colors hover:border-orange-500/60"
            style={{ borderColor: 'var(--c-border)', color: 'var(--c-text-secondary)' }}>
            {ex}
          </button>
        ))}
      </div>
      {error && <p className="text-xs mt-2" style={{ color: 'var(--c-danger)' }} role="alert">{error}</p>}
      {result && !error && (
        <div className="mt-4 pl-3 border-l-2" style={{ borderColor: 'var(--c-accent)' }} aria-live="polite">
          <p className="text-xs" style={{ color: 'var(--c-text-muted)' }}>
            Easy question for {result.field}{result.matched ? '' : ' (the closest field we have)'}
          </p>
          <p className="text-base font-semibold mt-1 leading-snug" style={{ color: 'var(--c-text)' }}>{result.question}</p>
          <Link to={ctaDestination} className="inline-flex items-center gap-1 text-sm font-semibold mt-2 hover:underline" style={{ color: 'var(--c-accent)' }}>
            Answer it now <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
};

// 30-second walkthrough recorded from the real app.
const DemoModal = ({ onClose }) => {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75" role="dialog" aria-modal="true" aria-label="MockAI demo video" onClick={onClose}>
      <div className="w-full max-w-4xl rounded-2xl border p-3 sm:p-4" style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold" style={{ color: 'var(--c-text)' }}>MockAI in 30 seconds</p>
          <button type="button" onClick={onClose} aria-label="Close video" className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-white/5" style={{ color: 'var(--c-text-secondary)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <video
          src="/demo/mockai-demo.mp4"
          poster="/demo/mockai-demo-poster.jpg"
          controls
          autoPlay
          muted
          playsInline
          className="w-full rounded-lg bg-black aspect-[16/10]"
        />
        <ol className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-xs" style={{ color: 'var(--c-text-secondary)' }}>
          {['Tell it the job', 'Choose how to answer', 'Answer each question', 'See your results'].map((s, i) => (
            <li key={s} className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0" style={{ background: 'var(--c-accent)' }}>{i + 1}</span>{s}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
};

const FAQS = [
  { q: 'Is it free?', a: 'Yes. Create an account and practise as often as you like.' },
  { q: 'Do I need a camera?', a: 'No. You can answer with your camera and microphone, with your voice only, or by typing. Without a camera, that part is simply not scored.' },
  { q: 'Is my video stored?', a: 'Only while you answer a question, and only after you agree. Recordings are encrypted, used only to assess your interview unless you allow otherwise, and you can delete them from your results page at any time.' },
  { q: 'Which jobs are covered?', a: 'Sixteen fields, including software, data, healthcare, nursing, teaching, law, accounting, marketing, HR, design, engineering, business analysis and sales. If yours is not listed, describe it and MockAI picks the closest field.' },
  { q: 'How long does it take?', a: 'About five minutes for three questions, and around a minute more for your feedback.' },
  { q: 'Is this a hiring decision?', a: 'No. MockAI is a practice coach. Its scores help you improve; they are not a hiring decision or a prediction of any employer\'s decision.' },
];

const Faq = () => {
  const [open, setOpen] = useState(0);
  return (
    <div className="border-t" style={{ borderColor: 'var(--c-border)' }}>
      {FAQS.map((f, i) => {
        const isOpen = open === i;
        return (
          <div key={f.q} className="border-b" style={{ borderColor: 'var(--c-border)' }}>
            <button type="button" onClick={() => setOpen(isOpen ? -1 : i)} aria-expanded={isOpen}
              className="w-full flex items-center justify-between gap-4 py-4 text-left text-base font-semibold" style={{ color: 'var(--c-text)' }}>
              {f.q}
              <ChevronDown className={`w-5 h-5 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} style={{ color: 'var(--c-text-muted)' }} />
            </button>
            {isOpen && <p className="pb-4 text-sm leading-relaxed max-w-3xl" style={{ color: 'var(--c-text-secondary)' }}>{f.a}</p>}
          </div>
        );
      })}
    </div>
  );
};

const SectionIntro = ({ eyebrow, title, text }) => (
  <div className="max-w-2xl mb-10 sm:mb-12 space-y-3">
    {eyebrow && <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--c-accent)' }}>{eyebrow}</p>}
    <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight" style={{ color: 'var(--c-text)' }}>{title}</h2>
    {text && <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>{text}</p>}
  </div>
);

const LandingPage = () => {
  const authed = isAuthenticated();
  const ctaDestination = authed ? '/interview/goal' : '/register';
  const [fields, setFields] = useState([]);
  const [fieldCount, setFieldCount] = useState(16);
  const [demoOpen, setDemoOpen] = useState(false);
  const smallScreen = useIsSmallScreen();

  useEffect(() => {
    let isMounted = true;
    getCategories()
      .then((data) => {
        if (!isMounted || !Array.isArray(data) || data.length === 0) return;
        const map = new Map(data.map((c) => [c.name, c]));
        const list = [];
        PREFERRED_TRACK_ORDER.forEach((name) => {
          if (map.has(name)) { list.push(map.get(name)); map.delete(name); }
        });
        map.forEach((c) => list.push(c));
        setFieldCount(data.length);
        setFields(list.slice(0, 12));
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, []);

  const displayFields = fields.length > 0 ? fields : FALLBACK_FIELDS;

  return (
    <div
      className="candidate-app min-h-screen flex flex-col font-sans relative selection:bg-[#FF6B35]/30 selection:text-[#FFFFFF] overflow-x-hidden"
      style={{ background: 'var(--c-bg)' }}
    >
      <AnimatedBackground3D />

      <div className="relative z-10 flex flex-col min-h-screen">
        <PublicNav />

        {/* Hero: what MockAI is, in one look */}
        <section className="relative border-b" style={{ borderColor: 'var(--c-border)' }}>
          <div className="c-page py-12 sm:py-20 lg:py-24">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
              <div className="lg:col-span-7 space-y-6">
                <div className="flex flex-wrap items-center gap-4">
                  <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold" style={{ borderColor: 'var(--c-border)', color: 'var(--c-text-secondary)', background: 'var(--c-surface)' }}>
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--c-accent)' }} />
                    AI mock interview coach
                  </span>
                  {/* Small live touches: a moving voice wave and a camera indicator */}
                  <span className="inline-flex items-center gap-4" aria-hidden="true">
                    <LiveAudioWaveform bars={12} height={16} color="var(--c-accent)" />
                    <LiveVideoIndicator />
                  </span>
                </div>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.08]" style={{ color: 'var(--c-text)' }}>
                  Practice your interview <br className="hidden sm:block" />
                  <span style={{ color: 'var(--c-accent)' }}>before it matters.</span>
                </h1>
                <p className="text-base sm:text-lg leading-relaxed max-w-xl" style={{ color: 'var(--c-text-secondary)' }}>
                  MockAI asks you real interview questions for your job, listens to your answers, and tells you exactly what to improve:
                  what you said, how you said it, and how you came across.
                </p>
                <TryQuestion ctaDestination={ctaDestination} />
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <Link to={ctaDestination} className="c-btn c-btn-primary px-6 py-3.5 font-semibold text-sm rounded-xl flex items-center gap-2 select-none group">
                    <span>Start a free practice interview</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                  <button type="button" onClick={() => setDemoOpen(true)} className="c-btn c-btn-secondary px-5 py-3.5 font-medium text-sm rounded-xl flex items-center gap-2">
                    <PlayCircle className="w-4 h-4" style={{ color: 'var(--c-accent)' }} />
                    <span>Watch a 30-second demo</span>
                  </button>
                </div>
                <ul className="pt-2 grid grid-cols-2 sm:flex sm:flex-wrap gap-x-6 gap-y-2 text-sm" style={{ color: 'var(--c-text-secondary)' }}>
                  {['Free to use', `${fieldCount} career fields`, 'About 5 minutes', 'Feedback in a minute'].map((t) => (
                    <li key={t} className="flex items-center gap-2">
                      <Check className="w-4 h-4 shrink-0" style={{ color: 'var(--c-accent)' }} /> {t}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="lg:col-span-5 relative flex items-center justify-center w-full max-w-lg lg:max-w-none mx-auto">
                <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden border shadow-2xl" style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface)', isolation: 'isolate' }}>
                  <CornerReticles size={12} color="var(--c-accent)" />
                  {smallScreen ? (
                    <img src={CANDIDATE_IMAGES.dashboardHero} alt="MockAI" className="w-full h-full object-cover" />
                  ) : (
                    <Suspense fallback={<img src={CANDIDATE_IMAGES.dashboardHero} alt="MockAI" className="w-full h-full object-cover" />}>
                      <HeroScene3D />
                    </Suspense>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="border-b py-16 sm:py-24" style={{ borderColor: 'var(--c-border)' }}>
          <div className="c-page">
            <SectionIntro eyebrow="How it works" title="Three steps, about five minutes" text="No setup and no scheduling. Practise whenever you have a few minutes." />
            <ol className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {STEPS.map((step, i) => (
                <li key={step.title} className="space-y-4 group">
                  {step.image ? (
                    <div className="relative aspect-video rounded-lg overflow-hidden border" style={{ borderColor: 'var(--c-border)' }}>
                      <img src={CANDIDATE_IMAGES[step.image]} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    </div>
                  ) : (
                    <FieldPickerPreview />
                  )}
                  <div className="flex items-start gap-3">
                    <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ background: 'var(--c-accent)', color: '#fff' }}>{i + 1}</span>
                    <div className="space-y-1">
                      <h3 className="text-base font-bold" style={{ color: 'var(--c-text)' }}>{step.title}</h3>
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>{step.body}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* What you get feedback on */}
        <section id="evaluation" className="border-b py-16 sm:py-24" style={{ borderColor: 'var(--c-border)' }}>
          <div className="c-page">
            <SectionIntro
              eyebrow="Your feedback"
              title="Know exactly what to improve"
              text="Every answer is checked in three ways: what you said, how you said it, and how you came across. If there is not enough to judge something, MockAI tells you instead of guessing."
            />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-x-10">
                {DIMENSIONS.map(({ icon: Icon, title, body }) => (
                  <div key={title} className="flex gap-3.5 items-start py-5 border-t" style={{ borderColor: 'var(--c-border)' }}>
                    <Icon className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--c-accent)' }} />
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold" style={{ color: 'var(--c-text)' }}>{title}</h3>
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>{body}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="lg:col-span-5">
                <SampleResult />
              </div>
            </div>
          </div>
        </section>

        {/* Fields */}
        <section id="tracks" aria-label="Career fields" className="border-b py-16 sm:py-24" style={{ borderColor: 'var(--c-border)' }}>
          <div className="c-page">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <SectionIntro eyebrow="For every career" title={`${fieldCount} career fields, not just tech`} text="Questions are written for real jobs, from software and data to healthcare, teaching, law, accounting and sales." />
              <Link to={ctaDestination} className="text-sm font-semibold flex items-center gap-1 hover:underline shrink-0 mb-10 sm:mb-12" style={{ color: 'var(--c-accent)' }}>
                Your job not here? Describe it <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 border-t" style={{ borderColor: 'var(--c-border)' }}>
              {displayFields.map((cat) => {
                const Icon = getCategoryIcon(cat.name);
                return (
                  <Link key={cat.id || cat.name} to={ctaDestination} className="flex items-center gap-3 py-4 border-b group" style={{ borderColor: 'var(--c-border)' }}>
                    <Icon className="w-5 h-5 shrink-0" style={{ color: 'var(--c-text-muted)' }} />
                    <span className="flex-1 min-w-0 text-sm font-semibold truncate group-hover:text-orange-500 transition-colors" style={{ color: 'var(--c-text)' }}>{cat.name}</span>
                    <ChevronRight className="w-4 h-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--c-accent)' }} />
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* Why MockAI */}
        <section id="why-mockai" className="border-b py-16 sm:py-24" style={{ borderColor: 'var(--c-border)' }}>
          <div className="c-page">
            <SectionIntro eyebrow="Why MockAI" title="The closest thing to the real interview" text="Reading tips is not enough. Answering out loud, and seeing what you missed, is how you get better." />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-x-10">
                {VALUES.map(({ icon: Icon, title, body }) => (
                  <div key={title} className="py-5 border-t space-y-2" style={{ borderColor: 'var(--c-border)' }}>
                    <Icon className="w-5 h-5" style={{ color: 'var(--c-accent)' }} />
                    <h3 className="text-base font-bold" style={{ color: 'var(--c-text)' }}>{title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>{body}</p>
                  </div>
                ))}
              </div>
              <div className="lg:col-span-5">
                <div className="rounded-2xl overflow-hidden border shadow-2xl relative" style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface)' }}>
                  <CornerReticles size={10} color="var(--c-accent)" />
                  <img src={CANDIDATE_IMAGES.completionSeal} alt="" className="w-full aspect-[4/3] object-cover" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" aria-label="Frequently asked questions" className="border-b py-16 sm:py-24" style={{ borderColor: 'var(--c-border)' }}>
          <div className="c-page">
            <SectionIntro eyebrow="Questions" title="Before you start" text="The things people usually ask first." />
            <Faq />
          </div>
        </section>

        {/* Final call to action */}
        <section className="relative py-24 sm:py-32 overflow-hidden" style={{ background: 'var(--c-bg)' }}>
          <div className="absolute inset-0 select-none pointer-events-none overflow-hidden">
            <img src={CANDIDATE_IMAGES.ctaBanner} alt="" className="w-full h-full object-cover object-center opacity-60" />
            <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at center, rgba(17, 17, 17, 0.55) 0%, rgba(17, 17, 17, 0.85) 70%, var(--c-bg) 100%)' }} />
            <div className="absolute inset-x-0 top-0 h-24" style={{ background: 'linear-gradient(to bottom, var(--c-bg), transparent)' }} />
            <div className="absolute inset-x-0 bottom-0 h-24" style={{ background: 'linear-gradient(to top, var(--c-bg), transparent)' }} />
          </div>
          <div className="relative z-10 c-page space-y-6 text-center">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight" style={{ color: '#FFFFFF' }}>
              Your next interview <br />
              starts with practice.
            </h2>
            <p className="text-sm sm:text-base max-w-lg mx-auto leading-relaxed" style={{ color: 'rgba(255, 255, 255, 0.85)' }}>
              Find out what you would say before someone asks. It takes about five minutes.
            </p>
            <div className="pt-2 flex justify-center">
              <Link to={ctaDestination} className="c-btn c-btn-primary px-8 py-3.5 text-sm font-semibold rounded-xl flex items-center gap-2.5 select-none group">
                <span>Start a free practice interview</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        </section>

        <footer className="border-t pt-8 pb-24 sm:pb-8 mt-auto" style={{ borderColor: 'var(--c-border)', background: 'var(--c-bg)' }}>
          <div className="c-page flex flex-col sm:flex-row items-center justify-between gap-4 text-xs" style={{ color: 'var(--c-text-muted)' }}>
            <div className="flex items-center gap-2">
              <span className="font-bold" style={{ color: 'var(--c-text)' }}>MockAI</span>
              <span>·</span>
              <span>AI mock interview coach</span>
            </div>
            <nav className="flex items-center gap-4" aria-label="Footer">
              <a href="#how-it-works" className="hover:text-[var(--c-text)] transition-colors">How it works</a>
              <Link to="/login" className="hover:text-[var(--c-text)] transition-colors">Sign in</Link>
              <Link to="/register" className="hover:text-[var(--c-text)] transition-colors">Create account</Link>
            </nav>
            <span>© {new Date().getFullYear()} MockAI</span>
          </div>
        </footer>
      </div>

      {/* Phones: the start button stays in reach while scrolling */}
      {!demoOpen && (
        <div className="sm:hidden fixed bottom-0 inset-x-0 z-40 p-3 border-t" style={{ background: 'var(--c-bg)', borderColor: 'var(--c-border)' }}>
          <Link to={ctaDestination} className="c-btn c-btn-primary w-full py-3.5 text-sm font-semibold rounded-xl flex items-center justify-center gap-2">
            Start practising <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {demoOpen && <DemoModal onClose={() => setDemoOpen(false)} />}
    </div>
  );
};

export default LandingPage;
