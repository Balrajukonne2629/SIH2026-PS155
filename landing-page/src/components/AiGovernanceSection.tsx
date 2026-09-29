import React from 'react';
import { Cpu, UserCheck, ShieldAlert, ArrowRight, Check, AlertCircle, FileCode } from 'lucide-react';

export const AiGovernanceSection: React.FC = () => {
  return (
    <section id="ai-governance" className="py-16 md:py-24 bg-surface border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-12">
          <div className="text-[11px] font-mono tracking-wider uppercase text-sky-700 font-semibold mb-2">
            Air-Gapped AI Safety & Governance
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-display text-slate-900 tracking-tight">
            Human-in-the-Loop AI Disambiguation Queue
          </h2>
          <p className="mt-3.5 text-sm sm:text-base text-slate-600 leading-relaxed font-sans">
            How NTRO PS26155 harnesses local Small Language Models (SLMs) for unmapped syntax interpretation 
            without allowing probabilistic AI to issue verdicts or mutate live routers.
          </p>
        </div>

        {/* The 4-Stage Visual Simulation Walk */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
          {/* Step 1: Unmapped Input */}
          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Step 01 · Ingestion
              </span>
              <h3 className="text-xs font-bold text-slate-900 mb-2 font-sans">
                Unmapped Directive Detected
              </h3>
              <p className="text-[11px] text-slate-600 leading-relaxed mb-3">
                During parsing, proprietary or unknown syntax that does not match standard CSM rules is isolated.
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-mono text-slate-800">
              service call-home
            </div>
          </div>

          {/* Step 2: Local AI Interpretation */}
          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-sky-700 block mb-1">
                Step 02 · Local SLM
              </span>
              <h3 className="text-xs font-bold text-slate-900 mb-2 font-sans">
                Semantic AI Interpretation
              </h3>
              <p className="text-[11px] text-slate-600 leading-relaxed mb-3">
                DistilBERT embeddings match candidates; local Llama 3.2 1B generates rationale & suggested condition.
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-mono text-slate-700 space-y-1">
              <div><span className="text-slate-400">Target:</span> services.call_home</div>
              <div><span className="text-slate-400">Cond:</span> equals False</div>
              <div><span className="text-slate-400">Confidence:</span> <span className="text-emerald-600 font-bold">0.88</span></div>
            </div>
          </div>

          {/* Step 3: Human Reviewer Gate */}
          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-700 block mb-1">
                Step 03 · Reviewer Gate
              </span>
              <h3 className="text-xs font-bold text-slate-900 mb-2 font-sans">
                Authorized Reviewer Approval
              </h3>
              <p className="text-[11px] text-slate-600 leading-relaxed mb-3">
                Reviewer inspects staged suggestion in pending queue. Zero AI output becomes active without human sign-off.
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200 text-[11px] font-mono text-amber-900 flex items-center justify-between">
              <span>Status: Staged</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-600 text-white font-bold shadow-xs">Approve</span>
            </div>
          </div>

          {/* Step 4: Deterministic Promotion */}
          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-700 block mb-1">
                Step 04 · Promotion
              </span>
              <h3 className="text-xs font-bold text-slate-900 mb-2 font-sans">
                Promoted to Trusted Library
              </h3>
              <p className="text-[11px] text-slate-600 leading-relaxed mb-3">
                Written into trusted_mappings.json with reviewer provenance. Re-audit executes 100% deterministically.
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200 text-[11px] font-mono text-emerald-900 font-medium">
              trusted_mappings.json (Committed)
            </div>
          </div>
        </div>

        {/* Dual Absolute Invariants Callout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-6 rounded-xl bg-white border border-rose-200 border-l-4 border-l-rose-500 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-sans">
                Invariant 1: Zero Generative Compliance Verdicts
              </h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-sans">
              AI is strictly confined to unmapped syntax interpretation and drafting plain-language explanations. 
              The system prohibits LLMs from assigning compliance verdicts (PASS, FAIL). 
              Every verdict is generated solely by deterministic AST evaluation against normalized CSM booleans, integers, and lists.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-white border border-amber-200 border-l-4 border-l-amber-500 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-sans">
                Invariant 2: Zero Device Auto-Execution
              </h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-sans">
              All generated remediation CLI snippets are display-only previews with static conflict checking. 
              The engine contains zero SSH, Telnet, or execution sockets (statically enforced via ast_safety.py). 
              Nothing touches or configures a live network router automatically.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
