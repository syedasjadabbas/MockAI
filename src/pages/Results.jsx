import React, { useState, useEffect } from 'react';
import { Award, ShieldAlert, Sparkles, AlertCircle } from 'lucide-react';
import { fetchWithAuth } from '../api';

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
  const [mappedResults, setMappedResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWithAuth('/interviews')
      .then(data => setMappedResults(data.map(r => {
        const hasScore = r.score !== null && r.score !== undefined;
        return {
          id: r._id.slice(-6).toUpperCase(),
          interviewId: r._id.slice(-6).toUpperCase(),
          user: r.candidate_name || 'Deleted User',
          overallScore: hasScore ? `${r.score}%` : '-',
          confidenceScore: hasScore && r.confidence != null ? `${r.confidence}%` : '-',
          stressIndicator: hasScore && r.stress ? r.stress : '-',
          date: r.created_at ? new Date(r.created_at).toISOString().split('T')[0] : '-'
        };
      }).sort((a, b) => new Date(b.date) - new Date(a.date))))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleExport = () => {
    const headers = ['Result ID', 'Interview ID', 'Candidate', 'Overall Score', 'Confidence Score', 'Stress Indicator', 'Date'];
    const csvContent = [
      headers.join(','),
      ...mappedResults.map(r => [
        `RES-${r.id}`,
        `INT-${r.interviewId}`,
        `"${r.user}"`,
        r.overallScore,
        r.confidenceScore,
        r.stressIndicator,
        r.date
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'mockai_evaluation_results.csv';
    link.click();
  };

  if (loading) return <div className="flex items-center justify-center h-full min-h-[400px]"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-white">Evaluation Results</h2>
        
        <div className="flex items-center gap-3">
          <button onClick={handleExport} className="px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 font-semibold text-sm transition-all border border-indigo-500/20 rounded-xl flex items-center gap-2">
            <Award className="w-4 h-4" />
            Export Scores
          </button>
        </div>
      </div>

      {/* Results Table */}
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
              {mappedResults.map((item, idx) => (
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
              {mappedResults.length === 0 && (
                <tr><td colSpan="7" className="py-8 text-center text-slate-400">No data available.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Results;
