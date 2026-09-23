import React from 'react';
import { UserIdentity, GlobalScreenId } from '../types';

interface NavbarProps {
  currentScreen: GlobalScreenId;
  onNavigate: (screen: GlobalScreenId) => void;
  unmappedCount?: number;
  currentUser?: UserIdentity | null;
  onLogout?: () => void;
  modelMode?: string;
  ollamaAlive?: boolean;
  activeSessionId?: string | null;
  isInWorkspace?: boolean;
  onOpenWorkspace?: () => void;
  onExitWorkspace?: () => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentScreen,
  onNavigate,
  unmappedCount = 0,
  currentUser,
  onLogout,
  modelMode = 'auto',
  ollamaAlive = true,
  activeSessionId = null,
  isInWorkspace = false,
  onOpenWorkspace,
  onExitWorkspace,
  theme = 'dark',
  onToggleTheme
}) => {
  const username = currentUser?.username || 'Operator';
  const role = currentUser?.role || 'viewer';
  const isApprover = currentUser?.is_authorized_approver;

  // Role-based navigation tabs definition
  const getNavItems = (): Array<{ id: GlobalScreenId; label: string; badge?: number }> => {
    switch (role) {
      case 'viewer':
        return [
          { id: 'dashboard', label: 'Dashboard' },
          { id: 'audits', label: 'Audits' },
          { id: 'reports', label: 'Reports' },
        ];
      case 'uploader':
        return [
          { id: 'dashboard', label: 'Dashboard' },
          { id: 'audits', label: 'My Audits' },
          { id: 'upload', label: 'Upload Config' },
          { id: 'reports', label: 'Reports' },
        ];
      case 'reviewer':
        return [
          { id: 'dashboard', label: 'Dashboard' },
          { id: 'audits', label: 'All Audits' },
          { id: 'upload', label: 'Upload Config' },
          { id: 'review_queue', label: 'Review Queue', badge: unmappedCount },
          { id: 'reports', label: 'Reports' },
          { id: 'system', label: 'System' },
        ];
      default:
        return [
          { id: 'dashboard', label: 'Dashboard' },
          { id: 'audits', label: 'Audits' },
          { id: 'reports', label: 'Reports' },
        ];
    }
  };

  const navItems = getNavItems();

  return (
    <header className="bg-slate-900 border-b border-slate-700 text-slate-100 font-sans sticky top-0 z-50 transition-colors shadow-xs">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* LEFT: Product Identity & Primary Global Navigation */}
          <div className="flex items-center gap-4 sm:gap-6 min-w-0">
            {/* Brand Identity */}
            <div
              className="flex items-center space-x-2.5 cursor-pointer hover:opacity-90 active:scale-[0.99] transition-[transform,opacity] duration-150 ease-out shrink-0"
              onClick={() => {
                if (isInWorkspace && onExitWorkspace) onExitWorkspace();
                onNavigate('dashboard');
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  if (isInWorkspace && onExitWorkspace) onExitWorkspace();
                  onNavigate('dashboard');
                }
              }}
              title="Return to Reviewer Dashboard"
            >
              <div className="flex items-center justify-center w-7 h-7 rounded-md bg-sky-500/10 border border-sky-500/30 text-sky-400 font-mono font-bold text-xs shadow-xs">
                NT
              </div>
              <div className="hidden sm:block leading-tight">
                <div className="text-xs font-bold tracking-tight text-slate-100">
                  Compliance Auditor
                </div>
                <div className="text-[10px] text-slate-400 font-medium">
                  Deterministic Engine
                </div>
              </div>
            </div>

            {/* Subtle Divider */}
            <div className="hidden md:block h-5 w-px bg-slate-700/80"></div>

            {/* Primary Global Navigation Tabs */}
            <nav className="flex items-center space-x-1 font-sans text-xs" aria-label="Global Application Navigation">
              {navItems.map((item) => {
                const isActive = !isInWorkspace && currentScreen === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (isInWorkspace && onExitWorkspace) {
                        onExitWorkspace();
                      }
                      onNavigate(item.id);
                    }}
                    className={`px-2.5 py-1.5 rounded-md transition-[transform,background-color,color,border-color] duration-150 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/80 flex items-center gap-1.5 cursor-pointer font-medium text-xs whitespace-nowrap ${
                      isActive
                        ? 'bg-slate-800 text-sky-400 border border-slate-700 shadow-xs font-semibold'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                    }`}
                  >
                    <span>{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-700 font-bold leading-none">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* RIGHT: Workspace Context & Session Controls */}
          <div className="flex items-center gap-2 sm:gap-2.5 text-xs shrink-0">
            {/* Contextual Active Workspace Status / Quick Jump */}
            {activeSessionId && (
              <div className="flex items-center">
                {isInWorkspace ? (
                  <div className="px-2 py-1 rounded bg-sky-950/40 text-sky-300 border border-sky-600/40 text-[11px] font-mono flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse"></span>
                    <span className="hidden md:inline font-sans text-slate-300 font-medium">Session:</span>
                    <code className="text-sky-300 font-semibold">{activeSessionId.substring(0, 8)}</code>
                  </div>
                ) : (
                  <button
                    onClick={onOpenWorkspace}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 text-xs font-medium transition-[transform,background-color,border-color] duration-150 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/80 flex items-center gap-1.5 cursor-pointer"
                    title={`Resume active audit workspace (${activeSessionId})`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
                    <span>Resume Audit</span>
                    <code className="font-mono text-[10px] text-sky-300">({activeSessionId.substring(0, 8)})</code>
                    <span>&rarr;</span>
                  </button>
                )}
              </div>
            )}

            {/* AI Runtime Status Indicator (Compact) */}
            {role === 'reviewer' ? (
              <button
                onClick={() => {
                  if (isInWorkspace && onExitWorkspace) onExitWorkspace();
                  onNavigate('system');
                }}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 font-mono text-[11px] text-slate-300 transition-[transform,background-color,border-color] duration-150 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/80 flex items-center gap-1.5 cursor-pointer"
                title="AI Runtime status (Click to open System)"
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    ollamaAlive ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                ></span>
                <span className="hidden sm:inline text-slate-400">AI:</span>
                <span className="font-semibold text-slate-200">{ollamaAlive ? modelMode.toUpperCase() : 'OFFLINE'}</span>
              </button>
            ) : (
              <div
                className="px-2 py-1 rounded bg-slate-800 border border-slate-700 font-mono text-[11px] text-slate-300 flex items-center gap-1.5"
                title="AI Runtime status"
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    ollamaAlive ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                ></span>
                <span className="hidden sm:inline text-slate-400">AI:</span>
                <span className="font-semibold text-slate-200">{ollamaAlive ? modelMode.toUpperCase() : 'OFFLINE'}</span>
              </div>
            )}

            {/* Operator Identity Badge */}
            <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-xs font-mono">
              <span className="text-slate-200 font-semibold">{username}</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold border leading-none ${
                  isApprover
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                    : 'bg-slate-700 text-slate-300 border-slate-600'
                }`}
              >
                {isApprover ? 'Approver' : role}
              </span>
            </div>

            {/* Theme Toggle Button */}
            {onToggleTheme && (
              <button
                onClick={onToggleTheme}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium transition-[transform,background-color,border-color,color] duration-150 ease-out active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/80 cursor-pointer flex items-center gap-1 shadow-xs"
                title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} theme`}
                aria-label={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} theme`}
              >
                <span>{theme === 'dark' ? '☼' : '☾'}</span>
                <span className="hidden sm:inline">{theme === 'dark' ? 'Light' : 'Dark'}</span>
              </button>
            )}

            {/* Logout Button */}
            {onLogout && (
              <button
                onClick={onLogout}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-rose-950/80 hover:text-rose-300 hover:border-rose-700 border border-slate-700 text-slate-300 text-xs font-medium transition-[transform,background-color,color,border-color] duration-150 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/80 cursor-pointer shadow-xs"
                title="End session and return to login"
              >
                Logout
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
