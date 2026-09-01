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
            <span className="text-[10px] bg-indigo-500/10 text-indigo-500 font-bold px-1.5 py-0.5 rounded border border-indigo-500/20">
              ADMIN
            </span>
          </Link>
          <button 
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-200"
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
                  isActive 
                    ? isDark ? 'text-indigo-400' : 'text-indigo-600' 
                    : isDark ? 'text-slate-400' : 'text-slate-500'
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
                ? 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/10' 
                : 'text-slate-600 hover:text-rose-600 hover:bg-rose-50'
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
