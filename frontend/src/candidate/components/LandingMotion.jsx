import React, { useEffect, useRef, useState } from 'react';
import {
  motion,
  AnimatePresence,
  animate,
  useInView,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'framer-motion';
import { Check, ArrowRight } from 'lucide-react';
import ScoreRing from './ScoreRing';

// Homepage motion: gentle, purposeful, and switched off for people whose
// device asks for reduced motion. Content is never hidden behind an
// animation that has to finish before it can be read.

const EASE = [0.22, 1, 0.36, 1];

function useMediaQuery(query) {
  const [match, setMatch] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatch(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return match;
}

// Fades and lifts its content into place the first time it scrolls into view.
export const Reveal = ({ children, delay = 0, y = 24, className = '', as = 'div', ...rest }) => {
  const reduce = useReducedMotion();
  const Tag = motion[as] || motion.div;
  if (reduce) {
    const Plain = as;
    return <Plain className={className} {...rest}>{children}</Plain>;
  }
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.7, ease: EASE, delay }}
      {...rest}
    >
      {children}
    </Tag>
  );
};

// The hero headline rises in word by word when the page opens.
export const HeadlineReveal = ({ lines, className, style }) => {
  const reduce = useReducedMotion();
  let i = 0;
  return (
    <h1 className={className} style={style}>
      {lines.map((line, li) => (
        <React.Fragment key={li}>
          {li > 0 && <br className="hidden sm:block" />}
          {li > 0 && ' '}
          <span style={line.accent ? { color: 'var(--c-accent)' } : undefined}>
            {line.text.split(' ').map((word, wi) => {
              const d = 0.08 + (i++) * 0.07;
              return (
                <React.Fragment key={wi}>
                  {wi > 0 && ' '}
                  <span className="inline-block overflow-hidden align-bottom pb-[0.08em]">
                    {reduce ? (
                      <span className="inline-block">{word}</span>
                    ) : (
                      <motion.span
                        className="inline-block"
                        initial={{ y: '105%', opacity: 0 }}
                        animate={{ y: '0%', opacity: 1 }}
                        transition={{ duration: 0.8, ease: EASE, delay: d }}
                      >
                        {word}
                      </motion.span>
                    )}
                  </span>
                </React.Fragment>
              );
            })}
          </span>
        </React.Fragment>
      ))}
    </h1>
  );
};

// A number that counts up from 0 the first time it scrolls into view.
export const CountUp = ({ to, duration = 1.2 }) => {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const [value, setValue] = useState(reduce ? to : 0);
  useEffect(() => {
    if (reduce) { setValue(to); return undefined; }
    if (!inView) return undefined;
    const controls = animate(0, to, { duration, ease: 'easeOut', onUpdate: (v) => setValue(Math.round(v)) });
    return () => controls.stop();
  }, [inView, reduce, to, duration]);
  return <span ref={ref} className="tabular-nums" style={{ color: 'var(--c-accent)' }}>{value}</span>;
};

// The thin orange line on each section band draws itself when reached.
export function useDrawBandLines() {
  useEffect(() => {
    const bands = Array.from(document.querySelectorAll('.c-section-band'));
    if (!bands.length) return undefined;
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-drawn'); obs.unobserve(e.target); } }),
      { threshold: 0.12 },
    );
    bands.forEach((b) => obs.observe(b));
    return () => obs.disconnect();
  }, []);
}

// Example result that comes alive when it scrolls into view: the score
// counts up, the bars fill and the two notes appear.
const SAMPLE_PARTS = [['What you said', 74], ['How you said it', 85], ['How you came across', 80]];

export const AnimatedSampleResult = () => {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const on = reduce || inView;
  const [score, setScore] = useState(reduce ? 78 : 0);
  // Each bar's number counts up from 0 together with its bar.
  const [parts, setParts] = useState(() => SAMPLE_PARTS.map(([, v]) => (reduce ? v : 0)));

  useEffect(() => {
    if (!inView || reduce) return undefined;
    const controls = [
      animate(0, 78, { duration: 1.4, ease: 'easeOut', onUpdate: (v) => setScore(Math.round(v)) }),
      ...SAMPLE_PARTS.map(([, target], i) => animate(0, target, {
        duration: 1.1,
        delay: 0.3 + i * 0.15,
        ease: [0.22, 1, 0.36, 1],
        onUpdate: (v) => setParts((prev) => { const next = [...prev]; next[i] = Math.round(v); return next; }),
      })),
    ];
    return () => controls.forEach((c) => c.stop());
  }, [inView, reduce]);

  return (
    <div ref={ref} className="rounded-2xl border p-6 space-y-5 shadow-2xl" style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)' }} aria-label="Example result">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--c-text-muted)' }}>Example result</p>
        <span className="text-xs" style={{ color: 'var(--c-text-muted)' }}>Nursing interview</span>
      </div>
      <div className="flex items-center gap-5">
        <ScoreRing value={score} suffix="%" size={104} strokeWidth={9} tone="accent" />
        <div>
          <p className="text-2xl font-bold" style={{ color: 'var(--c-text)' }}>Strong</p>
          <p className="text-sm mt-1" style={{ color: 'var(--c-text-secondary)' }}>Clear answers with good examples. Add more on patient safety.</p>
        </div>
      </div>
      <div className="space-y-3">
        {SAMPLE_PARTS.map(([label], i) => (
          <div key={label} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span style={{ color: 'var(--c-text-secondary)' }}>{label}</span>
              <span className="font-semibold tabular-nums" style={{ color: 'var(--c-text)' }}>{parts[i]}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--c-surface-muted)' }}>
              <div className="h-full rounded-full" style={{ width: `${parts[i]}%`, background: 'var(--c-accent)' }} />
            </div>
          </div>
        ))}
      </div>
      <div className="pt-4 border-t space-y-2 text-sm" style={{ borderColor: 'var(--c-border)', color: 'var(--c-text-secondary)' }}>
        {[
          [Check, 'Kept a steady pace with few filler words.', 'var(--c-accent)'],
          [ArrowRight, "Next time, mention how you would check the patient's ID.", 'var(--c-text-muted)'],
        ].map(([Icon, text, color], i) => (
          <p key={text} className="flex items-start gap-2" style={{
            opacity: on ? 1 : 0,
            transform: on ? 'none' : 'translateY(8px)',
            transition: reduce ? 'none' : `opacity 0.6s ease ${1.1 + i * 0.25}s, transform 0.6s ease ${1.1 + i * 0.25}s`,
          }}>
            <Icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color }} /> {text}
          </p>
        ))}
      </div>
    </div>
  );
};

// "How it works" as a scroll story on large screens: the section stays on
// screen while the visitor scrolls, the steps light up in turn, the picture
// changes and an orange line grows down the side. Phones and reduced-motion
// get the simple three-column layout (`fallback`).
export const StepsStory = ({ steps, renderVisual, fallback }) => {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const wide = useMediaQuery('(min-width: 1024px)');
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const [active, setActive] = useState(0);
  const lineScale = useTransform(scrollYProgress, [0, 1], [0, 1]);

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    setActive(Math.min(steps.length - 1, Math.max(0, Math.floor(v * steps.length * 0.999))));
  });

  if (!wide || reduce) return fallback;

  const goToStep = (i) => {
    const el = ref.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const span = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + span * ((i + 0.5) / steps.length), behavior: 'smooth' });
  };

  return (
    <div ref={ref} className="relative" style={{ height: `${steps.length * 75 + 25}vh` }}>
      <div className="sticky top-24 grid grid-cols-12 gap-14 items-center" style={{ height: 'calc(100vh - 8rem)' }}>
        <ol className="col-span-5 relative pl-12 space-y-10">
          <div className="absolute left-[15px] top-4 bottom-4 w-0.5 rounded-full" style={{ background: 'var(--c-border-strong)' }} aria-hidden="true">
            <motion.div className="w-full h-full rounded-full origin-top" style={{ scaleY: lineScale, background: 'var(--c-accent)' }} />
          </div>
          {steps.map((step, i) => {
            const isActive = i === active;
            const done = i < active;
            return (
              <li key={step.title}>
                <button type="button" onClick={() => goToStep(i)} className="text-left w-full relative" aria-current={isActive ? 'step' : undefined}>
                  <span
                    className="absolute -left-12 top-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors duration-300"
                    style={{
                      background: isActive || done ? 'var(--c-accent)' : 'var(--c-bg)',
                      borderColor: isActive || done ? 'var(--c-accent)' : 'var(--c-border-strong)',
                      color: isActive || done ? '#fff' : 'var(--c-text-muted)',
                    }}
                  >
                    {done ? <Check className="w-4 h-4" /> : i + 1}
                  </span>
                  <span className="block text-xl font-bold transition-colors duration-300" style={{ color: isActive ? 'var(--c-text)' : 'var(--c-text-muted)' }}>{step.title}</span>
                  <span className="block text-sm leading-relaxed mt-1.5 transition-all duration-300 max-w-sm"
                    style={{ color: 'var(--c-text-secondary)', opacity: isActive ? 1 : 0.45 }}>
                    {step.body}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        <div className="col-span-7 relative aspect-video">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              className="absolute inset-0"
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.02, y: -12 }}
              transition={{ duration: 0.5, ease: EASE }}
            >
              {renderVisual(steps[active], active)}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
