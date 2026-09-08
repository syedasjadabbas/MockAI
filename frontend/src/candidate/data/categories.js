// Interview "type" taxonomy for the Goal Selection chat flow (FR07). This
// is purely a UI/UX grouping, not backend data - the actual interview
// categories and questions now come from the real Question Bank via
// candidateApi.js's getCategories()/getQuestionsForCategory() (backed by
// backend/routes/candidate_interview.py), not from a static file. See
// GoalSelection.jsx's inferInterviewType() for how a fetched category gets
// mapped to one of these three types for presentation.
export const INTERVIEW_TYPES = [
  {
    id: 'technical',
    label: 'Domain & Technical Interview',
    description: 'Domain expertise, core competencies, and practical professional methodologies.',
    icon: 'Briefcase',
  },
  {
    id: 'behavioral',
    label: 'HR & Behavioral Interview',
    description: 'Communication, teamwork, professional ethics, and leadership scenarios.',
    icon: 'Users',
  },
  {
    id: 'situational',
    label: 'Situational Interview',
    description: 'Real-world workplace challenges, decision-making, and critical scenarios.',
    icon: 'Compass',
  },
];
