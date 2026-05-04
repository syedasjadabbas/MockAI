import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import AdminLogin from './pages/AdminLogin';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Interviews from './pages/Interviews';
import Results from './pages/Results';
import Logs from './pages/Logs';

// Wrapper for Admin Content to inject Header/Sidebar Layout
import { routes } from './routes';

function PrivateRoute({ children }) {
  const token = localStorage.getItem('mockai_admin_token');
  return token ? children : <Navigate to="/admin/login" />;
}

function AdminLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-[#080a10]">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Header />
        <main className="pt-20 px-8 pb-12">
          {children}
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {routes.map((route, idx) => {
          if (route.path === '/admin/login') {
            return (
              <Route 
                key={idx} 
                path={route.path} 
                element={
                  localStorage.getItem('mockai_admin_token') 
                  ? <Navigate to="/admin/dashboard" /> 
                  : route.element
                } 
              />
            );
          }

          const element = route.layout ? <AdminLayout>{route.element}</AdminLayout> : route.element;
          return (
            <Route 
              key={idx} 
              path={route.path} 
              element={<PrivateRoute>{element}</PrivateRoute>} 
            />
          );
        })}
        {/* Root Redirects */}
        <Route path="/admin" element={<Navigate to="/admin/dashboard" />} />
        <Route path="/" element={<Navigate to="/admin/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
