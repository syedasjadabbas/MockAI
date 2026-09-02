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
  Briefcase,
} from 'lucide-react';
import CandidateNav from '../components/CandidateNav';
import { getDashboardSummary, getCategories, startInterview } from '../services/candidateApi';
import { getSession } from '../services/candidateAuth';
import { formatDate } from '../../utils/dateFormat';
import { CANDIDATE_IMAGES } from '../assets/images';

const STATUS_TONE = {
  Completed: 'c-badge-success',
  'In Progress': 'c-badge-warning',
};

const CATEGORY_ICONS = {
  frontend: Code2,
  backend: Server,
  ai_ml: Cpu,
  behavioral: Users,
  general: Briefcase,
};

function getCategoryIcon(name = '') {
  const lower = name.toLowerCase();
  if (lower.includes('front') || lower.includes('react') || lower.includes('web')) return Code2;
  if (lower.includes('back') || lower.includes('distributed') || lower.includes('data')) return Server;
  if (lower.includes('ai') || lower.includes('machine') || lower.includes('learning')) return Cpu;
  if (lower.includes('behavioral') || lower.includes('leadership') || lower.includes('culture')) return Users;
  return Briefcase;
}

// FR04 / FR05 - Main Candidate Dashboard: Editorial Overview & Session Launcher
const Dashboard = () => {
  const navigate = useNavigate();
  const session = getSession();
  const [summary, setSummary] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [launchingId, setLaunchingId] = useState(null);

  useEffect(() => {
    let isMounted = true;

    Promise.all([getDashboardSummary(), getCategories()])
      .then(([summaryData, categoriesData]) => {
        if (!isMounted) return;
        setSummary(summaryData);
        setCategories(categoriesData || []);
      })
      .catch((err) => {
        console.error('Failed to load dashboard telemetry:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLaunchCategory = async (category) => {
    if (launchingId !== null) return;
    setLaunchingId(category.id);
    try {
      const newInterview = await startInterview({
        role: category.name,
        categoryId: category.id,
        type: category.type || 'technical',
      });
      navigate(`/interview/${newInterview.id}/session`);
    } catch (err) {
      console.error('Failed to auto-provision interview session:', err);
      navigate('/interview/goal');
    } finally {
      setLaunchingId(null);
    }
  };

  const displayName = session?.name || 'Candidate';
  const hasInterviews = (summary?.totalInterviews ?? 0) > 0;
  const hasScore = summary?.averageScore != null;

  return (
    <div className="candidate-app min-h-screen" style={{ background: 'var(--c-bg)' }}>
      {/* Navigation */}
      <CandidateNav />

      {/* Hero Section */}
      <section
        aria-label="Practice Workspace Hero"
        className="w-full border-b"
        style={{
          borderColor: 'var(--c-border)',
          background: 'var(--c-bg-subtle)',
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Left Content Area */}
            <div className="lg:col-span-7 flex flex-col justify-center">
              
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md border mb-4 w-fit"
                style={{
                  background: 'var(--c-surface)',
                  borderColor: 'var(--c-border)',
                }}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--c-accent)' }} />
                <span className="text-xs font-semibold" style={{ color: 'var(--c-text-secondary)' }}>
                  Welcome back, {displayName}
                </span>
              </div>

              <h1 className="c-heading text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-4" style={{ color: 'var(--c-text)' }}>
                Practice before it matters.
              </h1>

              <p
                className="text-sm sm:text-base leading-relaxed mb-8 max-w-[50ch]"
                style={{ color: 'var(--c-text-secondary)' }}
              >
                Simulate realistic interviews with timed prompts, audio-visual recording, and deterministic evaluation scoring.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <Link
                  to="/interview/goal"
                  className="c-btn c-btn-primary px-6 py-3 text-sm font-semibold rounded-md flex items-center gap-2"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Start Interview</span>
                </Link>

                <Link
                  to="/history"
                  className="c-btn c-btn-secondary px-5 py-3 text-sm font-medium rounded-md"
                >
                  <span>View History</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Right 3D Visual Asset */}
            <div className="lg:col-span-5 relative flex items-center justify-center">
              <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden border shadow-lg"
                style={{
                  borderColor: 'var(--c-border)',
                  background: 'var(--c-surface)',
                }}
              >
                <img
                  src={CANDIDATE_IMAGES.dashboardHero}
                  alt="MockAI 3D Analysis Orb"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-14">
        
        {/* LEVEL 1 — Practice Metrics (Direct on page with dividers, no outer container box) */}
        <section aria-label="Candidate Practice Statistics" className="border-b pb-10" style={{ borderColor: 'var(--c-border)' }}>
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-6">
            <div>
              <p className="c-eyebrow mb-1">Telemetry</p>
              <h2 className="c-heading text-xl font-bold" style={{ color: 'var(--c-text)' }}>Practice Record</h2>
            </div>
            {hasInterviews && summary?.lastInterview && (
              <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--c-text-muted)' }}>
                <Clock className="w-3.5 h-3.5" />
                <span>Last active {formatDate(summary.lastInterview.createdAt || summary.lastInterview.created_at)}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-8 sm:gap-12">
            <div>
              <p className="text-[11px] uppercase tracking-wider font-bold mb-1.5" style={{ color: 'var(--c-text-muted)' }}>
                Total Sessions
              </p>
              <p className="c-serif-num text-3xl sm:text-4xl font-bold" style={{ color: 'var(--c-text)' }}>
                {loading ? '—' : summary?.totalInterviews ?? 0}
              </p>
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-wider font-bold mb-1.5" style={{ color: 'var(--c-text-muted)' }}>
                Completed
              </p>
              <p className="c-serif-num text-3xl sm:text-4xl font-bold text-emerald-500">
                {loading ? '—' : summary?.completedInterviews ?? 0}
              </p>
            </div>

            <div className="col-span-2 md:col-span-1">
              <p className="text-[11px] uppercase tracking-wider font-bold mb-1.5" style={{ color: 'var(--c-text-muted)' }}>
                Average Score
              </p>
              <p className="c-serif-num text-3xl sm:text-4xl font-bold" style={{ color: 'var(--c-text)' }}>
                {loading ? '—' : hasScore ? `${Math.round(summary.averageScore)}%` : '—'}
              </p>
            </div>
          </div>
        </section>

        {/* LEVEL 3 — Practice Tracks (Actual standalone interactive objects) */}
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
                const isLaunching = launchingId === cat.id;

                return (
                  <button
                    key={cat.id}
                    onClick={() => handleLaunchCategory(cat)}
                    disabled={launchingId !== null}
                    className="c-card c-card-hover text-left p-5 rounded-lg flex flex-col justify-between group transition-all"
                    style={{
                      background: 'var(--c-surface-card)',
                      borderColor: 'var(--c-border)',
                    }}
                  >
                    <div>
                      <div className="w-9 h-9 rounded-md flex items-center justify-center mb-3 border"
                        style={{
                          background: 'var(--c-surface-muted)',
                          borderColor: 'var(--c-border)',
                          color: 'var(--c-text)',
                        }}
                      >
                        <Icon className="w-4.5 h-4.5" />
                      </div>
                      <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--c-text)' }}>
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
                      <span className="flex items-center gap-1 font-semibold group-hover:text-blue-500" style={{ color: 'var(--c-text-secondary)' }}>
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

        {/* LEVEL 2 — Recent Sessions Data Ledger (Structured open table without outer card container) */}
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
                <div className="col-span-2 text-center">Score</div>
                <div className="col-span-2 text-right">Status / Action</div>
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

                      {/* Score (2 cols) */}
                      <div className="sm:col-span-2 flex items-center sm:justify-center">
                        {isScored ? (
                          <span className="c-badge c-badge-accent text-xs font-mono font-bold px-2 py-0.5 rounded">
                            {Math.round(interview.score)}%
                          </span>
                        ) : (
                          <span className="text-xs font-mono" style={{ color: 'var(--c-text-muted)' }}>—</span>
                        )}
                      </div>

                      {/* Status & Action (2 cols) */}
                      <div className="sm:col-span-2 flex items-center justify-between sm:justify-end gap-2.5">
                        <span className={`c-badge ${STATUS_TONE[interview.status] || 'c-badge-muted'} text-[10px]`}>
                          {interview.status}
                        </span>
                        <span className="text-xs font-medium group-hover:text-blue-500 flex items-center gap-0.5" style={{ color: 'var(--c-text-secondary)' }}>
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
