import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookOpen, 
  Search, 
  Plus, 
  Filter, 
  FolderPlus, 
  Edit2, 
  Trash2, 
  Archive, 
  RotateCcw, 
  Eye, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  Layers, 
  Tag, 
  ChevronLeft, 
  ChevronRight, 
  Folder, 
  Code, 
  Server, 
  Cpu, 
  Users, 
  BarChart3, 
  Cloud, 
  Terminal, 
  Shield, 
  Sparkles,
  ChevronDown,
  RefreshCw,
  Check,
  Hash
} from 'lucide-react';
import { fetchWithAuth } from '../api';
import { useTheme } from '../context/ThemeContext';
import StatsCard from '../components/StatsCard';
import { TableSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import { formatDateOnly } from '../utils/dateFormat';

// Map icon strings to Lucide icon components
const ICON_MAP = {
  Folder: Folder,
  Code: Code,
  Server: Server,
  Cpu: Cpu,
  Users: Users,
  BarChart3: BarChart3,
  Cloud: Cloud,
  Terminal: Terminal,
  Shield: Shield,
  BookOpen: BookOpen,
  Layers: Layers
};

const DIFFICULTY_CONFIG = {
  Easy: {
    label: 'Easy',
    colorDark: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    colorLight: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500'
  },
  Medium: {
    label: 'Medium',
    colorDark: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    colorLight: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500'
  },
  Hard: {
    label: 'Hard',
    colorDark: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    colorLight: 'bg-rose-50 text-rose-700 border-rose-200',
    dot: 'bg-rose-500'
  }
};

const QuestionBank = () => {
  const { isDark } = useTheme();

  // Active Tab: 'questions' | 'categories'
  const [activeTab, setActiveTab] = useState('questions');

  // Main Data States
  const [questions, setQuestions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // Filters State for Questions
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [selectedDifficultyFilter, setSelectedDifficultyFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 8;

  // Modals States
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null); // null = add, object = edit
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [viewingQuestion, setViewingQuestion] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null); // { type: 'question'|'category', item: object }

  // Form States - Question
  const [qFormData, setQFormData] = useState({
    category_id: '',
    question_text: '',
    difficulty: 'Medium',
    type: 'Technical',
    expected_answer: '',
    tags: '',
    status: 'active'
  });

  // Form States - Category
  const [catFormData, setCatFormData] = useState({
    name: '',
    description: '',
    icon: 'Folder',
    status: 'active'
  });

  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch All Data
  const loadData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setLoadError(null);

    try {
      const [catsData, questionsData, statsData] = await Promise.all([
        fetchWithAuth('/categories'),
        fetchWithAuth('/questions'),
        fetchWithAuth('/question-bank/stats')
      ]);

      setCategories(catsData || []);
      setQuestions(questionsData || []);
      setStats(statsData || null);
    } catch (err) {
      console.error('Failed to load Question Bank data:', err);
      setLoadError(err.message || 'Failed to load Question Bank data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Questions Logic
  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      // Search match
      if (searchQuery.trim()) {
        const term = searchQuery.toLowerCase().trim();
        const textMatch = q.question_text?.toLowerCase().includes(term);
        const ansMatch = q.expected_answer?.toLowerCase().includes(term);
        const catMatch = q.category_name?.toLowerCase().includes(term);
        const tagMatch = q.tags?.some(t => t.toLowerCase().includes(term));
        if (!textMatch && !ansMatch && !catMatch && !tagMatch) return false;
      }

      // Category match
      if (selectedCategoryFilter !== 'all' && q.category_id !== selectedCategoryFilter) {
        return false;
      }

      // Difficulty match
      if (selectedDifficultyFilter !== 'all' && q.difficulty?.toLowerCase() !== selectedDifficultyFilter.toLowerCase()) {
        return false;
      }

      // Status match
      if (selectedStatusFilter !== 'all' && q.status?.toLowerCase() !== selectedStatusFilter.toLowerCase()) {
        return false;
      }

      // Type match
      if (selectedTypeFilter !== 'all' && q.type?.toLowerCase() !== selectedTypeFilter.toLowerCase()) {
        return false;
      }

      return true;
    });
  }, [questions, searchQuery, selectedCategoryFilter, selectedDifficultyFilter, selectedStatusFilter, selectedTypeFilter]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategoryFilter, selectedDifficultyFilter, selectedStatusFilter, selectedTypeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / PAGE_SIZE));
  const paginatedQuestions = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredQuestions.slice(start, start + PAGE_SIZE);
  }, [filteredQuestions, currentPage]);

  // Question Types for selection
  const QUESTION_TYPES = ['Technical', 'Behavioral', 'Situational', 'Conceptual', 'System Design'];

  // --- MODAL HANDLERS ---

  const openAddQuestionModal = (defaultCatId = '') => {
    setEditingQuestion(null);
    setQFormData({
      category_id: defaultCatId || (categories.length > 0 ? categories[0]._id : ''),
      question_text: '',
      difficulty: 'Medium',
      type: 'Technical',
      expected_answer: '',
      tags: '',
      status: 'active'
    });
    setFormError('');
    setShowQuestionModal(true);
  };

  const openEditQuestionModal = (q) => {
    setEditingQuestion(q);
    setQFormData({
      category_id: q.category_id || '',
      question_text: q.question_text || '',
      difficulty: q.difficulty || 'Medium',
      type: q.type || 'Technical',
      expected_answer: q.expected_answer || '',
      tags: Array.isArray(q.tags) ? q.tags.join(', ') : '',
      status: q.status || 'active'
    });
    setFormError('');
    setShowQuestionModal(true);
  };

  const openAddCategoryModal = () => {
    setEditingCategory(null);
    setCatFormData({
      name: '',
      description: '',
      icon: 'Folder',
      status: 'active'
    });
    setFormError('');
    setShowCategoryModal(true);
  };

  const openEditCategoryModal = (cat) => {
    setEditingCategory(cat);
    setCatFormData({
      name: cat.name || '',
      description: cat.description || '',
      icon: cat.icon || 'Folder',
      status: cat.status || 'active'
    });
    setFormError('');
    setShowCategoryModal(true);
  };

  // --- SUBMIT QUESTION ---
  const handleQuestionSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!qFormData.question_text.trim()) {
      setFormError('Question prompt is required.');
      return;
    }
    if (!qFormData.category_id) {
      setFormError('Please select a valid category.');
      return;
    }

    const cleanTags = qFormData.tags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const payload = {
      category_id: qFormData.category_id,
      question_text: qFormData.question_text.trim(),
      difficulty: qFormData.difficulty,
      type: qFormData.type,
      expected_answer: qFormData.expected_answer.trim(),
      tags: cleanTags,
      status: qFormData.status
    };

    setFormSubmitting(true);
    try {
      if (editingQuestion) {
        // Update existing question
        const updated = await fetchWithAuth(`/questions/${editingQuestion._id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        setQuestions(prev => prev.map(q => q._id === updated._id ? updated : q));
        showToast('Question updated successfully!');
        window.dispatchEvent(new CustomEvent('notify', { 
          detail: { message: `Question updated: ${payload.question_text.slice(0, 30)}...`, type: 'info' } 
        }));
      } else {
        // Create new question
        const created = await fetchWithAuth('/questions', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        setQuestions(prev => [created, ...prev]);
        showToast('New question created successfully!');
        window.dispatchEvent(new CustomEvent('notify', { 
          detail: { message: `New question added: ${payload.question_text.slice(0, 30)}...`, type: 'success' } 
        }));
      }

      // Refresh stats & category counts
      fetchWithAuth('/question-bank/stats').then(setStats).catch(() => {});
      fetchWithAuth('/categories').then(setCategories).catch(() => {});
      window.dispatchEvent(new Event('dataUpdated'));
      setShowQuestionModal(false);
    } catch (err) {
      setFormError(err.message || 'Failed to save question');
    } finally {
      setFormSubmitting(false);
    }
  };

  // --- SUBMIT CATEGORY ---
  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!catFormData.name.trim()) {
      setFormError('Category name is required.');
      return;
    }

    const payload = {
      name: catFormData.name.trim(),
      description: catFormData.description.trim(),
      icon: catFormData.icon,
      status: catFormData.status
    };

    setFormSubmitting(true);
    try {
      if (editingCategory) {
        // Update category
        const updated = await fetchWithAuth(`/categories/${editingCategory._id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        setCategories(prev => prev.map(c => c._id === updated._id ? updated : c));
        // Update questions category_name if changed
        setQuestions(prev => prev.map(q => q.category_id === updated._id ? { ...q, category_name: updated.name } : q));
        showToast('Category updated successfully!');
        window.dispatchEvent(new CustomEvent('notify', { 
          detail: { message: `Category updated: ${updated.name}`, type: 'info' } 
        }));
      } else {
        // Create category
        const created = await fetchWithAuth('/categories', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        setCategories(prev => [created, ...prev]);
        showToast('New category created successfully!');
        window.dispatchEvent(new CustomEvent('notify', { 
          detail: { message: `New category created: ${created.name}`, type: 'success' } 
        }));
      }

      fetchWithAuth('/question-bank/stats').then(setStats).catch(() => {});
      window.dispatchEvent(new Event('dataUpdated'));
      setShowCategoryModal(false);
    } catch (err) {
      setFormError(err.message || 'Failed to save category');
    } finally {
      setFormSubmitting(false);
    }
  };

  // --- TOGGLE QUESTION STATUS ---
  const handleToggleQuestionStatus = async (q) => {
    const nextStatus = q.status === 'active' ? 'archived' : 'active';
    try {
      const updated = await fetchWithAuth(`/questions/${q._id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus })
      });
      setQuestions(prev => prev.map(item => item._id === updated._id ? updated : item));
      showToast(`Question ${nextStatus === 'active' ? 'activated' : 'archived'}!`, 'info');
      fetchWithAuth('/question-bank/stats').then(setStats).catch(() => {});
      fetchWithAuth('/categories').then(setCategories).catch(() => {});
    } catch (err) {
      showToast('Failed to update question status', 'error');
    }
  };

  // --- TOGGLE CATEGORY STATUS ---
  const handleToggleCategoryStatus = async (cat) => {
    const nextStatus = cat.status === 'active' ? 'archived' : 'active';
    try {
      const updated = await fetchWithAuth(`/categories/${cat._id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus })
      });
      setCategories(prev => prev.map(item => item._id === updated._id ? updated : item));
      showToast(`Category ${nextStatus === 'active' ? 'activated' : 'archived'}!`, 'info');
      fetchWithAuth('/question-bank/stats').then(setStats).catch(() => {});
    } catch (err) {
      showToast('Failed to update category status', 'error');
    }
  };

  // --- DELETE CONFIRMATION ---
  const executeDelete = async () => {
    if (!confirmDelete) return;
    setFormSubmitting(true);

    try {
      if (confirmDelete.type === 'question') {
        await fetchWithAuth(`/questions/${confirmDelete.item._id}`, { method: 'DELETE' });
        setQuestions(prev => prev.filter(q => q._id !== confirmDelete.item._id));
        showToast('Question deleted successfully!');
        window.dispatchEvent(new CustomEvent('notify', { 
          detail: { message: `Question deleted`, type: 'warning' } 
        }));
      } else if (confirmDelete.type === 'category') {
        await fetchWithAuth(`/categories/${confirmDelete.item._id}`, { method: 'DELETE' });
        setCategories(prev => prev.filter(c => c._id !== confirmDelete.item._id));
        // Remove associated questions from state as backend cascades delete
        setQuestions(prev => prev.filter(q => q.category_id !== confirmDelete.item._id));
        showToast('Category and its associated questions deleted!');
        window.dispatchEvent(new CustomEvent('notify', { 
          detail: { message: `Category deleted: ${confirmDelete.item.name}`, type: 'warning' } 
        }));
      }

      fetchWithAuth('/question-bank/stats').then(setStats).catch(() => {});
      fetchWithAuth('/categories').then(setCategories).catch(() => {});
      window.dispatchEvent(new Event('dataUpdated'));
      setConfirmDelete(null);
    } catch (err) {
      showToast(err.message || 'Failed to delete item', 'error');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Clear all filters helper
  const hasActiveFilters = searchQuery || selectedCategoryFilter !== 'all' || selectedDifficultyFilter !== 'all' || selectedStatusFilter !== 'all' || selectedTypeFilter !== 'all';
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategoryFilter('all');
    setSelectedDifficultyFilter('all');
    setSelectedStatusFilter('all');
    setSelectedTypeFilter('all');
  };

  // Quick switch to category filtered view
  const filterBySpecificCategory = (catId) => {
    setSelectedCategoryFilter(catId);
    setActiveTab('questions');
  };

  // Render Category Icon Component
  const renderCategoryIcon = (iconName, className = "w-5 h-5") => {
    const Component = ICON_MAP[iconName] || Folder;
    return <Component className={className} />;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border backdrop-blur-xl transition-all duration-300 animate-slide-up ${
          toast.type === 'error'
            ? 'bg-rose-950/90 text-rose-200 border-rose-500/40 shadow-rose-950/40'
            : toast.type === 'warning'
            ? 'bg-amber-950/90 text-amber-200 border-amber-500/40 shadow-amber-950/40'
            : toast.type === 'info'
            ? 'bg-sky-950/90 text-sky-200 border-sky-500/40 shadow-sky-950/40'
            : 'bg-emerald-950/90 text-emerald-200 border-emerald-500/40 shadow-emerald-950/40'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="w-5 h-5 text-rose-400" /> : <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
          <span className="text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
              <BookOpen className="w-5 h-5 text-indigo-500" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
                Question Bank
              </h1>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
                Curate interview question repositories, rubrics, difficulty levels & category domains
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className={`p-2.5 rounded-xl border transition-all ${
              isDark 
                ? 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800' 
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-500' : ''}`} />
          </button>

          <button
            onClick={openAddCategoryModal}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
              isDark
                ? 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border-slate-700'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-sm'
            }`}
          >
            <FolderPlus className="w-4 h-4 text-indigo-400" />
            <span>New Category</span>
          </button>

          <button
            onClick={() => openAddQuestionModal()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/35 transition-all transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Question</span>
          </button>
        </div>
      </div>

      {/* Top Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Questions"
          value={loading ? '...' : String(stats?.total_questions || questions.length)}
          icon={BookOpen}
          change={`${stats?.active_questions || 0} active, ${stats?.archived_questions || 0} archived`}
          trend={stats?.active_questions > 0 ? 'up' : 'neutral'}
        />

        <StatsCard
          title="Categories"
          value={loading ? '...' : String(stats?.total_categories || categories.length)}
          icon={Layers}
          change={`${stats?.active_categories || 0} active domains`}
          trend="up"
        />

        <div className="glass-card rounded-2xl p-5 border flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Difficulty Split</span>
            <Sparkles className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-center gap-2 my-2">
            <span className={`px-2 py-0.5 rounded-lg text-xs font-bold border ${DIFFICULTY_CONFIG.Easy.colorDark}`}>
              E: {stats?.difficulty_breakdown?.Easy || 0}
            </span>
            <span className={`px-2 py-0.5 rounded-lg text-xs font-bold border ${DIFFICULTY_CONFIG.Medium.colorDark}`}>
              M: {stats?.difficulty_breakdown?.Medium || 0}
            </span>
            <span className={`px-2 py-0.5 rounded-lg text-xs font-bold border ${DIFFICULTY_CONFIG.Hard.colorDark}`}>
              H: {stats?.difficulty_breakdown?.Hard || 0}
            </span>
          </div>
          <p className="text-[11px] text-[var(--text-muted)]">Distributed across technical & behavioral</p>
        </div>

        <div className="glass-card rounded-2xl p-5 border flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Repository Health</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-[var(--text-primary)]">
                {stats?.total_questions ? `${Math.round((stats.active_questions / stats.total_questions) * 100)}%` : '100%'}
              </span>
              <span className="text-xs text-emerald-500 font-semibold">Active Ready</span>
            </div>
          </div>
          <p className="text-[11px] text-[var(--text-muted)]">Ready for live AI interview generation</p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-[var(--border-panel)] pb-1">
        <button
          onClick={() => setActiveTab('questions')}
          className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 relative ${
            activeTab === 'questions'
              ? isDark
                ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
                : 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-slate-800/20'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Questions Repository</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
            activeTab === 'questions'
              ? isDark ? 'bg-indigo-500/30 text-indigo-300' : 'bg-indigo-100 text-indigo-800'
              : isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'
          }`}>
            {questions.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 relative ${
            activeTab === 'categories'
              ? isDark
                ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
                : 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-slate-800/20'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Interview Categories</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
            activeTab === 'categories'
              ? isDark ? 'bg-indigo-500/30 text-indigo-300' : 'bg-indigo-100 text-indigo-800'
              : isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'
          }`}>
            {categories.length}
          </span>
        </button>
      </div>

      {/* Error state alert */}
      {loadError && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">{loadError}</span>
          </div>
          <button
            onClick={() => loadData(true)}
            className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 rounded-lg text-xs font-bold transition-all"
          >
            Retry
          </button>
        </div>
      )}

      {/* TAB 1: QUESTIONS MANAGEMENT */}
      {activeTab === 'questions' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="glass-card rounded-2xl p-4 border flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search questions, answer criteria, tags..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="theme-input w-full pl-10 pr-9 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Dropdowns */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Category Filter */}
              <select
                value={selectedCategoryFilter}
                onChange={e => setSelectedCategoryFilter(e.target.value)}
                className="theme-input px-3 py-2 rounded-xl text-xs sm:text-sm font-medium border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all cursor-pointer"
              >
                <option value="all">All Categories</option>
                {categories.map(c => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>

              {/* Difficulty Filter */}
              <select
                value={selectedDifficultyFilter}
                onChange={e => setSelectedDifficultyFilter(e.target.value)}
                className="theme-input px-3 py-2 rounded-xl text-xs sm:text-sm font-medium border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all cursor-pointer"
              >
                <option value="all">All Difficulties</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>

              {/* Status Filter */}
              <select
                value={selectedStatusFilter}
                onChange={e => setSelectedStatusFilter(e.target.value)}
                className="theme-input px-3 py-2 rounded-xl text-xs sm:text-sm font-medium border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="archived">Archived Only</option>
              </select>

              {/* Clear Filters Button */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>

          {/* Active Filter Badges */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] flex-wrap px-1">
              <span>Showing {filteredQuestions.length} matching questions</span>
              {selectedCategoryFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
                  Category: {categories.find(c => c._id === selectedCategoryFilter)?.name || selectedCategoryFilter}
                  <button onClick={() => setSelectedCategoryFilter('all')}><X className="w-3 h-3 hover:text-white" /></button>
                </span>
              )}
              {selectedDifficultyFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                  Difficulty: {selectedDifficultyFilter}
                  <button onClick={() => setSelectedDifficultyFilter('all')}><X className="w-3 h-3 hover:text-white" /></button>
                </span>
              )}
              {selectedStatusFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-500/10 text-slate-400 border border-slate-500/20 font-medium">
                  Status: {selectedStatusFilter}
                  <button onClick={() => setSelectedStatusFilter('all')}><X className="w-3 h-3 hover:text-white" /></button>
                </span>
              )}
            </div>
          )}

          {/* Questions Table / List */}
          <div className="glass-card rounded-2xl overflow-hidden border">
            {loading ? (
              <div className="p-6">
                <TableSkeleton rows={6} cols={5} />
              </div>
            ) : filteredQuestions.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title={hasActiveFilters ? "No matching questions found" : "No questions in Question Bank"}
                description={hasActiveFilters ? "Try adjusting your search criteria or resetting filters." : "Get started by adding questions or seeding default domain questions."}
                actionLabel={hasActiveFilters ? "Clear All Filters" : "+ Add First Question"}
                onAction={hasActiveFilters ? clearFilters : () => openAddQuestionModal()}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border-table)] bg-[var(--bg-table-header)]">
                      <th className="py-4 px-6 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Question Prompt</th>
                      <th className="py-4 px-6 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Category</th>
                      <th className="py-4 px-6 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Difficulty</th>
                      <th className="py-4 px-6 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Type & Tags</th>
                      <th className="py-4 px-6 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Status</th>
                      <th className="py-4 px-6 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-table)]">
                    {paginatedQuestions.map((q) => {
                      const diffCfg = DIFFICULTY_CONFIG[q.difficulty] || DIFFICULTY_CONFIG.Medium;
                      const isArchived = q.status === 'archived';

                      return (
                        <tr 
                          key={q._id} 
                          className={`hover:bg-[var(--bg-table-row-hover)] transition-colors group ${
                            isArchived ? 'opacity-65' : ''
                          }`}
                        >
                          {/* Question Text */}
                          <td className="py-4 px-6 max-w-md">
                            <div className="space-y-1">
                              <p className="text-sm font-semibold text-[var(--text-primary)] leading-snug line-clamp-2">
                                {q.question_text}
                              </p>
                              {q.expected_answer && (
                                <p className="text-xs text-[var(--text-muted)] line-clamp-1 italic">
                                  Rubric: {q.expected_answer}
                                </p>
                              )}
                            </div>
                          </td>

                          {/* Category */}
                          <td className="py-4 px-6 whitespace-nowrap">
                            <button
                              onClick={() => filterBySpecificCategory(q.category_id)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all hover:scale-105 ${
                                isDark ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              }`}
                              title="Filter by this category"
                            >
                              <Folder className="w-3 h-3" />
                              <span>{q.category_name || 'General'}</span>
                            </button>
                          </td>

                          {/* Difficulty */}
                          <td className="py-4 px-6 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                              isDark ? diffCfg.colorDark : diffCfg.colorLight
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${diffCfg.dot}`} />
                              {q.difficulty || 'Medium'}
                            </span>
                          </td>

                          {/* Type & Tags */}
                          <td className="py-4 px-6">
                            <div className="flex flex-col gap-1">
                              <span className="text-xs font-medium text-[var(--text-secondary)]">
                                {q.type || 'Technical'}
                              </span>
                              {q.tags && q.tags.length > 0 && (
                                <div className="flex items-center gap-1 flex-wrap max-w-xs">
                                  {q.tags.slice(0, 3).map((tag, idx) => (
                                    <span 
                                      key={idx} 
                                      className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800/40 text-[var(--text-muted)] border border-slate-700/50"
                                    >
                                      #{tag}
                                    </span>
                                  ))}
                                  {q.tags.length > 3 && (
                                    <span className="text-[10px] text-[var(--text-muted)]">
                                      +{q.tags.length - 3}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-4 px-6 whitespace-nowrap">
                            <button
                              onClick={() => handleToggleQuestionStatus(q)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition-all ${
                                q.status === 'active'
                                  ? isDark
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                  : isDark
                                    ? 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                                    : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                              }`}
                              title={`Click to ${q.status === 'active' ? 'Archive' : 'Activate'}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${q.status === 'active' ? 'bg-emerald-400' : 'bg-slate-400'}`} />
                              {q.status === 'active' ? 'Active' : 'Archived'}
                            </button>
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-6 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* View Details */}
                              <button
                                onClick={() => setViewingQuestion(q)}
                                className="p-2 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {/* Edit Question */}
                              <button
                                onClick={() => openEditQuestionModal(q)}
                                className="p-2 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-all"
                                title="Edit Question"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>

                              {/* Archive / Restore Toggle */}
                              <button
                                onClick={() => handleToggleQuestionStatus(q)}
                                className={`p-2 rounded-lg transition-all ${
                                  q.status === 'active'
                                    ? 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/10'
                                    : 'text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10'
                                }`}
                                title={q.status === 'active' ? 'Archive Question' : 'Restore Question'}
                              >
                                {q.status === 'active' ? <Archive className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />}
                              </button>

                              {/* Delete Question */}
                              <button
                                onClick={() => setConfirmDelete({ type: 'question', item: q })}
                                className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                                title="Delete Question"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {filteredQuestions.length > PAGE_SIZE && (
              <div className="p-4 border-t border-[var(--border-table)] flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-xs text-[var(--text-muted)]">
                  Showing <span className="font-semibold text-[var(--text-primary)]">{(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredQuestions.length)}</span> of <span className="font-semibold text-[var(--text-primary)]">{filteredQuestions.length}</span> questions
                </p>

                <div className="flex items-center gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="p-2 rounded-xl border border-[var(--border-input)] text-slate-400 hover:text-[var(--text-primary)] disabled:opacity-40 disabled:pointer-events-none transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="text-xs font-semibold px-3 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className="p-2 rounded-xl border border-[var(--border-input)] text-slate-400 hover:text-[var(--text-primary)] disabled:opacity-40 disabled:pointer-events-none transition-all"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CATEGORIES MANAGEMENT */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Interview Domains & Categories</h3>
              <p className="text-xs text-[var(--text-muted)]">Manage role-specific domains, question counts & active interview status</p>
            </div>
            <button
              onClick={openAddCategoryModal}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-500/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Category</span>
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-44 rounded-2xl bg-slate-800/30 animate-pulse border border-[var(--border-panel)]" />
              ))}
            </div>
          ) : categories.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 border">
              <EmptyState
                icon={Layers}
                title="No Categories Configured"
                description="Create your first interview category domain or seed standard defaults."
                actionLabel="+ Add Category"
                onAction={openAddCategoryModal}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {categories.map(cat => {
                const isArchived = cat.status === 'archived';
                const qCount = cat.question_count || 0;
                const activeQCount = cat.active_question_count || 0;

                return (
                  <div
                    key={cat._id}
                    className={`glass-card rounded-2xl p-5 border flex flex-col justify-between transition-all duration-300 hover:border-indigo-500/30 hover:shadow-xl ${
                      isArchived ? 'opacity-70' : ''
                    }`}
                  >
                    <div>
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                            {renderCategoryIcon(cat.icon, "w-5 h-5")}
                          </div>
                          <div>
                            <h4 className="text-base font-bold text-[var(--text-primary)] leading-tight">
                              {cat.name}
                            </h4>
                            <span className="text-[11px] text-[var(--text-muted)]">
                              Created {cat.created_at ? formatDateOnly(cat.created_at) : 'Recently'}
                            </span>
                          </div>
                        </div>

                        {/* Status badge */}
                        <button
                          onClick={() => handleToggleCategoryStatus(cat)}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition-all ${
                            cat.status === 'active'
                              ? isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : isDark ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-300'
                          }`}
                          title={`Click to ${cat.status === 'active' ? 'Archive' : 'Activate'}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${cat.status === 'active' ? 'bg-emerald-400' : 'bg-slate-400'}`} />
                          {cat.status === 'active' ? 'Active' : 'Archived'}
                        </button>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-2 mb-4">
                        {cat.description || 'No description provided for this category.'}
                      </p>
                    </div>

                    {/* Footer Stats & Actions */}
                    <div className="pt-3 border-t border-[var(--border-table)] flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-lg border border-indigo-500/20">
                          {qCount} Questions
                        </span>
                        {qCount > 0 && (
                          <span className="text-[11px] text-[var(--text-muted)]">
                            ({activeQCount} active)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => filterBySpecificCategory(cat._id)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 transition-all"
                          title="View Questions in this Category"
                        >
                          View Qs
                        </button>
                        <button
                          onClick={() => openEditCategoryModal(cat)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-all"
                          title="Edit Category"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setConfirmDelete({ type: 'category', item: cat })}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                          title="Delete Category"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ----------------- MODAL 1: ADD / EDIT QUESTION ----------------- */}
      {showQuestionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="theme-modal rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border flex flex-col max-h-[90vh] animate-scale-up">
            {/* Header */}
            <div className="p-6 border-b border-[var(--border-table)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                  <BookOpen className="w-5 h-5 text-indigo-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">
                    {editingQuestion ? 'Edit Interview Question' : 'Add New Interview Question'}
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    {editingQuestion ? 'Update question prompt, rubric, difficulty or category' : 'Configure prompt, grading rubric, and domain mapping'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowQuestionModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body Form */}
            <form onSubmit={handleQuestionSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              {formError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Category Select */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                  Category Domain <span className="text-rose-400">*</span>
                </label>
                <select
                  value={qFormData.category_id}
                  onChange={e => setQFormData({ ...qFormData, category_id: e.target.value })}
                  required
                  className="theme-input w-full px-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                >
                  <option value="" disabled>Select a Category</option>
                  {categories.map(c => (
                    <option key={c._id} value={c._id}>
                      {c.name} {c.status === 'archived' ? '(Archived)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Question Text */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                  Question Prompt <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={3}
                  value={qFormData.question_text}
                  onChange={e => setQFormData({ ...qFormData, question_text: e.target.value })}
                  placeholder="e.g. Explain how the Virtual DOM works and how reconciliation optimizes render performance in React."
                  required
                  className="theme-input w-full px-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none"
                />
              </div>

              {/* Row: Difficulty & Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Difficulty */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Difficulty Level
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Easy', 'Medium', 'Hard'].map(diff => (
                      <button
                        key={diff}
                        type="button"
                        onClick={() => setQFormData({ ...qFormData, difficulty: diff })}
                        className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                          qFormData.difficulty === diff
                            ? diff === 'Easy'
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-sm'
                              : diff === 'Medium'
                              ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-sm'
                              : 'bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-sm'
                            : 'border-[var(--border-input)] text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {diff}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Question Type */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Question Type
                  </label>
                  <select
                    value={qFormData.type}
                    onChange={e => setQFormData({ ...qFormData, type: e.target.value })}
                    className="theme-input w-full px-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  >
                    {QUESTION_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Expected Answer / Grading Rubric */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                  Expected Answer / Evaluation Rubric
                </label>
                <textarea
                  rows={3}
                  value={qFormData.expected_answer}
                  onChange={e => setQFormData({ ...qFormData, expected_answer: e.target.value })}
                  placeholder="Key concepts, algorithms, edge-cases, or behavioral STAR criteria candidate should mention..."
                  className="theme-input w-full px-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none"
                />
              </div>

              {/* Tags & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={qFormData.tags}
                    onChange={e => setQFormData({ ...qFormData, tags: e.target.value })}
                    placeholder="React, Virtual DOM, Performance"
                    className="theme-input w-full px-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Status
                  </label>
                  <div className="flex items-center gap-3 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="status"
                        value="active"
                        checked={qFormData.status === 'active'}
                        onChange={() => setQFormData({ ...qFormData, status: 'active' })}
                        className="accent-indigo-600"
                      />
                      <span className="text-xs font-semibold text-emerald-400">Active</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="status"
                        value="archived"
                        checked={qFormData.status === 'archived'}
                        onChange={() => setQFormData({ ...qFormData, status: 'archived' })}
                        className="accent-indigo-600"
                      />
                      <span className="text-xs font-semibold text-slate-400">Archived</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-[var(--border-table)] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowQuestionModal(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50"
                >
                  {formSubmitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                  <span>{editingQuestion ? 'Update Question' : 'Save Question'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- MODAL 2: ADD / EDIT CATEGORY ----------------- */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="theme-modal rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border flex flex-col animate-scale-up">
            {/* Header */}
            <div className="p-6 border-b border-[var(--border-table)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                  <FolderPlus className="w-5 h-5 text-indigo-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">
                    {editingCategory ? 'Edit Category' : 'Create New Category'}
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    {editingCategory ? 'Update category details and icon' : 'Define an interview category/role domain'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleCategorySubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                  Category Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={catFormData.name}
                  onChange={e => setCatFormData({ ...catFormData, name: e.target.value })}
                  placeholder="e.g. Cloud & DevOps Engineering"
                  required
                  className="theme-input w-full px-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={catFormData.description}
                  onChange={e => setCatFormData({ ...catFormData, description: e.target.value })}
                  placeholder="Short description of this domain role..."
                  className="theme-input w-full px-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none"
                />
              </div>

              {/* Icon Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                  Category Icon
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {Object.keys(ICON_MAP).map(iconKey => {
                    const IconComp = ICON_MAP[iconKey];
                    const isSelected = catFormData.icon === iconKey;
                    return (
                      <button
                        key={iconKey}
                        type="button"
                        onClick={() => setCatFormData({ ...catFormData, icon: iconKey })}
                        className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                          isSelected
                            ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40 shadow-sm'
                            : 'border-[var(--border-input)] text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <IconComp className="w-4 h-4" />
                        <span className="text-[10px] truncate max-w-full">{iconKey}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                  Status
                </label>
                <div className="flex items-center gap-4 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="cat_status"
                      value="active"
                      checked={catFormData.status === 'active'}
                      onChange={() => setCatFormData({ ...catFormData, status: 'active' })}
                      className="accent-indigo-600"
                    />
                    <span className="text-xs font-semibold text-emerald-400">Active</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="cat_status"
                      value="archived"
                      checked={catFormData.status === 'archived'}
                      onChange={() => setCatFormData({ ...catFormData, status: 'archived' })}
                      className="accent-indigo-600"
                    />
                    <span className="text-xs font-semibold text-slate-400">Archived</span>
                  </label>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-[var(--border-table)] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50"
                >
                  {formSubmitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                  <span>{editingCategory ? 'Update Category' : 'Create Category'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- MODAL 3: VIEW QUESTION DETAILS ----------------- */}
      {viewingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="theme-modal rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border flex flex-col animate-scale-up">
            {/* Header */}
            <div className="p-6 border-b border-[var(--border-table)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                  <Eye className="w-5 h-5 text-indigo-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">Question Details</h3>
                  <p className="text-xs text-[var(--text-muted)]">ID: {viewingQuestion._id}</p>
                </div>
              </div>
              <button
                onClick={() => setViewingQuestion(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
              {/* Badges Bar */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-xl text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1.5">
                  <Folder className="w-3.5 h-3.5" />
                  {viewingQuestion.category_name}
                </span>

                <span className={`px-3 py-1 rounded-xl text-xs font-bold border ${DIFFICULTY_CONFIG[viewingQuestion.difficulty]?.colorDark || ''}`}>
                  {viewingQuestion.difficulty}
                </span>

                <span className="px-3 py-1 rounded-xl text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                  {viewingQuestion.type || 'Technical'}
                </span>

                <span className={`px-3 py-1 rounded-xl text-xs font-bold border ${
                  viewingQuestion.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {viewingQuestion.status === 'active' ? 'Active' : 'Archived'}
                </span>
              </div>

              {/* Question Text */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Question Prompt</span>
                <div className="p-4 rounded-2xl bg-slate-800/40 border border-[var(--border-table)] text-sm font-semibold text-[var(--text-primary)] leading-relaxed">
                  {viewingQuestion.question_text}
                </div>
              </div>

              {/* Expected Answer / Rubric */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Expected Answer / Evaluation Rubric</span>
                <div className="p-4 rounded-2xl bg-slate-800/40 border border-[var(--border-table)] text-xs text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                  {viewingQuestion.expected_answer || 'No specific answer rubric provided.'}
                </div>
              </div>

              {/* Tags */}
              {viewingQuestion.tags && viewingQuestion.tags.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Tags</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {viewingQuestion.tags.map((tag, idx) => (
                      <span key={idx} className="text-xs px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="pt-3 border-t border-[var(--border-table)] flex items-center justify-between text-xs text-[var(--text-muted)]">
                <span>Created: {viewingQuestion.created_at ? formatDateOnly(viewingQuestion.created_at) : 'N/A'}</span>
                <span>Updated: {viewingQuestion.updated_at ? formatDateOnly(viewingQuestion.updated_at) : 'N/A'}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[var(--border-table)] flex items-center justify-between">
              <button
                onClick={() => {
                  const q = viewingQuestion;
                  setViewingQuestion(null);
                  openEditQuestionModal(q);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-all"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Question</span>
              </button>

              <button
                onClick={() => setViewingQuestion(null)}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- MODAL 4: DELETE CONFIRMATION ----------------- */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="theme-modal rounded-3xl w-full max-w-md p-6 border shadow-2xl space-y-4 animate-scale-up">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">
                Delete {confirmDelete.type === 'category' ? 'Category' : 'Question'}?
              </h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {confirmDelete.type === 'category'
                  ? `Are you sure you want to delete "${confirmDelete.item.name}"? This will also permanently delete all questions associated with this category.`
                  : `Are you sure you want to delete this question? This action cannot be undone.`}
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                disabled={formSubmitting}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 border border-[var(--border-input)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDelete}
                disabled={formSubmitting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-500/25 transition-all disabled:opacity-50"
              >
                {formSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionBank;
