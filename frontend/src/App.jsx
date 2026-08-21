import React, { useState, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import { routes } from './routes';
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
            {/* Root Redirects */}
            <Route path="/admin" element={<Navigate to="/admin/dashboard" />} />
            <Route path="/" element={<Navigate to="/admin/login" />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;

