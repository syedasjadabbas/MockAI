import React from 'react';
import InterviewTopBar from '../components/InterviewTopBar';

// Minimal, focused shell for the Goal Selection -> Feedback journey.
// No nav bar - this is deliberately closer to a real interview tool than
// a dashboard, so the candidate isn't distracted mid-session.
const InterviewFlowLayout = ({ step, onExit, children }) => {
  return (
    <div className="min-h-screen">
      <InterviewTopBar activeStep={step} onExit={onExit} />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {children}
      </main>
    </div>
  );
};

export default InterviewFlowLayout;
