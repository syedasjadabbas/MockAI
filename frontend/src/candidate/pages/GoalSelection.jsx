import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Bot, Code2, Users, Compass, ArrowRight, Server, Cpu, BarChart3 } from 'lucide-react';
import InterviewFlowLayout from '../layouts/InterviewFlowLayout';
import { CATEGORIES, INTERVIEW_TYPES, matchCategoryFromText, getCategoriesByType } from '../data/categories';
import { startInterview } from '../services/candidateApi';

// FR07 - Accept Interview Goal via Chatbot, FR08 - Select Interview Questions
//
// This is a real conversational UI (free text + quick replies), but the
// "understanding" behind it is a small transparent keyword matcher, not
// NLP/AI (see matchCategoryFromText in data/categories.js). Real language
// understanding is explicit future AI-integration work (FR13/FR14).

const CATEGORY_ICONS = { Code: Code2, Server, Cpu, BarChart3, Users };

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
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const pushBot = (text) => setMessages((m) => [...m, { from: 'bot', text }]);
  const pushUser = (text) => setMessages((m) => [...m, { from: 'user', text }]);

  const chooseCategory = (category) => {
    pushUser(category.name);
    setSelectedCategory(category);
    setSelectedType(category.interviewType);
    pushBot(`Great choice. I'll line up a ${category.name} interview for you. Ready to continue to preparation?`);
    setStage('confirm');
  };

  const chooseType = (typeId) => {
    const type = INTERVIEW_TYPES.find((t) => t.id === typeId);
    pushUser(type.label);
    setSelectedType(typeId);
    const options = getCategoriesByType(typeId);
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

    const matched = matchCategoryFromText(text);
    if (matched) {
      setSelectedType(matched.interviewType);
      setSelectedCategory(matched);
      pushBot(`Got it — that sounds like a ${matched.name} interview. Ready to continue to preparation?`);
      setStage('confirm');
    } else {
      pushBot("I didn't quite catch a specific topic. Could you pick one of the options below instead?");
      setStage('ask-type');
    }
  };

  const handleBegin = async () => {
    if (!selectedCategory) return;
    setStarting(true);
    try {
      const interview = await startInterview({ categoryId: selectedCategory.id, interviewType: selectedType });
      navigate(`/interview/${interview.id}/prepare`);
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

            {stage === 'ask-type' && selectedType && (
              <div className="flex flex-wrap gap-2 pt-1">
                {getCategoriesByType(selectedType).map((cat) => {
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

            {stage === 'ask-type' && !selectedType && (
              <div className="flex flex-wrap gap-2 pt-1">
                {CATEGORIES.map((cat) => {
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
              </div>
            )}
            <div ref={scrollRef} />
          </div>

          {stage !== 'confirm' && (
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
