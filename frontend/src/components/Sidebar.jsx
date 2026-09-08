import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import logo from '../assets/logo.png';
import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  Award, 
  FileText, 
  LogOut, 
  Terminal,
  Shield,
  BookOpen,
  X
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { prefetch } from '../api';

const prefetchedItems = new Set();

const prefetchRouteData = (path) => {
  if (prefetchedItems.has(path)) return;
  prefetchedItems.add(path);

  switch (path) {
    case '/admin/dashboard':
      import('../pages/Dashboard');
      prefetch('/');
      prefetch('/interviews?limit=5');
      break;
    case '/admin/users':
      import('../pages/Users');
      prefetch('/users');
      break;
    case '/admin/interviews':
      import('../pages/Interviews');
      prefetch('/interviews');
      break;
    case '/admin/questions':
      import('../pages/QuestionBank');
      prefetch('/categories');
      prefetch('/questions');
      prefetch('/question-bank/stats');
      break;
    case '/admin/results':
      import('../pages/Results');
      prefetch('/results');
      break;
    case '/admin/logs':
      import('../pages/Logs');
      prefetch('/logs');
      break;
    case '/admin/admins':
      import('../pages/Admins');
      prefetch('/all-admins');
      break;
    default:
      break;
  }
};

const Sidebar = ({ mobileOpen = false, setMobileOpen = () => {} }) => {
  const location = useLocation();
  const { isDark } = useTheme();

  const menuItems = [
    { title: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
    { title: 'Users', icon: Users, path: '/admin/users' },
    { title: 'Interviews', icon: Briefcase, path: '/admin/interviews' },
    { title: 'Question Bank', icon: BookOpen, path: '/admin/questions' },
    { title: 'Results', icon: Award, path: '/admin/results' },
    { title: 'Logs', icon: FileText, path: '/admin/logs' },
    { title: 'Manage Admins', icon: Shield, path: '/admin/admins' },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div 
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
        />
      )}

      {/* Sidebar Panel */}
      <aside className={`fixed inset-y-0 left-0 w-64 glass-panel border-r z-50 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-[var(--border-panel)]">
          <Link 
            to="/admin/dashboard" 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} 
            className="flex items-center gap-2.5 group select-none hover:opacity-95 transition-opacity"
          >
            <img src={logo} alt="MockAI Logo" className="c-brand-logo group-hover:scale-105 transition-transform" />
            <span className="text-[10px] bg-orange-500/10 text-orange-400 font-bold px-1.5 py-0.5 rounded border border-orange-500/25">
              ADMIN
            </span>
          </Link>
          <button 
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                onMouseEnter={() => prefetchRouteData(item.path)}
                onFocus={() => prefetchRouteData(item.path)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isActive 
                    ? isDark
                      ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30 shadow-sm shadow-orange-500/10'
                      : 'bg-orange-50 text-orange-600 border border-orange-200 shadow-sm'
                    : isDark
                      ? 'text-neutral-400 hover:text-neutral-100 hover:bg-[#202020]'
                      : 'text-neutral-600 hover:text-orange-600 hover:bg-neutral-100'
                }`}
              >
                <item.icon className={`w-5 h-5 transition-colors ${
                  isActive 
                    ? isDark ? 'text-orange-400' : 'text-orange-600' 
                    : isDark ? 'text-neutral-400' : 'text-neutral-500'
                }`} />
                {item.title}
              </Link>
            );
          })}
        </nav>

        {/* Footer / Logout */}
        <div className="p-4 border-t border-[var(--border-panel)]">
          <button 
            onClick={() => {
              localStorage.removeItem('mockai_admin_auth');
              localStorage.removeItem('mockai_admin_token');
              window.location.href = '/admin/login';
            }} 
            className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm font-semibold rounded-xl transition-all ${
              isDark 
                ? 'text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10' 
                : 'text-neutral-600 hover:text-rose-600 hover:bg-rose-50'
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

export default Sidebar;
