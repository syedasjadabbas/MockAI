import React, { useState } from 'react';
import CandidateSidebar from '../components/CandidateSidebar';
import CandidateHeader from '../components/CandidateHeader';

// Sidebar+header shell for the candidate's persistent app screens
// (Dashboard, History, Progress, Profile). Parallel to AdminLayout in
// App.jsx, not a replacement for it.
const CandidateLayout = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)] transition-colors duration-200">
      <CandidateSidebar mobileOpen={mobileMenuOpen} setMobileOpen={setMobileMenuOpen} />
      <div className="flex-1 lg:ml-64 flex flex-col min-w-0">
        <CandidateHeader onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)} />
        <main className="pt-20 px-4 sm:px-6 lg:px-8 pb-12 flex-1 w-full max-w-7xl mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default CandidateLayout;
