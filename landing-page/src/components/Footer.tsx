import React from 'react';
import { Shield, Lock, Terminal, ExternalLink, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { verifiedFacts } from '../data/productFacts';
import { useConsoleStatus } from '../context/ConsoleStatusContext';

export const Footer: React.FC = () => {
  const { isOnline, openConsoleOrModal } = useConsoleStatus();
  return (
    <footer className="border-t border-slate-800 bg-slate-950 text-slate-400 text-xs font-mono">
      {/* Upper Footer Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          {/* Identity & Mission Context */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-sky-400 font-mono font-bold text-sm shadow-inner">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <span className="font-mono font-bold text-white text-sm tracking-wider block">
                  NTRO PS26155 COMPLIANCE AUDITOR
                </span>
                <span className="text-[11px] text-slate-400 font-sans">
                  Sovereign Network Security Evaluation Platform
                </span>
              </div>
            </div>

            <p className="text-slate-400 text-xs leading-relaxed max-w-md font-sans">
              Engineered for the National Technical Research Organisation (NTRO) under Problem Statement PS26155.
              Provides deterministic compliance evaluation and cryptographic non-repudiation for heterogeneous enterprise and telecommunications networks.
            </p>

            <div className="flex flex-wrap gap-2 pt-2 text-[11px] font-mono">
              <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-1.5 shadow-sm">
                <Lock className="w-3 h-3 text-emerald-400" />
                Air-Gapped Sovereign
              </span>
              <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-1.5 shadow-sm">
                <Shield className="w-3 h-3 text-sky-400" />
                Deterministic Core
              </span>
              <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-1.5 shadow-sm">
                <Terminal className="w-3 h-3 text-slate-400" />
                SHA-256 Ledger
              </span>
            </div>
          </div>

          {/* Architecture & Pipeline Deep-Links */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-white text-xs font-bold uppercase tracking-wider font-mono">
              Architecture & Proof
            </h4>
            <ul className="space-y-2 text-slate-400 text-xs font-sans">
              <li>
                <a href="#architecture" className="hover:text-sky-300 transition-colors">
                  Archify Interactive Architecture
                </a>
              </li>
              <li>
                <a href="#pipeline-workflow" className="hover:text-sky-300 transition-colors">
                  7-Layer Verification Pipeline
                </a>
              </li>
              <li>
                <a href="#ai-governance" className="hover:text-sky-300 transition-colors">
                  Human-in-the-Loop Disambiguation
                </a>
              </li>
              <li>
                <a href="#multi-vendor" className="hover:text-sky-300 transition-colors">
                  Multi-Vendor CSM Normalization
                </a>
              </li>
              <li>
                <a href="#technical-evidence" className="hover:text-sky-300 transition-colors">
                  SHA-256 Tamper Simulation
                </a>
              </li>
              <li>
                <a href="#knowledge-graph" className="hover:text-sky-300 transition-colors">
                  Graphify AST Graph (6,364 Nodes)
                </a>
              </li>
            </ul>
          </div>

          {/* Operational Access & Dossier */}
          <div className="md:col-span-4 space-y-3">
            <h4 className="text-white text-xs font-bold uppercase tracking-wider font-mono">
              System Verification Endpoints
            </h4>
            <ul className="space-y-2.5 text-slate-400 text-xs font-sans">
              <li>
                <button
                  onClick={openConsoleOrModal}
                  className="w-full hover:text-sky-300 transition-colors flex items-center justify-between group p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-left cursor-pointer"
                  title={isOnline ? "Operational console is active on port 3000" : "Operational console offline — click for instructions"}
                >
                  <span className="flex items-center gap-2 font-mono text-[11px]">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      isOnline === true 
                        ? 'bg-emerald-400 animate-pulse' 
                        : isOnline === false 
                        ? 'bg-amber-400' 
                        : 'bg-slate-400'
                    }`} />
                    <Terminal className="w-3.5 h-3.5 text-sky-400" />
                    <span className="text-slate-200">Live Audit Console (:3000)</span>
                  </span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </button>
              </li>
              <li>
                <a
                  href="http://localhost:8000/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-sky-300 transition-colors flex items-center justify-between group p-2.5 rounded-lg bg-slate-900 border border-slate-800"
                >
                  <span className="flex items-center gap-2 font-mono text-[11px]">
                    <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-slate-200">FastAPI OpenAPI Spec (:8000/docs)</span>
                  </span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </a>
              </li>
              <li>
                <a
                  href="#download"
                  className="text-slate-400 hover:text-sky-300 transition-colors block text-[11px] font-mono pt-1"
                >
                  → Standalone Offline Distribution (8.47 GB · SHA-256)
                </a>
              </li>
              <li>
                <a
                  href="#documentation"
                  className="text-slate-400 hover:text-sky-300 transition-colors block text-[11px] font-mono"
                >
                  → Architecture Decision Records (ADR-001 to ADR-007)
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Baseline Bottom Bar: Cryptographic & Integrity Stamp */}
      <div className="border-t border-slate-900 bg-black/50 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-slate-400">
          <div>
            Smart India Hackathon (SIH) 2026 — Team NextGen | Problem Statement: NTRO PS26155
          </div>
          <div className="flex flex-wrap items-center gap-4 text-slate-400">
            <span>Core: v1.0.0</span>
            <span>•</span>
            <span>Controls: {verifiedFacts.metrics.verifiedControls} across {verifiedFacts.metrics.registeredFrameworks} Frameworks</span>
            <span>•</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>780+ Tests Passing</span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
