import React from 'react';
import { Bell, Search, User } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const Header = () => {
  const location = useLocation();
  
  const getPageTitle = (path) => {
    switch(path) {
      case '/admin/dashboard': return 'Dashboard';
      case '/admin/users': return 'Manage Users';
      case '/admin/interviews': return 'Interviews';
      case '/admin/results': return 'Evaluation Results';
      case '/admin/logs': return 'Action Logs';
      default: return 'Admin Panel';
    }
  };

  return (
    <header className="fixed top-0 right-0 left-64 h-16 glass-panel border-b border-slate-800/40 z-40 px-6 flex items-center justify-between">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-white">{getPageTitle(location.pathname)}</h1>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search everything..." 
            onKeyDown={(e) => { if(e.key === 'Enter') alert(`Searching for: ${e.target.value}`) }}
            className="pl-10 pr-4 py-1.5 rounded-lg bg-slate-900/40 border border-slate-800/40 text-slate-200 text-sm focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20 w-60"
          />
        </div>

        {/* Notif */}
        <button onClick={() => alert("You have 3 new notifications!")} className="relative w-9 h-9 flex items-center justify-center rounded-lg bg-slate-800/30 text-slate-400 hover:text-white border border-slate-800/40 hover:border-slate-700/60 transition-all">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
        </button>

        {/* Profile */}
        <div className="flex items-center gap-3 pl-2 border-l border-slate-800/60">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
            <User className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-semibold text-slate-200">Admin User</p>
            <p className="text-[11px] text-slate-400">Super Admin</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
