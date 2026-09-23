import React, { useState } from 'react';
import { login } from '../api';
import { UserIdentity } from '../types';

interface LoginScreenProps {
  onLoginSuccess: (user: UserIdentity) => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, theme, onToggleTheme }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMessage('Please enter both operator ID / username and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await login(username.trim(), password);
      onLoginSuccess(response.user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const setDemoRole = (user: string) => {
    setUsername(user);
    setPassword('StrongPassword123!');
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-app text-content-primary flex flex-col justify-center items-center px-4 font-sans selection:bg-sky-500 selection:text-white pt-12 pb-8">
      {/* Classification banner */}
      <div className="fixed top-0 left-0 right-0 bg-slate-900 border-b border-slate-700 px-4 py-1.5 flex items-center justify-between text-xs text-slate-400 font-sans z-50">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span className="text-slate-300 font-semibold font-mono text-[11px]">SECURITY CLEARANCE: LEVEL-3 RESTRICTED ACCESS</span>
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-[11px] font-mono hidden sm:inline text-slate-400">SYSTEM: NTRO-CSM v4.2</span>
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className="p-1 px-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-[transform,background-color] duration-150 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/80 cursor-pointer flex items-center gap-1.5 text-[11px] font-sans"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? (
                <>
                  <span className="text-amber-400">☀</span>
                  <span className="hidden sm:inline">Light</span>
                </>
              ) : (
                <>
                  <span className="text-sky-400">☾</span>
                  <span className="hidden sm:inline">Dark</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="w-full max-w-md space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-slate-900 border border-slate-700 font-mono text-sky-400 font-bold text-lg shadow-md">
            NT
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100">
            Network Security Compliance Auditor
          </h1>
          <p className="text-xs text-slate-400">
            Deterministic Compliance Subsystem • Operator Authentication
          </p>
        </div>

        {/* Login Box */}
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 sm:p-8 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div
                role="alert"
                className="bg-rose-950/60 border border-rose-800 text-rose-200 text-xs rounded p-3 font-mono flex items-start space-x-2"
              >
                <span className="text-rose-400 font-bold shrink-0">FAIL:</span>
                <span className="flex-1">{errorMessage}</span>
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-xs font-sans text-slate-300 mb-1.5 font-medium">
                Operator Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                disabled={isLoading}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. secops_reviewer"
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100 font-mono focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none transition-colors disabled:opacity-50"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-sans text-slate-300 mb-1.5 font-medium">
                Authorization Credential / Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                disabled={isLoading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100 font-mono focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none transition-colors disabled:opacity-50"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 px-4 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-semibold transition-[transform,background-color,border-color,box-shadow] duration-150 ease-out active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/80 focus-visible:ring-offset-1 border border-sky-500 flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <span>Authenticate &amp; Access Console &rarr;</span>
              )}
            </button>
          </form>

          {/* Quick Select Operator Roles for Evaluation */}
          <div className="mt-6 pt-5 border-t border-slate-700 space-y-2.5">
            <div className="text-xs text-slate-400 font-medium text-center">
              Operator Role Presets (Click to autofill):
            </div>
            <div className="text-xs text-slate-500 text-center font-mono">
              Credential: <code className="text-sky-400 font-semibold">StrongPassword123!</code>
            </div>

            <div className="grid grid-cols-1 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setDemoRole('secops_reviewer')}
                className="w-full py-1.5 px-3 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded border border-slate-700 text-left flex items-center justify-between cursor-pointer transition-[transform,background-color,border-color] duration-150 ease-out active:scale-[0.99] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-500/80"
              >
                <span className="font-semibold text-sky-400 font-mono">secops_reviewer</span>
                <span className="text-[11px] text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-800 leading-none">
                  Reviewer + Approver
                </span>
              </button>

              <button
                type="button"
                onClick={() => setDemoRole('netadmin_uploader')}
                className="w-full py-1.5 px-3 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded border border-slate-700 text-left flex items-center justify-between cursor-pointer transition-[transform,background-color,border-color] duration-150 ease-out active:scale-[0.99] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-500/80"
              >
                <span className="font-semibold text-sky-400 font-mono">netadmin_uploader</span>
                <span className="text-[11px] text-sky-300 px-1.5 py-0.5 rounded bg-sky-950/60 border border-sky-800 leading-none">
                  Uploader
                </span>
              </button>

              <button
                type="button"
                onClick={() => setDemoRole('auditor_viewer')}
                className="w-full py-1.5 px-3 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded border border-slate-700 text-left flex items-center justify-between cursor-pointer transition-[transform,background-color,border-color] duration-150 ease-out active:scale-[0.99] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-500/80"
              >
                <span className="font-semibold text-sky-400 font-mono">auditor_viewer</span>
                <span className="text-[11px] text-slate-400 px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 leading-none">
                  Viewer (Read-Only)
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Security watermark footer */}
        <div className="text-center font-mono text-xs text-slate-500">
          AIR-GAPPED COMPLIANT • DETERMINISTIC ZERO SUBPROCESS ENGINE
        </div>
      </div>
    </div>
  );
};
export default LoginScreen;
