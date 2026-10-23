import React from 'react';
import CandidateNav from '../components/CandidateNav';
import AnimatedBackground3D from '../components/AnimatedBackground3D';

const CandidateLayout = ({ children }) => {
  return (
    <div className="candidate-app min-h-screen relative" style={{ background: 'var(--c-bg)' }}>
      <AnimatedBackground3D />
      <div className="relative z-10">
        <CandidateNav />
        <main className="c-page py-8 sm:py-10">
          {children}
        </main>
      </div>
    </div>
  );
};

export default CandidateLayout;
