import React, { useState, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
      <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
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

// Wraps /login, /register, and bare / so the authenticated-redirect check
// re-runs on every render of THIS route, exactly like PrivateCandidateRoute
// already does for protected routes. A plain inline ternary evaluated
// directly in App()'s render body is only recomputed when App itself
// re-renders (effectively once per full page load, since App has no state
// of its own) - so its result can go stale for the rest of that SPA
// session. Concretely: reload while authenticated bakes in "redirect to
// /dashboard" for /login; a later logout (a client-side navigate, no
// reload) clears the token but that baked-in redirect never updates, so
// /login bounces to /dashboard, PrivateCandidateRoute correctly bounces
// back to /login, and the two ping-pong forever ("Maximum update depth
// exceeded"). Wrapping in a real component fixes this the same way
// PrivateCandidateRoute already avoids it.
function PublicCandidateRoute({ children }) {
  return isCandidateAuthenticated() ? <Navigate to="/dashboard" /> : children;
}

function RootRedirect() {
  return <Navigate to={isCandidateAuthenticated() ? '/dashboard' : '/login'} />;
}

function AdminLayout({ children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)] transition-colors duration-200">
      <Sidebar mobileOpen={mobileMenuOpen} setMobileOpen={setMobileMenuOpen} />
      <div className="flex-1 lg:ml-64 flex flex-col min-w-0">
        <Header onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)} />
        <main className="pt-20 px-4 sm:px-6 lg:px-8 pb-12 flex-1 w-full max-w-7xl mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Suspense fallback={<PageFallback />}>
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

