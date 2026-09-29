import React, { useState } from 'react';
import { Server, CheckCircle2, Shield, Layers, Code, FileText, ChevronRight } from 'lucide-react';
import { VENDOR_ARCHITECTURES, REGISTERED_FRAMEWORKS, VendorArchitectureInfo } from '../data/vendorData';

export const MultiVendorSection: React.FC = () => {
  const [selectedVendorId, setSelectedVendorId] = useState<string>("cisco");
  const selectedVendor: VendorArchitectureInfo = VENDOR_ARCHITECTURES.find(v => v.id === selectedVendorId) || VENDOR_ARCHITECTURES[0];

  return (
    <section id="multi-vendor" className="py-16 md:py-24 bg-app border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-12">
          <div className="text-[11px] font-mono tracking-wider uppercase text-sky-700 font-semibold mb-2">
            Standards & Hardware Coverage
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-display text-slate-900 tracking-tight">
            4 Vendor Architectures · 8 Integrated Frameworks
          </h2>
          <p className="mt-3.5 text-sm sm:text-base text-slate-600 leading-relaxed font-sans">
            Cisco IOS-XE · Juniper Junos · Arista EOS · Fortinet FortiOS. 
            Normalized into the Common Security Model (CSM v7) to evaluate 69 authoritative controls without M × N rule explosion.
          </p>
        </div>

        {/* Vendor Architecture Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-200 pb-3">
          {VENDOR_ARCHITECTURES.map((v) => {
            const isSelected = v.id === selectedVendorId;
            return (
              <button
                key={v.id}
                onClick={() => setSelectedVendorId(v.id)}
                className={`flex items-center gap-2.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  isSelected
                    ? 'bg-sky-600 text-white border border-sky-600 shadow-sm'
                    : 'bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-50 border border-slate-300 shadow-xs'
                }`}
              >
                <Server className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                <span>{v.osName}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded border font-mono ${isSelected ? 'bg-sky-700 text-white border-sky-500' : v.maturityBadgeClass}`}>
                  {v.maturity}
                </span>
              </button>
            );
          })}
        </div>

        {/* Selected Vendor Detail Panel */}
        <div className="p-6 md:p-8 rounded-xl bg-white border border-slate-200 mb-14 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono text-slate-500 uppercase tracking-wider">
                  {selectedVendor.name}
                </span>
                <span className="text-slate-300">·</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${selectedVendor.maturityBadgeClass}`}>
                  {selectedVendor.maturity}
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 font-sans">
                {selectedVendor.osName} Compliance Architecture
              </h3>
            </div>
            <div className="text-right">
              <span className="text-3xl font-extrabold font-mono text-sky-600 tracking-tight">
                {selectedVendor.baselineRulesCount}
              </span>
              <span className="text-xs text-slate-500 block font-mono">
                Baseline Rules Evaluated
              </span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div>
                <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-500 mb-1.5">
                  Parser & Normalization Implementation
                </h4>
                <p className="text-xs text-slate-800 font-mono bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  {selectedVendor.parserType}
                </p>
              </div>

              <div>
                <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-500 mb-2">
                  Engine Capabilities & Invariants
                </h4>
                <ul className="space-y-1.5">
                  {selectedVendor.capabilities.map((cap, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 className="w-3.5 h-3.5 text-sky-600 mt-0.5 shrink-0" />
                      <span>{cap}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-500 mb-1">
                  Repository Verification Evidence
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed font-sans">
                  {selectedVendor.evidenceSummary}
                </p>
              </div>
            </div>

            {/* Supported Frameworks List for this Vendor */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-600 mb-3 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-sky-600" />
                <span>Applicable Frameworks</span>
              </h4>
              <ul className="space-y-2">
                {selectedVendor.frameworksSupported.map((fw, idx) => (
                  <li key={idx} className="p-2 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-800 font-medium flex items-center gap-1.5 shadow-xs">
                    <ChevronRight className="w-3 h-3 text-sky-600 shrink-0" />
                    <span>{fw}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] text-slate-500 font-mono">
                Sample: {selectedVendor.sampleDataset}
              </div>
            </div>
          </div>
        </div>

        {/* 8 Registered Compliance Frameworks Catalog Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 font-sans">
                8 Integrated Compliance Frameworks & Catalogs
              </h3>
              <p className="text-xs text-slate-500">
                Authoritative standards catalogs managed under FrameworkRegistry
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-sky-700 px-2.5 py-1 rounded bg-sky-50 border border-sky-200">
              69 Total Controls
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {REGISTERED_FRAMEWORKS.map((fw) => (
              <div
                key={fw.id}
                className="p-4 rounded-xl bg-white border border-slate-200 hover:border-slate-300 shadow-sm transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mb-1.5">
                    <span>{fw.scope}</span>
                    <span className="font-semibold text-sky-700">{fw.version}</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 mb-1.5 font-sans">
                    {fw.name}
                  </h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-3">
                    {fw.description}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 font-mono">Controls</span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                    {fw.controlCount}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
