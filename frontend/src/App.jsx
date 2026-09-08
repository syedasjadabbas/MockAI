import React, { useState, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import { routes } from './routes';
import { candidateRoutes } from './candidate/routes';
import { isAuthenticated as isCandidateAuthenticated } from './candidate/services/candidateAuth';
import CandidateShell from './candidate/components/CandidateShell';
import { ThemeProvider } from './context/ThemeContext';

function PageFallback() {
  return (
    <div className="flex items-center justify-center min-h-[50vh] w-full">
      <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
    </div>
  );
}

function PrivateRoute({ children }) {
  const token = localStorage.getItem('mockai_admin_token');
  return token ? children : <Navigate to="/admin/login" />;
}

function PrivateCandidateRoute({ children }) {
  return isCandidateAuthenticated() ? children : <Navigate to="/login" />;
}

function PublicCandidateRoute({ children }) {
  return isCandidateAuthenticated() ? <Navigate to="/dashboard" /> : children;
}

function RootRedirect() {
  return <Navigate to={isCandidateAuthenticated() ? '/dashboard' : '/login'} />;
}

function AdminLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)] transition-colors duration-200">
      <Sidebar mobileOpen={mobileMenuOpen} setMobileOpen={setMobileMenuOpen} />
      <div className="flex-1 lg:ml-64 flex flex-col min-w-0">
        <Header onToggleMobileMenu={() => setMobileMenuOpen(prev => !prev)} />
        <main className="pt-20 px-4 sm:px-6 lg:px-8 pb-12 flex-1 w-full max-w-7xl mx-auto page-content-transition">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function App() {
  const loginRoute = routes.find(r => r.path === '/admin/login');
  const adminPanelRoutes = routes.filter(r => r.path !== '/admin/login');

  return (
    <ThemeProvider>
      <BrowserRouter>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            {/* Admin Login Route */}
            {loginRoute && (
              <Route 
                path="/admin/login" 
                element={
                  localStorage.getItem('mockai_admin_token') 
                  ? <Navigate to="/admin/dashboard" /> 
                  : loginRoute.element
                } 
              />
            )}

            {/* Persistent Admin Layout Route (keeps Header & Sidebar mounted) */}
            <Route element={<PrivateRoute><AdminLayout /></PrivateRoute>}>
              {adminPanelRoutes.map((route, idx) => (
                <Route 
                  key={route.path || idx} 
                  path={route.path} 
                  element={route.element} 
                />
              ))}
            </Route>

            {/* Candidate/User Panel routes */}
            {candidateRoutes.map((route, idx) => {
              if (route.path === '/login' || route.path === '/register') {
                return (
                  <Route
                    key={`candidate-${idx}`}
                    path={route.path}
                    element={<CandidateShell><PublicCandidateRoute>{route.element}</PublicCandidateRoute></CandidateShell>}
                  />
                );
              }

              const element = route.private ? <PrivateCandidateRoute>{route.element}</PrivateCandidateRoute> : route.element;
              return <Route key={`candidate-${idx}`} path={route.path} element={<CandidateShell>{element}</CandidateShell>} />;
            })}

            {/* Admin Root Redirect */}
            <Route path="/admin" element={<Navigate to="/admin/dashboard" />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;

