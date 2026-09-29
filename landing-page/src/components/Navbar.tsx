import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Layers, 
  Workflow, 
  Cpu, 
  Network, 
  CheckCircle2, 
  HardDrive, 
  FileText, 
  ArrowUpRight, 
  Terminal,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Compass,
  Video,
  Server
} from 'lucide-react';
import { PRODUCT_FACTS } from '../data/productFacts';
import { useConsoleStatus } from '../context/ConsoleStatusContext';

export const Navbar: React.FC = () => {
  const { isOnline, openConsoleOrModal } = useConsoleStatus();
  const [activeSection, setActiveSection] = useState('overview');
  const [indicatorProgress, setIndicatorProgress] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navItems = [
    { id: 'overview', label: 'Executive Overview', icon: Shield, href: '#' },
    { id: 'pillars', label: '3 Invariant Pillars', icon: Cpu, href: '#pillars' },
    { id: 'workflow', label: '7-Layer Pipeline', icon: Workflow, href: '#workflow' },
    { id: 'architecture', label: 'Archify Master Topology', icon: Layers, href: '#architecture' },
    { id: 'ai-governance', label: 'AI Safety & HITL Queue', icon: Cpu, href: '#ai-governance' },
    { id: 'multi-vendor', label: 'Multi-Vendor Standards', icon: Server, href: '#multi-vendor' },
    { id: 'evidence', label: 'SHA-256 Ledger Proof', icon: CheckCircle2, href: '#evidence' },
    { id: 'knowledge-graph', label: 'Graphify (6,364 Nodes)', icon: Network, href: '#knowledge-graph' },
    { id: 'prototype', label: 'Working Prototype Console', icon: Terminal, href: '#prototype' },
    { id: 'videos', label: 'Video Demonstration', icon: Video, href: '#videos' },
    { id: 'documentation', label: 'Specifications & ADRs', icon: FileText, href: '#documentation' },
    { id: 'download', label: 'Air-Gap Bundle (8.47 GB)', icon: HardDrive, href: '#download' }
  ];

  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (totalScroll > 0) {
        setIndicatorProgress((window.scrollY / totalScroll) * 100);
      }

      // Check section offsets from bottom to top
      const sectionIds = [
        'overview',
        'pillars',
        'workflow',
        'architecture',
        'ai-governance',
        'multi-vendor',
        'evidence',
        'knowledge-graph',
        'prototype',
        'videos',
        'documentation',
        'download'
      ];

      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const id = sectionIds[i];
        if (id === 'overview') {
          if (window.scrollY < 400) {
            setActiveSection('overview');
            break;
          }
        } else {
          const el = document.getElementById(id);
          if (el) {
            const rect = el.getBoundingClientRect();
            if (rect.top <= 240) {
              setActiveSection(id);
              break;
            }
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const activeItemIndex = navItems.findIndex(item => item.id === activeSection);
  const activeLabel = activeItemIndex >= 0 ? navItems[activeItemIndex].label : 'Executive Overview';

  return (
    <>
      {/* Top Reading Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-slate-200 z-[60]">
        <div 
          className="h-full bg-sky-600 transition-all duration-150 ease-out"
          style={{ width: `${indicatorProgress}%` }}
        />
      </div>

      {/* Floating Modern Header Island */}
      <header className="fixed top-3 inset-x-0 z-50 pointer-events-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between pointer-events-auto">
          {/* Brand Dossier Identity Chip */}
          <a
            href="#"
            className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-white/95 border border-slate-200 shadow-md shadow-slate-900/5 hover:border-sky-300 transition-all backdrop-blur-md group"
          >
            <div className="w-6 h-6 rounded-full bg-sky-600 flex items-center justify-center text-white shadow-xs">
              <Shield className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center gap-1.5 font-mono text-xs">
              <span className="font-bold text-slate-900">NTRO PS26155</span>
              <span className="text-slate-300">/</span>
              <span className="text-sky-700 font-semibold hidden sm:inline">PRODUCT DOSSIER</span>
            </div>
          </a>

          {/* Quick External Prototype Link & Offline Package CTA */}
          <div className="flex items-center gap-2">
            <button
              onClick={openConsoleOrModal}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 border border-slate-200 text-xs font-mono text-slate-700 hover:text-sky-700 hover:border-sky-300 shadow-sm transition-all cursor-pointer"
              title={isOnline ? "Operational console is active on port 3000" : "Operational console offline — click for instructions"}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${
                isOnline === true 
                  ? 'bg-emerald-500 animate-pulse' 
                  : isOnline === false 
                  ? 'bg-amber-400' 
                  : 'bg-slate-300'
              }`} />
              <Terminal className="w-3 h-3 text-sky-600" />
              <span>Console (:3000)</span>
              <ArrowUpRight className="w-3 h-3 text-slate-400" />
            </button>

            <a
              href="#download"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium shadow-md shadow-sky-600/20 hover:shadow-sky-600/30 transition-all"
            >
              <span>Audit Bundle (8.47 GB)</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </header>

      {/* Floating Document Outline Index (Desktop Left Rail) */}
      <aside 
        className={`fixed left-5 top-1/2 -translate-y-1/2 z-40 hidden xl:flex flex-col rounded-2xl bg-white/95 border border-slate-200/90 shadow-2xl shadow-slate-900/10 backdrop-blur-xl transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-14 p-2' : 'w-64 p-3'
        }`}
        aria-label="Document Outline"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-2.5 mb-1.5 border-b border-slate-100">
          {!isCollapsed ? (
            <>
              <div className="flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-sky-600" />
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-600 font-bold">
                  Document Index
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-100 font-semibold">
                  {Math.round(indicatorProgress)}%
                </span>
                <button
                  onClick={() => setIsCollapsed(true)}
                  className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                  title="Collapse to compact icon strip"
                  aria-label="Collapse Index"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          ) : (
            <div className="w-full flex justify-center">
              <button
                onClick={() => setIsCollapsed(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                title="Expand Document Outline"
                aria-label="Expand Index"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* List of Landmarks / Document Sections */}
        <div className="space-y-0.5 max-h-[64vh] overflow-y-auto scrollbar-none py-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <a
                key={item.id}
                href={item.href}
                className={`group relative flex items-center rounded-xl transition-all ${
                  isCollapsed ? 'justify-center p-2' : 'gap-2.5 px-3 py-2'
                } ${
                  isActive
                    ? 'bg-sky-50 text-slate-900 border border-sky-200/90 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
                }`}
                title={item.label}
              >
                {/* Active Indicator Bar / Dot */}
                {isActive && (
                  <span className="absolute left-1 w-1 h-3 rounded-full bg-sky-600" />
                )}

                {/* Icon */}
                <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                  isActive ? 'text-sky-600' : 'text-slate-400 group-hover:text-slate-600'
                }`} />

                {/* Full Visible Text Label */}
                {!isCollapsed && (
                  <span className={`text-xs font-sans truncate tracking-tight transition-colors ${
                    isActive ? 'font-bold text-slate-900' : 'font-medium text-slate-700 group-hover:text-slate-950'
                  }`}>
                    {item.label}
                  </span>
                )}
              </a>
            );
          })}
        </div>

        {/* Footer Landmark Status */}
        {!isCollapsed && (
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span className="truncate max-w-[140px] text-slate-600 font-medium">{activeLabel}</span>
            <span className="text-slate-500 font-medium">AUDIT OUTLINE</span>
          </div>
        )}
      </aside>

      {/* Bottom Floating Navigation Dock (Mobile & Tablet) */}
      <nav className="fixed bottom-4 inset-x-4 z-50 xl:hidden flex items-center justify-around py-2 px-3 rounded-full bg-white/95 border border-slate-200 shadow-2xl backdrop-blur-md">
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <a
              key={item.id}
              href={item.href}
              className={`p-2 rounded-full flex flex-col items-center gap-0.5 text-[10px] ${
                isActive ? 'text-sky-600 font-bold' : 'text-slate-400'
              }`}
            >
              <Icon className="w-4 h-4" />
            </a>
          );
        })}
        <a
          href="#download"
          className="p-2 rounded-full bg-sky-600 text-white shadow-sm"
          title="Download evaluation bundle"
        >
          <HardDrive className="w-4 h-4" />
        </a>
      </nav>
    </>
  );
};
