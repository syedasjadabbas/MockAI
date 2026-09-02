import React, { Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Code2,
  Mic,
  BarChart3,
  Clock,
  Video,
  FileCheck2,
  Sparkles,
  Layers,
  ChevronRight,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import PublicNav from '../components/PublicNav';
import AnimatedBackground3D from '../components/AnimatedBackground3D';
import { CANDIDATE_IMAGES } from '../assets/images';
import { isAuthenticated } from '../services/candidateAuth';
import { CornerReticles, LiveAudioWaveform } from '../components/TechnicalDoodles';

const HeroScene3D = lazy(() => import('../components/HeroScene3D'));

const LandingPage = () => {
  const authed = isAuthenticated();
  const ctaDestination = authed ? '/interview/goal' : '/register';

  return (
    <div
      className="candidate-app min-h-screen flex flex-col font-sans relative selection:bg-[#FF6B35]/30 selection:text-[#FFFFFF]"
      style={{ background: 'var(--c-bg)' }}
    >
      {/* 3D Ambient Background Layer */}
      <AnimatedBackground3D />

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Public Navigation */}
        <PublicNav />

        {/* ===================================================================
            SECTION 1 — HERO (Flagship Interactive 3D Section)
           =================================================================== */}
        <section className="relative border-b overflow-hidden" style={{ borderColor: 'var(--c-border)' }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 lg:py-24">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
              
              {/* Left Copy & Actions */}
              <div className="lg:col-span-7 space-y-6">

                {/* Flagship Headline */}
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.08]" style={{ color: 'var(--c-text)' }}>
                  Practice before <br className="hidden sm:block" />
                  <span className="text-[#FF6B35]">it matters.</span>
                </h1>

                {/* Supporting Copy */}
                <p className="text-base sm:text-lg leading-relaxed max-w-xl" style={{ color: 'var(--c-text-secondary)' }}>
                  Simulate realistic technical and behavioral interviews, record synchronized spoken and video responses, and receive objective AI-powered evaluation with actionable performance telemetry.
                </p>

                {/* CTAs */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Link
                    to={ctaDestination}
                    className="c-btn c-btn-primary px-6 py-3 font-bold text-sm rounded-lg flex items-center gap-2 shadow-md transition-all select-none"
                    style={{
                      background: 'var(--c-accent)',
                      color: 'var(--c-on-accent)',
                    }}
                  >
                    <span>Start Practicing</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>

                  <a
                    href="#how-it-works"
                    className="c-btn c-btn-secondary px-5 py-3 font-semibold text-sm rounded-lg border flex items-center gap-2 transition-colors"
                    style={{
                      background: 'var(--c-surface)',
                      borderColor: 'var(--c-border)',
                      color: 'var(--c-text)',
                    }}
                  >
                    <span>Explore MockAI</span>
                    <ChevronRight className="w-4 h-4 text-[#A3A3A3]" />
                  </a>
                </div>

                {/* Micro Metric Telemetry */}
                <div className="pt-4 flex items-center gap-6 text-xs" style={{ color: 'var(--c-text-muted)' }}>
                  <div className="flex items-center gap-2">
                    <LiveAudioWaveform />
                    <span className="font-mono">44.1kHz High-Fi ASR</span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#FF6B35]" />
                    <span className="font-mono">Deterministic Rubric</span>
                  </div>
                </div>

              </div>

              {/* Right Flagship Interactive 3D Hero Visual */}
              <div className="lg:col-span-5 relative flex items-center justify-center">
                <div
                  className="relative w-full aspect-[4/3] rounded-xl overflow-hidden border shadow-2xl"
                  style={{
                    borderColor: 'var(--c-border)',
                    background: 'var(--c-surface)',
                  }}
                >
                  <CornerReticles size={12} color="var(--c-accent)" />
                  
                  <Suspense
                    fallback={
                      <div className="w-full h-full flex items-center justify-center bg-[#111111]">
                        <img
                          src={CANDIDATE_IMAGES.dashboardHero}
                          alt="MockAI 3D Microphone & AI Analysis Core"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    }
                  >
                    <HeroScene3D />
                  </Suspense>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ===================================================================
            SECTION 2 — HOW MOCKAI WORKS (Clean 3-Step Journey)
           =================================================================== */}
        <section id="how-it-works" className="border-b py-16 sm:py-24" style={{ borderColor: 'var(--c-border)' }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            
            {/* Section Header */}
            <div className="max-w-2xl mb-14 space-y-2">
              <p className="c-eyebrow" style={{ color: 'var(--c-accent)' }}>Workflow Architecture</p>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: 'var(--c-text)' }}>
                How MockAI works.
              </h2>
              <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                Three streamlined steps from track configuration to granular assessment.
              </p>
            </div>

            {/* 3 Step Sequence */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              
              {/* Step 01 */}
              <div className="space-y-4 pt-4 border-t" style={{ borderColor: 'var(--c-border)' }}>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-extrabold tracking-widest text-[#FF6B35]">
                    [STEP 01]
                  </span>
                  <Code2 className="w-4 h-4 text-[#A3A3A3]" />
                </div>
                <h3 className="text-lg font-bold" style={{ color: 'var(--c-text)' }}>
                  Choose your interview
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                  Select from Frontend, Backend, AI/ML, System Design, or Behavioral tracks with calibrated difficulty tiers.
                </p>
                <div className="pt-2 text-[11px] font-mono text-[#A3A3A3] flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF9F1C]" />
                  <span>Domain track selection</span>
                </div>
              </div>

              {/* Step 02 */}
              <div className="space-y-4 pt-4 border-t" style={{ borderColor: 'var(--c-border)' }}>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-extrabold tracking-widest text-[#FF6B35]">
                    [STEP 02]
                  </span>
                  <Mic className="w-4 h-4 text-[#A3A3A3]" />
                </div>
                <h3 className="text-lg font-bold" style={{ color: 'var(--c-text)' }}>
                  Answer realistic questions
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                  Respond under realistic time constraints with synchronized audio-visual capture and speech transcription.
                </p>
                <div className="pt-2 text-[11px] font-mono text-[#A3A3A3] flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                  <span>Timed simulator active</span>
                </div>
              </div>

              {/* Step 03 */}
              <div className="space-y-4 pt-4 border-t" style={{ borderColor: 'var(--c-border)' }}>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-extrabold tracking-widest text-[#FF6B35]">
                    [STEP 03]
                  </span>
                  <BarChart3 className="w-4 h-4 text-[#A3A3A3]" />
                </div>
                <h3 className="text-lg font-bold" style={{ color: 'var(--c-text)' }}>
                  Review your performance
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                  Inspect explainable scoring across technical accuracy, pacing cadence, communication, and question-level insights.
                </p>
                <div className="pt-2 text-[11px] font-mono text-[#A3A3A3] flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B35]" />
                  <span>Deterministic report ledger</span>
                </div>
              </div>

            </div>

          </div>
        </section>

        {/* ===================================================================
            SECTION 3 — WHAT MOCKAI EVALUATES (Authentic Capabilities)
           =================================================================== */}
        <section id="evaluation" className="border-b py-16 sm:py-24" style={{ borderColor: 'var(--c-border)' }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            
            <div className="max-w-2xl mb-14 space-y-2">
              <p className="c-eyebrow" style={{ color: 'var(--c-accent)' }}>Assessment Dimensions</p>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: 'var(--c-text)' }}>
                What MockAI evaluates.
              </h2>
              <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                Objective, explainable rubrics focused on the core signals technical hiring teams look for.
              </p>
            </div>

            {/* Rubric Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* Technical / Content */}
              <div className="p-6 rounded-lg border space-y-3"
                style={{
                  background: 'var(--c-surface)',
                  borderColor: 'var(--c-border)',
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-[#FF6B35] font-bold">01 • CONTENT</span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#181818] text-[#A3A3A3] border border-[#2E2E2E]">Core Metric</span>
                </div>
                <h3 className="text-base font-bold" style={{ color: 'var(--c-text)' }}>
                  Technical Accuracy
                </h3>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                  Evaluates conceptual correctness, architectural choices, code logic, and depth of technical reasoning.
                </p>
              </div>

              {/* Communication */}
              <div className="p-6 rounded-lg border space-y-3"
                style={{
                  background: 'var(--c-surface)',
                  borderColor: 'var(--c-border)',
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-[#FF6B35] font-bold">02 • DELIVERY</span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#181818] text-[#A3A3A3] border border-[#2E2E2E]">ASR Analysis</span>
                </div>
                <h3 className="text-base font-bold" style={{ color: 'var(--c-text)' }}>
                  Speech & Communication
                </h3>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                  Analyzes spoken fluency, structured thought articulation, and precision in technical terminology.
                </p>
              </div>

              {/* Clarity & Conciseness */}
              <div className="p-6 rounded-lg border space-y-3"
                style={{
                  background: 'var(--c-surface)',
                  borderColor: 'var(--c-border)',
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-[#FF6B35] font-bold">03 • STRUCTURE</span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#181818] text-[#A3A3A3] border border-[#2E2E2E]">Conciseness</span>
                </div>
                <h3 className="text-base font-bold" style={{ color: 'var(--c-text)' }}>
                  Clarity & Conciseness
                </h3>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                  Identifies rambling, unnecessary filler, and measures how effectively direct answers are framed.
                </p>
              </div>

              {/* Pacing Cadence */}
              <div className="p-6 rounded-lg border space-y-3"
                style={{
                  background: 'var(--c-surface)',
                  borderColor: 'var(--c-border)',
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-[#FF6B35] font-bold">04 • TEMPO</span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#181818] text-[#A3A3A3] border border-[#2E2E2E]">WPM Tracking</span>
                </div>
                <h3 className="text-base font-bold" style={{ color: 'var(--c-text)' }}>
                  Pacing Cadence
                </h3>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                  Computes words-per-minute tempo to ensure your delivery is neither rushed nor hesitant.
                </p>
              </div>

              {/* Completeness */}
              <div className="p-6 rounded-lg border space-y-3"
                style={{
                  background: 'var(--c-surface)',
                  borderColor: 'var(--c-border)',
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-[#FF6B35] font-bold">05 • SCOPE</span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#181818] text-[#A3A3A3] border border-[#2E2E2E]">Coverage</span>
                </div>
                <h3 className="text-base font-bold" style={{ color: 'var(--c-text)' }}>
                  Response Completeness
                </h3>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                  Measures whether all sub-parts of complex multi-tier prompts were addressed thoroughly.
                </p>
              </div>

              {/* Overall Performance */}
              <div className="p-6 rounded-lg border space-y-3"
                style={{
                  background: 'var(--c-surface)',
                  borderColor: 'var(--c-border)',
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-[#FF6B35] font-bold">06 • SYNTHESIS</span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#181818] text-[#A3A3A3] border border-[#2E2E2E]">Composite</span>
                </div>
                <h3 className="text-base font-bold" style={{ color: 'var(--c-text)' }}>
                  Deterministic Score
                </h3>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                  A calibrated 0–100 composite index calculated objectively across all individual evaluation facets.
                </p>
              </div>

            </div>

          </div>
        </section>

        {/* ===================================================================
            SECTION 4 — WHY MOCKAI (Product Value)
           =================================================================== */}
        <section id="why-mockai" className="border-b py-16 sm:py-24" style={{ borderColor: 'var(--c-border)' }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            
            <div className="max-w-2xl mb-14 space-y-2">
              <p className="c-eyebrow" style={{ color: 'var(--c-accent)' }}>Product Value</p>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: 'var(--c-text)' }}>
                Why candidates choose MockAI.
              </h2>
              <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                Built to replace high-stakes guesswork with calibrated, repeatable practice.
              </p>
            </div>

            {/* Structured Value Composition */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              <div className="flex gap-4 items-start">
                <div className="w-9 h-9 rounded-md bg-[#1F1F1F] border border-[#2E2E2E] flex items-center justify-center shrink-0 text-[#FF6B35]">
                  <Clock className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold" style={{ color: 'var(--c-text)' }}>
                    Timed Interview Simulation
                  </h3>
                  <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                    Practice answering questions under realistic countdown pressure, developing muscle memory for real interviews.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="w-9 h-9 rounded-md bg-[#1F1F1F] border border-[#2E2E2E] flex items-center justify-center shrink-0 text-[#FF6B35]">
                  <Video className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold" style={{ color: 'var(--c-text)' }}>
                    Audio/Video Response Capture
                  </h3>
                  <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                    Direct browser-native media recording with instant local playback review for self-reflection.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="w-9 h-9 rounded-md bg-[#1F1F1F] border border-[#2E2E2E] flex items-center justify-center shrink-0 text-[#FF6B35]">
                  <FileCheck2 className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold" style={{ color: 'var(--c-text)' }}>
                    Explainable AI Evaluation
                  </h3>
                  <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                    No vague buzzwords. Get specific, question-by-question feedback identifying exactly what was strong and what to refine.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="w-9 h-9 rounded-md bg-[#1F1F1F] border border-[#2E2E2E] flex items-center justify-center shrink-0 text-[#FF6B35]">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold" style={{ color: 'var(--c-text)' }}>
                    Performance History Ledger
                  </h3>
                  <p className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                    Every attempt is saved in your candidate history ledger to track progression across technical tracks over time.
                  </p>
                </div>
              </div>

            </div>

          </div>
        </section>

        {/* ===================================================================
            SECTION 5 — FINAL CTA & FOOTER
           =================================================================== */}
        <section className="py-20 sm:py-28" style={{ background: 'var(--c-bg-subtle)' }}>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6">
            
            <p className="c-eyebrow text-[#FF6B35]">Get Ready Today</p>
            
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight" style={{ color: 'var(--c-text)' }}>
              Your next interview <br />
              starts with practice.
            </h2>
            
            <p className="text-sm sm:text-base max-w-lg mx-auto leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
              Build confidence, master technical articulation, and eliminate surprise before your real interview.
            </p>

            <div className="pt-2 flex justify-center">
              <Link
                to={ctaDestination}
                className="c-btn c-btn-primary px-8 py-3.5 text-sm font-bold rounded-lg shadow-lg flex items-center gap-2 select-none"
                style={{
                  background: 'var(--c-accent)',
                  color: 'var(--c-on-accent)',
                }}
              >
                <span>Start Practicing</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

          </div>
        </section>

        {/* Minimalist Public Footer */}
        <footer className="border-t py-8 mt-auto" style={{ borderColor: 'var(--c-border)', background: 'var(--c-bg)' }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs" style={{ color: 'var(--c-text-muted)' }}>
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#F5F5F5]">MockAI</span>
              <span>•</span>
              <span>AI-Powered Interview Practice Platform</span>
            </div>

            <div className="flex items-center gap-4 font-mono text-[11px]">
              <span className="text-[#22C55E]">● ALL SYSTEMS OPERATIONAL</span>
              <span>•</span>
              <span>© {new Date().getFullYear()} MockAI</span>
            </div>
          </div>
        </footer>

      </div>
    </div>
  );
};

export default LandingPage;
