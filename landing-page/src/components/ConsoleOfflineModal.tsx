import React, { useState } from 'react';
import { Terminal, X, AlertCircle, Copy, Check, RefreshCw, ArrowUpRight, HardDrive } from 'lucide-react';
import { useConsoleStatus } from '../context/ConsoleStatusContext';

export const ConsoleOfflineModal: React.FC = () => {
  const { isModalOpen, closeModal, checkNow } = useConsoleStatus();
  const [isChecking, setIsChecking] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  if (!isModalOpen) return null;

  const startScriptCmd = ".\\START.bat";
  const manualFrontendCmd = "npm run dev";
  const manualBackendCmd = "uvicorn src.main:app --port 8000";

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(text);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const handleRetry = async () => {
    setIsChecking(true);
    const online = await checkNow();
    setIsChecking(false);
    if (online) {
      closeModal();
      window.open('http://localhost:3000', '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 transition-all animate-in fade-in duration-200"
      onClick={closeModal}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={closeModal}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-3.5 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-amber-700 font-bold px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200">
                Port 3000 Offline
              </span>
              <span className="text-xs font-mono text-slate-400">Connection Not Detected</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 font-sans mt-1">
              Operational Console Not Running
            </h3>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-600 font-sans leading-relaxed mb-4">
          The presentation landing page is currently active on <span className="font-mono text-slate-800 font-semibold">port 3001</span>, 
          but the operational compliance prototype frontend has not been started on <span className="font-mono text-slate-800 font-semibold">http://localhost:3000</span>.
        </p>

        {/* How to Launch Section */}
        <div className="space-y-3 mb-5">
          <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-700">
            How to launch the local prototype:
          </div>

          {/* Option 1: One-Click START.bat */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-800 mb-1.5">
              <span className="flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-sky-600" />
                <span>Option A: Run One-Click Orchestrator</span>
              </span>
              <button
                onClick={() => handleCopy(startScriptCmd)}
                className="text-[11px] font-mono text-sky-600 hover:text-sky-800 flex items-center gap-1"
              >
                {copiedCmd === startScriptCmd ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span className="text-emerald-600 font-bold">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <div className="bg-slate-950 rounded-lg p-2 font-mono text-xs text-emerald-400 select-all">
              <code>{startScriptCmd}</code>
            </div>
            <div className="text-[10px] text-slate-500 font-sans mt-1">
              Launches both FastAPI backend (:8000) and React operator console (:3000).
            </div>
          </div>

          {/* Option B: Manual Frontend Launch */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-800 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-slate-600" />
                <span>Option B: Launch Frontend Separately</span>
              </span>
              <button
                onClick={() => handleCopy(manualFrontendCmd)}
                className="text-[11px] font-mono text-sky-600 hover:text-sky-800 flex items-center gap-1"
              >
                {copiedCmd === manualFrontendCmd ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span className="text-emerald-600 font-bold">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <div className="bg-slate-950 rounded-lg p-2 font-mono text-xs text-sky-300 select-all">
              <code>{manualFrontendCmd}</code>
            </div>
            <div className="text-[10px] text-slate-500 font-sans mt-1">
              Run inside the <code>frontend/</code> repository directory.
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <button
            onClick={closeModal}
            className="px-3.5 py-2 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            Dismiss
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRetry}
              disabled={isChecking}
              className="px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-1.5 shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin text-sky-600' : 'text-slate-500'}`} />
              <span>{isChecking ? 'Checking...' : 'Check Connection'}</span>
            </button>

            <a
              href="http://localhost:3000"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-all flex items-center gap-1 shadow-sm"
            >
              <span>Open Port 3000 Anyway</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
