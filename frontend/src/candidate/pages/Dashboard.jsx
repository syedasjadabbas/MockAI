import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  ArrowRight,
  Clock,
  ChevronRight,
  Code2,
  Server,
  Cpu,
  Users,
  Database,
  Briefcase,
} from 'lucide-react';
import CandidateNav from '../components/CandidateNav';
import { getDashboardSummary, getCategories, startInterview } from '../services/candidateApi';
import { getSession } from '../services/candidateAuth';
import { formatDate } from '../../utils/dateFormat';
import { CANDIDATE_IMAGES } from '../assets/images';

import {
  CornerReticles,
  LiveAudioWaveform,
  TechnicalHUDTag,
  FrontendLayoutSchematic,
  BackendClusterSchematic,
  NeuralNodesDiagram,
  BehavioralDialogueSchematic,
  SqlMatrixSchematic,
} from '../components/TechnicalDoodles';

// Map domain tracks to tailored micro schematics
function getDomainSchematic(categoryName = '') {
  const str = categoryName.toLowerCase();
  if (str.includes('front') || str.includes('web') || str.includes('react') || str.includes('ui')) {
    return FrontendLayoutSchematic;
  }
  if (str.includes('back') || str.includes('node') || str.includes('server') || str.includes('distribut')) {
    return BackendClusterSchematic;
  }
  if (str.includes('ai') || str.includes('ml') || str.includes('learning') || str.includes('neural')) {
    return NeuralNodesDiagram;
  }
  if (str.includes('behav') || str.includes('leader') || str.includes('culture') || str.includes('hr')) {
    return BehavioralDialogueSchematic;
  }
  if (str.includes('data') || str.includes('sql') || str.includes('db') || str.includes('analyt')) {
    return SqlMatrixSchematic;
  }
  return null;
}

// Map tracks to icons
function getCategoryIcon(categoryName = '') {
  const str = categoryName.toLowerCase();
  if (str.includes('front') || str.includes('react') || str.includes('web')) return Code2;
  if (str.includes('back') || str.includes('node') || str.includes('server') || str.includes('system')) return Server;
  if (str.includes('ai') || str.includes('ml') || str.includes('learning')) return Cpu;
  if (str.includes('behavioral') || str.includes('hr') || str.includes('leader')) return Users;
  if (str.includes('data') || str.includes('sql') || str.includes('database')) return Database;
  return Briefcase;
}

// FR04 / FR05 - Main Candidate Dashboard: Editorial Overview & Session Launcher
const Dashboard = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState(getSession());
  const [summary, setSummary] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [launchingId, setLaunchingId] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const [cats, summ] = await Promise.all([
          getCategories().catch(() => []),
          getDashboardSummary().catch(() => null),
        ]);
        if (!isMounted) return;
        setCategories(cats || []);
        setSummary(summ);
      } catch (err) {
        console.error('Failed to load dashboard telemetry:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, []);

  const handleLaunchCategory = async (category) => {
    setLaunchingId(category.id);
    try {
      const newInterview = await startInterview({
        role: category.name,
        categoryId: category.id,
        interviewType: category.type || 'technical',
      });
      navigate(`/interview/${newInterview.id}/prepare`);
    } catch (err) {
      console.error('Failed to auto-provision interview session:', err);
      setLaunchingId(null);
    }
  };

  const hasInterviews = summary && (summary?.totalInterviews ?? 0) > 0;
  const hasScore = summary?.averageScore != null;

  return (
    <div className="candidate-app min-h-screen flex flex-col font-sans" style={{ background: 'var(--c-bg)' }}>
      {/* Navigation */}
      <CandidateNav />

      {/* Hero Section */}
      <section className="relative border-b overflow-hidden"
        style={{
          borderColor: 'var(--c-border)',
          background: 'var(--c-bg-subtle)',
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Left Content Area */}
            <div className="lg:col-span-7 space-y-5">
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border"
                  style={{
                    background: 'var(--c-surface-muted)',
                    borderColor: 'var(--c-border)',
                    color: 'var(--c-text-secondary)',
                  }}
                >
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <span>Welcome back, {session?.name || 'Candidate'}</span>
                </div>

                <div className="hidden sm:flex items-center gap-2 pl-1">
                  <LiveAudioWaveform bars={8} height={14} color="var(--c-accent)" />
                  <TechnicalHUDTag value="STUDIO READY" tone="accent" />
                </div>
              </div>

              <h1 className="c-heading text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.1]"
                style={{ color: 'var(--c-text)' }}
              >
                Practice before it matters.
              </h1>

              <p
                className="text-sm sm:text-base leading-relaxed max-w-xl"
                style={{ color: 'var(--c-text-secondary)' }}
              >
                Simulate realistic interviews with timed prompts, audio-visual recording, and deterministic evaluation scoring.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  to="/interview/goal"
                  className="c-btn c-btn-primary px-5 py-2.5 font-bold text-xs rounded-md shadow-sm flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Start Interview</span>
                </Link>

                <Link
                  to="/history"
                  className="c-btn c-btn-secondary px-5 py-2.5 font-semibold text-xs rounded-md border flex items-center gap-2 transition-colors"
                >
                  <span>View History</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Right 3D Visual Asset */}
            <div className="lg:col-span-5 relative flex items-center justify-center">
              <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden border shadow-lg group"
                style={{
                  borderColor: 'var(--c-border)',
                  background: 'var(--c-surface)',
                }}
              >
                <CornerReticles size={12} color="var(--c-accent)" />
                <img
                  src={CANDIDATE_IMAGES.dashboardHero}
                  alt="MockAI 3D Analysis Orb"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />

                {/* Floating Technical HUD Badge */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                  <span className="c-tech-annotation px-2 py-0.5 rounded bg-black/60 backdrop-blur-sm text-slate-300 border border-white/10">
                    [AI INTERVIEW LAB v2.4]
                  </span>
                  <span className="c-tech-annotation px-2 py-0.5 rounded bg-black/60 backdrop-blur-sm text-blue-400 border border-white/10">
                    44.1kHz SAMPLING
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-14">
        
        {/* LEVEL 1 — Practice Metrics */}
        <section aria-label="Candidate Practice Statistics" className="border-b pb-10" style={{ borderColor: 'var(--c-border)' }}>
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-6">
            <div className="flex items-center gap-3">
              <div>
                <p className="c-eyebrow mb-1">Telemetry</p>
                <h2 className="c-heading text-xl font-bold" style={{ color: 'var(--c-text)' }}>Practice Record</h2>
              </div>
            </div>
            {hasInterviews && summary?.lastInterview && (
              <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--c-text-muted)' }}>
                <Clock className="w-3.5 h-3.5" />
                <span>Last active {formatDate(summary.lastInterview.createdAt || summary.lastInterview.created_at)}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-8 sm:gap-12">
            {/* Total Sessions */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-wider font-bold" style={{ color: 'var(--c-text-muted)' }}>
                  Total Sessions
                </p>
                <span className="c-tech-annotation opacity-40">SESSION.LOG</span>
              </div>
              <p className="c-serif-num text-3xl sm:text-4xl font-bold" style={{ color: 'var(--c-text)' }}>
                {loading ? '—' : summary?.totalInterviews ?? 0}
              </p>
              <div className="w-full bg-slate-500/10 h-1 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min(100, ((summary?.totalInterviews || 0) / 10) * 100)}%` }}
                />
              </div>
            </div>

            {/* Completed */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-wider font-bold" style={{ color: 'var(--c-text-muted)' }}>
                  Completed
                </p>
                <span className="c-tech-annotation opacity-40">EVAL.DONE</span>
              </div>
              <p className="c-serif-num text-3xl sm:text-4xl font-bold text-emerald-500">
                {loading ? '—' : summary?.completedInterviews ?? 0}
              </p>
              <div className="w-full bg-slate-500/10 h-1 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                  style={{
                    width: `${
                      summary?.totalInterviews
                        ? ((summary.completedInterviews || 0) / summary.totalInterviews) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* Average Score */}
            <div className="col-span-2 md:col-span-1 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-wider font-bold" style={{ color: 'var(--c-text-muted)' }}>
                  Average Score
                </p>
                <span className="c-tech-annotation opacity-40">ACCURACY</span>
              </div>
              <p className="c-serif-num text-3xl sm:text-4xl font-bold" style={{ color: 'var(--c-text)' }}>
                {loading ? '—' : hasScore ? `${Math.round(summary.averageScore)}%` : '—'}
              </p>
              <div className="w-full bg-slate-500/10 h-1 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                  style={{ width: `${hasScore ? summary.averageScore : 0}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* LEVEL 3 — Practice Tracks */}
        {categories.length > 0 && (
          <section aria-label="Available Practice Tracks" className="border-b pb-12" style={{ borderColor: 'var(--c-border)' }}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="c-eyebrow mb-1">Domains</p>
                <h2 className="c-heading text-xl font-bold" style={{ color: 'var(--c-text)' }}>Interview Tracks</h2>
              </div>
              <Link to="/interview/goal" className="text-xs font-semibold flex items-center gap-1 hover:opacity-80 transition-opacity" style={{ color: 'var(--c-text-secondary)' }}>
                <span>All topics</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.slice(0, 6).map((cat) => {
                const Icon = getCategoryIcon(cat.name);
                const Schematic = getDomainSchematic(cat.name);
                const isLaunching = launchingId === cat.id;

                return (
                  <button
                    key={cat.id}
                    onClick={() => handleLaunchCategory(cat)}
                    disabled={launchingId !== null}
                    className="c-card c-card-hover text-left p-5 rounded-lg flex flex-col justify-between group transition-all relative overflow-hidden"
                    style={{
                      background: 'var(--c-surface-card)',
                      borderColor: 'var(--c-border)',
                    }}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-9 h-9 rounded-md flex items-center justify-center border transition-colors group-hover:border-blue-500/50"
                          style={{
                            background: 'var(--c-surface-muted)',
                            borderColor: 'var(--c-border)',
                            color: 'var(--c-text)',
                          }}
                        >
                          <Icon className="w-4.5 h-4.5" />
                        </div>
                        {Schematic && (
                          <div className="opacity-40 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--c-text-muted)' }}>
                            <Schematic size={24} />
                          </div>
                        )}
                      </div>
                      <h3 className="text-sm font-bold mb-1 group-hover:text-blue-500 transition-colors" style={{ color: 'var(--c-text)' }}>
                        {cat.name}
                      </h3>
                      <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--c-text-secondary)' }}>
                        {cat.description || 'Targeted interview practice with structured prompts and AI scoring.'}
                      </p>
                    </div>

                    <div className="mt-5 pt-3 border-t flex items-center justify-between text-xs font-medium"
                      style={{ borderColor: 'var(--c-border)' }}
                    >
                      <span style={{ color: 'var(--c-text-muted)' }}>
                        {cat.questionCount ? `${cat.questionCount} Questions` : 'Official Track'}
                      </span>
                      <span className="flex items-center gap-1 font-semibold text-blue-500" style={{ color: 'var(--c-accent)' }}>
                        {isLaunching ? 'Preparing...' : 'Start Session'}
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* LEVEL 2 — Recent Sessions */}
        <section aria-label="Recent Practice Sessions">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="c-eyebrow mb-1">Activity</p>
              <h2 className="c-heading text-xl font-bold" style={{ color: 'var(--c-text)' }}>Recent Sessions</h2>
            </div>
            {hasInterviews && (
              <Link to="/history" className="text-xs font-semibold flex items-center gap-1.5 hover:opacity-80 transition-opacity" style={{ color: 'var(--c-text-secondary)' }}>
                <span>Full history</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>

          {!hasInterviews ? (
            <div className="py-12 text-center border-t border-b" style={{ borderColor: 'var(--c-border)' }}>
              <h3 className="text-base font-bold mb-1.5" style={{ color: 'var(--c-text)' }}>No interviews recorded yet</h3>
              <p className="text-xs max-w-sm mx-auto mb-5" style={{ color: 'var(--c-text-secondary)' }}>
                Begin your first mock session to unlock speech fluency analysis and structured evaluation scoring.
              </p>
              <Link to="/interview/goal" className="c-btn c-btn-primary px-5 py-2.5 text-xs font-semibold rounded-md">
                Start Your First Interview
              </Link>
            </div>
          ) : (
            <div className="border-t border-b" style={{ borderColor: 'var(--c-border)' }}>
              {/* Table Header Row (Desktop) */}
              <div className="hidden sm:grid grid-cols-12 gap-4 py-3 text-[11px] font-bold uppercase tracking-wider border-b"
                style={{ borderColor: 'var(--c-border)', color: 'var(--c-text-muted)' }}
              >
                <div className="col-span-5">Track & Role</div>
                <div className="col-span-3">Date & Time</div>
                <div className="col-span-1 text-center">Score</div>
                <div className="col-span-2 text-center">Status</div>
                <div className="col-span-1 text-right">Action</div>
              </div>

              {/* Table Body Rows */}
              <div className="divide-y" style={{ borderColor: 'var(--c-border)' }}>
                {summary.recent.map((interview) => {
                  const isCompleted = interview.status === 'Completed';
                  const targetUrl = isCompleted
                    ? `/interview/${interview.id}/results`
                    : `/interview/${interview.id}/session`;
                  const Icon = getCategoryIcon(interview.role || '');
                  const displayDate = formatDate(interview.createdAt || interview.created_at || interview.completedAt);
                  const isScored = interview.score != null;

                  return (
                    <Link
                      key={interview.id}
                      to={targetUrl}
                      className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4 py-4 items-center transition-colors hover:bg-slate-500/[0.03] group px-1 sm:px-2 rounded"
                    >
                      {/* Track & Role (5 cols) */}
                      <div className="sm:col-span-5 flex items-center gap-3 min-w-0">
                        <div 
                          className="w-8 h-8 rounded flex items-center justify-center shrink-0 border"
                          style={{ 
                            background: 'var(--c-surface-muted)', 
                            borderColor: 'var(--c-border)', 
                            color: 'var(--c-text)' 
                          }}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate group-hover:text-blue-500 transition-colors" style={{ color: 'var(--c-text)' }}>
                            {interview.role}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] mt-0.5" style={{ color: 'var(--c-text-muted)' }}>
                            <span className="capitalize">{interview.type || 'Technical'}</span>
                            {interview.questions?.length > 0 && (
                              <>
                                <span>•</span>
                                <span>{interview.questions.length} Prompts</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Date & Time (3 cols) */}
                      <div className="sm:col-span-3 text-xs" style={{ color: 'var(--c-text-secondary)' }}>
                        <span className="sm:inline block">{displayDate && displayDate !== '-' ? displayDate : 'Recent Session'}</span>
                      </div>

                      {/* Score (1 col) */}
                      <div className="sm:col-span-1 flex items-center sm:justify-center">
                        {isScored ? (
                          <span className="font-mono text-xs font-bold" style={{ color: 'var(--c-text)' }}>
                            {Math.round(interview.score)}%
                          </span>
                        ) : (
                          <span className="text-xs font-mono" style={{ color: 'var(--c-text-muted)' }}>—</span>
                        )}
                      </div>

                      {/* Status (2 cols) - Minimalist status dot */}
                      <div className="sm:col-span-2 flex items-center sm:justify-center">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--c-text-secondary)' }}>
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              isCompleted ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}
                          />
                          <span>{interview.status || 'In Progress'}</span>
                        </span>
                      </div>

                      {/* Action (1 col) */}
                      <div className="sm:col-span-1 flex items-center justify-end">
                        <span className="text-xs font-semibold group-hover:text-blue-500 flex items-center gap-1 transition-colors" style={{ color: 'var(--c-accent)' }}>
                          <span>{isCompleted ? 'Results' : 'Resume'}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-xs"
        style={{ borderColor: 'var(--c-border)', color: 'var(--c-text-muted)', background: 'var(--c-bg-subtle)' }}
      >
        <p>© 2026 MockAI • Real Question Banks & Explainable AI Evaluation</p>
      </footer>
    </div>
  );
};

export default Dashboard;
