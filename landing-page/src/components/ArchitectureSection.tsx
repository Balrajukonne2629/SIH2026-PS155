import React, { useState } from 'react';
import { Layers, Maximize2, Download, ExternalLink, RefreshCw, Eye, Sparkles, Shield, Cpu, Lock, CheckCircle2 } from 'lucide-react';

export const ArchitectureSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'interactive' | 'widescreen' | 'vertical'>('interactive');
  const [iframeKey, setIframeKey] = useState(0);

  const reloadIframe = () => setIframeKey((prev) => prev + 1);

  return (
    <section id="architecture" className="py-20 md:py-28 bg-app border-b border-border relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-sky-50 border border-sky-200 text-[11px] font-mono tracking-wider uppercase text-sky-700 font-semibold mb-3">
              <Layers className="w-3.5 h-3.5 text-sky-600" />
              <span>Architectural Blueprint · Verified 4-Tier Pipeline</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold font-display text-slate-900 tracking-tight">
              Master System Architecture & Isolation Boundaries
            </h2>
            <p className="mt-4 text-sm sm:text-base text-slate-600 leading-relaxed font-sans">
              A strictly decoupled 4-tier pipeline designed for sub-millisecond evaluation, air-gapped critical network compliance, 
              modular multi-vendor expansion, and mathematical non-repudiation. Inspect live directed data flows, AST sandboxes, and drill into 2,744 verified implementation nodes.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2.5 shrink-0">
            <a
              href="./interactive/graph.html"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 border border-slate-300 shadow-sm transition-all group"
            >
              <span>Dedicated Architecture Canvas</span>
              <Maximize2 className="w-3.5 h-3.5 text-sky-600 group-hover:scale-110 transition-transform" />
            </a>
            <a
              href="./diagrams/ARCHITECTURE_DIAGRAM_16_9.svg"
              download="NTRO_PS26155_System_Architecture_16_9.svg"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 border border-slate-300 transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5 text-sky-600" />
              <span>Vector Blueprint (SVG)</span>
            </a>
          </div>
        </div>

        {/* View Mode Switcher Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-t-xl bg-slate-100 border border-b-0 border-slate-200">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('interactive')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
                activeTab === 'interactive'
                  ? 'bg-sky-600 text-white shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Interactive Pipeline (Pan / Zoom / Drill-Down)</span>
            </button>

            <button
              onClick={() => setActiveTab('widescreen')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
                activeTab === 'widescreen'
                  ? 'bg-sky-600 text-white shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>16:9 Presentation Blueprint</span>
            </button>

            <button
              onClick={() => setActiveTab('vertical')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
                activeTab === 'vertical'
                  ? 'bg-sky-600 text-white shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>9:16 Flowchart Dossier</span>
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
            {activeTab === 'interactive' && (
              <button
                onClick={reloadIframe}
                className="p-1.5 rounded-md hover:bg-white text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1.5 text-xs border border-transparent hover:border-slate-300"
                title="Reload diagram canvas"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset View</span>
              </button>
            )}
            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-200 border border-slate-300 text-slate-700 hidden sm:inline-block">
              CANONICAL RENDER
            </span>
          </div>
        </div>

        {/* Display Canvas Container */}
        <div className="rounded-b-xl border border-slate-200 bg-slate-950 overflow-hidden shadow-xl relative">
          {activeTab === 'interactive' && (
            <div className="relative w-full h-[680px]">
              <iframe
                key={iframeKey}
                src="./interactive/graph.html?mode=arch"
                title="NTRO PS26155 Interactive System Architecture"
                className="w-full h-full border-0"
              />
            </div>
          )}

          {activeTab === 'widescreen' && (
            <div className="p-6 md:p-10 flex flex-col items-center justify-center bg-slate-50 min-h-[580px] overflow-auto">
              <img
                src="./diagrams/ARCHITECTURE_DIAGRAM_16_9.svg"
                alt="16:9 Landscape System Architecture Vector Diagram"
                className="w-full max-w-5xl h-auto rounded border border-slate-200 shadow-md"
                loading="lazy"
              />
              <p className="mt-4 text-xs font-mono text-slate-500 text-center">
                High-resolution vector architecture blueprint (16:9). Source: <code>docs/ARCHITECTURE_DIAGRAM_16_9.svg</code>
              </p>
            </div>
          )}

          {activeTab === 'vertical' && (
            <div className="p-6 md:p-10 flex flex-col items-center justify-center bg-slate-50 min-h-[580px] overflow-auto">
              <img
                src="./diagrams/short_architecture_diagram_9_16.svg"
                alt="9:16 Vertical Mobile Flowchart Vector Diagram"
                className="max-w-md w-full h-auto rounded border border-slate-200 shadow-md"
                loading="lazy"
              />
              <p className="mt-4 text-xs font-mono text-slate-500 text-center">
                Mobile-optimized 9:16 vertical pipeline execution flowchart. Source: <code>docs/short_architecture_diagram_9_16.svg</code>
              </p>
            </div>
          )}
        </div>

        {/* Architectural Boundaries Explanatory Cards */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2 text-sky-600">
              <Shield className="w-4 h-4" />
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900">
                1. Ingestion Isolation
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-sans">
              Guarded multi-file and ZIP ingestion enforces strict magic-byte validation, ZIP slip path traversal sanitization, and AST static security scans before raw configs enter the pipeline.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2 text-emerald-600">
              <Cpu className="w-4 h-4" />
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900">
                2. CSM Normalization & AST Eval
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-sans">
              Vendor-specific syntax (Cisco, Juniper, Arista, Fortinet) converts into canonical JSON models. Pure Python condition rules evaluate across 8 frameworks in 0.065 ms with zero LLM variance.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2 text-amber-600">
              <Lock className="w-4 h-4" />
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900">
                3. Immutable Cryptographic Ledger
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-sans">
              Every audit commits a block linked by SHA-256 to prior sessions. Any single-bit database modification invalidates the chain, verified continuously via <code>/api/audit-log/verify</code>.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
