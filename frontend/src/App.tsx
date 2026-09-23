import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardScreen } from './components/DashboardScreen';
import { UploadScreen } from './components/UploadScreen';
import { AuditsScreen } from './components/AuditsScreen';
import { AiSuggestionReviewScreen } from './components/AiSuggestionReviewScreen';
import { AuditLogReportScreen } from './components/AuditLogReportScreen';
import { SystemScreen } from './components/SystemScreen';
import { AuditWorkspace } from './components/AuditWorkspace';
import { LoginScreen } from './components/LoginScreen';
import { ReviewerDashboard } from './components/ReviewerDashboard';
import { UserIdentity, GlobalScreenId, AuditWorkspaceState, AuditWorkspaceTab } from './types';
import { getAccessToken, getCurrentUser, clearAccessToken, onUnauthorized, getModelStatus, getAuditResults } from './api';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserIdentity | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // Real Light + Dark Theme state with persistence
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('ntro_theme');
    if (saved === 'light' || saved === 'dark') return saved;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
    return 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(theme);
    localStorage.setItem('ntro_theme', theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Global Navigation State (separate from AuditWorkspaceState)
  const [currentScreen, setCurrentScreen] = useState<GlobalScreenId>('dashboard');

  // Contextual Audit Workspace State (null when in global navigation)
  const [auditWorkspace, setAuditWorkspace] = useState<AuditWorkspaceState | null>(null);
  const [lastWorkspaceTab, setLastWorkspaceTab] = useState<AuditWorkspaceTab>('overview');

  // Live model runtime status for top classification bar
  const [liveModelMode, setLiveModelMode] = useState<string>('auto');
  const [liveOllamaAlive, setLiveOllamaAlive] = useState<boolean>(true);

  // Active session and cached results
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [cachedResults, setCachedResults] = useState<any>(null);
  const [activeUnmappedLine, setActiveUnmappedLine] = useState<string>('service call-home');
  const [activeRemediationRuleId, setActiveRemediationRuleId] = useState<string>('CISCO-NTP-001');

  // Check existing session on mount & register 401 callback
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      const token = getAccessToken();
      if (!token) {
        if (isMounted) setAuthLoading(false);
        return;
      }
      try {
        const user = await getCurrentUser();
        if (isMounted) {
          setCurrentUser(user);
          // Set role-appropriate default landing screen
          setCurrentScreen('dashboard');
        }
        try {
          const modelStat = await getModelStatus();
          if (isMounted) {
            setLiveModelMode(modelStat.mode);
            setLiveOllamaAlive(modelStat.ollama_alive);
          }
        } catch {
          // Model status fetch failure is non-fatal for auth
        }
      } catch {
        clearAccessToken();
        if (isMounted) setCurrentUser(null);
      } finally {
        if (isMounted) setAuthLoading(false);
      }
    };

    initAuth();

    // Centralized 401 handler: immediately resets auth state without page reload
    const unsubscribe = onUnauthorized(() => {
      if (isMounted) {
        setCurrentUser(null);
        setActiveSessionId(null);
        setCachedResults(null);
        setAuditWorkspace(null);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Role-enforced global navigation handler
  const handleNavigate = (screen: GlobalScreenId) => {
    const role = currentUser?.role;

    // RBAC validation on navigation
    if (role === 'viewer') {
      if (screen !== 'dashboard' && screen !== 'audits' && screen !== 'reports') {
        setCurrentScreen('dashboard');
        setAuditWorkspace(null);
        return;
      }
    } else if (role === 'uploader') {
      if (screen === 'review_queue' || screen === 'system') {
        setCurrentScreen('dashboard');
        setAuditWorkspace(null);
        return;
      }
    }

    setAuditWorkspace(null);
    setCurrentScreen(screen);
  };

  const handleLoginSuccess = (user: UserIdentity) => {
    setCurrentUser(user);
    setCurrentScreen('dashboard');
    setAuditWorkspace(null);
    getModelStatus()
      .then((stat) => {
        setLiveModelMode(stat.mode);
        setLiveOllamaAlive(stat.ollama_alive);
      })
      .catch(() => {});
  };

  const handleLogout = () => {
    clearAccessToken();
    setCurrentUser(null);
    setActiveSessionId(null);
    setCachedResults(null);
    setAuditWorkspace(null);
    setCurrentScreen('dashboard');
  };

  // Upload completes -> opens contextual Audit Workspace on Results
  const handleAuditStarted = (sessionId: string, initialResults: any) => {
    setActiveSessionId(sessionId);
    setCachedResults(initialResults);
    setLastWorkspaceTab('results');
    setAuditWorkspace({
      sessionId,
      activeTab: 'results',
      unmappedLine: activeUnmappedLine,
      ruleId: activeRemediationRuleId
    });
  };

  // Open existing or recent audit from Dashboard or Audits table
  const handleOpenAudit = async (sessionId: string, initialTab: AuditWorkspaceTab = 'overview') => {
    setActiveSessionId(sessionId);
    setLastWorkspaceTab(initialTab);
    try {
      const results = await getAuditResults(sessionId);
      setCachedResults(results);
    } catch {
      // Keep existing cachedResults or allow component to handle error
    }
    setAuditWorkspace({
      sessionId,
      activeTab: initialTab,
      unmappedLine: activeUnmappedLine,
      ruleId: activeRemediationRuleId
    });
  };

  const handleWorkspaceTabChange = (tab: AuditWorkspaceTab) => {
    setLastWorkspaceTab(tab);
    setAuditWorkspace((prev) => {
      if (!prev) return null;
      return { ...prev, activeTab: tab };
    });
  };

  const handleExitWorkspace = (destination?: GlobalScreenId) => {
    if (destination) {
      handleNavigate(destination);
    } else {
      setAuditWorkspace(null);
    }
  };

  const handleApprovalCompleted = () => {
    setCachedResults(null);
    if (auditWorkspace) {
      setAuditWorkspace((prev) => (prev ? { ...prev, activeTab: 'results' } : null));
    }
  };

  const unmappedCount = cachedResults?.unmapped_lines?.length ?? 0;

  // Gate privileged interface while initializing
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center font-mono text-xs text-slate-400 space-y-3">
        <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
        <div>INITIALIZING OPERATOR SECURITY CONTEXT...</div>
      </div>
    );
  }

  // If unauthenticated, display the login screen
  if (!currentUser) {
    return (
      <LoginScreen
        onLoginSuccess={handleLoginSuccess}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />
    );
  }

  return (
    <div className="min-h-screen bg-app text-content-primary flex flex-col font-sans selection:bg-sky-500 selection:text-white transition-colors duration-150">
      {/* Top SOC Navigation Bar */}
      <Navbar
        currentScreen={currentScreen}
        onNavigate={handleNavigate}
        unmappedCount={unmappedCount}
        currentUser={currentUser}
        onLogout={handleLogout}
        modelMode={liveModelMode}
        ollamaAlive={liveOllamaAlive}
        activeSessionId={activeSessionId}
        isInWorkspace={auditWorkspace !== null}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onOpenWorkspace={() => {
          if (activeSessionId) {
            setAuditWorkspace({
              sessionId: activeSessionId,
              activeTab: lastWorkspaceTab,
              unmappedLine: activeUnmappedLine,
              ruleId: activeRemediationRuleId
            });
          }
        }}
        onExitWorkspace={handleExitWorkspace}
      />

      {/* Main Screen Content Body */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Contextual Audit Workspace View */}
        {auditWorkspace ? (
          <AuditWorkspace
            workspaceState={auditWorkspace}
            onTabChange={handleWorkspaceTabChange}
            onExitWorkspace={handleExitWorkspace}
            currentUser={currentUser}
            cachedResults={cachedResults}
            onSelectRemediationRule={(rId) => {
              setActiveRemediationRuleId(rId);
              setAuditWorkspace((prev) => (prev ? { ...prev, ruleId: rId } : null));
            }}
            onSelectUnmappedLine={(line) => {
              setActiveUnmappedLine(line);
              setAuditWorkspace((prev) => (prev ? { ...prev, unmappedLine: line } : null));
            }}
            onAuditFinalized={() => {}}
          />
        ) : (
          /* Global Navigation Views */
          <>
            {currentScreen === 'dashboard' && (
              <DashboardScreen
                currentUser={currentUser}
                onNavigate={handleNavigate}
                onOpenAudit={handleOpenAudit}
                unmappedCount={unmappedCount}
              />
            )}

            {currentScreen === 'upload' && currentUser.role !== 'viewer' && (
              <UploadScreen
                onAuditStarted={handleAuditStarted}
                onNavigateToLedger={() => handleNavigate('reports')}
                currentUser={currentUser}
              />
            )}

            {currentScreen === 'audits' && (
              <AuditsScreen
                currentUser={currentUser}
                onOpenAudit={handleOpenAudit}
                onNavigateToUpload={currentUser.role !== 'viewer' ? () => handleNavigate('upload') : undefined}
              />
            )}

            {currentScreen === 'review_queue' && currentUser.role === 'reviewer' && (
              <ReviewerDashboard
                currentUser={currentUser}
                onNavigate={handleNavigate}
                onOpenAudit={handleOpenAudit}
              />
            )}

            {currentScreen === 'reports' && (
              <AuditLogReportScreen currentUser={currentUser} />
            )}

            {currentScreen === 'system' && currentUser.role === 'reviewer' && (
              <SystemScreen currentUser={currentUser} />
            )}
          </>
        )}
      </main>

      {/* Footer Classification & Compliance Watermark */}
      <footer className="bg-slate-950 border-t border-slate-900 py-3 px-4 text-center font-mono text-[11px] text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <span>RESTRICTED // NTRO CYBER COMPLIANCE AUDITOR (SIH 2026)</span>
            <span className="mx-2 text-slate-700">•</span>
            <span>BACKEND: http://127.0.0.1:8000</span>
          </div>
          <div>
            <span>AIR-GAPPED COMPLIANT • ZERO DEVICE EXECUTION</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
