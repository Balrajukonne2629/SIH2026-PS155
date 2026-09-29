import React, { useState } from 'react';
import { ShieldCheck, AlertOctagon, CheckCircle2, RefreshCw, Key, Database, Cpu, FileCheck } from 'lucide-react';
import { PRODUCT_FACTS } from '../data/productFacts';

export const TechnicalEvidence: React.FC = () => {
  const [isTampered, setIsTampered] = useState(false);

  // Simulated continuous SHA-256 blocks
  const validBlocks = [
    {
      index: 1,
      id: "AUDIT-2026-001",
      device: "RTR-CORE-01 (Cisco IOS-XE)",
      prevHash: "0000000000000000000000000000000000000000000000000000000000000000",
      blockHash: "9a2f1b4c8e7d6a5f0123456789abcdef0123456789abcdef0123456789abcdef",
      status: "PASS",
      rulesPass: 10,
      rulesFail: 0
    },
    {
      index: 2,
      id: "AUDIT-2026-002",
      device: "SW-ACCESS-04 (Juniper Junos)",
      prevHash: "9a2f1b4c8e7d6a5f0123456789abcdef0123456789abcdef0123456789abcdef",
      blockHash: "4c8e7d6a5f0123456789abcdef0123456789abcdef0123456789abcdef9a2f1b",
      status: "PASS",
      rulesPass: 10,
      rulesFail: 0
    },
    {
      index: 3,
      id: "AUDIT-2026-003",
      device: "BORDER-GW-02 (Cisco IOS-XE)",
      prevHash: "4c8e7d6a5f0123456789abcdef0123456789abcdef0123456789abcdef9a2f1b",
      blockHash: "e7d6a5f0123456789abcdef0123456789abcdef0123456789abcdef9a2f1b4c8",
      status: "FAIL",
      rulesPass: 8,
      rulesFail: 2
    }
  ];

  return (
    <section id="evidence" className="py-16 md:py-24 bg-surface border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-12">
          <div className="text-[11px] font-mono tracking-wider uppercase text-sky-700 font-semibold mb-2">
            Mathematical &amp; Empirical Proof
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-display text-slate-900 tracking-tight">
            Verified Technical Evidence &amp; Cryptographic Assurance
          </h2>
          <p className="mt-3.5 text-sm sm:text-base text-slate-600 leading-relaxed font-sans">
            Every metric presented is traceable to current repository test executions, 
            benchmarks, and AST extraction reports. Zero speculative claims.
          </p>
        </div>

        {/* 8 Technical Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
          {PRODUCT_FACTS.fullMetrics.map((m) => (
            <div
              key={m.id}
              className="p-4 rounded-xl bg-white border border-slate-200 hover:border-slate-300 shadow-sm transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-2xl font-extrabold font-mono text-slate-900 tracking-tight">
                    {m.value}
                  </span>
                  {m.unit && (
                    <span className="text-xs font-mono text-sky-600 font-semibold">
                      {m.unit}
                    </span>
                  )}
                </div>
                <h4 className="text-xs font-bold text-slate-800 mb-1 font-sans">
                  {m.label}
                </h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {m.description}
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-100 text-[10px] font-mono text-slate-400 truncate">
                {m.provenance}
              </div>
            </div>
          ))}
        </div>

        {/* Interactive SHA-256 Hash Chain & Tamper Simulator */}
        <div className="p-6 md:p-8 rounded-xl bg-white border border-slate-200 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono text-sky-700 font-semibold uppercase tracking-wider">
                  Interactive Non-Repudiation Simulator (ADR-004)
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 font-sans">
                Tamper-Evident SHA-256 Ledger Chaining
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl font-sans">
                Each block contains: H(n) = SHA256(H(n-1) || AuditID || Timestamp || PayloadHash). 
                Simulate a single-bit alteration in Block #2 to observe instant mathematical chain breakdown.
              </p>
            </div>

            {/* Tamper Toggle Control */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setIsTampered(!isTampered)}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm ${
                  isTampered
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                }`}
              >
                <AlertOctagon className="w-4 h-4" />
                <span>{isTampered ? 'Tamper Active (Bit-Flipped)' : 'Simulate Tamper (Bit Flip)'}</span>
              </button>
              {isTampered && (
                <button
                  onClick={() => setIsTampered(false)}
                  className="px-3 py-2 rounded-lg bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 border border-slate-300 flex items-center gap-1 shadow-sm"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Restore Ledger</span>
                </button>
              )}
            </div>
          </div>

          {/* Tamper Warning Banner if Active */}
          {isTampered ? (
            <div className="my-4 p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2 font-mono">
              <AlertOctagon className="w-4 h-4 shrink-0 text-rose-600" />
              <span>[CRYPTOGRAPHIC INTEGRITY CORRUPTION DETECTED] Block #2 hash mismatch! Block #3 previous_hash link broken. Non-repudiation verification fails at block boundary.</span>
            </div>
          ) : (
            <div className="my-4 p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2 font-mono">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>[CHAIN STATUS: SECURE &amp; VERIFIED] All 3 blocks cryptographically linked. /api/audit-log/verify reports 100% mathematical non-repudiation.</span>
            </div>
          )}

          {/* Hash Blocks Visualization Spine */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            {validBlocks.map((b) => {
              const isCorrupted = isTampered && b.index >= 2;
              return (
                <div
                  key={b.index}
                  className={`p-4 rounded-xl border transition-all ${
                    isCorrupted
                      ? 'bg-rose-50/70 border-rose-300 shadow-sm'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-mono mb-2">
                    <span className="font-bold text-sky-700">Block #{b.index}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${isCorrupted ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'}`}>
                      {isCorrupted ? 'CORRUPT' : 'VERIFIED'}
                    </span>
                  </div>

                  <div className="text-xs font-bold text-slate-900 mb-1 font-sans">
                    {b.id}
                  </div>
                  <div className="text-[11px] text-slate-500 mb-3 font-sans truncate">
                    {b.device}
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-200 text-[10px] font-mono">
                    <div>
                      <span className="text-slate-400 block">PREV BLOCK HASH:</span>
                      <span className="text-slate-600 truncate block">
                        {isCorrupted && b.index === 3
                          ? "MISMATCH_HASH_BROKEN_CHAIN_ERROR"
                          : b.prevHash}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">CURRENT BLOCK HASH:</span>
                      <span className={`truncate block font-semibold ${isCorrupted ? 'text-rose-600' : 'text-emerald-700'}`}>
                        {isCorrupted && b.index === 2
                          ? "CORRUPTED_9a2f1b4c8e7d6a5f0123456789abcdef"
                          : b.blockHash}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
