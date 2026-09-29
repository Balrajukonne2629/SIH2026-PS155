import React, { useState } from 'react';
import { Terminal, ExternalLink, Shield, CheckCircle2, User, Key, Maximize2 } from 'lucide-react';
import { useConsoleStatus } from '../context/ConsoleStatusContext';

export const PrototypeShowcase: React.FC = () => {
  const { isOnline, openConsoleOrModal } = useConsoleStatus();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const screens = [
    {
      id: "workflow-snapshot",
      title: "Operational Compliance Workflow & Results Matrix",
      category: "Verified Runtime Capture",
      src: "./screenshots/ntro-compliance-workflow.visual-check.1440x900.dark.png",
      resolution: "1440 × 900 Retina",
      description: "Live operational view displaying multi-framework scoring (CIS Benchmark v2.2.1, DISA-STIG V3R7), rule evidence lines, and deterministic pass rates."
    },
    {
      id: "architecture-snapshot",
      title: "Master 7-Layer Architecture Visual Verification",
      category: "Verified System Capture",
      src: "./screenshots/v7_system_architecture.visual-check.2048x1320.dark.png",
      resolution: "2048 × 1320 Ultra-DPI",
      description: "Visual verification capture confirming layout balance, AST safety guard placement, and theme contrast across both Light and Carbon/Graphite modes."
    }
  ];

  return (
    <section id="prototype" className="py-16 md:py-24 bg-surface border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-12">
          <div className="text-[11px] font-mono tracking-wider uppercase text-sky-700 font-semibold mb-2">
            Working Prototype Verification
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-display text-slate-900 tracking-tight">
            Operational Application & Visual Proof
          </h2>
          <p className="mt-3.5 text-sm sm:text-base text-slate-600 leading-relaxed font-sans">
            Verified captures from the live React + Vite + TypeScript application running on port 3000. 
            All metrics and outputs reflect real AST parses and deterministic rule executions.
          </p>
        </div>

        {/* Live App Launcher Banner */}
        <div className="p-6 rounded-xl bg-white border border-slate-200 mb-12 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="text-sm font-bold text-slate-900 font-mono">
                Operational Application Console (:3000)
              </h3>
            </div>
            <p className="text-xs text-slate-600 max-w-2xl font-sans leading-relaxed">
              When the local backend (<code className="text-sky-700 bg-sky-50 px-1 py-0.5 rounded border border-sky-200 font-mono">uvicorn src.main:app :8000</code>) and frontend dev server (<code className="text-sky-700 bg-sky-50 px-1 py-0.5 rounded border border-sky-200 font-mono">npm run dev :3000</code>) are running, 
              evaluators can directly interact with the full role-based access control interface.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2 text-[11px] font-mono text-slate-600">
              <span className="font-semibold text-slate-500">Roles:</span>
              <span className="px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-700">Reviewer (Full Admin)</span>
              <span className="px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-700">Uploader (Upload & Staging)</span>
              <span className="px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-700">Viewer (Read-Only)</span>
            </div>
          </div>

          <button
            onClick={openConsoleOrModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-colors shadow-sm shrink-0 cursor-pointer"
            title={isOnline ? "Operational console is active on port 3000" : "Operational console offline — click for instructions"}
          >
            <span className={`w-2 h-2 rounded-full ${
              isOnline === true 
                ? 'bg-emerald-300 animate-pulse' 
                : isOnline === false 
                ? 'bg-amber-300' 
                : 'bg-white/60'
            }`} />
            <Terminal className="w-4 h-4" />
            <span>Launch Live Console</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 2 Verified Visual Check Screenshots Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {screens.map((screen) => (
            <div
              key={screen.id}
              className="rounded-xl bg-white border border-slate-200 overflow-hidden shadow-sm flex flex-col justify-between group"
            >
              <div className="relative overflow-hidden bg-slate-900 border-b border-slate-200">
                <img
                  src={screen.src}
                  alt={screen.title}
                  className="w-full h-auto object-cover group-hover:scale-[1.01] transition-transform duration-300"
                  loading="lazy"
                />
                <button
                  onClick={() => setSelectedImage(screen.src)}
                  className="absolute bottom-3 right-3 p-2 rounded-lg bg-white/90 text-slate-800 border border-slate-200 hover:bg-white transition-colors shadow-md"
                  title="Expand screenshot"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 mb-1.5">
                  <span className="text-sky-700 font-semibold">{screen.category}</span>
                  <span>{screen.resolution}</span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 mb-1.5 font-sans">
                  {screen.title}
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed font-sans">
                  {screen.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Modal for Fullscreen Screenshot Inspection */}
        {selectedImage && (
          <div
            onClick={() => setSelectedImage(null)}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out"
          >
            <div className="max-w-6xl w-full max-h-[90vh] overflow-auto rounded-lg border border-border-strong bg-surface p-2 shadow-2xl">
              <img
                src={selectedImage}
                alt="Expanded View"
                className="w-full h-auto rounded"
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
