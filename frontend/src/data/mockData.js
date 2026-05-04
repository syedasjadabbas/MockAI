export const usersData = [
  { id: 1, name: 'Alice Johnson', email: 'alice@example.com', interviews: 3, role: 'Candidate', joined: '2023-10-15' },
  { id: 2, name: 'Bob Smith', email: 'bob@example.com', interviews: 1, role: 'Candidate', joined: '2023-11-02' },
  { id: 3, name: 'Charlie Davis', email: 'charlie@example.com', interviews: 5, role: 'Candidate', joined: '2024-01-20' },
  { id: 4, name: 'Diana Prince', email: 'diana@example.com', interviews: 2, role: 'Candidate', joined: '2024-02-10' },
  { id: 5, name: 'Evan Wright', email: 'evan@example.com', interviews: 0, role: 'Candidate', joined: '2024-03-01' }
];

export const interviewsData = [
  { id: 101, user: 'Alice Johnson', type: 'Frontend Developer', status: 'Completed', date: '2024-03-10 10:00 AM', score: 85 },
  { id: 102, user: 'Bob Smith', type: 'Backend Developer', status: 'Scheduled', date: '2024-04-12 02:00 PM', score: null },
  { id: 103, user: 'Alice Johnson', type: 'System Design', status: 'Completed', date: '2024-03-25 11:00 AM', score: 92 },
  { id: 104, user: 'Charlie Davis', type: 'Data Science', status: 'Completed', date: '2024-02-15 09:00 AM', score: 78 },
  { id: 105, user: 'Diana Prince', type: 'Frontend Developer', status: 'In Progress', date: '2024-04-07 01:30 PM', score: null }
];

export const resultsData = [
  { id: 201, interviewId: 101, user: 'Alice Johnson', overallScore: 85, confidenceScore: 88, stressIndicator: 'Low' },
  { id: 202, interviewId: 103, user: 'Alice Johnson', overallScore: 92, confidenceScore: 95, stressIndicator: 'Low' },
  { id: 203, interviewId: 104, user: 'Charlie Davis', overallScore: 78, confidenceScore: 72, stressIndicator: 'Medium' }
];

export const logsData = [
  { id: 301, admin: 'Admin', action: 'Viewed User', target: 'Alice Johnson', timestamp: '2024-04-07 10:15 AM' },
  { id: 302, admin: 'Admin', action: 'Opened Interview Details', target: 'Interview #101', timestamp: '2024-04-07 10:20 AM' },
  { id: 303, admin: 'Admin', action: 'Checked Results', target: 'Results #201', timestamp: '2024-04-07 10:25 AM' },
  { id: 304, admin: 'Admin', action: 'Logged In', target: 'System', timestamp: '2024-04-07 09:00 AM' }
];
