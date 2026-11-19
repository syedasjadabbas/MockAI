import React, { useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

// Terms of Use and Privacy Policy. Everything here describes what the app
// actually does today (see backend/routes/candidate*.py and
// backend/services/media_*.py), so keep it in step with the code.

const UPDATED = '19 November 2026';

const TERMS = {
  title: 'Terms of Use',
  intro:
    'These terms explain the rules for using MockAI. By creating an account or using the site you agree to them. If you do not agree, please do not use MockAI.',
  sections: [
    {
      heading: 'What MockAI is',
      body: [
        'MockAI is a practice tool. It asks you interview questions for the field you choose, records or reads your answers, and gives you scores and feedback so you can improve.',
        'MockAI is a final year project built by students at COMSATS University Islamabad, Lahore Campus. It is not a recruitment service and is not connected to any employer.',
      ],
    },
    {
      heading: 'Scores and feedback are a guide, not a judgement',
      body: [
        'Your scores and feedback are produced automatically by AI models. They can be wrong, and they do not predict whether you will get a job.',
        'Use them as practice advice only. Do not rely on them for hiring, admissions or any other important decision about you or anyone else.',
      ],
    },
    {
      heading: 'Your account',
      list: [
        'Give a real email address. We send a code to it to confirm your account and to reset your password.',
        'Keep your password private. You are responsible for what happens under your account.',
        'After several wrong passwords in a row, your account is locked for a short time to protect it.',
        'You can also sign in with Google. Google then tells us your name, email address and profile picture.',
      ],
    },
    {
      heading: 'Acceptable use',
      body: ['When you use MockAI, please do not:'],
      list: [
        'record or upload anyone other than yourself without their permission;',
        'try to break into, overload or copy the service, or get around its limits;',
        'use another person’s account;',
        'upload anything illegal, abusive or that you have no right to share.',
      ],
      after: ['We may suspend or remove an account that breaks these rules.'],
    },
    {
      heading: 'Mentor sessions',
      body: [
        'You can book a session with a mentor listed on MockAI. Mentors give their own advice; MockAI does not check or guarantee it. When you book or cancel, both you and the mentor are sent an email about it.',
      ],
    },
    {
      heading: 'Your content',
      body: [
        'Your answers and recordings stay yours. You allow MockAI to store and process them only to run your interview, score it and show you the results. The Privacy Policy explains how.',
      ],
    },
    {
      heading: 'No guarantee',
      body: [
        'MockAI is provided as it is. As a student project it may change, have errors or be unavailable at times, and saved data could be lost. To the extent the law allows, we are not responsible for any loss that comes from using it.',
      ],
    },
    {
      heading: 'Changes to these terms',
      body: [
        'We may update these terms. The date at the top of this page shows when they last changed. If you keep using MockAI after a change, you accept the new terms.',
      ],
    },
  ],
};

const PRIVACY = {
  title: 'Privacy Policy',
  intro:
    'This page explains what information MockAI keeps about you, why, and the choices you have. We keep only what is needed to run your practice interviews.',
  sections: [
    {
      heading: 'What we collect',
      list: [
        'Account details: your name, email address and a password, which is stored only in scrambled (hashed) form. If you sign in with Google, we receive your name, email address and profile picture from Google.',
        'Your goal: the job or field you type in, so we can pick suitable questions.',
        'Your answers: typed answers, and any audio or video you record while answering.',
        'Results: the text of what you said, your scores, feedback and interview history.',
        'Optional extras: anything you add to your profile, mentor bookings, and survey answers you choose to give.',
        'Basic technical details, such as your IP address, used to limit repeated requests and protect accounts.',
      ],
    },
    {
      heading: 'Camera and microphone',
      body: [
        'MockAI asks for your permission before an interview starts. You can choose camera and microphone, microphone only, or typing only. Nothing is recorded unless you choose to answer with your voice or camera.',
      ],
    },
    {
      heading: 'How we use it',
      list: [
        'to run your interview and turn your spoken answers into text;',
        'to score your answers and write your feedback;',
        'to show your history and progress over time;',
        'to send you account emails, such as sign-up and password-reset codes and mentor booking notices.',
      ],
      after: [
        'We do not sell your information, and we do not use it for advertising.',
      ],
    },
    {
      heading: 'Where the processing happens',
      body: [
        'Your answers are analysed by AI models running on MockAI’s own server. They are not sent to an outside AI company. Account and interview data is stored in a MongoDB database, and emails are sent through an email provider.',
      ],
    },
    {
      heading: 'How we protect it',
      list: [
        'Recordings are stored encrypted on the server.',
        'Passwords are never stored in plain form.',
        'Only you and MockAI administrators can see your interviews.',
      ],
      after: ['No system is perfectly secure, but we take reasonable care to keep your data safe.'],
    },
    {
      heading: 'How long we keep it',
      body: [
        'Recordings are needed only to score your interview. Once your results are ready you can delete the recordings of that interview from your results page; your scores, transcript and feedback stay. Recordings may also be removed automatically after a set number of days.',
        'Your account and interview history are kept until you ask us to delete them.',
      ],
    },
    {
      heading: 'Your choices',
      list: [
        'see your interviews, scores and feedback at any time in your history;',
        'update your profile and change your password;',
        'delete the recordings of a finished interview;',
        'ask the MockAI team to delete your account and all of its data.',
      ],
    },
    {
      heading: 'Changes to this policy',
      body: [
        'If we change how we handle your information, we will update this page and the date at the top.',
      ],
    },
  ],
};

const PAGES = { '/terms': TERMS, '/privacy': PRIVACY };

const Paragraphs = ({ items }) =>
  (items || []).map((p) => (
    <p key={p} className="leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>{p}</p>
  ));

const LegalPage = () => {
  const { pathname } = useLocation();
  const page = PAGES[pathname] || TERMS;

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = `${page.title} · MockAI`;
  }, [page]);

  const tabClass = ({ isActive }) =>
    `px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${isActive ? '' : 'hover:text-[var(--c-text)]'}`;
  const tabStyle = ({ isActive }) => ({
    color: isActive ? 'var(--c-text)' : 'var(--c-text-muted)',
    background: isActive ? 'var(--c-surface-muted)' : 'transparent',
  });

  return (
    <div className="candidate-app min-h-screen flex flex-col font-sans" style={{ background: 'var(--c-bg)' }}>
      <header className="border-b sticky top-0 z-30 backdrop-blur" style={{ borderColor: 'var(--c-border)', background: 'color-mix(in srgb, var(--c-bg) 85%, transparent)' }}>
        <div className="c-page h-16 flex items-center justify-between gap-4">
          <Link to="/" className="text-lg font-bold tracking-tight" style={{ color: 'var(--c-text)' }}>
            Mock<span style={{ color: 'var(--c-accent)' }}>AI</span>
          </Link>
          <Link to="/" className="flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-[var(--c-text)]" style={{ color: 'var(--c-text-secondary)' }}>
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <div className="c-page py-12 sm:py-16">
          <div className="max-w-3xl">
            <nav className="flex gap-1 mb-8" aria-label="Legal pages">
              <NavLink to="/terms" className={tabClass} style={tabStyle}>Terms of Use</NavLink>
              <NavLink to="/privacy" className={tabClass} style={tabStyle}>Privacy Policy</NavLink>
            </nav>

            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight" style={{ color: 'var(--c-text)' }}>{page.title}</h1>
            <p className="text-sm mt-2" style={{ color: 'var(--c-text-muted)' }}>Last updated {UPDATED}</p>
            <p className="mt-6 text-lg leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>{page.intro}</p>

            <div className="mt-10 space-y-10">
              {page.sections.map((s, i) => (
                <section key={s.heading} className="pt-8 border-t" style={{ borderColor: 'var(--c-border)' }}>
                  <h2 className="text-xl font-semibold flex items-baseline gap-3" style={{ color: 'var(--c-text)' }}>
                    <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--c-accent)' }}>{String(i + 1).padStart(2, '0')}</span>
                    {s.heading}
                  </h2>
                  <div className="mt-3 space-y-3">
                    <Paragraphs items={s.body} />
                    {s.list && (
                      <ul className="space-y-2">
                        {s.list.map((item) => (
                          <li key={item} className="flex gap-3 leading-relaxed" style={{ color: 'var(--c-text-secondary)' }}>
                            <span className="mt-2.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--c-accent)' }} aria-hidden="true" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <Paragraphs items={s.after} />
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t py-8" style={{ borderColor: 'var(--c-border)' }}>
        <div className="c-page flex flex-col sm:flex-row items-center justify-between gap-3 text-xs" style={{ color: 'var(--c-text-muted)' }}>
          <span>© {new Date().getFullYear()} MockAI</span>
          <nav className="flex items-center gap-4" aria-label="Footer">
            <Link to="/" className="hover:text-[var(--c-text)] transition-colors">Home</Link>
            <Link to="/terms" className="hover:text-[var(--c-text)] transition-colors">Terms</Link>
            <Link to="/privacy" className="hover:text-[var(--c-text)] transition-colors">Privacy</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
};

export default LegalPage;
