import React, { useState } from 'react';
import { ShieldCheck, ArrowRight, ArrowLeft, CheckCircle2, Lock, Terminal, Database, FileCheck, Cpu, Code2 } from 'lucide-react';
import { PIPELINE_STEPS, PipelineStep } from '../data/pipelineSteps';

export const PipelineWorkflow: React.FC = () => {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const activeStep: PipelineStep = PIPELINE_STEPS[activeStepIndex];

  const getStepIcon = (category: string) => {
    switch (category) {
      case "Ingestion": return <Terminal className="w-4 h-4 text-accent" />;
      case "Normalization": return <Code2 className="w-4 h-4 text-sky-400" />;
      case "Compliance": return <Cpu className="w-4 h-4 text-emerald-400" />;
      case "Governance": return <ShieldCheck className="w-4 h-4 text-amber-400" />;
      case "Remediation": return <Lock className="w-4 h-4 text-rose-400" />;
      case "Ledger": return <Database className="w-4 h-4 text-emerald-400" />;
      case "Export": return <FileCheck className="w-4 h-4 text-accent" />;
      default: return <Cpu className="w-4 h-4 text-accent" />;
    }
  };

  return (
    <section id="workflow" className="py-16 md:py-24 bg-surface border-b border-border relative">
      <div id="pipeline-workflow" className="absolute -top-24 pointer-events-none" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-12">
          <div className="text-[11px] font-mono tracking-wider uppercase text-sky-700 font-semibold mb-2">
            Deterministic Pipeline Execution
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-display text-slate-900 tracking-tight">
            The 7-Layer End-to-End Compliance Pipeline
          </h2>
          <p className="mt-3.5 text-sm sm:text-base text-slate-600 leading-relaxed font-sans">
            A strictly decoupled, fail-closed verification pipeline engineered for isolated, high-security enterprise enclaves. 
            Follow the flow of device configurations from raw syntax to cryptographic proof.
          </p>
        </div>

        {/* Horizontal Step Selector Spine (Desktop & Scrollable Mobile) */}
        <div className="mb-8 overflow-x-auto pb-2 scrollbar-thin">
          <div className="flex items-center min-w-[700px] border-b border-slate-200">
            {PIPELINE_STEPS.map((step, idx) => {
              const isActive = idx === activeStepIndex;
              const isPassed = idx < activeStepIndex;
              return (
                <button
                  key={step.id}
                  onClick={() => setActiveStepIndex(idx)}
                  className={`flex-1 flex items-center gap-2 py-3 px-2 border-b-2 text-left transition-all ${
                    isActive
                      ? 'border-sky-600 bg-sky-50/70 text-sky-900 font-semibold'
                      : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/60'
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono shrink-0 ${
                      isActive
                        ? 'bg-sky-600 text-white font-bold'
                        : isPassed
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}
                  >
                    {isPassed ? <CheckCircle2 className="w-3.5 h-3.5" /> : step.stepNumber}
                  </span>
                  <div className="truncate">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                      Stage 0{step.stepNumber}
                    </div>
                    <div className="text-xs truncate font-medium">
                      {step.name.split(' ')[0]}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Stage Inspector Card */}
        <div className="rounded-xl bg-white border border-slate-200 p-6 md:p-8 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-sky-600">
                {getStepIcon(activeStep.category)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-sky-700 uppercase tracking-wider">
                    Stage 0{activeStep.stepNumber} of 07
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                    {activeStep.category}
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 font-sans mt-0.5">
                  {activeStep.name}
                </h3>
              </div>
            </div>

            {/* Stepper Navigation Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveStepIndex(Math.max(0, activeStepIndex - 1))}
                disabled={activeStepIndex === 0}
                className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none text-xs font-medium text-slate-700 border border-slate-300 transition-colors flex items-center gap-1 shadow-sm"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Previous Stage</span>
              </button>
              <button
                onClick={() => setActiveStepIndex(Math.min(PIPELINE_STEPS.length - 1, activeStepIndex + 1))}
                disabled={activeStepIndex === PIPELINE_STEPS.length - 1}
                className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-30 disabled:pointer-events-none text-xs font-semibold text-white transition-colors flex items-center gap-1 shadow-sm"
              >
                <span>Next Stage</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Card Body: Stage Overview & Deep-Dive */}
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-5">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-1.5">
                  Operational Summary
                </h4>
                <p className="text-sm text-slate-700 leading-relaxed font-sans">
                  {activeStep.summary}
                </p>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-2">
                  Technical Specifications & AST Guarantees
                </h4>
                <ul className="space-y-2">
                  {activeStep.technicalDetails.map((detail, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-600 mt-1.5 shrink-0" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Security Invariant Callout */}
              <div className="p-4 rounded-lg bg-emerald-50/60 border border-emerald-200 border-l-4 border-l-emerald-500">
                <div className="text-[10px] font-mono tracking-wider uppercase text-emerald-800 font-bold mb-0.5">
                  Non-Negotiable Security Invariant
                </div>
                <div className="text-xs text-slate-800 font-mono font-medium">
                  {activeStep.securityInvariant}
                </div>
              </div>
            </div>

            {/* Right Column: Input / Output Data Contracts */}
            <div className="lg:col-span-1 p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold block mb-1">
                    Input Contract
                  </span>
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs font-mono text-slate-800">
                    {activeStep.input}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold block mb-1">
                    Output Contract
                  </span>
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs font-mono text-slate-800">
                    {activeStep.output}
                  </div>
                </div>
              </div>

              {activeStep.adrReference && (
                <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-500 text-[11px]">Architectural Mandate</span>
                  <span className="font-mono text-sky-700 text-[11px] font-semibold">
                    {activeStep.adrReference}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
