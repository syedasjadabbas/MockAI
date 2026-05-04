import React, { useState, useEffect, useMemo } from 'react';
import { Award, ShieldAlert, Sparkles, AlertCircle, Search, Filter } from 'lucide-react';
import { fetchWithAuth } from '../api';
import { useLocation } from 'react-router-dom';
import { exportToCSV } from '../utils/csvExport';

const ScoreIndicator = ({ scoreStr }) => {
  if (!scoreStr || scoreStr === '-') return <span className="text-slate-500 font-medium text-xs">-</span>;
  
  const score = parseInt(scoreStr.replace('%', ''));
  if (score < 60) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border bg-red-500/20 text-red-400 border-red-500/20">
        <AlertCircle className="w-3.5 h-3.5" />
        Needs Improvement ({score}%)
      </span>
    );
  }

  let color = 'bg-amber-500/20 text-amber-400 border-amber-500/20';
  if (score >= 80) color = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20';

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${color}`}>
      <Sparkles className="w-3.5 h-3.5" />
      {score}%
    </span>
  );
};

const Results = () => {
  const location = useLocation();
  const [mappedResults, setMappedResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(() => new URLSearchParams(location.search).get('search') || '');
  const [scoreFilter, setScoreFilter] = useState('All Scores');

  useEffect(() => {
    const query = new URLSearchParams(location.search).get('search');
    if (query !== null) setSearch(query);
  }, [location.search]);

  useEffect(() => {
    fetchWithAuth('/interviews')
      .then(data => {
        setMappedResults(data.map(r => {
          const hasScore = r.score !== null && r.score !== undefined;
          return {
            id: r._id.slice(-6).toUpperCase(),
            interviewId: r._id.slice(-6).toUpperCase(),
            user: r.candidate_name || 'Deleted User',
            overallScore: hasScore ? `${r.score}%` : '-',
            scoreValue: hasScore ? r.score : null,
            confidenceScore: hasScore && r.confidence != null ? `${r.confidence}%` : '-',
            stressIndicator: hasScore && r.stress ? r.stress : '-',
            date: r.created_at ? new Date(r.created_at).toISOString().split('T')[0] : '-'
          };
        }).sort((a, b) => {
          if (a.date === '-' && b.date === '-') return 0;
          if (a.date === '-') return 1;
          if (b.date === '-') return -1;
          return new Date(b.date) - new Date(a.date);
        }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredResults = mappedResults.filter(item => {
    const matchSearch = search ? (
      (item.user && item.user.toLowerCase().includes(search.toLowerCase())) ||
      (item.interviewId && item.interviewId.toLowerCase().includes(search.toLowerCase()))
    ) : true;

    let matchScore = true;
    if (scoreFilter === 'High') matchScore = item.scoreValue >= 80;
    else if (scoreFilter === 'Medium') matchScore = item.scoreValue >= 60 && item.scoreValue < 80;
    else if (scoreFilter === 'Low') matchScore = item.scoreValue < 60 && item.scoreValue !== null;
    else if (scoreFilter === 'Not Evaluated') matchScore = item.scoreValue === null;

    return matchSearch && matchScore;
  });

  const insightData = useMemo(() => {
    const completed = mappedResults.filter(r => r.scoreValue !== null);
    const totalCompleted = completed.length;
    
    if (totalCompleted === 0) {
      return { avg: 0, highPct: 0, lowPct: 0, empty: true };
    }
    
    const avg = Math.round(completed.reduce((a, b) => a + b.scoreValue, 0) / totalCompleted);
    const high = completed.filter(r => r.scoreValue >= 80).length;
    const low = completed.filter(r => r.scoreValue < 60).length;
    
    return {
      avg,
      highPct: Math.round((high / totalCompleted) * 100),
      lowPct: Math.round((low / totalCompleted) * 100),
      empty: false
    };
  }, [mappedResults]);

  const topPerformers = useMemo(() => {
    return [...mappedResults]
      .filter(r => r.scoreValue !== null)
      .sort((a, b) => b.scoreValue - a.scoreValue)
      .slice(0, 3);
  }, [mappedResults]);

  const lowPerformers = useMemo(() => {
    return [...mappedResults]
      .filter(r => r.scoreValue !== null)
      .sort((a, b) => a.scoreValue - b.scoreValue)
      .slice(0, 3);
  }, [mappedResults]);

  const handleExport = () => {
    const dataToExport = filteredResults.map(r => ({
      'Result ID': `RES-${r.id}`,
      'Interview ID': `INT-${r.interviewId}`,
      Candidate: r.user,
      'Overall Score': r.overallScore,
      'Confidence Score': r.confidenceScore,
      'Stress Indicator': r.stressIndicator,
      Date: r.date
    }));
    exportToCSV(dataToExport, 'mockai_evaluation_results.csv');
  };

  if (loading) return <div className="flex items-center justify-center h-full min-h-[400px]"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-white">Evaluation Results</h2>
        
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative w-full md:w-48">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search candidate or ID..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900/40 border border-slate-800/40 text-slate-200 text-sm focus:outline-none focus:border-indigo-500/40"
            />
          </div>
          
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-900/40 border border-slate-800/40 rounded-xl">
            <Filter className="w-4 h-4 text-slate-400" />
            <select 
              value={scoreFilter}
              onChange={(e) => setScoreFilter(e.target.value)}
              className="bg-transparent text-sm text-slate-300 focus:outline-none"
            >
              <option value="All Scores">All Scores</option>
              <option value="High">High (&ge; 80)</option>
              <option value="Medium">Medium (60-79)</option>
              <option value="Low">Low (&lt; 60)</option>
              <option value="Not Evaluated">Not Evaluated</option>
            </select>
          </div>

          <button onClick={handleExport} className="px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 font-semibold text-sm transition-all border border-indigo-500/20 rounded-xl flex items-center gap-2 whitespace-nowrap">
            <Award className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Mini Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-4 rounded-xl flex items-center justify-between border border-slate-800/40">
          <span className="text-sm text-slate-400 font-medium">Average Score</span>
          <span className="text-xl font-bold text-white">{insightData.empty ? '-' : `${insightData.avg}%`}</span>
        </div>
        <div className="glass-card p-4 rounded-xl flex items-center justify-between border border-emerald-500/10 bg-emerald-500/5">
          <span className="text-sm text-emerald-400/80 font-medium">High Performers</span>
          <span className="text-xl font-bold text-emerald-400">{insightData.empty ? '-' : `${insightData.highPct}%`}</span>
        </div>
        <div className="glass-card p-4 rounded-xl flex items-center justify-between border border-rose-500/10 bg-rose-500/5">
          <span className="text-sm text-rose-400/80 font-medium">Low Performers</span>
          <span className="text-xl font-bold text-rose-400">{insightData.empty ? '-' : `${insightData.lowPct}%`}</span>
        </div>
      </div>

      {/* Overall Performance Insight */}
      <div className="glass-card p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 flex items-center justify-between">
        <span className="text-sm font-semibold text-indigo-300">Overall Performance Insight</span>
        <span className="text-sm font-medium text-slate-200">
          {insightData.empty 
            ? "No completed interviews yet" 
            : insightData.avg >= 80 
              ? "Overall performance is strong" 
              : insightData.avg >= 60 
                ? "Overall performance is moderate" 
                : "Overall performance needs improvement"}
        </span>
      </div>

      {/* Top & Low Performers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card p-4 rounded-xl border border-slate-800/40">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Top Performers</h3>
          <div className="space-y-2">
            {topPerformers.length === 0 ? <p className="text-xs text-slate-500">No data available</p> : topPerformers.map((p, i) => (
              <div key={i} className="flex justify-between items-center text-sm">
                <span className="text-slate-400">{p.user}</span>
                <span className="font-semibold text-emerald-400">{p.scoreValue}%</span>
              </div>
            ))}
          </div>
        </div>
        <div className="glass-card p-4 rounded-xl border border-slate-800/40">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Low Performers</h3>
          <div className="space-y-2">
            {lowPerformers.length === 0 ? <p className="text-xs text-slate-500">No data available</p> : lowPerformers.map((p, i) => (
              <div key={i} className="flex justify-between items-center text-sm">
                <span className="text-slate-400">{p.user}</span>
                <span className="font-semibold text-rose-400">{p.scoreValue}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="mb-2 text-right">
        <span className="text-xs text-slate-500 font-medium">* Scores are shown only for completed interviews</span>
      </div>
      <div className="glass-card rounded-2xl border border-slate-800/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/60 bg-slate-800/20">
                <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Result ID</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Interview ID</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Candidate</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Overall Score</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Confidence Score</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Stress Indicator</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredResults.map((item, idx) => (
                <tr key={idx} className="border-b border-slate-800/40 last:border-0 hover:bg-slate-800/10 transition-colors">
                  <td className="py-4 px-6 font-medium text-sm text-indigo-400">RES-{item.id}</td>
                  <td className="py-4 px-6 font-medium text-sm text-slate-400">INT-{item.interviewId}</td>
                  <td className="py-4 px-6 font-semibold text-sm text-slate-200">{item.user}</td>
                  <td className="py-4 px-6">
                    <ScoreIndicator scoreStr={item.overallScore} />
                  </td>
                  <td className="py-4 px-6">
                    {item.confidenceScore !== '-' ? (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 max-w-24 h-1.5 rounded-full bg-slate-800 border border-slate-700/60 overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: item.confidenceScore }}></div>
                        </div>
                        <span className="text-xs font-semibold text-slate-400">{item.confidenceScore}</span>
                      </div>
                    ) : (
                      <span className="text-slate-500 font-medium text-xs">-</span>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    {item.stressIndicator !== '-' ? (
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                        item.stressIndicator === 'Low' 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/10'
                          : item.stressIndicator === 'Medium'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/10'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/10'
                      }`}>
                        {item.stressIndicator === 'High' && <ShieldAlert className="w-3.5 h-3.5" />}
                        {item.stressIndicator === 'Medium' && <AlertCircle className="w-3.5 h-3.5" />}
                        {item.stressIndicator}
                      </span>
                    ) : (
                      <span className="text-slate-500 font-medium text-xs">-</span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-slate-500 text-sm font-medium text-right">{item.date}</td>
                </tr>
              ))}
              {filteredResults.length === 0 && (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400">
                    {search.trim() ? `No results found for "${search.trim()}"` : 'No data available.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Results;
