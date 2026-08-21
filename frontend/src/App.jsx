import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import { routes } from './routes';
import { ThemeProvider } from './context/ThemeContext';

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
    </ThemeProvider>
  );
}

export default App;
