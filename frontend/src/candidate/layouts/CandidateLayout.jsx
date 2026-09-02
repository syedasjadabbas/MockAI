import React from 'react';
import CandidateNav from '../components/CandidateNav';

const CandidateLayout = ({ children }) => {
  return (
    <div className="candidate-app min-h-screen" style={{ background: 'var(--c-bg)' }}>
      <CandidateNav />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {children}
      </main>
    </div>
  );
};

export default CandidateLayout;
