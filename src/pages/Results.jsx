import React from 'react';
import { Award, ShieldAlert, Sparkles, AlertCircle } from 'lucide-react';

const mockResults = [
  { id: 'INT-3041', name: 'John Doe', score: 88, confidence: 92, stress: 'Low', date: 'Mar 15, 2026' },
  { id: 'INT-3040', name: 'Alice Freeman', score: 64, confidence: 58, stress: 'Medium', date: 'Mar 14, 2026' },
  { id: 'INT-3039', name: 'Robert Fox', score: 95, confidence: 98, stress: 'Low', date: 'Mar 13, 2026' },
  { id: 'INT-3038', name: 'James Wilson', score: 42, confidence: 60, stress: 'High', date: 'Mar 12, 2026' },
  { id: 'INT-3037', name: 'Emily Taylor', score: 79, confidence: 85, stress: 'Medium', date: 'Mar 10, 2026' },
];

const ScoreIndicator = ({ score }) => {
  let color = 'bg-rose-500/20 text-rose-400 border-rose-500/20';
  if (score >= 80) color = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20';
  else if (score >= 65) color = 'bg-amber-500/20 text-amber-400 border-amber-500/20';

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${color}`}>
      <Sparkles className="w-3.5 h-3.5" />
      {score}%
    </span>
  );
};

const Results = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-white">Evaluation Results</h2>
        
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 font-semibold text-sm transition-all border border-indigo-500/20 rounded-xl flex items-center gap-2">
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
                <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Interview ID</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Candidate</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Overall Score</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Confidence Score</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Stress Indicator</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Date</th>
              </tr>
            </thead>
            <tbody>
              {mockResults.map((item, idx) => (
                <tr key={idx} className="border-b border-slate-800/40 last:border-0 hover:bg-slate-800/10 transition-colors">
                  <td className="py-4 px-6 font-medium text-sm text-indigo-400">{item.id}</td>
                  <td className="py-4 px-6 font-semibold text-sm text-slate-200">{item.name}</td>
                  <td className="py-4 px-6">
                    <ScoreIndicator score={item.score} />
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 max-w-24 h-1.5 rounded-full bg-slate-800 border border-slate-700/60 overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${item.confidence}%` }}></div>
                      </div>
                      <span className="text-xs font-semibold text-slate-400">{item.confidence}%</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                      item.stress === 'Low' 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/10'
                        : item.stress === 'Medium'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/10'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/10'
                    }`}>
                      {item.stress === 'High' && <ShieldAlert className="w-3.5 h-3.5" />}
                      {item.stress === 'Medium' && <AlertCircle className="w-3.5 h-3.5" />}
                      {item.stress}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-slate-500 text-sm font-medium text-right">{item.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Results;
