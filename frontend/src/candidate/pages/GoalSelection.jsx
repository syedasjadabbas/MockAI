import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Bot, Code2, Users, Compass, ArrowRight, Server, Cpu, BarChart3, AlertCircle } from 'lucide-react';
import InterviewFlowLayout from '../layouts/InterviewFlowLayout';
import { INTERVIEW_TYPES } from '../data/categories';
import { getCategories, startInterview } from '../services/candidateApi';

// FR07 - Accept Interview Goal via Chatbot, FR08 - Select Interview Questions
//
// This is a real conversational UI (free text + quick replies), but the
// "understanding" behind it is a small transparent keyword matcher, not
// NLP/AI - real language understanding is explicit future AI-integration
// work. Categories come from the real Question Bank (GET /candidate/
// categories) - the only thing that's presentational-only here is the
// Technical/HR/Situational grouping: the backend's categories_collection
// has no "interview type" field of its own (that grouping only exists at
// the question level within a category), so inferInterviewType() below
// derives it client-side from the category name, purely to keep this
// page's existing chat flow working. It never invents a new category or
// changes what's actually stored in the Question Bank.

const CATEGORY_ICONS = { Code: Code2, Server, Cpu, BarChart3, Users, Folder: Code2 };

// Presentational-only grouping - see file header. "Behavioral & Leadership"
// is the only seeded category with behavioral/situational content, so both
// of those quick-replies resolve to it; everything else defaults to
// "technical". This never touches the backend's actual category data.
function inferInterviewType(category) {
  return /behav/i.test(category.name) ? 'behavioral' : 'technical';
}

function getCategoriesByType(categories, typeId) {
  if (typeId === 'situational') {
    return categories.filter((c) => inferInterviewType(c) === 'behavioral');
  }
  return categories.filter((c) => inferInterviewType(c) === typeId);
}

function matchCategoryFromText(text, categories) {
  const t = (text || '').toLowerCase();
  const rules = [
    { keywords: ['frontend', 'front-end', 'react', 'css', 'javascript', 'ui', 'web'], test: (name) => /frontend/i.test(name) },
    { keywords: ['backend', 'back-end', 'api', 'database', 'server', 'microservice'], test: (name) => /backend/i.test(name) },
    { keywords: ['machine learning', ' ai ', 'artificial intelligence', 'nlp', 'data scien', 'model'], test: (name) => /machine learning|artificial intelligence/i.test(name) },
    { keywords: ['data analy', 'analytics', 'sql', 'dashboard', 'reporting'], test: (name) => /data analytics|sql/i.test(name) },
    { keywords: ['hr', 'behavioral', 'behaviour', 'leadership', 'situational', 'teamwork', 'manager', 'conflict'], test: (name) => /behavioral|leadership/i.test(name) },
  ];
  for (const rule of rules) {
    if (rule.keywords.some((k) => t.includes(k))) {
      const found = categories.find((c) => rule.test(c.name));
      if (found) return found;
    }
  }
  return null;
}

const Bubble = ({ from, children }) => (
  <div className={`flex ${from === 'user' ? 'justify-end' : 'justify-start'}`}>
    <div className={`max-w-[85%] sm:max-w-md rounded-2xl px-4 py-3 text-sm leading-relaxed ${
      from === 'user'
        ? 'bg-indigo-600 text-white rounded-br-md'
        : 'theme-card rounded-bl-md text-[var(--text-primary)]'
    }`}>
      {children}
    </div>
  </div>
);

const GoalSelection = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([
    { from: 'bot', text: "Hi! I'm here to help set up your mock interview. What role or topic would you like to practice today?" },
  ]);
  const [input, setInput] = useState('');
  const [stage, setStage] = useState('ask-goal'); // ask-goal -> ask-type -> confirm
  const [selectedType, setSelectedType] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState('');
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch((err) => setCategoriesError(err.message || 'Could not load interview categories.'))
      .finally(() => setCategoriesLoading(false));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, categoriesLoading]);

  const pushBot = (text) => setMessages((m) => [...m, { from: 'bot', text }]);
  const pushUser = (text) => setMessages((m) => [...m, { from: 'user', text }]);

  const chooseCategory = (category) => {
    pushUser(category.name);
    setSelectedCategory(category);
    setSelectedType(inferInterviewType(category));
    pushBot(`Great choice. I'll line up a ${category.name} interview for you. Ready to continue to preparation?`);
    setStage('confirm');
  };

  const chooseType = (typeId) => {
    const type = INTERVIEW_TYPES.find((t) => t.id === typeId);
    pushUser(type.label);
    setSelectedType(typeId);
    const options = getCategoriesByType(categories, typeId);
    if (options.length === 1) {
      chooseCategory(options[0]);
    } else {
      pushBot(`Which area within ${type.label.toLowerCase()} would you like to focus on?`);
      setStage('ask-type');
    }
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    pushUser(text);
    setInput('');

    const matched = matchCategoryFromText(text, categories);
    if (matched) {
      chooseCategory(matched);
    } else {
      pushBot("I didn't quite catch a specific topic. Could you pick one of the options below instead?");
      setSelectedType(null);
      setStage('ask-type');
    }
  };

  const handleBegin = async () => {
    if (!selectedCategory) return;
    setStarting(true);
    setStartError('');
    try {
      const interview = await startInterview({ categoryId: selectedCategory.id, interviewType: selectedType });
      navigate(`/interview/${interview.id}/prepare`);
    } catch (err) {
      setStartError(err.message || 'Could not start the interview. Please try again.');
    } finally {
      setStarting(false);
    }
  };

  return (
    <InterviewFlowLayout step="goal">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/30">
            <Bot className="w-5 h-5 text-indigo-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Set Your Interview Goal</h2>
            <p className="text-xs text-[var(--text-secondary)]">Tell us what you'd like to practice, or pick from the options.</p>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 sm:p-6 flex flex-col gap-4 min-h-[360px]">
          {categoriesLoading ? (
            <div className="flex-1 flex items-center justify-center py-10">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : categoriesError ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 py-10 text-center">
              <AlertCircle className="w-6 h-6 text-rose-500" />
              <p className="text-sm text-[var(--text-secondary)]">{categoriesError}</p>
            </div>
          ) : (
          <div className="flex-1 space-y-3 overflow-y-auto max-h-[45vh] pr-1">
            {messages.map((m, i) => (
              <Bubble key={i} from={m.from}>{m.text}</Bubble>
            ))}

            {stage === 'ask-goal' && (
              <div className="flex flex-wrap gap-2 pt-1">
                {INTERVIEW_TYPES.map((type) => {
                  const Icon = { Code2, Users, Compass }[type.icon];
                  return (
                    <button
                      key={type.id}
                      onClick={() => chooseType(type.id)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold theme-input border hover:border-indigo-500/60 hover:text-indigo-500 transition-all"
                    >
                      {Icon && <Icon className="w-3.5 h-3.5" />}
                      {type.label}
                    </button>
                  );
                })}
              </div>
            )}

            {stage === 'ask-type' && (
              <div className="flex flex-wrap gap-2 pt-1">
                {(selectedType ? getCategoriesByType(categories, selectedType) : categories).map((cat) => {
                  const Icon = CATEGORY_ICONS[cat.icon] || Code2;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => chooseCategory(cat)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold theme-input border hover:border-indigo-500/60 hover:text-indigo-500 transition-all"
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            )}

            {stage === 'confirm' && (
              <div className="pt-1">
                <button
                  onClick={handleBegin}
                  disabled={starting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-500/20 transition-all active:scale-[0.98] disabled:opacity-60"
                >
                  {starting ? 'Setting up…' : 'Continue to Preparation'}
                  {!starting && <ArrowRight className="w-4 h-4" />}
                </button>
                {startError && (
                  <p className="text-xs font-semibold text-rose-500 flex items-center gap-1.5 mt-3">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {startError}
                  </p>
                )}
              </div>
            )}
            <div ref={scrollRef} />
          </div>
          )}

          {!categoriesLoading && !categoriesError && stage !== 'confirm' && (
            <div className="flex items-center gap-2 pt-2 border-t border-[var(--border-table)]">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="e.g. I want to practice a backend engineering interview"
                className="flex-1 px-4 py-2.5 rounded-xl text-sm theme-input border focus:outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 transition-all"
              />
              <button
                onClick={handleSend}
                className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all active:scale-[0.98]"
                aria-label="Send"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </InterviewFlowLayout>
  );
};

export default GoalSelection;
