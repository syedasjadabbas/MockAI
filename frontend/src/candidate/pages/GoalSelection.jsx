import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Code2,
  Users,
  Compass,
  Server,
  Cpu,
  BarChart3,
  AlertCircle,
  CheckCircle2,
  Stethoscope,
  HeartPulse,
  GraduationCap,
  Calculator,
  Scale,
  Megaphone,
  Palette,
  HardHat,
  Briefcase,
  TrendingUp,
  Bot,
  SendHorizontal,
  RotateCcw,
  Clock,
  ListChecks,
  Sparkles,
} from 'lucide-react';
import InterviewFlowLayout from '../layouts/InterviewFlowLayout';
import { INTERVIEW_TYPES } from '../data/categories';
import { getCategories, startInterview, interpretGoal } from '../services/candidateApi';

const CATEGORY_ICONS = {
  Code: Code2,
  Server,
  Cpu,
  BarChart3,
  Users,
  Folder: Briefcase,
  Stethoscope,
  HeartPulse,
  GraduationCap,
  Calculator,
  Scale,
  Megaphone,
  Palette,
  HardHat,
  Briefcase,
  TrendingUp,
};

function getCategoryDisplayIcon(cat) {
  if (cat?.icon && CATEGORY_ICONS[cat.icon]) {
    return CATEGORY_ICONS[cat.icon];
  }
  const name = (cat?.name || '').toLowerCase();
  if (name.includes('health') || name.includes('medic') || name.includes('doctor')) return Stethoscope;
  if (name.includes('nurs') || name.includes('patient')) return HeartPulse;
  if (name.includes('teach') || name.includes('educat')) return GraduationCap;
  if (name.includes('account') || name.includes('financ')) return Calculator;
  if (name.includes('law') || name.includes('legal')) return Scale;
  if (name.includes('market') || name.includes('brand')) return Megaphone;
  if (name.includes('human') || name.includes('talent') || name.includes('recruit') || name.includes('hr')) return Users;
  if (name.includes('design') || name.includes('graphic')) return Palette;
  if (name.includes('civil') || name.includes('structur') || name.includes('construct')) return HardHat;
  if (name.includes('business') || name.includes('analyst') || name.includes('strateg')) return Briefcase;
  if (name.includes('sale') || name.includes('client') || name.includes('revenue')) return TrendingUp;
  if (name.includes('front') || name.includes('web') || name.includes('react')) return Code2;
  if (name.includes('back') || name.includes('node') || name.includes('server')) return Server;
  if (name.includes('ai') || name.includes('machine') || name.includes('ml')) return Cpu;
  if (name.includes('data') || name.includes('sql')) return BarChart3;
  return Briefcase;
}

// Suggested interview type for a domain picked without one. Only a hint:
// the chatbot always asks the candidate which kind of interview they want.
function suggestInterviewType(category) {
  return /behav|leadership/i.test(category?.name || '') ? 'behavioral' : 'technical';
}

function typeLabel(typeId) {
  return INTERVIEW_TYPES.find((t) => t.id === typeId)?.label || 'Interview';
}

// Quick-start examples shown under the message box.
const QUICK_GOALS = ['Frontend developer', 'Nurse', 'Teacher', 'Accountant', 'Data analyst', 'Marketing'];

const TYPE_BLURB = {
  technical: 'Domain expertise & role-specific skills',
  behavioral: 'Communication, teamwork, ethics & leadership',
  situational: 'Real workplace scenarios & decision-making',
};

function matchCategoryFromText(text, categories) {
  const t = (text || '').toLowerCase().trim();
  if (!t) return null;

  // 1. Direct or partial match on category name
  const directMatch = categories.find((c) => c.name.toLowerCase() === t);
  if (directMatch) return directMatch;

  const subMatch = categories.find((c) => c.name.toLowerCase().includes(t) || t.includes(c.name.toLowerCase()));
  if (subMatch) return subMatch;

  // 2. Role synonyms for every career domain
  const domainRules = [
    { keywords: ['doctor', 'physician', 'medicine', 'medical', 'clinical', 'hospital', 'surgeon', 'pediatrician', 'cardiolog', 'gp', 'resident'], test: (n) => /healthcare|medicine/i.test(n) },
    { keywords: ['nurse', 'nursing', 'patient care', 'triage', 'icu', 'rn', 'vital sign', 'caregiver', 'clinic nurse'], test: (n) => /nursing|patient care/i.test(n) },
    { keywords: ['teacher', 'teaching', 'education', 'educator', 'instructor', 'professor', 'pedagogy', 'curriculum', 'school', 'tutor'], test: (n) => /education|teaching/i.test(n) },
    { keywords: ['accountant', 'accounting', 'auditor', 'audit', 'financial', 'finance', 'cpa', 'bookkeep', 'tax', 'balance sheet', 'gaap', 'ifrs'], test: (n) => /accounting|financial/i.test(n) },
    { keywords: ['lawyer', 'attorney', 'legal', 'law', 'litigation', 'counsel', 'paralegal', 'barrister', 'juris', 'court', 'contract law'], test: (n) => /law|legal/i.test(n) },
    { keywords: ['marketing', 'brand', 'campaign', 'seo', 'growth', 'advertising', 'marketing manager', 'social media', 'content strategy', 'cmo'], test: (n) => /marketing/i.test(n) },
    { keywords: ['hr', 'human resources', 'talent', 'recruiter', 'recruiting', 'onboarding', 'hr manager', 'people ops', 'people operations'], test: (n) => /human resources|talent/i.test(n) },
    { keywords: ['graphic designer', 'graphic design', 'ui/ux', 'visual design', 'illustrator', 'photoshop', 'figma', 'designer', 'art director', 'creative director'], test: (n) => /graphic|design/i.test(n) },
    { keywords: ['civil engineer', 'civil engineering', 'structural engineer', 'autocad', 'construction', 'concrete', 'infrastructure', 'bridge', 'site engineer'], test: (n) => /civil|structural/i.test(n) },
    { keywords: ['business analyst', 'business analysis', 'requirements', 'stakeholder', 'product owner', 'user stories', 'process optimization', 'bpm'], test: (n) => /business analysis|strategy/i.test(n) },
    { keywords: ['sales', 'sales manager', 'account executive', 'prospecting', 'quota', 'b2b sales', 'client acquisition', 'closer', 'sales director'], test: (n) => /sales/i.test(n) },
    { keywords: ['frontend', 'front-end', 'react', 'css', 'javascript', 'vue', 'angular', 'web dev', 'web developer', 'html', 'typescript'], test: (n) => /frontend/i.test(n) },
    { keywords: ['backend', 'back-end', 'api', 'database', 'server', 'node', 'django', 'microservice', 'distributed', 'fastapi', 'golang', 'java'], test: (n) => /backend/i.test(n) },
    { keywords: ['machine learning', ' ai ', 'artificial intelligence', 'nlp', 'deep learning', 'model', 'data science', 'llm', 'computer vision'], test: (n) => /machine learning|artificial intelligence/i.test(n) },
    { keywords: ['data analyst', 'data analytics', 'sql', 'bi', 'tableau', 'powerbi', 'dashboard', 'reporting'], test: (n) => /data analytics|sql/i.test(n) },
    { keywords: ['behavioral', 'behaviour', 'leadership', 'situational', 'teamwork', 'manager', 'conflict', 'soft skill'], test: (n) => /behavioral|leadership/i.test(n) },
  ];

  for (const rule of domainRules) {
    if (rule.keywords.some((k) => t.includes(k) || k.includes(t))) {
      const found = categories.find((c) => rule.test(c.name));
      if (found) return found;
    }
  }

  // 3. Match within category description
  const descMatch = categories.find((c) => (c.description || '').toLowerCase().includes(t));
  if (descMatch) return descMatch;

  return null;
}

// FR 07 / Objective 2 - a text chatbot that finds the candidate's domain and
// asks which kind of interview they want (technical, HR/behavioral or
// situational). The chosen type decides which questions are asked (FR 08).
const GoalSelection = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([
    { from: 'bot', text: 'Hi! What role or field are you preparing for? Type it below, or pick the kind of interview you want first.' },
  ]);
  const [input, setInput] = useState('');
  // ask-goal -> pick-domain -> ask-interview-type -> confirm
  const [stage, setStage] = useState('ask-goal');
  const [selectedType, setSelectedType] = useState(null);
  const [typeChosen, setTypeChosen] = useState(false);
  const [suggestedType, setSuggestedType] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [customRole, setCustomRole] = useState('');
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState('');
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState('');
  // Categories suggested by the semantic goal interpreter (ambiguous goals)
  const [suggestionIds, setSuggestionIds] = useState([]);
  const [interpreting, setInterpreting] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch((err) => setCategoriesError(err.message || 'Could not load interview categories.'))
      .finally(() => setCategoriesLoading(false));
  }, []);

  // Follow the conversation once the candidate has replied.
  useEffect(() => {
    if (messages.length <= 1) return;
    scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, stage]);

  const pushBot = (text) => setMessages((m) => [...m, { from: 'bot', text }]);
  const pushUser = (text) => setMessages((m) => [...m, { from: 'user', text }]);

  const roleLabelFor = (category, roleName) => roleName || category?.name || '';

  const goToConfirm = (category, roleName, typeId) => {
    pushBot(`A ${typeLabel(typeId).toLowerCase()} for ${roleLabelFor(category, roleName)}. Ready to set up your microphone and start?`);
    setStage('confirm');
  };

  const chooseCategory = (category, customRoleName = null, typeHint = null, echoUser = true) => {
    const roleLabel = roleLabelFor(category, customRoleName);
    if (echoUser) pushUser(roleLabel);
    setSuggestionIds([]);
    setSelectedCategory(category);
    setCustomRole(customRoleName || '');
    if (typeChosen && selectedType) {
      goToConfirm(category, customRoleName, selectedType);
      return;
    }
    setSuggestedType(typeHint || suggestInterviewType(category));
    pushBot(`${roleLabel} it is. What kind of interview would you like: technical, HR / behavioral, or situational?`);
    setStage('ask-interview-type');
  };

  // Type picked first (before the domain).
  const chooseTypeFirst = (typeId) => {
    pushUser(typeLabel(typeId));
    setSelectedType(typeId);
    setTypeChosen(true);
    pushBot('Great. Which field or role should the questions be about?');
    setSuggestionIds([]);
    setStage('pick-domain');
  };

  // Type picked after the domain.
  const chooseInterviewType = (typeId) => {
    pushUser(typeLabel(typeId));
    setSelectedType(typeId);
    setTypeChosen(true);
    goToConfirm(selectedCategory, customRole, typeId);
  };

  const handleSend = async (preset) => {
    const text = (typeof preset === 'string' ? preset : input).trim();
    if (!text || interpreting) return;
    pushUser(text);
    setInput('');

    // 1. Semantic interpretation on the backend (FR07-02)
    setInterpreting(true);
    let result = null;
    try {
      result = await interpretGoal(text);
    } catch {
      result = null; // fall back to local keyword matching below
    } finally {
      setInterpreting(false);
    }

    if (result) {
      const byId = (id) => categories.find((c) => c.id === id);
      const best = result.best && byId(result.best.id);
      if (result.status === 'matched' && best) {
        // A short goal ("ICU nurse") becomes the role name; a sentence does not.
        const roleName = text.split(/\s+/).length <= 4 ? text : null;
        chooseCategory(best, roleName, result.interview_type, false);
        return;
      }
      const suggestions = (result.suggestions || []).map((m) => m.id).filter(byId);
      if (result.status === 'ambiguous' && suggestions.length) {
        pushBot('That could fit a few fields. Which one is closest?');
        setSuggestionIds(suggestions);
        setStage('pick-domain');
        return;
      }
    }

    // 2. Offline fallback: keyword matching
    const matched = matchCategoryFromText(text, categories);
    if (matched) {
      chooseCategory(matched, text, null, false);
    } else {
      pushBot("I couldn't match that to a field yet. Pick the closest one below, or describe your role differently.");
      setSuggestionIds([]);
      setStage('pick-domain');
    }
  };

  const handleBegin = async () => {
    if (!selectedCategory || !selectedType) return;
    setStarting(true);
    setStartError('');
    try {
      const interview = await startInterview({
        categoryId: selectedCategory.id,
        interviewType: selectedType,
        role: customRole || selectedCategory.name,
      });
      navigate(`/interview/${interview.id}/prepare`);
    } catch (err) {
      setStartError(err.message || 'Could not start the interview. Please try again.');
    } finally {
      setStarting(false);
    }
  };

  const startOver = () => {
    setMessages([{ from: 'bot', text: 'Sure, let us start again. What role or field are you preparing for?' }]);
    setStage('ask-goal');
    setSelectedType(null);
    setTypeChosen(false);
    setSuggestedType(null);
    setSelectedCategory(null);
    setCustomRole('');
    setSuggestionIds([]);
    setStartError('');
    setInput('');
  };

  const renderTypeCards = (onPick, suggested = null) => (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {INTERVIEW_TYPES.map((type) => {
        const Icon = { Briefcase, Users, Compass, Code2 }[type.icon] || Briefcase;
        const isSuggested = suggested === type.id;
        return (
          <button
            key={type.id}
            onClick={() => onPick(type.id)}
            className="rounded-lg border p-4 text-left flex sm:flex-col items-start gap-3 transition-all group hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2"
            style={{
              background: isSuggested ? 'var(--c-badge-accent-bg)' : 'var(--c-surface-muted)',
              borderColor: isSuggested ? 'var(--c-accent)' : 'var(--c-border)',
            }}
          >
            <div
              className="w-9 h-9 rounded-md flex items-center justify-center shrink-0"
              style={{ background: 'var(--c-badge-accent-bg)', color: 'var(--c-accent)' }}
            >
              <Icon className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold group-hover:text-orange-500 transition-colors" style={{ color: 'var(--c-text)' }}>
                  {type.label.replace(' Interview', '')}
                </span>
                {isSuggested && <span className="c-badge c-badge-accent text-[11px] font-semibold">Suggested</span>}
              </span>
              <span className="text-xs block mt-0.5 leading-relaxed" style={{ color: 'var(--c-text-muted)' }}>
                {TYPE_BLURB[type.id]}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );

  const domainOptions = suggestionIds.length
    ? suggestionIds.map((sid) => categories.find((c) => c.id === sid)).filter(Boolean)
    : categories;

  const showInput = !categoriesLoading && !categoriesError && (stage === 'ask-goal' || stage === 'pick-domain');
  const roleTitle = customRole && customRole.toLowerCase() !== selectedCategory?.name?.toLowerCase()
    ? customRole
    : selectedCategory?.name;

  return (
    <InterviewFlowLayout step="goal">
      <div className="py-6 sm:py-10 max-w-4xl mx-auto space-y-6">

        <div className="space-y-3">
          <h1 className="c-heading text-2xl sm:text-3xl font-bold" style={{ color: 'var(--c-text)' }}>
            Set up your practice interview
          </h1>
          <p className="text-sm" style={{ color: 'var(--c-text-secondary)' }}>
            Tell the assistant which job you are preparing for and choose the kind of interview.
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              { Icon: ListChecks, text: '3 easy questions' },
              { Icon: Clock, text: 'About 5 minutes' },
              { Icon: Sparkles, text: 'Feedback on every answer' },
            ].map(({ Icon, text }) => (
              <span
                key={text}
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium"
                style={{ borderColor: 'var(--c-border)', color: 'var(--c-text-secondary)', background: 'var(--c-surface)' }}
              >
                <Icon className="w-3.5 h-3.5" style={{ color: 'var(--c-accent)' }} />
                {text}
              </span>
            ))}
          </div>
        </div>

        {/* FR 7-01: the setup assistant is a text chatbot. Messages, the choices for
            the current step and the message box all live in one panel. */}
        <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)' }}>
          <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b" style={{ borderColor: 'var(--c-border)' }}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--c-badge-accent-bg)', color: 'var(--c-accent)' }}>
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-bold leading-tight" style={{ color: 'var(--c-text)' }}>Interview assistant</p>
                <p className="text-[11px] leading-tight" style={{ color: 'var(--c-text-muted)' }}>Finds your field and sets up the questions</p>
              </div>
            </div>
            {stage !== 'ask-goal' && (
              <button
                onClick={startOver}
                disabled={starting || interpreting}
                className="shrink-0 whitespace-nowrap text-xs font-semibold flex items-center gap-1 px-2 py-1 rounded-md hover:underline underline-offset-2 disabled:opacity-40"
                style={{ color: 'var(--c-text-muted)' }}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Start over
              </button>
            )}
          </div>

          <div className="px-4 sm:px-5 py-5 space-y-3" role="log" aria-live="polite" aria-label="Interview setup assistant">
            {messages.map((m, i) => (
              <div key={i} className={`flex items-end gap-2 ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.from === 'bot' && (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--c-badge-accent-bg)', color: 'var(--c-accent)' }}>
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] px-3.5 py-2.5 text-sm leading-relaxed ${m.from === 'user' ? 'rounded-2xl rounded-br-sm' : 'rounded-2xl rounded-bl-sm'}`}
                  style={m.from === 'user'
                    ? { background: 'var(--c-accent)', color: '#fff' }
                    : { background: 'var(--c-surface-muted)', color: 'var(--c-text)' }}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {interpreting && (
              <div className="flex items-end gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--c-badge-accent-bg)', color: 'var(--c-accent)' }}>
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-sm flex items-center gap-2" style={{ background: 'var(--c-surface-muted)', color: 'var(--c-text-muted)' }}>
                  <span className="w-3 h-3 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--c-accent)', borderTopColor: 'transparent' }} />
                  Finding the best match…
                </div>
              </div>
            )}

            {/* Choices for the current step */}
            <div className="pt-2">
              {categoriesLoading ? (
                <div className="flex items-center gap-2 py-4 text-xs" style={{ color: 'var(--c-text-muted)' }}>
                  <span className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--c-accent)', borderTopColor: 'transparent' }} />
                  Loading fields…
                </div>
              ) : categoriesError ? (
                <p className="text-sm flex items-center gap-2 text-red-500"><AlertCircle className="w-4 h-4 shrink-0" /> {categoriesError}</p>
              ) : interpreting ? null : (
                <>
                  {stage === 'ask-goal' && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold" style={{ color: 'var(--c-text-muted)' }}>Or choose the kind of interview first:</p>
                      {renderTypeCards(chooseTypeFirst)}
                    </div>
                  )}

                  {stage === 'ask-interview-type' && renderTypeCards(chooseInterviewType, suggestedType)}

                  {stage === 'pick-domain' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {domainOptions.map((cat) => {
                        const Icon = getCategoryDisplayIcon(cat);
                        return (
                          <button
                            key={cat.id}
                            onClick={() => chooseCategory(cat)}
                            className="rounded-lg border px-3 py-2.5 text-left flex items-center gap-2.5 transition-colors group hover:border-orange-500/60"
                            style={{ background: 'var(--c-surface-muted)', borderColor: 'var(--c-border)' }}
                          >
                            <Icon className="w-4 h-4 shrink-0" style={{ color: 'var(--c-accent)' }} />
                            <span className="text-xs font-semibold truncate group-hover:text-orange-500 transition-colors" style={{ color: 'var(--c-text)' }}>
                              {cat.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {stage === 'confirm' && (
                    <div className="rounded-lg border p-4 sm:p-5 space-y-4" style={{ background: 'var(--c-surface-muted)', borderColor: 'var(--c-border)' }}>
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-base font-bold" style={{ color: 'var(--c-text)' }}>{roleTitle}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--c-text-secondary)' }}>
                            {typeLabel(selectedType)}
                            {roleTitle !== selectedCategory?.name ? ` · ${selectedCategory?.name}` : ''}
                          </p>
                          <p className="text-xs mt-2" style={{ color: 'var(--c-text-muted)' }}>
                            3 easy questions · about 5 minutes · next you check your camera and microphone
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <button
                          onClick={handleBegin}
                          disabled={starting}
                          className="c-btn c-btn-primary px-6 py-3 text-sm font-bold rounded-md flex items-center justify-center gap-2"
                        >
                          <span>{starting ? 'Setting up…' : 'Continue'}</span>
                          {!starting && <ArrowRight className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => { pushBot('Sure. Which kind of interview would you like instead?'); setStage('ask-interview-type'); }}
                          disabled={starting}
                          className="c-btn c-btn-secondary px-4 py-3 text-xs font-semibold rounded-md"
                        >
                          Change interview type
                        </button>
                      </div>
                      {startError && (
                        <p className="text-xs font-semibold flex items-center gap-1.5 text-red-500">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {startError}
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
              <div ref={scrollRef} />
            </div>
          </div>

          {showInput && (
            <div className="px-4 sm:px-5 py-4 border-t space-y-3" style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface-card)' }}>
              {stage === 'ask-goal' && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-semibold mr-1" style={{ color: 'var(--c-text-muted)' }}>Try:</span>
                  {QUICK_GOALS.map((g) => (
                    <button
                      key={g}
                      onClick={() => handleSend(g)}
                      disabled={interpreting}
                      className="rounded-full border px-3 py-1 text-xs font-medium transition-colors hover:border-orange-500/60 disabled:opacity-50"
                      style={{ borderColor: 'var(--c-border)', color: 'var(--c-text-secondary)' }}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              )}
              <form
                className="flex items-center gap-2"
                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={stage === 'pick-domain' ? 'Or describe your role in your own words' : 'e.g. I have a nursing interview next week'}
                  disabled={interpreting}
                  aria-label="Message the interview setup assistant"
                  className="c-input flex-1 min-w-0 px-4 py-3 rounded-lg text-sm disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={interpreting || !input.trim()}
                  aria-label="Send"
                  className="c-btn c-btn-primary shrink-0 h-11 px-4 rounded-lg text-sm font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {interpreting
                    ? <span className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'currentColor', borderTopColor: 'transparent' }} />
                    : <SendHorizontal className="w-4 h-4" />}
                  <span className="hidden sm:inline">Send</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </InterviewFlowLayout>
  );
};

export default GoalSelection;
