import React from 'react';
import CandidateNav from '../components/CandidateNav';

// Single top-nav shell for the candidate's persistent app screens
// (Dashboard, History, Progress, Profile) - replaces the old
// sidebar+header "admin portal" composition with one slim bar plus
// generous content width, closer to a modern consumer product.
const CandidateLayout = ({ children }) => {
  return (
    <div className="min-h-screen">
      <CandidateNav />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {children}
      </main>
    </div>
  );
};

export default CandidateLayout;
