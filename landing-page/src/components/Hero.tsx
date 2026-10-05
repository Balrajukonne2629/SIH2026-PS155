import React from 'react';
import { ArrowRight, ShieldCheck, Download, FileText, CheckCircle2, Lock, Cpu, Database, ChevronRight, Terminal } from 'lucide-react';
import { PRODUCT_FACTS } from '../data/productFacts';
import { useConsoleStatus } from '../context/ConsoleStatusContext';

export const Hero: React.FC = () => {
  const { isOnline, openConsoleOrModal } = useConsoleStatus();
  return (
    <section id="overview" className="relative pt-28 pb-20 md:pt-36 md:pb-28 overflow-hidden border-b border-slate-200 bg-gradient-to-b from-white via-slate-50 to-white">
      {/* Background Architectural Canvas & Subtle Radial Glow */}
      <div 
        className="absolute inset-0 bg-tech-grid opacity-60 pointer-events-none"
      />
      <div 
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-sky-200/40 rounded-full blur-[140px] pointer-events-none"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* System Presentation Orientation Header */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 text-xs font-mono shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-900 font-bold">{PRODUCT_FACTS.projectTitle}</span>
            <span className="text-slate-300">·</span>
            <span className="text-sky-700 font-semibold">Official Product Architecture Dossier</span>
            <span className="text-slate-300">·</span>
            <span className="text-slate-500 hidden sm:inline">{PRODUCT_FACTS.classification}</span>
          </div>

          <button
            onClick={openConsoleOrModal}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white hover:bg-slate-50 text-xs font-mono text-slate-700 hover:text-sky-700 border border-slate-200 transition-all shadow-sm group cursor-pointer"
            title={isOnline ? "Operational console is active on port 3000" : "Operational console offline — click for instructions"}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${
              isOnline === true 
                ? 'bg-emerald-500 animate-pulse' 
                : isOnline === false 
                ? 'bg-amber-400' 
                : 'bg-slate-300'
            }`} />
            <span>Live Audit Console (:3000)</span>
            <ChevronRight className="w-3.5 h-3.5 text-sky-600 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Primary Statement */}
        <div className="max-w-4xl">
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold font-display tracking-tight text-slate-900 leading-[1.12]">
            Deterministic Network Security Compliance for Heterogeneous Critical Network Infrastructure
          </h1>
          <p className="mt-6 text-base sm:text-lg text-slate-600 leading-relaxed font-sans max-w-3xl">
            An offline-first evaluation platform engineered for heterogeneous enterprise and telecommunications networks. 
            Audits multi-vendor configurations across CIS Benchmarks, DISA-STIG, NIST SP 800-53, and ISO/IEC 27001 
            with deterministic sub-millisecond evaluation speed and cryptographic non-repudiation.
          </p>
        </div>

        {/* Invariant Axiom Banner */}
        <div className="mt-8 p-4 sm:p-5 rounded-xl bg-white border border-slate-200 shadow-md max-w-3xl relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-sky-600" />
          <div className="flex items-start sm:items-center justify-between gap-4">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-sky-700 font-semibold flex items-center gap-1.5 mb-1">
                <span>Core Architectural Principle</span>
              </div>
              <p className="text-sm sm:text-base font-mono text-slate-900 font-bold">
                AI assists. Humans approve. Deterministic rules decide.
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Zero generative hallucinations in compliance verdicts. Never touches live hardware without operator sign-off.
              </p>
            </div>
            <div className="hidden md:flex flex-col items-end shrink-0 text-right">
              <span className="text-[10px] font-mono text-slate-500 uppercase">Rule Latency</span>
              <span className="text-xs font-mono font-bold text-emerald-600">0.065 ms</span>
            </div>
          </div>
        </div>

        {/* Primary Action Row with Strict Hierarchy */}
        <div className="mt-10 flex flex-wrap items-center gap-3.5">
          <a
            href="#architecture"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold font-sans transition-all duration-200 shadow-md shadow-sky-600/20 hover:-translate-y-0.5"
          >
            <span>Explore Architecture</span>
            <ChevronRight className="w-4 h-4 text-sky-100" />
          </a>
          <a
            href="#technical-evidence"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-medium border border-slate-300 transition-all duration-200 shadow-sm hover:-translate-y-0.5"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Cryptographic Proof & Latency</span>
          </a>
          <a
            href="#knowledge-graph"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-medium border border-slate-300 transition-all duration-200 shadow-sm hover:-translate-y-0.5"
          >
            <Cpu className="w-4 h-4 text-sky-600" />
            <span>Graphify Topology (2,744)</span>
          </a>
          <a
            href="#download"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 text-xs font-medium border border-slate-300 transition-all duration-200"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Package (.sha256)</span>
          </a>
        </div>

        {/* 4 Quantitative Anchor Metric Cards */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PRODUCT_FACTS.highlightMetrics.map((m) => (
            <div
              key={m.id}
              className="p-5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition-all shadow-sm relative overflow-hidden group hover:translate-y-[-2px]"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono tracking-wider uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                  {m.badge}
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl sm:text-4xl font-extrabold font-mono text-slate-900 tracking-tight">
                  {m.value}
                </span>
                {m.unit && (
                  <span className="text-base font-mono text-sky-600 font-semibold">
                    {m.unit}
                  </span>
                )}
              </div>
              <h3 className="text-xs font-semibold text-slate-800 mt-1.5 font-sans">
                {m.label}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                {m.description}
              </p>
              <div className="mt-3 pt-2.5 border-t border-slate-100 text-[10px] font-mono text-slate-400 truncate">
                {m.provenance}
              </div>
            </div>
          ))}
        </div>

        {/* Sovereign Assurance Ribbon */}
        <div className="mt-10 pt-6 border-t border-border-subtle grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono text-content-secondary">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>100% Air-Gapped Loopback</span>
          </div>
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-accent shrink-0" />
            <span>Sub-Millisecond Eval (65µs)</span>
          </div>
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-amber-400 shrink-0" />
            <span>SHA-256 Chained Ledger</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0" />
            <span>Zero Device Auto-Execution</span>
          </div>
        </div>
      </div>
    </section>
  );
};
