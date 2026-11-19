import React, { useState, useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ShieldCheck,
  Scale,
  Sparkles,
  UserCheck,
  FileText,
  AlertCircle,
  Database,
  Camera,
  Cpu,
  Server,
  Lock,
  Trash2,
  Users,
  Mail,
} from 'lucide-react';
import logo from '../../assets/logo.png';
import { isAuthenticated } from '../services/candidateAuth';

// Terms of Use and Privacy Policy — written in plain language and kept in step
// with what MockAI actually does (backend/routes/candidate*.py & services/media_*.py).

const UPDATED = '19 November 2026';

const TERMS = {
  key: 'terms',
  title: 'Terms of Use',
  subtitle: 'Simple rules for using MockAI. By using the site, you agree to them.',
  highlights: [
    { icon: Sparkles, title: 'Practice only', text: 'Student FYP tool, not a recruiter.' },
    { icon: Scale, title: 'AI guidance', text: 'Scores are tips, not hiring verdicts.' },
    { icon: FileText, title: 'You own it', text: 'Your answers and recordings stay yours.' },
    { icon: ShieldCheck, title: 'Play fair', text: 'Only record yourself and respect limits.' },
  ],
  sections: [
    {
      icon: Sparkles,
      heading: 'What MockAI is',
      preview: 'A student-built interview practice tool, not a hiring service.',
      body: [
        'MockAI asks practice questions for your chosen field, reviews your answers, and gives scores and feedback so you can improve.',
        'It is a final year project by students at COMSATS University Islamabad, Lahore Campus — not a recruitment service or connected to any employer.',
      ],
    },
    {
      icon: Scale,
      heading: 'Scores are a guide, not a judgement',
      preview: 'AI feedback helps you practice; never use it for hiring decisions.',
      body: [
        'Scores and feedback are produced automatically by AI models and can be wrong. They do not predict whether you will get a job.',
        'Use them as practice advice only — not for hiring, admissions, or other major decisions.',
      ],
    },
    {
      icon: UserCheck,
      heading: 'Your account',
      preview: 'Use a real email, protect your password, or sign in with Google.',
      list: [
        'Use a real email address for verification and password-reset codes.',
        'Keep your password private — you are responsible for your account.',
        'Several wrong passwords in a row briefly lock your account for safety.',
        'Google sign-in shares your name, email address, and profile picture with us.',
      ],
    },
    {
      icon: ShieldCheck,
      heading: 'Fair use rules',
      preview: 'Only record yourself and do not misuse the platform.',
      list: [
        'Do not record or upload anyone else without their permission.',
        'Do not try to break into, overload, copy, or bypass service limits.',
        'Do not use another person’s account or upload illegal or abusive content.',
      ],
      note: 'We may suspend or remove accounts that break these rules.',
    },
    {
      icon: Users,
      heading: 'Mentor sessions & your content',
      preview: 'Mentors give independent advice; your recordings remain yours.',
      list: [
        'Mentors: Listed mentors give their own advice; MockAI does not guarantee it. Bookings and cancellations email both you and the mentor.',
        'Your content: Your answers and recordings stay yours. You only allow MockAI to process them to run, score, and show your interview.',
      ],
    },
    {
      icon: AlertCircle,
      heading: 'No guarantee & updates',
      preview: 'Provided "as is" as a student project and updated over time.',
      body: [
        'As a student project, MockAI is provided as-is and may change, have bugs, go offline, or lose saved data. To the extent the law allows, we are not responsible for any loss.',
        'If we update these terms, we change the date at the top. Continuing to use MockAI means you accept the update.',
      ],
    },
  ],
};

const PRIVACY = {
  key: 'privacy',
  title: 'Privacy Policy',
  subtitle: 'We keep only what is needed to run your practice interviews — nothing more.',
  highlights: [
    { icon: Server, title: 'Private AI', text: 'Runs on our server — no outside AI.' },
    { icon: Camera, title: 'Your choice', text: 'Camera & mic are always optional.' },
    { icon: Lock, title: 'Never sold', text: 'No ads, no tracking, no data sales.' },
    { icon: Trash2, title: 'Easy delete', text: 'Remove recordings from results anytime.' },
  ],
  sections: [
    {
      icon: Database,
      heading: 'What we collect',
      preview: 'Account info, your answers, scores, and basic security logs.',
      list: [
        'Account: Name, email, and hashed password (or Google name, email, and photo).',
        'Interviews: Your job goal, typed or recorded answers, transcripts, scores, and feedback.',
        'Optional: Profile extras, mentor bookings, and survey responses you choose to share.',
        'Security: Basic technical info like IP address to limit spam and protect accounts.',
      ],
    },
    {
      icon: Camera,
      heading: 'Camera & microphone',
      preview: 'Always opt-in — you can practice by typing if you prefer.',
      body: [
        'MockAI asks for permission before every interview. Choose camera + mic, mic only, or typing only. Nothing is recorded unless you choose voice or video.',
      ],
    },
    {
      icon: Cpu,
      heading: 'How we use it',
      preview: 'Strictly to score interviews, track progress, and send account emails.',
      list: [
        'Transcribe spoken answers, score them, and generate coaching feedback.',
        'Show your interview history and progress over time.',
        'Send sign-up codes, password resets, and mentor booking emails.',
      ],
      note: 'We never sell your information and never use it for advertising.',
    },
    {
      icon: Server,
      heading: 'Where processing happens',
      preview: 'Analyzed on MockAI’s own server — never sent to outside AI companies.',
      body: [
        'Your answers are evaluated by AI models running directly on MockAI’s server, not an external AI provider. Account and interview data are stored in MongoDB, and emails go through our email provider.',
      ],
    },
    {
      icon: Lock,
      heading: 'How we protect it',
      preview: 'Encrypted recordings, hashed passwords, and private access.',
      list: [
        'Recordings are stored encrypted on the server.',
        'Passwords are always hashed — never stored in plain text.',
        'Only you and MockAI administrators can see your interviews.',
      ],
      note: 'No system is 100% perfect, but we take reasonable care to keep your data safe.',
    },
    {
      icon: Trash2,
      heading: 'Keeping & deleting your data',
      preview: 'Delete recordings anytime or ask us to remove your whole account.',
      list: [
        'Delete interview recordings from your Results page once scoring finishes (your scores, transcript, and feedback stay). Recordings may also auto-delete after a set period.',
        'View your history, edit your profile, or change your password anytime.',
        'Email us anytime to permanently delete your account and all data.',
      ],
      note: 'If this policy changes, we will update this page and the date at the top.',
    },
  ],
};

const PAGES = { '/terms': TERMS, '/privacy': PRIVACY };

const LegalPage = () => {
  const { pathname } = useLocation();
  const page = PAGES[pathname] || TERMS;
  const isTerms = page.key === 'terms';
  const authed = isAuthenticated();

  // Track which accordion rows are expanded (starts clean & collapsed so the page is effortless to scan)
  const [openIndices, setOpenIndices] = useState([]);

  useEffect(() => {
    window.scrollTo(0, 0);
    setOpenIndices([]);
    document.title = `${page.title} · MockAI`;
  }, [page]);

  const allOpen = openIndices.length === page.sections.length;

  const toggleItem = (idx) => {
    setOpenIndices((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  const toggleAll = () => {
    setOpenIndices(allOpen ? [] : page.sections.map((_, i) => i));
  };

  return (
    <div
      className="candidate-app min-h-screen flex flex-col font-sans selection:bg-[#FF6B35]/20 selection:text-[#FF6B35]"
      style={{ background: 'var(--c-bg)' }}
    >
      {/* Clean Minimal Header */}
      <header
        className="border-b sticky top-0 z-30 backdrop-blur-md"
        style={{
          borderColor: 'var(--c-border)',
          background: 'color-mix(in srgb, var(--c-bg) 88%, transparent)',
        }}
      >
        <div className="c-page h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={logo} alt="MockAI" className="w-7 h-7 rounded-lg object-contain" />
            <span className="text-base font-bold tracking-tight" style={{ color: 'var(--c-text)' }}>
              Mock<span style={{ color: 'var(--c-accent)' }}>AI</span>
            </span>
          </Link>

          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-[var(--c-text)]"
            style={{ color: 'var(--c-text-secondary)' }}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to home</span>
          </Link>
        </div>
      </header>

      {/* Wide Asymmetric Layout Using .c-page */}
      <main className="flex-1">
        <div className="c-page py-10 sm:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 xl:gap-16 items-start">
            {/* Left Column: Switcher, Intro & At-a-Glance Summary */}
            <div className="lg:col-span-5 lg:sticky lg:top-24">
              {/* Segmented Tab Switcher */}
              <div
                className="inline-flex p-1 rounded-xl border mb-7"
                style={{ background: 'var(--c-surface-muted)', borderColor: 'var(--c-border)' }}
                role="tablist"
                aria-label="Legal pages"
              >
                <NavLink
                  to="/terms"
                  className="flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all"
                  style={({ isActive }) => ({
                    color: isActive ? 'var(--c-on-accent)' : 'var(--c-text-secondary)',
                    background: isActive ? 'var(--c-accent)' : 'transparent',
                  })}
                >
                  <Scale className="w-3.5 h-3.5" />
                  Terms of Use
                </NavLink>
                <NavLink
                  to="/privacy"
                  className="flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all"
                  style={({ isActive }) => ({
                    color: isActive ? 'var(--c-on-accent)' : 'var(--c-text-secondary)',
                    background: isActive ? 'var(--c-accent)' : 'transparent',
                  })}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Privacy Policy
                </NavLink>
              </div>

              {/* Page Title */}
              <div>
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight" style={{ color: 'var(--c-text)' }}>
                  {page.title}
                </h1>
                <p className="mt-2.5 text-base leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                  {page.subtitle}
                </p>
                <p className="mt-2 text-xs" style={{ color: 'var(--c-text-muted)' }}>
                  Last updated {UPDATED}
                </p>
              </div>

              {/* At-a-Glance Summary Grid (4 Compact Tiles) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-7">
                {page.highlights.map(({ icon: Icon, title, text }) => (
                  <div
                    key={title}
                    className="flex items-start gap-3 p-4 rounded-xl border"
                    style={{
                      background: 'var(--c-surface-card)',
                      borderColor: 'var(--c-border)',
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: 'var(--c-accent-soft)', color: 'var(--c-accent)' }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-sm font-semibold" style={{ color: 'var(--c-text)' }}>
                        {title}
                      </h2>
                      <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                        {text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Expandable Topics & Footer Links */}
            <div className="lg:col-span-7">
              {/* Accordion List Header */}
              <div className="flex items-center justify-between mb-3 lg:pt-1">
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--c-text-muted)' }}>
                  Tap any topic for details
                </p>
                <button
                  type="button"
                  onClick={toggleAll}
                  className="text-xs font-semibold transition-colors hover:underline"
                  style={{ color: 'var(--c-accent)' }}
                >
                  {allOpen ? 'Collapse all' : 'Expand all'}
                </button>
              </div>

              {/* Expandable Topics */}
              <div className="space-y-2.5">
                {page.sections.map((section, idx) => {
                  const Icon = section.icon;
                  const isOpen = openIndices.includes(idx);

                  return (
                    <div
                      key={section.heading}
                      className="rounded-xl border overflow-hidden transition-colors"
                      style={{
                        background: 'var(--c-surface-card)',
                        borderColor: isOpen ? 'var(--c-border-strong)' : 'var(--c-border)',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => toggleItem(idx)}
                        aria-expanded={isOpen}
                        className="w-full flex items-center gap-3.5 px-4 sm:px-5 py-4 text-left transition-colors hover:bg-white/[0.02]"
                      >
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors"
                          style={{
                            background: isOpen ? 'var(--c-accent)' : 'var(--c-surface-muted)',
                            color: isOpen ? 'var(--c-on-accent)' : 'var(--c-accent)',
                          }}
                        >
                          <Icon className="w-4 h-4" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm sm:text-base font-semibold leading-snug" style={{ color: 'var(--c-text)' }}>
                            {section.heading}
                          </h3>
                          <p className="text-xs sm:text-sm mt-0.5 truncate sm:whitespace-normal" style={{ color: 'var(--c-text-muted)' }}>
                            {section.preview}
                          </p>
                        </div>

                        <ChevronDown
                          className={`w-4 h-4 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                          style={{ color: isOpen ? 'var(--c-accent)' : 'var(--c-text-muted)' }}
                        />
                      </button>

                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            className="overflow-hidden"
                          >
                            <div
                              className="px-4 sm:px-5 pb-5 pt-3 border-t space-y-3 text-sm leading-relaxed"
                              style={{ borderColor: 'var(--c-border)', color: 'var(--c-text-secondary)' }}
                            >
                              {section.body?.map((paragraph) => (
                                <p key={paragraph}>{paragraph}</p>
                              ))}

                              {section.list && (
                                <ul className="space-y-2">
                                  {section.list.map((item) => (
                                    <li key={item} className="flex items-start gap-2.5">
                                      <span
                                        className="w-1.5 h-1.5 rounded-full mt-2 shrink-0"
                                        style={{ background: 'var(--c-accent)' }}
                                        aria-hidden="true"
                                      />
                                      <span>{item}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}

                              {section.note && (
                                <p
                                  className="text-xs font-medium pt-2 border-t"
                                  style={{ borderColor: 'var(--c-border)', color: 'var(--c-text)' }}
                                >
                                  {section.note}
                                </p>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>

              {/* Compact Bottom Bar: Contact & Companion Doc */}
              <div
                className="mt-8 pt-6 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-sm"
                style={{ borderColor: 'var(--c-border)' }}
              >
                <div className="flex items-center gap-2" style={{ color: 'var(--c-text-secondary)' }}>
                  <Mail className="w-4 h-4 shrink-0" style={{ color: 'var(--c-accent)' }} />
                  <span>Questions?</span>
                  <a
                    href="mailto:asjadabbaszaidi@gmail.com?subject=MockAI%20Question"
                    className="font-medium hover:underline"
                    style={{ color: 'var(--c-text)' }}
                  >
                    asjadabbaszaidi@gmail.com
                  </a>
                </div>

                <Link
                  to={isTerms ? '/privacy' : '/terms'}
                  className="inline-flex items-center gap-1.5 font-semibold hover:underline"
                  style={{ color: 'var(--c-accent)' }}
                >
                  <span>{isTerms ? 'Read Privacy Policy' : 'Read Terms of Use'}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Simple Footer */}
      <footer className="border-t py-7 mt-auto" style={{ borderColor: 'var(--c-border)' }}>
        <div className="c-page flex flex-col sm:flex-row items-center justify-between gap-3 text-xs" style={{ color: 'var(--c-text-muted)' }}>
          <span>© {new Date().getFullYear()} MockAI · COMSATS Lahore</span>
          <nav className="flex items-center gap-5" aria-label="Footer">
            <Link to="/" className="hover:text-[var(--c-text)] transition-colors">Home</Link>
            <Link to="/terms" className="hover:text-[var(--c-text)] transition-colors">Terms</Link>
            <Link to="/privacy" className="hover:text-[var(--c-text)] transition-colors">Privacy</Link>
            {authed ? (
              <Link to="/dashboard" className="hover:text-[var(--c-text)] transition-colors">Dashboard</Link>
            ) : (
              <Link to="/login" className="hover:text-[var(--c-text)] transition-colors">Sign in</Link>
            )}
          </nav>
        </div>
      </footer>
    </div>
  );
};

export default LegalPage;
