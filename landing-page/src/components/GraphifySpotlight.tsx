import React, { useState } from 'react';
import { Network, Maximize2, ShieldCheck, CheckCircle2, GitCommit, Search, RefreshCw, ExternalLink, Cpu } from 'lucide-react';
import { PRODUCT_FACTS } from '../data/productFacts';

export const GraphifySpotlight: React.FC = () => {
  const [iframeKey, setIframeKey] = useState(0);

  const hubs = [
    { name: "Frontend Console UI", role: "React SPA sovereign operator interface (238 nodes)" },
    { name: "API Gateway & Router", role: "FastAPI endpoints, CORS boundary, lifecycle orchestration (111 nodes)" },
    { name: "Compliance Engine", role: "CIS & STIG rule runners, FrameworkRegistry, crosswalks (182 nodes)" },
    { name: "Vendor Normalization", role: "VendorRegistry plug-and-play adapter boundary (Cisco, Junos, Arista, Fortinet)" },
    { name: "AI Advisory Intelligence", role: "Local DistilBERT / Llama 3.2 1B advisory scoring with HITL approval gate" },
    { name: "Audit Ledger & Invariants", role: "SHA-256 hash-chained immutable blocks & bit-level tamper verification" },
  ];

  return (
    <section id="knowledge-graph" className="py-20 md:py-28 bg-[#F8FAFC] border-b border-border relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-sky-50 border border-sky-200 text-[11px] font-mono tracking-wider uppercase text-sky-700 font-semibold mb-3">
              <Network className="w-3.5 h-3.5 text-sky-600" />
              <span>Codebase Architectural Topology · Graphify Knowledge Graph</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold font-display text-slate-900 tracking-tight">
              Interactive Codebase Knowledge Graph (2,744 Nodes)
            </h2>
            <p className="mt-4 text-sm sm:text-base text-slate-600 leading-relaxed font-sans">
              The verified 101-file repository was parsed via AST extraction into a live, progressive disclosure architecture graph. 
              Evaluators can explore the clean 4-tier functional pipeline, trace 13 directed dataflow highways, drill down into 2,744 AST implementation nodes, and inspect isolated subsystem boundaries.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => setIframeKey(k => k + 1)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 text-xs font-mono font-medium text-slate-700 border border-slate-300 shadow-sm transition-colors"
              title="Reset graph canvas"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Graph</span>
            </button>
            <a
              href="./interactive/graph.html"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-semibold text-white shadow-sm transition-all"
            >
              <span>Fullscreen Canvas</span>
              <Maximize2 className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* 4 Quantitative Topology Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500 font-mono block mb-1">Total Graph Nodes</span>
            <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-900">2,744</span>
            <span className="text-[10px] text-slate-400 font-mono block mt-1">Functions, Classes, Modules</span>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500 font-mono block mb-1">Dependency Edges</span>
            <span className="text-2xl sm:text-3xl font-bold font-mono text-sky-600">5,213</span>
            <span className="text-[10px] text-slate-400 font-mono block mt-1">Calls, Imports, Dataflows</span>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500 font-mono block mb-1">Detected Communities</span>
            <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-900">177</span>
            <span className="text-[10px] text-slate-400 font-mono block mt-1">Louvain Community Hubs</span>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500 font-mono block mb-1">Analyzed Source Corpus</span>
            <span className="text-2xl sm:text-3xl font-bold font-mono text-emerald-600">101</span>
            <span className="text-[10px] text-slate-400 font-mono block mt-1">Verified Files · Product Core</span>
          </div>
        </div>

        {/* First-Class Live Interactive Graphify WebGL Frame */}
        <div className="rounded-xl border border-slate-300 bg-white overflow-hidden shadow-xl mb-8">
          <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2 text-slate-700 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>LIVE ARCHITECTURE ENGINE: 4-Tier Pipeline · Click cards to drill into AST nodes · Mode Switcher</span>
            </div>
            <div className="flex items-center gap-3 text-slate-500">
              <span>Artifact: <code>graphify-out/graph.html</code></span>
            </div>
          </div>
          <div className="relative w-full h-[620px] bg-[#0f0f1a]">
            <iframe
              key={iframeKey}
              src="./interactive/graph.html"
              title="NTRO PS26155 Codebase Knowledge Graph"
              className="w-full h-full border-0"
            />
          </div>
        </div>

        {/* Graph Insights & Invariants Proof Details */}
        <div className="p-6 md:p-8 rounded-xl bg-white border border-slate-200 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 font-mono">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Topological Proof of Architectural Invariants</span>
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed font-sans">
                Graph analysis confirms that deterministic compliance evaluators (<code className="text-sky-700 font-mono">cis_benchmark_cisco_iosxe</code>, <code className="text-sky-700 font-mono">disa_stig_cisco_iosxe</code>) 
                have zero edge connections to network sockets, shell execution, or remote endpoints. 
                Data flows strictly from ingestion into normalized CSM and into deterministic rules.
              </p>

              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                <h4 className="text-xs font-bold font-mono text-slate-800 mb-2">
                  Central Hub Communities Extracted:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {hubs.map((hub, idx) => (
                    <div key={idx} className="text-xs p-2 rounded bg-white border border-slate-200">
                      <span className="font-mono text-sky-700 font-semibold block">{hub.name}</span>
                      <span className="text-[11px] text-slate-500 line-clamp-1">{hub.role}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs font-mono text-slate-500 pt-1">
                <GitCommit className="w-3.5 h-3.5 text-sky-600" />
                <span>Extracted from live verified repository · 100% Deterministic AST Extraction</span>
              </div>
            </div>

            {/* Evaluator Guide */}
            <div className="lg:col-span-1 p-5 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
              <span className="text-[10px] font-mono uppercase tracking-wider text-sky-700 font-bold block">
                How to Evaluate
              </span>
              <h4 className="text-xs font-bold text-slate-900 font-sans">
                Interactive Exploration Modes
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed font-sans">
                Use the mode bar and canvas interaction to inspect:
              </p>
              <ul className="text-xs font-mono text-slate-700 space-y-1.5 pl-2">
                <li>• <b>Architecture Flow:</b> Clean 4-tier pipeline with 13 directed dataflows</li>
                <li>• <b>Subsystem Drilldown:</b> Click any card to fan out inner AST nodes</li>
                <li>• <b>Detailed Topology:</b> Full 11 hubs and 27 inter-module edges</li>
                <li>• <b>+ Verification Suite:</b> Includes 1,638 automated test nodes</li>
              </ul>
              <a
                href="./interactive/graph.html"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 hover:text-sky-700"
              >
                <span>Launch in full browser window</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
