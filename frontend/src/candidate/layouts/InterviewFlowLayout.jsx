import React from 'react';
import InterviewTopBar from '../components/InterviewTopBar';
import AnimatedBackground3D from '../components/AnimatedBackground3D';

const InterviewFlowLayout = ({ step, onExit, children }) => {
  return (
    <div className="candidate-app min-h-screen relative" style={{ background: 'var(--c-bg)' }}>
      <AnimatedBackground3D />
      <div className="relative z-10">
        <InterviewTopBar activeStep={step} onExit={onExit} />
        <main className="c-page py-8 sm:py-10">
          {children}
        </main>
      </div>
    </div>
  );
};

export default InterviewFlowLayout;
