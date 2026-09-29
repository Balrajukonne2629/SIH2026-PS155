import React from 'react';
import { Cpu, Users, ShieldCheck, ArrowRight, Check } from 'lucide-react';
import { PRODUCT_FACTS } from '../data/productFacts';

export const FoundationalPillars: React.FC = () => {
  const getIcon = (idx: number) => {
    switch (idx) {
      case 0: return <Cpu className="w-5 h-5 text-accent" />;
      case 1: return <Users className="w-5 h-5 text-amber-400" />;
      case 2: return <ShieldCheck className="w-5 h-5 text-emerald-400" />;
      default: return <Cpu className="w-5 h-5 text-accent" />;
    }
  };

  return (
    <section id="pillars" className="py-16 md:py-24 bg-app border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-12">
          <div className="text-[11px] font-mono tracking-wider uppercase text-sky-700 font-semibold mb-2">
            Foundational System Architecture
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-display text-slate-900 tracking-tight">
            The Three Invariant Pillars of Network Security Auditing
          </h2>
          <p className="mt-3.5 text-sm sm:text-base text-slate-600 leading-relaxed font-sans">
            Architecturally codified through formal Architecture Decision Records (ADRs). 
            Separates deterministic evaluation from advisory intelligence and cryptographic auditing.
          </p>
        </div>

        {/* 3 Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PRODUCT_FACTS.pillars.map((pillar, idx) => (
            <div
              key={pillar.number}
              className="p-6 rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between shadow-sm relative group"
            >
              <div>
                {/* Header Spine */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-sky-50 border border-sky-200 text-sky-700">
                    PILLAR {pillar.number}
                  </span>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                    {getIcon(idx)}
                  </div>
                </div>

                <h3 className="text-base font-bold text-slate-900 font-sans">
                  {pillar.title}
                </h3>
                <div className="text-xs font-mono text-slate-500 mt-0.5 mb-3">
                  {pillar.subtitle}
                </div>

                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  {pillar.description}
                </p>

                {/* Feature Checklist */}
                <ul className="space-y-2 border-t border-slate-100 pt-4 mb-6">
                  {pillar.features.map((feat, fIdx) => (
                    <li key={fIdx} className="flex items-start gap-2 text-[11px] text-slate-600">
                      <Check className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Bottom ADR Reference */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="font-mono text-[11px] text-slate-500">
                  {pillar.adr}
                </span>
                <a
                  href={`#doc-${pillar.adr.toLowerCase()}`}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-600 hover:text-sky-800 transition-colors"
                >
                  <span>Decision Record</span>
                  <ArrowRight className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
