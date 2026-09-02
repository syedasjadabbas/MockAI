import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Code2, Users, Compass, Server, Cpu, BarChart3, AlertCircle, CheckCircle2 } from 'lucide-react';
import InterviewFlowLayout from '../layouts/InterviewFlowLayout';
import { INTERVIEW_TYPES } from '../data/categories';
import { getCategories, startInterview } from '../services/candidateApi';
import { CANDIDATE_IMAGES } from '../assets/images';
import {
  CornerReticles,
  TechnicalHUDTag,
  FrontendLayoutSchematic,
  BackendClusterSchematic,
  NeuralNodesDiagram,
  BehavioralDialogueSchematic,
  SqlMatrixSchematic,
} from '../components/TechnicalDoodles';

function getDomainSchematic(categoryName = '') {
  const str = categoryName.toLowerCase();
  if (str.includes('front') || str.includes('web') || str.includes('react') || str.includes('ui')) return FrontendLayoutSchematic;
  if (str.includes('back') || str.includes('node') || str.includes('server') || str.includes('distribut')) return BackendClusterSchematic;
  if (str.includes('ai') || str.includes('ml') || str.includes('learning') || str.includes('neural')) return NeuralNodesDiagram;
  if (str.includes('behav') || str.includes('leader') || str.includes('culture') || str.includes('hr')) return BehavioralDialogueSchematic;
  if (str.includes('data') || str.includes('sql') || str.includes('db') || str.includes('analyt')) return SqlMatrixSchematic;
  return null;
}

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
    pushBot(`${category.name} selected. Ready to proceed to setup and calibration?`);
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
      pushBot(`Which domain within ${type.label.toLowerCase()} would you like to focus on?`);
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
      pushBot("I didn't catch an exact track â€” pick one of the options below to get started.");
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
      <div className="max-w-4xl mx-auto py-6 sm:py-10 space-y-8">
        
        {/* Header with 3D Visual */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-8">
            <p className="c-eyebrow mb-1">Goal Setup</p>
            <h1 className="c-heading text-2xl sm:text-3xl font-bold" style={{ color: 'var(--c-text)' }}>
              {currentPrompt}
            </h1>
            <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--c-text-secondary)' }}>
              Choose a practice track to generate tailored interview prompts and evaluation criteria.
            </p>
          </div>
          <div className="hidden lg:block lg:col-span-4">
            <div className="relative rounded-lg overflow-hidden border aspect-video group"
              style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface)' }}
            >
              <CornerReticles size={8} color="var(--c-accent)" />
              <img src={CANDIDATE_IMAGES.neuralSphere} alt="AI Neural Network" className="w-full h-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute bottom-2 left-2">
                <span className="c-tech-annotation px-1.5 py-0.5 rounded bg-black/60 text-orange-400 border border-white/10">[AI NETWORK]</span>
              </div>
            </div>
          </div>
        </div>

        {trail.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {trail.map((t, i) => (
              <span key={i} className="c-badge c-badge-muted font-semibold text-xs">
                {t}
              </span>
            ))}
          </div>
        )}

        {/* Content Area */}
        <div>
          {categoriesLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--c-accent)', borderTopColor: 'transparent' }} />
              <p className="text-xs font-medium" style={{ color: 'var(--c-text-muted)' }}>Loading tracks...</p>
            </div>
          ) : categoriesError ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <AlertCircle className="w-6 h-6 text-red-500" />
              <p className="text-sm font-medium" style={{ color: 'var(--c-text-secondary)' }}>{categoriesError}</p>
            </div>
          ) : (
            <>
              {/* LEVEL 3 â€” Standalone Selectable Track Cards */}
              {stage === 'ask-goal' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  {INTERVIEW_TYPES.map((type) => {
                    const Icon = { Code2, Users, Compass }[type.icon] || Code2;
                    return (
                      <button
                        key={type.id}
                        onClick={() => chooseType(type.id)}
                        className="c-card c-card-hover rounded-lg p-5 text-left flex flex-col justify-between gap-4 transition-all group relative overflow-hidden"
                        style={{
                          background: 'var(--c-surface-card)',
                          borderColor: 'var(--c-border)',
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="w-8 h-8 rounded flex items-center justify-center border transition-colors group-hover:border-orange-500/50"
                            style={{
                              background: 'var(--c-surface-muted)',
                              borderColor: 'var(--c-border)',
                              color: 'var(--c-text)',
                            }}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className="c-tech-annotation opacity-40 group-hover:opacity-100 transition-opacity">
                            {type.id === 'technical' ? '[CODE]' : type.id === 'behavioral' ? '[DIALOGUE]' : '[EXPLORE]'}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs font-bold block group-hover:text-orange-500 transition-colors" style={{ color: 'var(--c-text)' }}>
                            {type.label}
                          </span>
                          <span className="text-[11px] block mt-0.5" style={{ color: 'var(--c-text-muted)' }}>
                            {type.id === 'technical' ? 'Algorithmic & architectural prompts' : 'Leadership & team scenarios'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {stage === 'ask-type' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(selectedType ? getCategoriesByType(categories, selectedType) : categories).map((cat) => {
                    const Icon = CATEGORY_ICONS[cat.icon] || Code2;
                    const Schematic = getDomainSchematic(cat.name);
                    return (
                      <button
                        key={cat.id}
                        onClick={() => chooseCategory(cat)}
                        className="c-card c-card-hover rounded-lg p-4 text-left flex items-center justify-between gap-3.5 transition-all group"
                        style={{
                          background: 'var(--c-surface-card)',
                          borderColor: 'var(--c-border)',
                        }}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded flex items-center justify-center shrink-0 border transition-colors group-hover:border-orange-500/50"
                            style={{
                              background: 'var(--c-surface-muted)',
                              borderColor: 'var(--c-border)',
                              color: 'var(--c-text)',
                            }}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-bold truncate group-hover:text-orange-500 transition-colors" style={{ color: 'var(--c-text)' }}>
                            {cat.name}
                          </span>
                        </div>
                        {Schematic && (
                          <div className="opacity-30 group-hover:opacity-100 transition-opacity shrink-0" style={{ color: 'var(--c-text-muted)' }}>
                            <Schematic size={20} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {stage === 'confirm' && (
                <div className="space-y-5 pt-2">
                  <div className="p-4 rounded-lg border flex items-center gap-3.5"
                    style={{
                      background: 'var(--c-surface-card)',
                      borderColor: 'var(--c-border)',
                    }}
                  >
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--c-text-muted)' }}>Selected Track</p>
                      <p className="text-base font-bold" style={{ color: 'var(--c-text)' }}>{selectedCategory?.name}</p>
                    </div>
                  </div>

                  <button
                    onClick={handleBegin}
                    disabled={starting}
                    className="c-btn c-btn-primary px-6 py-3 text-xs font-bold rounded-md w-full sm:w-auto flex items-center justify-center gap-2"
                  >
                    <span>{starting ? 'Initializing Sessionâ€¦' : 'Continue to Preparation'}</span>
                    {!starting && <ArrowRight className="w-3.5 h-3.5" />}
                  </button>

                  {startError && (
                    <p className="text-xs font-semibold flex items-center gap-1.5 text-red-500">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {startError}
                    </p>
                  )}
                </div>
              )}
              <div ref={scrollRef} />
            </>
          )}
        </div>

        {/* Search input bar */}
        {!categoriesLoading && !categoriesError && stage !== 'confirm' && (
          <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: 'var(--c-border)' }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Or enter a specific topic â€” e.g., React, System Architecture, Leadership..."
              className="c-input flex-1 px-3.5 py-2.5 rounded-md text-xs"
            />
            <button onClick={handleSend} className="c-btn c-btn-secondary px-4 py-2.5 rounded-md text-xs font-semibold">
              Go
            </button>
          </div>
        )}
      </div>
    </InterviewFlowLayout>
  );
};

export default GoalSelection;


