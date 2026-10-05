import React, { useState } from 'react';
import { Layers, Maximize2, Download, ExternalLink, RefreshCw, Eye, Sparkles, Shield, Cpu, Lock, CheckCircle2, Sun, Moon } from 'lucide-react';

export const ArchitectureSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'interactive' | 'visual-check' | 'widescreen' | 'vertical' | 'compact'>('interactive');
  const [iframeKey, setIframeKey] = useState(0);
  const [visualTheme, setVisualTheme] = useState<'dark' | 'light'>('dark');
  const [visualDiagram, setVisualDiagram] = useState<'architecture' | 'workflow'>('architecture');

  const reloadIframe = () => setIframeKey((prev) => prev + 1);

  return (
    <section id="architecture" className="py-20 md:py-28 bg-app border-b border-border relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-sky-50 border border-sky-200 text-[11px] font-mono tracking-wider uppercase text-sky-700 font-semibold mb-3">
              <Layers className="w-3.5 h-3.5 text-sky-600" />
              <span>Architectural Blueprint · Archify Master Architecture &amp; Vectors</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold font-display text-slate-900 tracking-tight">
              Master System Architecture &amp; Isolation Boundaries
            </h2>
            <p className="mt-4 text-sm sm:text-base text-slate-600 leading-relaxed font-sans">
              A strictly decoupled 4-tier pipeline engineered for sub-millisecond evaluation, air-gapped critical network compliance, 
              modular multi-vendor expansion, and mathematical non-repudiation. Explore the canonical Archify interactive system model, 
              toggle Dark/Light automated visual-check verifications, and inspect vector SVG blueprints.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <a
              href="./interactive/v7_system_architecture.html"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-semibold text-white shadow-sm transition-all group"
            >
              <span>Dedicated Archify Studio</span>
              <Maximize2 className="w-3.5 h-3.5 text-white group-hover:scale-110 transition-transform" />
            </a>
            <a
              href="./diagrams/ARCHITECTURE_DIAGRAM_16_9.svg"
              download="NTRO_PS26155_System_Architecture_16_9.svg"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 border border-slate-300 transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5 text-sky-600" />
              <span>Blueprint (SVG)</span>
            </a>
          </div>
        </div>

        {/* View Mode Switcher Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-t-xl bg-slate-100 border border-b-0 border-slate-200">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setActiveTab('interactive')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'interactive'
                  ? 'bg-sky-600 text-white shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Archify Studio (Interactive)</span>
            </button>

            <button
              onClick={() => setActiveTab('visual-check')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'visual-check'
                  ? 'bg-sky-600 text-white shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Archify Visual Evidence (2048×1320)</span>
            </button>

            <button
              onClick={() => setActiveTab('widescreen')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'widescreen'
                  ? 'bg-sky-600 text-white shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>16:9 Vector</span>
            </button>

            <button
              onClick={() => setActiveTab('vertical')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'vertical'
                  ? 'bg-sky-600 text-white shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>9:16 Flowchart</span>
            </button>

            <button
              onClick={() => setActiveTab('compact')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'compact'
                  ? 'bg-sky-600 text-white shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Compact Flow</span>
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

            {activeTab === 'visual-check' && (
              <div className="flex items-center gap-2">
                <div className="flex items-center rounded-lg bg-white border border-slate-300 p-0.5">
                  <button
                    onClick={() => setVisualDiagram('architecture')}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                      visualDiagram === 'architecture'
                        ? 'bg-sky-100 text-sky-800 font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    System Arch
                  </button>
                  <button
                    onClick={() => setVisualDiagram('workflow')}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                      visualDiagram === 'workflow'
                        ? 'bg-sky-100 text-sky-800 font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Workflow
                  </button>
                </div>

                <div className="flex items-center rounded-lg bg-white border border-slate-300 p-0.5">
                  <button
                    onClick={() => setVisualTheme('dark')}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono flex items-center gap-1 transition-colors ${
                      visualTheme === 'dark'
                        ? 'bg-slate-900 text-white font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Moon className="w-3 h-3" />
                    <span>Dark</span>
                  </button>
                  <button
                    onClick={() => setVisualTheme('light')}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono flex items-center gap-1 transition-colors ${
                      visualTheme === 'light'
                        ? 'bg-amber-100 text-amber-900 font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Sun className="w-3 h-3 text-amber-600" />
                    <span>Light</span>
                  </button>
                </div>
              </div>
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
                src="./interactive/v7_system_architecture.html?embed=1"
                title="NTRO PS26155 Archify Master System Architecture"
                className="w-full h-full border-0"
              />
            </div>
          )}

          {activeTab === 'visual-check' && (
            <div className="p-4 sm:p-8 flex flex-col items-center justify-center bg-slate-900 min-h-[580px] overflow-auto">
              {visualDiagram === 'architecture' ? (
                <div className="w-full max-w-5xl flex flex-col items-center">
                  <img
                    src={`./screenshots/v7_system_architecture.visual-check.2048x1320.${visualTheme}.png`}
                    alt={`NTRO PS26155 Master Architecture Archify Visual Check (${visualTheme})`}
                    className="w-full h-auto rounded border border-slate-700 shadow-2xl"
                    loading="lazy"
                  />
                  <div className="mt-4 flex flex-wrap items-center justify-between w-full text-xs font-mono text-slate-400 gap-2">
                    <span>Archify 2.17 Automated Visual Check · 2048 × 1320 Ultra-DPI ({visualTheme.toUpperCase()})</span>
                    <a
                      href="./screenshots/v7_system_architecture.visual-check.html"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 underline"
                    >
                      <span>View Browser Visual Evidence Report</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ) : (
                <div className="w-full max-w-5xl flex flex-col items-center">
                  <img
                    src={`./screenshots/ntro-compliance-workflow.visual-check.2048x1320.${visualTheme}.png`}
                    alt={`NTRO PS26155 Compliance Workflow Archify Visual Check (${visualTheme})`}
                    className="w-full h-auto rounded border border-slate-700 shadow-2xl"
                    loading="lazy"
                  />
                  <div className="mt-4 flex flex-wrap items-center justify-between w-full text-xs font-mono text-slate-400 gap-2">
                    <span>Archify 2.17 Compliance Workflow · 2048 × 1320 Ultra-DPI ({visualTheme.toUpperCase()})</span>
                    <a
                      href="./screenshots/ntro-compliance-workflow.visual-check.html"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 underline"
                    >
                      <span>View Workflow Visual Evidence Report</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}
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
              <div className="mt-4 flex flex-wrap items-center justify-between w-full max-w-5xl text-xs font-mono text-slate-500 gap-2">
                <span>High-resolution vector architecture blueprint (16:9 Landscape). Source: <code>docs/ARCHITECTURE_DIAGRAM_16_9.svg</code></span>
                <a
                  href="./diagrams/ARCHITECTURE_DIAGRAM_16_9.svg"
                  download="NTRO_PS26155_System_Architecture_16_9.svg"
                  className="inline-flex items-center gap-1 text-sky-600 hover:text-sky-800 font-semibold"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download SVG</span>
                </a>
              </div>
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
              <div className="mt-4 flex flex-wrap items-center justify-between max-w-md w-full text-xs font-mono text-slate-500 gap-2">
                <span>Mobile-optimized 9:16 vertical pipeline execution flowchart. Source: <code>docs/short_architecture_diagram_9_16.svg</code></span>
                <a
                  href="./diagrams/short_architecture_diagram_9_16.svg"
                  download="NTRO_PS26155_Flowchart_9_16.svg"
                  className="inline-flex items-center gap-1 text-sky-600 hover:text-sky-800 font-semibold"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download SVG</span>
                </a>
              </div>
            </div>
          )}

          {activeTab === 'compact' && (
            <div className="p-6 md:p-10 flex flex-col items-center justify-center bg-slate-50 min-h-[580px] overflow-auto">
              <img
                src="./diagrams/short_architecture_diagram.svg"
                alt="Compact Pipeline Flowchart Vector Diagram"
                className="w-full max-w-4xl h-auto rounded border border-slate-200 shadow-md"
                loading="lazy"
              />
              <div className="mt-4 flex flex-wrap items-center justify-between w-full max-w-4xl text-xs font-mono text-slate-500 gap-2">
                <span>Compact horizontal pipeline execution flowchart. Source: <code>docs/short_architecture_diagram.svg</code></span>
                <a
                  href="./diagrams/short_architecture_diagram.svg"
                  download="NTRO_PS26155_Pipeline_Flow.svg"
                  className="inline-flex items-center gap-1 text-sky-600 hover:text-sky-800 font-semibold"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download SVG</span>
                </a>
              </div>
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
                2. CSM Normalization &amp; AST Eval
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
