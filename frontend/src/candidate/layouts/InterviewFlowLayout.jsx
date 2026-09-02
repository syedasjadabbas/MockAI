import React from 'react';
import InterviewTopBar from '../components/InterviewTopBar';

const InterviewFlowLayout = ({ step, onExit, children }) => {
  return (
    <div className="candidate-app min-h-screen" style={{ background: 'var(--c-bg)' }}>
      <InterviewTopBar activeStep={step} onExit={onExit} />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {children}
      </main>
    </div>
  );
};

export default InterviewFlowLayout;
