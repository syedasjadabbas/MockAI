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
  ChevronRight,
  ShieldCheck,
  TrendingUp,
  Terminal,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import PublicNav from '../components/PublicNav';
import AnimatedBackground3D from '../components/AnimatedBackground3D';
import { CANDIDATE_IMAGES } from '../assets/images';
import { isAuthenticated } from '../services/candidateAuth';
import { CornerReticles, LiveAudioWaveform, LiveVideoWaveform } from '../components/TechnicalDoodles';

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

                {/* Dual Animated Audio & Video Waveform Indicators */}
                <div className="pt-3 flex flex-wrap items-center gap-5 text-xs font-mono">
                  {/* Audio Waveform */}
                  <div className="flex items-center gap-2">
                    <LiveAudioWaveform bars={12} height={16} color="var(--c-accent)" />
                    <span className="text-[11px] font-mono tracking-wider uppercase" style={{ color: 'var(--c-text-secondary)' }}>
                      Audio Stream
                    </span>
                  </div>

                  <span className="text-[#3A3A3A]">•</span>

                  {/* Video Waveform */}
                  <div className="flex items-center gap-2">
                    <LiveVideoWaveform bars={12} height={16} color="#FF9F1C" />
                    <span className="text-[11px] font-mono tracking-wider uppercase text-[#FF9F1C]">
                      Video Stream 60fps
                    </span>
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
            SECTION 2 — HOW MOCKAI WORKS (Visuals + Micro Code Snippets)
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

            {/* 3 Step Sequence with 3D Visuals & Code Snippets */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              {/* Step 01 */}
              <div className="flex flex-col justify-between p-5 rounded-xl border space-y-4"
                style={{
                  background: 'var(--c-surface)',
                  borderColor: 'var(--c-border)',
                }}
              >
                <div>
                  {/* Step Image */}
                  <div className="relative aspect-video rounded-lg overflow-hidden border mb-4" style={{ borderColor: 'var(--c-border)' }}>
                    <img
                      src={CANDIDATE_IMAGES.neuralSphere}
                      alt="Choose your interview"
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-black/80 text-[#FF6B35] border border-white/10">
                      STEP 01
                    </span>
                  </div>

                  <h3 className="text-base font-bold mb-1" style={{ color: 'var(--c-text)' }}>
                    Choose your interview
                  </h3>
                  <p className="text-xs leading-relaxed mb-3" style={{ color: 'var(--c-text-secondary)' }}>
                    Select from Frontend, Backend, AI/ML, System Design, or Behavioral tracks with calibrated difficulty.
                  </p>
                </div>

                {/* Code Snippet */}
                <div className="rounded-md p-3 font-mono text-[11px] leading-relaxed border"
                  style={{
                    background: '#141414',
                    borderColor: 'var(--c-border)',
                    color: '#A3A3A3',
                  }}
                >
                  <div className="flex items-center justify-between text-[10px] text-[#6B6B6B] border-b pb-1.5 mb-2" style={{ borderColor: 'var(--c-border)' }}>
                    <span className="flex items-center gap-1 text-[#FF6B35]">
                      <Terminal className="w-3 h-3" /> config.json
                    </span>
                    <span>REST API</span>
                  </div>
                  <pre className="overflow-x-auto text-[10.5px]">
                    <span className="text-[#FF9F1C]">{`{\n`}</span>
                    <span className="text-[#A3A3A3]">{`  "track": `}</span><span className="text-[#22C55E]">"distributed_systems"</span><span className="text-[#A3A3A3]">{`,\n`}</span>
                    <span className="text-[#A3A3A3]">{`  "tier": `}</span><span className="text-[#22C55E]">"Senior L5"</span><span className="text-[#A3A3A3]">{`,\n`}</span>
                    <span className="text-[#A3A3A3]">{`  "duration": `}</span><span className="text-[#FF6B35]">45</span>
                    <span className="text-[#FF9F1C]">{`\n}`}</span>
                  </pre>
                </div>
              </div>

              {/* Step 02 */}
              <div className="flex flex-col justify-between p-5 rounded-xl border space-y-4"
                style={{
                  background: 'var(--c-surface)',
                  borderColor: 'var(--c-border)',
                }}
              >
                <div>
                  {/* Step Image */}
                  <div className="relative aspect-video rounded-lg overflow-hidden border mb-4" style={{ borderColor: 'var(--c-border)' }}>
                    <img
                      src={CANDIDATE_IMAGES.studioMic}
                      alt="Answer realistic questions"
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-black/80 text-[#FF6B35] border border-white/10">
                      STEP 02
                    </span>
                  </div>

                  <h3 className="text-base font-bold mb-1" style={{ color: 'var(--c-text)' }}>
                    Answer realistic questions
                  </h3>
                  <p className="text-xs leading-relaxed mb-3" style={{ color: 'var(--c-text-secondary)' }}>
                    Respond under realistic time pressure with synchronized audio-visual capture and speech transcription.
                  </p>
                </div>

                {/* Code Snippet */}
                <div className="rounded-md p-3 font-mono text-[11px] leading-relaxed border"
                  style={{
                    background: '#141414',
                    borderColor: 'var(--c-border)',
                    color: '#A3A3A3',
                  }}
                >
                  <div className="flex items-center justify-between text-[10px] text-[#6B6B6B] border-b pb-1.5 mb-2" style={{ borderColor: 'var(--c-border)' }}>
                    <span className="flex items-center gap-1 text-[#FF6B35]">
                      <Mic className="w-3 h-3" /> stream.ts
                    </span>
                    <span className="text-[#22C55E]">44.1kHz REC</span>
                  </div>
                  <pre className="overflow-x-auto text-[10.5px]">
                    <span className="text-[#FF9F1C]">{`// Live ASR Stream\n`}</span>
                    <span className="text-[#60A5FA]">{`session`}</span><span className="text-[#F5F5F5]">{`.onAudioFrame((chunk) => {\n`}</span>
                    <span className="text-[#A3A3A3]">{`  evaluator.`}</span><span className="text-[#FBBF24]">{`trackCadence`}</span><span className="text-[#F5F5F5]">{`(chunk.wpm);\n`}</span>
                    <span className="text-[#F5F5F5]">{`});`}</span>
                  </pre>
                </div>
              </div>

              {/* Step 03 */}
              <div className="flex flex-col justify-between p-5 rounded-xl border space-y-4"
                style={{
                  background: 'var(--c-surface)',
                  borderColor: 'var(--c-border)',
                }}
              >
                <div>
                  {/* Step Image */}
                  <div className="relative aspect-video rounded-lg overflow-hidden border mb-4" style={{ borderColor: 'var(--c-border)' }}>
                    <img
                      src={CANDIDATE_IMAGES.evalChart}
                      alt="Review your performance"
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-black/80 text-[#FF6B35] border border-white/10">
                      STEP 03
                    </span>
                  </div>

                  <h3 className="text-base font-bold mb-1" style={{ color: 'var(--c-text)' }}>
                    Review your performance
                  </h3>
                  <p className="text-xs leading-relaxed mb-3" style={{ color: 'var(--c-text-secondary)' }}>
                    Inspect explainable scoring across technical accuracy, pacing cadence, and question-level insights.
                  </p>
                </div>

                {/* Code Snippet */}
                <div className="rounded-md p-3 font-mono text-[11px] leading-relaxed border"
                  style={{
                    background: '#141414',
                    borderColor: 'var(--c-border)',
                    color: '#A3A3A3',
                  }}
                >
                  <div className="flex items-center justify-between text-[10px] text-[#6B6B6B] border-b pb-1.5 mb-2" style={{ borderColor: 'var(--c-border)' }}>
                    <span className="flex items-center gap-1 text-[#FF6B35]">
                      <BarChart3 className="w-3 h-3" /> report.json
                    </span>
                    <span className="text-[#FF9F1C]">SCORE: 92/100</span>
                  </div>
                  <pre className="overflow-x-auto text-[10.5px]">
                    <span className="text-[#FF9F1C]">{`{\n`}</span>
                    <span className="text-[#A3A3A3]">{`  "score": `}</span><span className="text-[#FF6B35]">92</span><span className="text-[#A3A3A3]">{`,\n`}</span>
                    <span className="text-[#A3A3A3]">{`  "accuracy": `}</span><span className="text-[#22C55E]">"OPTIMAL"</span><span className="text-[#A3A3A3]">{`,\n`}</span>
                    <span className="text-[#A3A3A3]">{`  "pacing_wpm": `}</span><span className="text-[#60A5FA]">138</span>
                    <span className="text-[#FF9F1C]">{`\n}`}</span>
                  </pre>
                </div>
              </div>

            </div>

          </div>
        </section>

        {/* ===================================================================
            SECTION 3 — WHAT MOCKAI EVALUATES (Rubric Grid + Telemetry Inspector)
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

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Column: 6 Rubric Dimension Cards */}
              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Technical Accuracy */}
                <div className="p-4 rounded-lg border space-y-2"
                  style={{
                    background: 'var(--c-surface)',
                    borderColor: 'var(--c-border)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-[#FF6B35] font-bold">01 • CONTENT</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#181818] text-[#22C55E] border border-white/10">Weight 40%</span>
                  </div>
                  <h3 className="text-sm font-bold" style={{ color: 'var(--c-text)' }}>
                    Technical Accuracy
                  </h3>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                    Conceptual correctness, architectural depth, code logic, and depth of technical reasoning.
                  </p>
                </div>

                {/* Speech & Communication */}
                <div className="p-4 rounded-lg border space-y-2"
                  style={{
                    background: 'var(--c-surface)',
                    borderColor: 'var(--c-border)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-[#FF6B35] font-bold">02 • DELIVERY</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#181818] text-[#60A5FA] border border-white/10">Weight 20%</span>
                  </div>
                  <h3 className="text-sm font-bold" style={{ color: 'var(--c-text)' }}>
                    Speech & Communication
                  </h3>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                    Spoken fluency, articulation structure, and precision with domain vocabulary.
                  </p>
                </div>

                {/* Clarity & Conciseness */}
                <div className="p-4 rounded-lg border space-y-2"
                  style={{
                    background: 'var(--c-surface)',
                    borderColor: 'var(--c-border)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-[#FF6B35] font-bold">03 • STRUCTURE</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#181818] text-[#FBBF24] border border-white/10">Weight 15%</span>
                  </div>
                  <h3 className="text-sm font-bold" style={{ color: 'var(--c-text)' }}>
                    Clarity & Conciseness
                  </h3>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                    Elimination of filler words, direct answering, and organized thought structure.
                  </p>
                </div>

                {/* Pacing Cadence */}
                <div className="p-4 rounded-lg border space-y-2"
                  style={{
                    background: 'var(--c-surface)',
                    borderColor: 'var(--c-border)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-[#FF6B35] font-bold">04 • TEMPO</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#181818] text-[#A855F7] border border-white/10">WPM Metric</span>
                  </div>
                  <h3 className="text-sm font-bold" style={{ color: 'var(--c-text)' }}>
                    Pacing Cadence
                  </h3>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                    Words-per-minute tempo tracking to maintain composure without hesitation.
                  </p>
                </div>

                {/* Response Completeness */}
                <div className="p-4 rounded-lg border space-y-2"
                  style={{
                    background: 'var(--c-surface)',
                    borderColor: 'var(--c-border)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-[#FF6B35] font-bold">05 • SCOPE</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#181818] text-[#EC4899] border border-white/10">Coverage</span>
                  </div>
                  <h3 className="text-sm font-bold" style={{ color: 'var(--c-text)' }}>
                    Completeness
                  </h3>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                    Thoroughness in addressing all dimensions of complex multi-part questions.
                  </p>
                </div>

                {/* Deterministic Score */}
                <div className="p-4 rounded-lg border space-y-2"
                  style={{
                    background: 'var(--c-surface)',
                    borderColor: 'var(--c-border)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-[#FF6B35] font-bold">06 • SYNTHESIS</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#181818] text-[#FF9F1C] border border-white/10">0–100 Index</span>
                  </div>
                  <h3 className="text-sm font-bold" style={{ color: 'var(--c-text)' }}>
                    Overall Performance
                  </h3>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                    A calibrated composite score index calculated objectively across all facets.
                  </p>
                </div>

              </div>

              {/* Right Column: Code Telemetry Terminal Inspector */}
              <div className="lg:col-span-5 rounded-xl border p-5 space-y-4"
                style={{
                  background: '#141414',
                  borderColor: 'var(--c-border)',
                }}
              >
                <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--c-border)' }}>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                    <span className="text-xs font-mono text-[#A3A3A3] ml-2">evaluator_engine.ts</span>
                  </div>
                  <span className="text-[11px] font-mono text-[#FF6B35] font-bold">REAL-TIME TELEMETRY</span>
                </div>

                <pre className="font-mono text-xs leading-relaxed overflow-x-auto text-[#A3A3A3]">
                  <span className="text-[#60A5FA]">{`// Deterministic Evaluation Output\n`}</span>
                  <span className="text-[#FF9F1C]">{`{\n`}</span>
                  <span className="text-[#A3A3A3]">{`  "candidate_id": `}</span><span className="text-[#22C55E]">"cand_7821"</span><span className="text-[#A3A3A3]">{`,\n`}</span>
                  <span className="text-[#A3A3A3]">{`  "rubric_matrix": {\n`}</span>
                  <span className="text-[#A3A3A3]">{`    "technical_accuracy": `}</span><span className="text-[#FF6B35]">94.5</span><span className="text-[#A3A3A3]">{`,\n`}</span>
                  <span className="text-[#A3A3A3]">{`    "clarity_wpm": `}</span><span className="text-[#FF6B35]">136</span><span className="text-[#A3A3A3]">{`,\n`}</span>
                  <span className="text-[#A3A3A3]">{`    "filler_word_ratio": `}</span><span className="text-[#22C55E]">0.012</span><span className="text-[#A3A3A3]">{`,\n`}</span>
                  <span className="text-[#A3A3A3]">{`    "completeness": `}</span><span className="text-[#FF6B35]">96.0</span><span className="text-[#A3A3A3]">{`\n`}</span>
                  <span className="text-[#A3A3A3]">{`  },\n`}</span>
                  <span className="text-[#A3A3A3]">{`  "overall_composite": `}</span><span className="text-[#22C55E]">93.2</span><span className="text-[#A3A3A3]">{`,\n`}</span>
                  <span className="text-[#A3A3A3]">{`  "recommendation": `}</span><span className="text-[#22C55E]">"OPTIMAL_CADENCE"</span>
                  <span className="text-[#FF9F1C]">{`\n}`}</span>
                </pre>

                {/* Visual Level Meters */}
                <div className="pt-3 border-t space-y-2.5 text-xs font-mono" style={{ borderColor: 'var(--c-border)' }}>
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-[#F5F5F5]">Technical Reasoning</span>
                      <span className="text-[#FF6B35] font-bold">94%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[#202020] overflow-hidden">
                      <div className="h-full bg-[#FF6B35] rounded-full" style={{ width: '94%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-[#F5F5F5]">Speech Fluency</span>
                      <span className="text-[#FF9F1C] font-bold">91%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[#202020] overflow-hidden">
                      <div className="h-full bg-[#FF9F1C] rounded-full" style={{ width: '91%' }} />
                    </div>
                  </div>
                </div>

              </div>

            </div>

          </div>
        </section>

        {/* ===================================================================
            SECTION 4 — WHY MOCKAI (Visual Composition + Product Value)
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

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              
              {/* Left Column: 4 Core Pillars */}
              <div className="lg:col-span-7 space-y-5">
                
                <div className="flex gap-4 items-start p-4 rounded-lg border"
                  style={{
                    background: 'var(--c-surface)',
                    borderColor: 'var(--c-border)',
                  }}
                >
                  <div className="w-9 h-9 rounded-md bg-[#181818] border border-[#2E2E2E] flex items-center justify-center shrink-0 text-[#FF6B35]">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold" style={{ color: 'var(--c-text)' }}>
                      Timed Interview Simulation
                    </h3>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                      Practice answering under realistic countdown pressure, developing muscle memory for real interviews.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start p-4 rounded-lg border"
                  style={{
                    background: 'var(--c-surface)',
                    borderColor: 'var(--c-border)',
                  }}
                >
                  <div className="w-9 h-9 rounded-md bg-[#181818] border border-[#2E2E2E] flex items-center justify-center shrink-0 text-[#FF6B35]">
                    <Video className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold" style={{ color: 'var(--c-text)' }}>
                      Audio/Video Response Capture
                    </h3>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                      Direct browser-native media recording with instant local playback review for self-reflection.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start p-4 rounded-lg border"
                  style={{
                    background: 'var(--c-surface)',
                    borderColor: 'var(--c-border)',
                  }}
                >
                  <div className="w-9 h-9 rounded-md bg-[#181818] border border-[#2E2E2E] flex items-center justify-center shrink-0 text-[#FF6B35]">
                    <FileCheck2 className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold" style={{ color: 'var(--c-text)' }}>
                      Explainable AI Evaluation
                    </h3>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                      No vague buzzwords. Get specific, question-by-question feedback identifying exactly what was strong and what to refine.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start p-4 rounded-lg border"
                  style={{
                    background: 'var(--c-surface)',
                    borderColor: 'var(--c-border)',
                  }}
                >
                  <div className="w-9 h-9 rounded-md bg-[#181818] border border-[#2E2E2E] flex items-center justify-center shrink-0 text-[#FF6B35]">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold" style={{ color: 'var(--c-text)' }}>
                      Continuous Progress Tracking
                    </h3>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                      Every attempt is stored in your candidate history ledger to track progression across technical tracks over time.
                    </p>
                  </div>
                </div>

              </div>

              {/* Right Column: 3D Visual Asset Card */}
              <div className="lg:col-span-5 relative">
                <div className="rounded-xl overflow-hidden border shadow-2xl relative"
                  style={{
                    borderColor: 'var(--c-border)',
                    background: 'var(--c-surface)',
                  }}
                >
                  <CornerReticles size={10} color="var(--c-accent)" />
                  <img
                    src={CANDIDATE_IMAGES.completionSeal}
                    alt="MockAI Mastery & Verification"
                    className="w-full aspect-[4/3] object-cover"
                  />
                  
                  {/* Floating Telemetry Badge */}
                  <div className="p-4 border-t space-y-2" style={{ borderColor: 'var(--c-border)', background: '#141414' }}>
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-[#FF6B35] font-bold">VERIFIED_SIMULATION</span>
                      <span className="text-[#22C55E]">● PASS_RATE +48%</span>
                    </div>
                    <p className="text-[11px] text-[#A3A3A3] leading-relaxed">
                      Candidates using MockAI's structured rubric show measurable improvements in response conciseness and technical articulation within 3 practice sessions.
                    </p>
                  </div>
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
