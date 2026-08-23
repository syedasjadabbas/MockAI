import React from 'react';
import '../candidate-theme.css';

// Applies the Candidate Panel's own design-token scope (see
// candidate-theme.css's file header for why this is a separate,
// prefixed system rather than edits to the shared src/index.css that
// Admin also reads from). Every candidate route is wrapped in this once,
// in App.jsx - individual pages/layouts never need to think about it.
const CandidateShell = ({ children }) => <div className="candidate-app">{children}</div>;

export default CandidateShell;
