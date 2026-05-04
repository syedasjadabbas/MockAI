import React from 'react';
import { Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Interviews from './pages/Interviews';
import Results from './pages/Results';
import Logs from './pages/Logs';
import AdminLogin from './pages/AdminLogin';
import Admins from './pages/Admins';

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
