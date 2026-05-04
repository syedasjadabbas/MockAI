import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  Award, 
  FileText, 
  LogOut, 
  Terminal 
} from 'lucide-react';

const Sidebar = () => {
  const location = useLocation();

  const menuItems = [
    { title: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
    { title: 'Users', icon: Users, path: '/admin/users' },
    { title: 'Interviews', icon: Briefcase, path: '/admin/interviews' },
    { title: 'Results', icon: Award, path: '/admin/results' },
    { title: 'Logs', icon: FileText, path: '/admin/logs' },
  ];

  return (
    <aside className="fixed inset-y-0 left-0 w-64 glass-panel border-r border-slate-800/40 z-50 flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800/40">
        <div className="flex items-center gap-2">
          <Terminal className="w-8 h-8 text-indigo-500" />
          <span className="font-bold text-xl tracking-tight text-white grad-text">MockAI</span>
          <span className="text-[10px] bg-indigo-500/10 text-indigo-400 font-medium px-1.5 py-0.5 rounded border border-indigo-500/20">ADMIN</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-6 px-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive 
                  ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' 
                  : 'text-slate-400 hover:text-indigo-400 hover:bg-slate-800/30'
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
              {item.title}
            </Link>
          );
        })}
      </nav>

      {/* Footer / Logout */}
      <div className="p-4 border-t border-slate-800/40">
        <button onClick={() => {
          localStorage.removeItem('mockai_admin_auth');
          localStorage.removeItem('mockai_admin_token');
          window.location.href = '/admin/login';
        }} className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/5 rounded-xl transition-all">
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
