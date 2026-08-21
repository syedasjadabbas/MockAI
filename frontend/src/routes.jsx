import React, { lazy } from 'react';
import { Navigate } from 'react-router-dom';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Users = lazy(() => import('./pages/Users'));
const Interviews = lazy(() => import('./pages/Interviews'));
const Results = lazy(() => import('./pages/Results'));
const Logs = lazy(() => import('./pages/Logs'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const Admins = lazy(() => import('./pages/Admins'));
const QuestionBank = lazy(() => import('./pages/QuestionBank'));

export const routes = [
  {
    path: '/admin/login',
    element: <AdminLogin />,
    layout: false,
  },
  {
    path: '/admin/dashboard',
    element: <Dashboard />,
    layout: true,
  },
  {
    path: '/admin/users',
    element: <Users />,
    layout: true,
  },
  {
    path: '/admin/interviews',
    element: <Interviews />,
    layout: true,
  },
  {
    path: '/admin/questions',
    element: <QuestionBank />,
    layout: true,
  },
  {
    path: '/admin/question-bank',
    element: <QuestionBank />,
    layout: true,
  },
  {
    path: '/admin/results',
    element: <Results />,
    layout: true,
  },
  {
    path: '/admin/logs',
    element: <Logs />,
    layout: true,
  },
  {
    path: '/admin/admins',
    element: <Admins />,
    layout: true,
  },
];
