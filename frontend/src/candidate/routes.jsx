import React, { lazy } from 'react';

const Register = lazy(() => import('./pages/Register'));
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const GoalSelection = lazy(() => import('./pages/GoalSelection'));
const InterviewPreparation = lazy(() => import('./pages/InterviewPreparation'));
const InterviewSimulator = lazy(() => import('./pages/InterviewSimulator'));
const InterviewCompletion = lazy(() => import('./pages/InterviewCompletion'));
const EvaluationResults = lazy(() => import('./pages/EvaluationResults'));
const Feedback = lazy(() => import('./pages/Feedback'));
const InterviewHistory = lazy(() => import('./pages/InterviewHistory'));
const ProgressTracking = lazy(() => import('./pages/ProgressTracking'));
const Profile = lazy(() => import('./pages/Profile'));

// Candidate/User Panel routes. Each page manages its own layout shell
// internally (CandidateLayout for the dashboard-style pages, InterviewFlowLayout
// for the interview journey), so this list only needs to declare which
// routes require an authenticated candidate session.
export const candidateRoutes = [
  { path: '/register', element: <Register />, private: false },
  { path: '/login', element: <Login />, private: false },
  { path: '/dashboard', element: <Dashboard />, private: true },
  { path: '/interview/goal', element: <GoalSelection />, private: true },
  { path: '/interview/:id/prepare', element: <InterviewPreparation />, private: true },
  { path: '/interview/:id/session', element: <InterviewSimulator />, private: true },
  { path: '/interview/:id/complete', element: <InterviewCompletion />, private: true },
  { path: '/interview/:id/results', element: <EvaluationResults />, private: true },
  { path: '/interview/:id/feedback', element: <Feedback />, private: true },
  { path: '/history', element: <InterviewHistory />, private: true },
  { path: '/progress', element: <ProgressTracking />, private: true },
  { path: '/profile', element: <Profile />, private: true },
];
