import React, { useState } from 'react';
import { Terminal, ExternalLink, Shield, CheckCircle2, User, Key, Maximize2, Moon, Sun, Filter } from 'lucide-react';
import { useConsoleStatus } from '../context/ConsoleStatusContext';

interface ShowcaseItem {
  id: string;
  title: string;
  category: 'archify' | 'reviewer' | 'uploader';
  categoryLabel: string;
  src: string;
  lightSrc?: string;
  resolution: string;
  description: string;
  role: string;
}

export const PrototypeShowcase: React.FC = () => {
  const { isOnline, openConsoleOrModal } = useConsoleStatus();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<'all' | 'archify' | 'reviewer' | 'uploader'>('all');
  const [archifyTheme, setArchifyTheme] = useState<'dark' | 'light'>('dark');

  const items: ShowcaseItem[] = [
    {
      id: "arch-v7",
      title: "Master 7-Layer Architecture Visual Verification",
      category: "archify",
      categoryLabel: "Archify Verification",
      src: "./screenshots/v7_system_architecture.visual-check.2048x1320.dark.png",
      lightSrc: "./screenshots/v7_system_architecture.visual-check.2048x1320.light.png",
      resolution: "2048 × 1320 Ultra-DPI",
      description: "Automated browser evidence verifying 4-tier pipeline layout, AST isolation boundaries, and contrast integrity across dark and light presets.",
      role: "System Architecture Dossier"
    },
    {
      id: "workflow-v7",
      title: "Operational Compliance Workflow & Results Matrix",
      category: "archify",
      categoryLabel: "Archify Verification",
      src: "./screenshots/ntro-compliance-workflow.visual-check.2048x1320.dark.png",
      lightSrc: "./screenshots/ntro-compliance-workflow.visual-check.2048x1320.light.png",
      resolution: "2048 × 1320 Ultra-DPI",
      description: "Automated evidence capturing multi-framework evaluation matrix (CIS Benchmark v2.2.1, DISA-STIG V3R7) and deterministic rule outcomes.",
      role: "Compliance Engine Dossier"
    },
    {
      id: "rev-dashboard",
      title: "Executive Compliance Posture & Triage Dashboard",
      category: "reviewer",
      categoryLabel: "Reviewer Console",
      src: "./screenshots/app/reviewer_dashboard.png",
      resolution: "Live Console Capture",
      description: "Live console view displaying cumulative compliance pass rate (46.9%), active violation counts, and pending AI disambiguation proposals.",
      role: "Role: secops_reviewer"
    },
    {
      id: "rev-progression",
      title: "Configuration Compliance Progression & AI Syntax Queue",
      category: "reviewer",
      categoryLabel: "Reviewer Console",
      src: "./screenshots/app/compliance_progression.png",
      resolution: "Live Console Capture",
      description: "Interactive progression tracking device posture improvements across audit iterations (V1 to V3) alongside pending HITL syntax proposals.",
      role: "Role: secops_reviewer"
    },
    {
      id: "rev-health",
      title: "Subsystem Integrity, Health & Air-Gap Telemetry",
      category: "reviewer",
      categoryLabel: "Reviewer Console",
      src: "./screenshots/app/subsystem_health.png",
      resolution: "Live Console Capture",
      description: "Runtime health monitor proving strict 0 KB air-gap network egress, local AI daemon loopback status, and backend API fast-fail health.",
      role: "SOC Subsystem Monitor"
    },
    {
      id: "rev-editor",
      title: "Canonical Report Editor with Immutable Guardrails",
      category: "reviewer",
      categoryLabel: "Reviewer Console",
      src: "./screenshots/app/report_editor.png",
      resolution: "Live Console Capture",
      description: "Interactive report editor enforcing the invariant that deterministic compliance verdicts and hashes cannot be altered by human commentary.",
      role: "Role: secops_reviewer"
    },
    {
      id: "rev-pdf",
      title: "Cryptographic PDF Signature Verification (AUTHENTIC)",
      category: "reviewer",
      categoryLabel: "Reviewer Console",
      src: "./screenshots/app/pdf_verification.png",
      resolution: "Live Console Capture",
      description: "Mathematical verification confirming exported PDF cryptographic digest exactly matches the immutable audit ledger sequence entry.",
      role: "Non-Repudiation Gate"
    },
    {
      id: "up-intake",
      title: "Multi-Vendor Ingestion Intake & 5 Vendor Presets",
      category: "uploader",
      categoryLabel: "Uploader Pipeline",
      src: "./screenshots/app/config_presets_intake.png",
      resolution: "Live Console Capture",
      description: "Ingestion workspace with one-click presets for Cisco IOS-XE, Juniper Junos, Fortinet FortiOS, Arista EOS, and Palo Alto PAN-OS.",
      role: "Role: netadmin_uploader"
    },
    {
      id: "up-verify",
      title: "Cryptographic Hash Chain Verification (VALIDATED)",
      category: "uploader",
      categoryLabel: "Uploader Pipeline",
      src: "./screenshots/app/ledger_verification.png",
      resolution: "Live Console Capture",
      description: "Real-time recalculation of all SHA-256 parent linkages in audit_log.jsonl confirming 100% mathematical integrity with zero tampering.",
      role: "Integrity Verification"
    }
  ];

  const filteredItems = filterCategory === 'all' 
    ? items 
    : items.filter(item => item.category === filterCategory);

  return (
    <section id="prototype" className="py-16 md:py-24 bg-surface border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div className="max-w-3xl">
            <div className="text-[11px] font-mono tracking-wider uppercase text-sky-700 font-semibold mb-2">
              Working Prototype &amp; Operational Verification
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-display text-slate-900 tracking-tight">
              Operational Application &amp; Visual Evidence
            </h2>
            <p className="mt-3.5 text-sm sm:text-base text-slate-600 leading-relaxed font-sans">
              Verified captures from the live React + Vite + TypeScript application running on port 3000, 
              paired with high-resolution Archify automated browser visual check evidence. Click any card to inspect full resolution.
            </p>
          </div>

          {/* Theme Toggle for Archify assets */}
          <div className="flex items-center gap-2 bg-white border border-slate-300 p-1 rounded-lg shrink-0">
            <span className="text-xs font-mono text-slate-500 px-2 hidden sm:inline">Archify Theme:</span>
            <button
              onClick={() => setArchifyTheme('dark')}
              className={`px-2.5 py-1 rounded text-xs font-mono flex items-center gap-1.5 transition-colors ${
                archifyTheme === 'dark'
                  ? 'bg-slate-900 text-white font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Moon className="w-3 h-3" />
              <span>Dark</span>
            </button>
            <button
              onClick={() => setArchifyTheme('light')}
              className={`px-2.5 py-1 rounded text-xs font-mono flex items-center gap-1.5 transition-colors ${
                archifyTheme === 'light'
                  ? 'bg-amber-100 text-amber-900 font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sun className="w-3 h-3 text-amber-600" />
              <span>Light</span>
            </button>
          </div>
        </div>

        {/* Live App Launcher Banner */}
        <div className="p-6 rounded-xl bg-white border border-slate-200 mb-10 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
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
              <span className="px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-700">Uploader (Upload &amp; Staging)</span>
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

        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 mb-8 border-b border-slate-200 pb-3">
          <span className="text-xs font-mono text-slate-500 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>
          {[
            { id: 'all', label: 'All Artifacts (9)' },
            { id: 'archify', label: 'Archify Evidence (2)' },
            { id: 'reviewer', label: 'Reviewer & Approver (5)' },
            { id: 'uploader', label: 'Uploader Pipeline (2)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterCategory(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterCategory === tab.id
                  ? 'bg-sky-600 text-white shadow-sm font-bold'
                  : 'bg-white text-slate-700 hover:text-slate-900 border border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Artifacts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => {
            const currentSrc = item.category === 'archify' && archifyTheme === 'light' && item.lightSrc
              ? item.lightSrc
              : item.src;

            return (
              <div
                key={item.id}
                className="rounded-xl bg-white border border-slate-200 overflow-hidden shadow-sm flex flex-col justify-between group hover:border-slate-300 hover:shadow-md transition-all"
              >
                <div className="relative overflow-hidden bg-slate-950 border-b border-slate-200 aspect-[16/10] flex items-center justify-center">
                  <img
                    src={currentSrc}
                    alt={item.title}
                    className="w-full h-full object-cover object-top group-hover:scale-[1.02] transition-transform duration-300 cursor-pointer"
                    onClick={() => setSelectedImage(currentSrc)}
                    loading="lazy"
                  />
                  <button
                    onClick={() => setSelectedImage(currentSrc)}
                    className="absolute bottom-2.5 right-2.5 p-1.5 rounded-lg bg-white/90 text-slate-800 border border-slate-200 hover:bg-white transition-colors shadow-md"
                    title="Expand screenshot"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="p-4 flex flex-col flex-1 justify-between">
                  <div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mb-1.5">
                      <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-700 font-semibold border border-sky-200">
                        {item.categoryLabel}
                      </span>
                      <span>{item.resolution}</span>
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 mb-1.5 font-sans leading-snug">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-slate-600 leading-relaxed font-sans line-clamp-3">
                      {item.description}
                    </p>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono text-slate-500">
                    <span>{item.role}</span>
                    <button
                      onClick={() => setSelectedImage(currentSrc)}
                      className="text-sky-600 hover:text-sky-800 font-bold flex items-center gap-1"
                    >
                      <span>Inspect</span>
                      <Maximize2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal for Fullscreen Screenshot Inspection */}
        {selectedImage && (
          <div
            onClick={() => setSelectedImage(null)}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="max-w-6xl w-full max-h-[92vh] overflow-auto rounded-xl border border-slate-700 bg-slate-950 p-3 shadow-2xl relative"
            >
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs font-mono text-slate-400">
                <span>Inspecting High-Resolution Artifact</span>
                <button
                  onClick={() => setSelectedImage(null)}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold"
                >
                  Close (ESC)
                </button>
              </div>
              <img
                src={selectedImage}
                alt="Expanded View"
                className="w-full h-auto rounded border border-slate-800"
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
