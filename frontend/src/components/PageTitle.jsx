import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Browser-tab title for every route, set in one place.
const TITLES = [
  [/^\/$/, 'MockAI – Mock interview practice'],
  [/^\/login$/, 'Sign in'],
  [/^\/register$/, 'Create account'],
  [/^\/dashboard$/, 'Dashboard'],
  [/^\/mentors$/, 'Mentors'],
  [/^\/history$/, 'Interview history'],
  [/^\/progress$/, 'Progress'],
  [/^\/profile$/, 'Profile'],
  [/^\/interview\/goal$/, 'Choose your field'],
  [/^\/interview\/[^/]+\/prepare$/, 'Camera & mic check'],
  [/^\/interview\/[^/]+\/session$/, 'Interview in progress'],
  [/^\/interview\/[^/]+\/complete$/, 'Processing your answers'],
  [/^\/interview\/[^/]+\/results$/, 'Your results'],
  [/^\/interview\/[^/]+\/feedback$/, 'Feedback'],
  [/^\/admin\/login$/, 'Admin sign in'],
  [/^\/admin\/dashboard$/, 'Admin · Dashboard'],
  [/^\/admin\/users$/, 'Admin · Users'],
  [/^\/admin\/interviews$/, 'Admin · Interviews'],
  [/^\/admin\/(questions|question-bank)$/, 'Admin · Question bank'],
  [/^\/admin\/results$/, 'Admin · Results'],
  [/^\/admin\/logs$/, 'Admin · Activity logs'],
  [/^\/admin\/admins$/, 'Admin · Admins'],
];

export default function PageTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    const match = TITLES.find(([re]) => re.test(pathname));
    const title = match ? match[1] : 'Page not found';
    document.title = pathname === '/' ? title : `${title} | MockAI`;
  }, [pathname]);

  return null;
}
