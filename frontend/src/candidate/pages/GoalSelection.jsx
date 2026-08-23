import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Code2, Users, Compass, Server, Cpu, BarChart3, AlertCircle } from 'lucide-react';
import InterviewFlowLayout from '../layouts/InterviewFlowLayout';
import { INTERVIEW_TYPES } from '../data/categories';
import { getCategories, startInterview } from '../services/candidateApi';

// FR07 - Accept Interview Goal, FR08 - Select Interview Questions
//
// A small transparent keyword matcher drives the free-text fallback, not
// NLP/AI - real language understanding is explicit future AI-integration
// work. Categories come from the real Question Bank (GET /candidate/
// categories) - the only thing that's presentational-only here is the
// Technical/HR/Situational grouping: the backend's categories_collection
// has no "interview type" field of its own (that grouping only exists at
// the question level within a category), so inferInterviewType() below
// derives it client-side from the category name, purely to keep this
// page's existing flow working. It never invents a new category or
// changes what's actually stored in the Question Bank.
//
// Presented as a guided, step-by-step preparation flow rather than a chat
// assistant - no avatar/bot icon, no "AI" framing. The underlying state
// machine (ask-goal -> ask-type -> confirm) is unchanged; only how the
// current step and prior choices are displayed has changed.

const CATEGORY_ICONS = { Code: Code2, Server, Cpu, BarChart3, Users, Folder: Code2 };

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

const GoalSelection = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([
    { from: 'bot', text: 'What role or topic would you like to practice today?' },
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
    pushBot(`${category.name} it is. Ready to continue to preparation?`);
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
      pushBot("I didn't catch a specific topic — pick one of the options below instead.");
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

  const trail = messages.filter((m) => m.from === 'user').map((m) => m.text);
  const currentPrompt = [...messages].reverse().find((m) => m.from === 'bot')?.text;

  return (
    <InterviewFlowLayout step="goal">
      <div className="max-w-2xl mx-auto">
        <p className="c-eyebrow mb-2">Set Your Goal</p>

        {trail.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-5">
            {trail.map((t, i) => (
              <span key={i} className="c-badge c-badge-accent">{t}</span>
            ))}
          </div>
        )}

        <div className="c-card rounded-3xl p-7 sm:p-9">
          {categoriesLoading ? (
            <div className="flex items-center justify-center py-14">
              <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--c-accent)', borderTopColor: 'transparent' }} />
            </div>
          ) : categoriesError ? (
            <div className="flex flex-col items-center gap-2 py-14 text-center">
              <AlertCircle className="w-6 h-6" style={{ color: 'var(--c-danger)' }} />
              <p className="text-sm" style={{ color: 'var(--c-text-secondary)' }}>{categoriesError}</p>
            </div>
          ) : (
            <>
              <h1 className="c-heading text-2xl sm:text-[1.6rem] leading-snug mb-6">{currentPrompt}</h1>

              {stage === 'ask-goal' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {INTERVIEW_TYPES.map((type) => {
                    const Icon = { Code2, Users, Compass }[type.icon];
                    return (
                      <button
                        key={type.id}
                        onClick={() => chooseType(type.id)}
                        className="c-card c-card-hover rounded-2xl p-4 text-left flex flex-col gap-2.5"
                      >
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--c-accent-soft)', color: 'var(--c-accent)' }}>
                          {Icon && <Icon className="w-4.5 h-4.5" />}
                        </div>
                        <span className="text-sm font-semibold">{type.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {stage === 'ask-type' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {(selectedType ? getCategoriesByType(categories, selectedType) : categories).map((cat) => {
                    const Icon = CATEGORY_ICONS[cat.icon] || Code2;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => chooseCategory(cat)}
                        className="c-card c-card-hover rounded-2xl p-4 text-left flex flex-col gap-2.5"
                      >
                        <Icon className="w-4.5 h-4.5" style={{ color: 'var(--c-accent)' }} />
                        <span className="text-sm font-semibold">{cat.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {stage === 'confirm' && (
                <div>
                  <button onClick={handleBegin} disabled={starting} className="c-btn c-btn-primary px-6 py-3">
                    {starting ? 'Setting up…' : 'Continue to Preparation'}
                    {!starting && <ArrowRight className="w-4 h-4" />}
                  </button>
                  {startError && (
                    <p className="text-xs font-semibold flex items-center gap-1.5 mt-3" style={{ color: 'var(--c-danger)' }}>
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {startError}
                    </p>
                  )}
                </div>
              )}
              <div ref={scrollRef} />
            </>
          )}
        </div>

        {!categoriesLoading && !categoriesError && stage !== 'confirm' && (
          <div className="flex items-center gap-2 mt-4">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Or describe it yourself — e.g. a backend engineering interview"
              className="c-input flex-1 px-4 py-2.5 rounded-xl text-sm"
            />
            <button onClick={handleSend} className="c-btn c-btn-secondary px-4 py-2.5">
              Go
            </button>
          </div>
        )}
      </div>
    </InterviewFlowLayout>
  );
};

export default GoalSelection;
