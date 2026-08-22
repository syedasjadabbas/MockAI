import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, History, LineChart, User, LogOut, Terminal, X, PlayCircle } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { logout } from '../services/candidateAuth';

const CandidateSidebar = ({ mobileOpen = false, setMobileOpen = () => {} }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isDark } = useTheme();

  const menuItems = [
    { title: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { title: 'Interview History', icon: History, path: '/history' },
    { title: 'Progress Tracking', icon: LineChart, path: '/progress' },
    { title: 'Profile', icon: User, path: '/profile' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
        />
      )}

      <aside className={`fixed inset-y-0 left-0 w-64 glass-panel border-r z-50 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-[var(--border-panel)]">
          <Link to="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/30 group-hover:scale-105 transition-transform">
              <Terminal className="w-5 h-5 text-indigo-500" />
            </div>
            <span className="font-extrabold text-xl tracking-tight grad-text">MockAI</span>
          </Link>
          <button onClick={() => setMobileOpen(false)} className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 pt-5">
          <Link
            to="/interview/goal"
            onClick={() => setMobileOpen(false)}
            className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-500/20 transition-all active:scale-[0.98]"
          >
            <PlayCircle className="w-4.5 h-4.5" />
            Start New Interview
          </Link>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? isDark
                      ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 shadow-sm shadow-indigo-500/10'
                      : 'bg-indigo-50 text-indigo-600 border border-indigo-200 shadow-sm'
                    : isDark
                      ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40'
                      : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-100'
                }`}
              >
                <item.icon className={`w-5 h-5 transition-colors ${
                  isActive ? (isDark ? 'text-indigo-400' : 'text-indigo-600') : (isDark ? 'text-slate-400' : 'text-slate-500')
                }`} />
                {item.title}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[var(--border-panel)]">
          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm font-semibold rounded-xl transition-all ${
              isDark ? 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/10' : 'text-slate-600 hover:text-rose-600 hover:bg-rose-50'
            }`}
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
};

export default CandidateSidebar;
