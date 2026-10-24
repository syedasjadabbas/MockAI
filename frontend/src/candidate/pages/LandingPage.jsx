import React, { Suspense, lazy, useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Code2,
  Mic,
  Clock,
  Video,
  FileCheck2,
  ChevronRight,
  TrendingUp,
  Server,
  Users,
  Briefcase,
  Stethoscope,
  GraduationCap,
  Calculator,
  Scale,
  Megaphone,
  Palette,
  HardHat,
  MessageSquareText,
  SpellCheck,
  ScanFace,
  Gauge,
} from 'lucide-react';
import PublicNav from '../components/PublicNav';
import AnimatedBackground3D from '../components/AnimatedBackground3D';
import { CANDIDATE_IMAGES } from '../assets/images';
import {
  CornerReticles,
  LiveAudioWaveform,
  LiveVideoIndicator,
  FrontendLayoutSchematic,
  BackendClusterSchematic,
  NeuralNodesDiagram,
  BehavioralDialogueSchematic,
  SqlMatrixSchematic,
} from '../components/TechnicalDoodles';
import TypewriterCode from '../components/TypewriterCode';
import { isAuthenticated } from '../services/candidateAuth';
import { getCategories } from '../services/candidateApi';

const HeroScene3D = lazy(() => import('../components/HeroScene3D'));

// Map domain tracks to small line drawings
function getDomainSchematic(categoryName = '') {
  const str = categoryName.toLowerCase();
  if (str.includes('front') || str.includes('web') || str.includes('react') || str.includes('ui')) return FrontendLayoutSchematic;
  if (str.includes('back') || str.includes('node') || str.includes('server') || str.includes('distribut')) return BackendClusterSchematic;
  if (str.includes('ai') || str.includes('ml') || str.includes('learning') || str.includes('neural')) return NeuralNodesDiagram;
  if (str.includes('behav') || str.includes('leader') || str.includes('culture') || str.includes('hr')) return BehavioralDialogueSchematic;
  if (str.includes('data') || str.includes('sql') || str.includes('db') || str.includes('analyt')) return SqlMatrixSchematic;
  return null;
}

// Map tracks to icons
function getCategoryIcon(categoryName = '') {
  const str = categoryName.toLowerCase();
  if (str.includes('health') || str.includes('medic') || str.includes('doctor')) return Stethoscope;
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
  return Briefcase;
}

const PREFERRED_TRACK_ORDER = [
  'Frontend Development',
  'Healthcare & Medicine',
  'Marketing & Brand Management',
  'Education & Teaching',
  'Backend & Distributed Systems',
  'Law & Legal Practice',
  'Accounting & Financial Analysis',
  'Graphic & Visual Design',
  'Human Resources & Talent Management',
  'Civil & Structural Engineering',
  'Sales Leadership & Client Acquisition',
  'Behavioral & Leadership',
];

const CURATED_TRACKS = [
  {
    name: 'Frontend Development',
    description: 'Core web concepts, React, modern JavaScript, CSS architecture, browser APIs, and frontend performance.',
    questionCount: 5,
  },
  {
    name: 'Healthcare & Medicine',
    description: 'Clinical diagnosis, patient communication, triage protocols, medical ethics, and evidence-based treatment.',
    questionCount: 5,
  },
  {
    name: 'Marketing & Brand Management',
    description: 'Campaign attribution, CAC/LTV economics, brand positioning, growth funnels, and multichannel strategy.',
    questionCount: 5,
  },
  {
    name: 'Education & Teaching',
    description: 'Curriculum planning, classroom management, differentiated instruction, student engagement, and pedagogical assessment.',
    questionCount: 5,
  },
  {
    name: 'Backend & Distributed Systems',
    description: 'API design, SQL & NoSQL databases, microservices, authentication security, caching, and scalability.',
    questionCount: 5,
  },
  {
    name: 'Law & Legal Practice',
    description: 'Contract negotiation, statutory compliance, litigation risk, ethical standards, and client confidentiality.',
    questionCount: 5,
  },
  {
    name: 'Accounting & Financial Analysis',
    description: 'Financial reporting, cash flow forecasting, variance analysis, GAAP/IFRS standards, and tax compliance.',
    questionCount: 5,
  },
  {
    name: 'Graphic & Visual Design',
    description: 'Design systems, visual hierarchy, typography, brand identity, user empathy, and client critique handling.',
    questionCount: 5,
  },
  {
    name: 'Human Resources & Talent Management',
    description: 'Talent acquisition, employee relations, performance reviews, workplace conflict mediation, and labor compliance.',
    questionCount: 5,
  },
  {
    name: 'Civil & Structural Engineering',
    description: 'Structural integrity, foundation load calculations, seismic building codes, environmental impact, and site safety.',
    questionCount: 5,
  },
  {
    name: 'Sales Leadership & Client Acquisition',
    description: 'Enterprise sales cycles, objection handling, pipeline forecasting, value discovery, and client retention.',
    questionCount: 5,
  },
  {
    name: 'Behavioral & Leadership',
    description: 'Conflict resolution, executive presence, team mentorship, strategic prioritization, and workplace values.',
    questionCount: 5,
  },
];

const STEPS = [
  {
    image: null,
    code: 'STEP1_CODE_LINES',
    title: 'Pick a field',
    body: 'Choose the interview track that matches the job you are preparing for. Each session has five questions.',
  },
  {
    image: 'studioMic',
    code: 'STEP2_CODE_LINES',
    title: 'Answer on camera',
    body: 'Speak your answers with your camera and microphone on, or type them if you prefer. You get one question at a time.',
  },
  {
    image: 'evalChart',
    code: 'STEP3_CODE_LINES',
    title: 'Read your feedback',
    body: 'See a score for each answer, what you covered and missed, how you spoke, and how you came across on video.',
  },
];

const DIMENSIONS = [
  {
    icon: FileCheck2,
    title: 'What you said',
    body: 'Your answer is compared with what a strong answer covers. You see the points you made and the ones you missed.',
  },
  {
    icon: Mic,
    title: 'How you said it',
    body: 'Speaking pace, pauses and filler words like "um" and "uh", measured from your recording.',
  },
  {
    icon: SpellCheck,
    title: 'Language',
    body: 'Grammar, clarity and tone of your answer, with the sentences worth fixing.',
  },
  {
    icon: ScanFace,
    title: 'On camera',
    body: 'Whether you stayed in frame and faced the camera, and how steady your expression was.',
  },
  {
    icon: Gauge,
    title: 'Confidence and stress',
    body: 'Estimated from your speech and expression, and only shown when an answer is long enough to judge.',
  },
  {
    icon: MessageSquareText,
    title: 'What to work on',
    body: 'Strengths, weaknesses and specific suggestions for your next practice session.',
  },
];

const VALUES = [
  {
    icon: Clock,
    title: 'Timed questions',
    body: 'Answer under a clock, the way a real interview feels.',
  },
  {
    icon: Video,
    title: 'Recorded answers',
    body: 'Your camera and microphone record each answer in the browser. Nothing is recorded until you agree.',
  },
  {
    icon: FileCheck2,
    title: 'Feedback per question',
    body: 'Specific notes on each answer, not one vague overall grade.',
  },
  {
    icon: TrendingUp,
    title: 'Progress over time',
    body: 'Every session is saved, so you can see whether your scores improve.',
  },
];

// Step 1 preview: what choosing a track looks like.
const TrackPickerPreview = () => (
  <div className="relative aspect-video rounded-lg overflow-hidden border p-3 flex flex-col justify-center gap-1.5 select-none bg-[#0F1013]" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
    <div className="p-2 rounded-md border border-orange-500/25 bg-orange-500/[0.06] flex items-center gap-2">
      <span className="w-2 h-2 rounded-full bg-orange-500" />
      <p className="text-[11px] font-bold text-[#F5F5F5] leading-none">Healthcare & Medicine</p>
    </div>
    <div className="grid grid-cols-2 gap-1.5">
      {['Marketing & Brand', 'Frontend Development', 'Law & Legal Practice', 'Education & Teaching'].map((t) => (
        <div key={t} className="p-1.5 rounded-md border border-white/[0.06] bg-white/[0.02] flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
          <span className="text-[11px] text-zinc-400 font-medium truncate">{t}</span>
        </div>
      ))}
    </div>
  </div>
);

// Typewriter Code Snippets — Calibrated Professional Syntax Highlighting
const STEP1_CODE_LINES = [
  [{ text: '{', color: '#71717A' }],
  [
    { text: '  "track": ', color: '#A1A1AA' },
    { text: '"healthcare_medicine"', color: '#86EFAC' },
    { text: ',', color: '#71717A' },
  ],
  [
    { text: '  "role": ', color: '#A1A1AA' },
    { text: '"Clinical Specialist"', color: '#86EFAC' },
    { text: ',', color: '#71717A' },
  ],
  [
    { text: '  "duration": ', color: '#A1A1AA' },
    { text: '45', color: '#FDBA74' },
  ],
  [{ text: '}', color: '#71717A' }],
];

const STEP2_CODE_LINES = [
  [{ text: '// Live ASR Stream', color: '#64748B' }],
  [
    { text: 'session', color: '#93C5FD' },
    { text: '.onAudioFrame((chunk) => {', color: '#E2E8F0' },
  ],
  [
    { text: '  evaluator.', color: '#A1A1AA' },
    { text: 'trackCadence', color: '#C4B5FD' },
    { text: '(chunk.wpm);', color: '#E2E8F0' },
  ],
  [{ text: '});', color: '#71717A' }],
];

const STEP3_CODE_LINES = [
  [{ text: '// Multimodal Evaluation Output', color: '#64748B' }],
  [{ text: '{', color: '#71717A' }],
  [
    { text: '  "content": { "accuracy": ', color: '#A1A1AA' },
    { text: '94.5', color: '#FDBA74' },
    { text: ' },', color: '#71717A' },
  ],
  [
    { text: '  "speech": { "clarity": ', color: '#A1A1AA' },
    { text: '91.0', color: '#FDBA74' },
    { text: ' },', color: '#71717A' },
  ],
  [
    { text: '  "vision": { "facial": ', color: '#A1A1AA' },
    { text: '"ANALYZED"', color: '#86EFAC' },
    { text: ' },', color: '#71717A' },
  ],
  [
    { text: '  "overall_score": ', color: '#A1A1AA' },
    { text: '93.2', color: '#FDBA74' },
  ],
  [{ text: '}', color: '#71717A' }],
];

const EVALUATOR_CODE_LINES = [
  [{ text: '// Multimodal Evaluation Output', color: '#64748B' }],
  [{ text: '{', color: '#71717A' }],
  [{ text: '  "content": {', color: '#A1A1AA' }],
  [
    { text: '    "technical_accuracy": ', color: '#A1A1AA' },
    { text: '94.5', color: '#FDBA74' },
    { text: ',', color: '#71717A' },
  ],
  [
    { text: '    "completeness": ', color: '#A1A1AA' },
    { text: '96.0', color: '#FDBA74' },
  ],
  [{ text: '  },', color: '#71717A' }],
  [{ text: '  "speech": {', color: '#A1A1AA' }],
  [
    { text: '    "clarity": ', color: '#A1A1AA' },
    { text: '91.0', color: '#FDBA74' },
    { text: ',', color: '#71717A' },
  ],
  [
    { text: '    "pacing_wpm": ', color: '#A1A1AA' },
    { text: '136', color: '#FDBA74' },
    { text: ',', color: '#71717A' },
  ],
  [
    { text: '    "filler_word_ratio": ', color: '#A1A1AA' },
    { text: '0.012', color: '#FDBA74' },
  ],
  [{ text: '  },', color: '#71717A' }],
  [{ text: '  "vision": {', color: '#A1A1AA' }],
  [
    { text: '    "facial_expression": ', color: '#A1A1AA' },
    { text: '"ANALYZED"', color: '#86EFAC' },
    { text: ',', color: '#71717A' },
  ],
  [
    { text: '    "confidence_indicator": ', color: '#A1A1AA' },
    { text: '"ANALYZED"', color: '#86EFAC' },
    { text: ',', color: '#71717A' },
  ],
  [
    { text: '    "stress_indicator": ', color: '#A1A1AA' },
    { text: '"ANALYZED"', color: '#86EFAC' },
  ],
  [{ text: '  },', color: '#71717A' }],
  [
    { text: '  "overall_composite": ', color: '#A1A1AA' },
    { text: '93.2', color: '#FDBA74' },
  ],
  [{ text: '}', color: '#71717A' }],
];

/**
 * Animated Score Level Meter with Counter & Fill Animation
 */
const AnimatedScoreMeter = ({ label, targetPercent, color = '#FF6B35' }) => {
  const containerRef = useRef(null);
  const [currentPercent, setCurrentPercent] = useState(0);
  const [hasTriggered, setHasTriggered] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasTriggered) {
          setHasTriggered(true);
        }
      },
      { threshold: 0.3 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [hasTriggered]);

  useEffect(() => {
    if (!hasTriggered) return;

    const duration = 1400; // 1.4s smooth animation
    const startTime = performance.now();

    const frame = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const val = Math.round(ease * targetPercent);
      setCurrentPercent(val);

      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        setCurrentPercent(targetPercent);
      }
    };

    const id = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(id);
  }, [hasTriggered, targetPercent]);

  return (
    <div ref={containerRef}>
      <div className="flex justify-between text-[11px] font-mono mb-1.5">
        <span className="text-zinc-600 dark:text-zinc-300 font-medium">{label}</span>
        <span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-200">
          {currentPercent}%
        </span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-white/[0.06] border border-slate-300 dark:border-white/[0.04] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-75"
          style={{
            width: `${currentPercent}%`,
            background: color,
            boxShadow: '0 0 8px rgba(249, 115, 22, 0.25)',
          }}
        />
      </div>
    </div>
  );
};

const STEP_CODE = { STEP1_CODE_LINES, STEP2_CODE_LINES, STEP3_CODE_LINES };

const LandingPage = () => {
  const authed = isAuthenticated();
  const ctaDestination = authed ? '/interview/goal' : '/register';
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    let isMounted = true;
    getCategories()
      .then((data) => {
        if (!isMounted) return;
        if (Array.isArray(data) && data.length > 0) {
          const map = new Map(data.map((c) => [c.name, c]));
          const list = [];
          PREFERRED_TRACK_ORDER.forEach((name) => {
            if (map.has(name)) {
              list.push(map.get(name));
              map.delete(name);
            }
          });
          map.forEach((c) => list.push(c));
          setCategories(list.slice(0, 12));
        } else {
          setCategories(CURATED_TRACKS);
        }
      })
      .catch(() => {
        if (isMounted) setCategories(CURATED_TRACKS);
      });
    return () => { isMounted = false; };
  }, []);

  const displayTracks = categories.length > 0 ? categories : CURATED_TRACKS;

  return (
    <div
      className="candidate-app min-h-screen flex flex-col font-sans relative selection:bg-[#FF6B35]/30 selection:text-[#FFFFFF] overflow-x-hidden"
      style={{ background: 'var(--c-bg)' }}
    >
      <AnimatedBackground3D />

      <div className="relative z-10 flex flex-col min-h-screen">
        <PublicNav />

        {/* Hero */}
        <section className="relative border-b" style={{ borderColor: 'var(--c-border)' }}>
          <div className="c-page py-12 sm:py-20 lg:py-24">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
              <div className="lg:col-span-7 space-y-6">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.08]" style={{ color: 'var(--c-text)' }}>
                  Practice before <br className="hidden sm:block" />
                  <span className="text-[#FF6B35]">it matters.</span>
                </h1>
                <p className="text-base sm:text-lg leading-relaxed max-w-xl" style={{ color: 'var(--c-text-secondary)' }}>
                  Answer real interview questions on camera, then see what went well and what to work on: the content of your answer, how you spoke, and how you came across on video.
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Link
                    to={ctaDestination}
                    className="c-btn c-btn-primary px-6 py-3 font-semibold text-sm rounded-xl flex items-center gap-2 select-none group"
                  >
                    <span>Start practicing</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                  <a
                    href="#how-it-works"
                    className="c-btn c-btn-secondary px-5 py-3 font-medium text-sm rounded-xl flex items-center gap-2 transition-all group"
                  >
                    <span>How it works</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" style={{ color: 'var(--c-text-muted)' }} />
                  </a>
                </div>
                <div className="pt-3 flex flex-wrap items-center gap-5" aria-hidden="true">
                  <LiveAudioWaveform bars={12} height={16} color="var(--c-accent)" />
                  <LiveVideoIndicator />
                </div>
              </div>

              <div className="lg:col-span-5 relative flex items-center justify-center w-full max-w-lg lg:max-w-none mx-auto">
                <div
                  className="relative w-full aspect-[4/3] rounded-xl overflow-hidden border shadow-2xl"
                  style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface)', isolation: 'isolate' }}
                >
                  <CornerReticles size={12} color="var(--c-accent)" />
                  <Suspense
                    fallback={
                      <img
                        src={CANDIDATE_IMAGES.dashboardHero}
                        alt="MockAI"
                        className="w-full h-full object-cover rounded-xl"
                      />
                    }
                  >
                    <HeroScene3D />
                  </Suspense>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="border-b py-16 sm:py-24" style={{ borderColor: 'var(--c-border)' }}>
          <div className="c-page">
            <div className="max-w-2xl mb-12 space-y-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: 'var(--c-text)' }}>
                How it works
              </h2>
              <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                Three steps, about fifteen minutes.
              </p>
            </div>
            <ol className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {STEPS.map((step, i) => (
                <li
                  key={step.title}
                  className="p-5 rounded-xl border space-y-3 group"
                  style={{ background: 'var(--c-surface-card)', borderColor: 'var(--c-border)' }}
                >
                  {step.image ? (
                    <div className="relative aspect-video rounded-lg overflow-hidden border" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                      <img
                        src={CANDIDATE_IMAGES[step.image]}
                        alt=""
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                  ) : (
                    <TrackPickerPreview />
                  )}
                  <span
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ background: 'var(--c-accent-soft, rgba(255,107,53,0.12))', color: 'var(--c-accent)' }}
                  >
                    {i + 1}
                  </span>
                  <h3 className="text-base font-bold" style={{ color: 'var(--c-text)' }}>{step.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>{step.body}</p>
                  <div className="rounded-lg p-3 font-mono text-[11px] leading-relaxed border border-white/[0.06] bg-[#0E0F12]" aria-hidden="true">
                    <TypewriterCode lines={STEP_CODE[step.code]} duration={1800} />
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Interview tracks */}
        <section id="tracks" aria-label="Interview tracks" className="border-b py-16 sm:py-24" style={{ borderColor: 'var(--c-border)' }}>
          <div className="c-page">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 gap-4">
              <div className="max-w-2xl space-y-2">
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: 'var(--c-text)' }}>
                  Interview tracks
                </h2>
                <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                  Questions written for specific jobs, from software to healthcare to law.
                </p>
              </div>
              <Link
                to={ctaDestination}
                className="text-xs font-semibold flex items-center gap-1 hover:opacity-80 transition-opacity shrink-0"
                style={{ color: 'var(--c-text-secondary)' }}
              >
                <span>All topics</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayTracks.map((cat) => {
                const Icon = getCategoryIcon(cat.name);
                const Schematic = getDomainSchematic(cat.name);
                return (
                  <Link
                    key={cat.id || cat.name}
                    to={ctaDestination}
                    className="c-card c-card-hover text-left p-5 rounded-lg flex flex-col justify-between group transition-all relative overflow-hidden block select-none"
                    style={{ background: 'var(--c-surface-card)', borderColor: 'var(--c-border)' }}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div
                          className="w-9 h-9 rounded-md flex items-center justify-center border transition-colors group-hover:border-orange-500/50"
                          style={{ background: 'var(--c-surface-muted)', borderColor: 'var(--c-border)', color: 'var(--c-text)' }}
                        >
                          <Icon className="w-4.5 h-4.5" />
                        </div>
                        {Schematic && (
                          <div className="opacity-40 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--c-text-muted)' }}>
                            <Schematic size={24} />
                          </div>
                        )}
                      </div>
                      <h3 className="text-sm font-bold mb-1 group-hover:text-orange-500 transition-colors" style={{ color: 'var(--c-text)' }}>
                        {cat.name}
                      </h3>
                      <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--c-text-secondary)' }}>
                        {cat.description || 'Interview questions for this field, with feedback on every answer.'}
                      </p>
                    </div>
                    <div className="mt-5 pt-3 border-t flex items-center justify-between text-xs font-medium" style={{ borderColor: 'var(--c-border)' }}>
                      <span style={{ color: 'var(--c-text-muted)' }}>
                        {cat.questionCount ? `${cat.questionCount} questions` : 'Interview track'}
                      </span>
                      <span className="flex items-center gap-1 font-semibold" style={{ color: 'var(--c-accent)' }}>
                        <span>Start</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* What you get feedback on */}
        <section id="evaluation" className="border-b py-16 sm:py-24" style={{ borderColor: 'var(--c-border)' }}>
          <div className="c-page">
            <div className="max-w-2xl mb-12 space-y-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: 'var(--c-text)' }}>
                What you get feedback on
              </h2>
              <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                Each answer is scored on its content, your delivery and your video. When there is not enough to judge, MockAI says so instead of guessing.
              </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-8">
              {DIMENSIONS.map(({ icon: Icon, title, body }) => (
                <div key={title} className="flex gap-3.5 items-start">
                  <Icon className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--c-accent)' }} />
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold" style={{ color: 'var(--c-text)' }}>{title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>{body}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="lg:col-span-5 rounded-xl border p-5 space-y-4 shadow-2xl" style={{ background: '#141414', borderColor: 'var(--c-border)' }} aria-hidden="true">
              <div className="flex items-center gap-2 border-b pb-3" style={{ borderColor: 'var(--c-border)' }}>
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
              </div>
              <TypewriterCode lines={EVALUATOR_CODE_LINES} duration={2400} />
              <div className="pt-3 border-t space-y-2.5 text-xs font-mono" style={{ borderColor: 'var(--c-border)' }}>
                <AnimatedScoreMeter label="Content" targetPercent={94} color="linear-gradient(90deg, #EA580C, #F97316)" />
                <AnimatedScoreMeter label="Speaking" targetPercent={91} color="linear-gradient(90deg, #0284C7, #38BDF8)" />
              </div>
            </div>
            </div>
          </div>
        </section>

        {/* Why MockAI */}
        <section id="why-mockai" className="border-b py-16 sm:py-24" style={{ borderColor: 'var(--c-border)' }}>
          <div className="c-page">
            <div className="max-w-2xl mb-12 space-y-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: 'var(--c-text)' }}>
                Why practice with MockAI
              </h2>
              <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                Rehearsing out loud, on camera, is the closest thing to the real interview.
              </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              {VALUES.map(({ icon: Icon, title, body }) => (
                <div
                  key={title}
                  className="flex gap-4 items-start p-4 rounded-lg border"
                  style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)' }}
                >
                  <div
                    className="w-9 h-9 rounded-md flex items-center justify-center shrink-0 border"
                    style={{ background: 'var(--c-surface-muted)', borderColor: 'var(--c-border)', color: 'var(--c-accent)' }}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold" style={{ color: 'var(--c-text)' }}>{title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>{body}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="lg:col-span-5">
              <div className="rounded-xl overflow-hidden border shadow-2xl relative" style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface)' }}>
                <CornerReticles size={10} color="var(--c-accent)" />
                <img src={CANDIDATE_IMAGES.completionSeal} alt="" className="w-full aspect-[4/3] object-cover" />
              </div>
            </div>
            </div>
          </div>
        </section>

        {/* Final call to action */}
        <section className="relative py-24 sm:py-32 overflow-hidden" style={{ background: 'var(--c-bg)' }}>
          <div className="absolute inset-0 select-none pointer-events-none overflow-hidden">
            <img src={CANDIDATE_IMAGES.ctaBanner} alt="" className="w-full h-full object-cover object-center opacity-75" />
            <div
              className="absolute inset-0"
              style={{ background: 'radial-gradient(circle at center, rgba(17, 17, 17, 0.50) 0%, rgba(17, 17, 17, 0.80) 70%, var(--c-bg) 100%)' }}
            />
            <div className="absolute inset-x-0 top-0 h-24" style={{ background: 'linear-gradient(to bottom, var(--c-bg), transparent)' }} />
            <div className="absolute inset-x-0 bottom-0 h-24" style={{ background: 'linear-gradient(to top, var(--c-bg), transparent)' }} />
          </div>
          <div className="relative z-10 c-page space-y-6 text-center">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight" style={{ color: '#FFFFFF' }}>
              Your next interview <br />
              starts with practice.
            </h2>
            <p className="text-sm sm:text-base max-w-lg mx-auto leading-relaxed" style={{ color: 'rgba(255, 255, 255, 0.90)' }}>
              Find out what you would say before someone asks.
            </p>
            <div className="pt-2 flex justify-center">
              <Link
                to={ctaDestination}
                className="c-btn c-btn-primary px-8 py-3.5 text-sm font-semibold rounded-xl flex items-center gap-2.5 select-none group"
              >
                <span>Start practicing</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        </section>

        <footer className="border-t py-8 mt-auto" style={{ borderColor: 'var(--c-border)', background: 'var(--c-bg)' }}>
          <div className="c-page flex flex-col sm:flex-row items-center justify-between gap-4 text-xs" style={{ color: 'var(--c-text-muted)' }}>
            <div className="flex items-center gap-2">
              <span className="font-bold" style={{ color: 'var(--c-text)' }}>MockAI</span>
              <span>•</span>
              <span>Mock interview practice</span>
            </div>
            <span>© {new Date().getFullYear()} MockAI</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default LandingPage;
