// Candidate-facing interview categories & question bank.
//
// This mirrors the shape of the REAL data already stored in MongoDB by the
// Admin Panel (see backend/database.py -> categories_collection /
// questions_collection, and backend/seed_question_bank.py for the seeded
// content). Field names match exactly (question_text, difficulty, type,
// tags, expected_answer, status) so that swapping this file's contents for
// a real `GET /candidate/categories` call later requires no changes to any
// component that consumes it.
//
// "type" values (Technical / Conceptual / Behavioral / Situational) come
// straight from the seeded question bank and align with the report's
// Technical / HR / Situational interview framing.

export const INTERVIEW_TYPES = [
  {
    id: 'technical',
    label: 'Technical Interview',
    description: 'Domain knowledge, coding concepts, and system design.',
    icon: 'Code2',
  },
  {
    id: 'behavioral',
    label: 'HR / Behavioral Interview',
    description: 'Communication, teamwork, and leadership scenarios.',
    icon: 'Users',
  },
  {
    id: 'situational',
    label: 'Situational Interview',
    description: 'How you would handle real workplace situations.',
    icon: 'Compass',
  },
];

export const CATEGORIES = [
  {
    id: 'cat-frontend',
    name: 'Frontend Development',
    description: 'Core web concepts, React, modern JavaScript, CSS architecture, browser APIs, and frontend performance.',
    icon: 'Code',
    status: 'active',
    interviewType: 'technical',
    questions: [
      { id: 'q-fe-1', question_text: 'Explain the Virtual DOM and reconciliation process in React. How does React determine when and what to re-render?', difficulty: 'Medium', type: 'Technical', tags: ['React', 'Virtual DOM', 'Performance'], status: 'active' },
      { id: 'q-fe-2', question_text: 'What are React Server Components (RSC) and how do they differ from traditional Client Components?', difficulty: 'Hard', type: 'Technical', tags: ['React', 'Next.js', 'Architecture'], status: 'active' },
      { id: 'q-fe-3', question_text: 'Describe the JavaScript Event Loop, the Microtask Queue vs Macrotask Queue, and execution precedence.', difficulty: 'Medium', type: 'Technical', tags: ['JavaScript', 'Event Loop', 'Async'], status: 'active' },
      { id: 'q-fe-4', question_text: 'How do you optimize Core Web Vitals (LCP, INP, CLS) in a modern single-page application?', difficulty: 'Hard', type: 'Technical', tags: ['Web Vitals', 'Performance'], status: 'active' },
      { id: 'q-fe-5', question_text: 'What is the difference between CSS Flexbox and CSS Grid, and when should each be used?', difficulty: 'Easy', type: 'Conceptual', tags: ['CSS', 'Layout'], status: 'active' },
    ],
  },
  {
    id: 'cat-backend',
    name: 'Backend & Distributed Systems',
    description: 'API design, SQL & NoSQL databases, microservices, authentication security, caching, and scalability.',
    icon: 'Server',
    status: 'active',
    interviewType: 'technical',
    questions: [
      { id: 'q-be-1', question_text: 'Explain how JWT authentication works and what security vulnerabilities need to be mitigated in production.', difficulty: 'Medium', type: 'Technical', tags: ['Auth', 'Security', 'JWT'], status: 'active' },
      { id: 'q-be-2', question_text: 'Compare SQL and NoSQL databases: In what scenarios would you choose PostgreSQL over MongoDB?', difficulty: 'Medium', type: 'Conceptual', tags: ['Database', 'Architecture'], status: 'active' },
      { id: 'q-be-3', question_text: 'How would you design a distributed rate limiter capable of handling 100,000 requests/sec across multiple API nodes?', difficulty: 'Hard', type: 'Technical', tags: ['System Design', 'Redis'], status: 'active' },
      { id: 'q-be-4', question_text: 'Explain B-Tree indexing in relational databases and why having too many indexes degrades write throughput.', difficulty: 'Medium', type: 'Technical', tags: ['Database', 'Indexing'], status: 'active' },
    ],
  },
  {
    id: 'cat-ai',
    name: 'AI & Machine Learning',
    description: 'Model evaluation, NLP fundamentals, supervised/unsupervised learning, and applied ML systems.',
    icon: 'Cpu',
    status: 'active',
    interviewType: 'technical',
    questions: [
      { id: 'q-ai-1', question_text: 'Explain the bias-variance tradeoff and how it affects model generalization.', difficulty: 'Medium', type: 'Technical', tags: ['ML', 'Fundamentals'], status: 'active' },
      { id: 'q-ai-2', question_text: 'How does attention work in Transformer architectures, and why did it replace recurrent models for NLP?', difficulty: 'Hard', type: 'Technical', tags: ['NLP', 'Transformers'], status: 'active' },
      { id: 'q-ai-3', question_text: 'What metrics would you use to evaluate a classifier on an imbalanced dataset, and why not accuracy alone?', difficulty: 'Medium', type: 'Conceptual', tags: ['Evaluation', 'Metrics'], status: 'active' },
    ],
  },
  {
    id: 'cat-data',
    name: 'Data Analytics & SQL',
    description: 'Query optimization, data modeling, statistical reasoning, and analytical storytelling.',
    icon: 'BarChart3',
    status: 'active',
    interviewType: 'technical',
    questions: [
      { id: 'q-da-1', question_text: 'Write and explain a SQL query to find the second-highest salary in an employees table without using LIMIT.', difficulty: 'Medium', type: 'Technical', tags: ['SQL'], status: 'active' },
      { id: 'q-da-2', question_text: 'How would you detect and handle outliers in a dataset before building a forecasting model?', difficulty: 'Medium', type: 'Conceptual', tags: ['Statistics', 'Data Cleaning'], status: 'active' },
    ],
  },
  {
    id: 'cat-behavioral',
    name: 'Behavioral & Leadership',
    description: 'Communication, conflict resolution, ownership, and how you work with others under pressure.',
    icon: 'Users',
    status: 'active',
    interviewType: 'behavioral',
    questions: [
      { id: 'q-hr-1', question_text: 'Tell me about a time you disagreed with a teammate on a technical decision. How did you resolve it?', difficulty: 'Medium', type: 'Behavioral', tags: ['Conflict', 'Teamwork'], status: 'active' },
      { id: 'q-hr-2', question_text: 'Describe a project where you had to take ownership of a mistake. What did you do next?', difficulty: 'Medium', type: 'Behavioral', tags: ['Ownership', 'Accountability'], status: 'active' },
      { id: 'q-hr-3', question_text: 'You are given a task with an unrealistic deadline by your manager. How do you respond?', difficulty: 'Medium', type: 'Situational', tags: ['Prioritization', 'Communication'], status: 'active' },
      { id: 'q-hr-4', question_text: 'A teammate is consistently missing deadlines and it is affecting your delivery. What do you do?', difficulty: 'Medium', type: 'Situational', tags: ['Teamwork', 'Conflict'], status: 'active' },
    ],
  },
];

export const getCategoryById = (id) => CATEGORIES.find((c) => c.id === id) || null;

export const getCategoriesByType = (interviewType) =>
  CATEGORIES.filter((c) => c.interviewType === interviewType && c.status === 'active');

// Very small, transparent keyword matcher for the Goal Selection chat flow.
// This is NOT NLP/AI — it is a plain substring/keyword lookup used only to
// route free-text chat input to one of the fixed categories above. Real
// language understanding (FR07) is explicit future AI-integration work.
export function matchCategoryFromText(text) {
  const t = (text || '').toLowerCase();
  const rules = [
    { id: 'cat-frontend', keywords: ['frontend', 'front-end', 'react', 'css', 'javascript', 'ui', 'web'] },
    { id: 'cat-backend', keywords: ['backend', 'back-end', 'api', 'database', 'server', 'microservice', 'sql'] },
    { id: 'cat-ai', keywords: ['ai', 'machine learning', 'ml', 'nlp', 'data scien', 'model'] },
    { id: 'cat-data', keywords: ['data analy', 'analytics', 'sql', 'dashboard', 'reporting'] },
    { id: 'cat-behavioral', keywords: ['hr', 'behavioral', 'behaviour', 'leadership', 'situational', 'teamwork', 'manager', 'conflict'] },
  ];
  for (const rule of rules) {
    if (rule.keywords.some((k) => t.includes(k))) return getCategoryById(rule.id);
  }
  return null;
}
