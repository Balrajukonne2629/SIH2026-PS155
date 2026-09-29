import React from 'react';
import { AlertTriangle, CheckCircle2, ShieldAlert, Cpu, Lock, Network, FileWarning, Key } from 'lucide-react';

export const ProblemSolution: React.FC = () => {
  const problems = [
    {
      icon: <Network className="w-4 h-4 text-rose-400" />,
      title: "Syntax Divergence Across Vendors",
      desc: "Heterogeneous networking hardware (Cisco IOS-XE, Juniper Junos, Arista EOS, Fortinet FortiOS, Palo Alto PAN-OS) uses fundamentally divergent CLI hierarchies, syntax tokens, and semantics. Traditional auditing requires deep per-vendor tooling and duplicate rule libraries."
    },
    {
      icon: <FileWarning className="w-4 h-4 text-rose-400" />,
      title: "Unacceptable Risk of Cloud AI & Hallucinations",
      desc: "Egressing mission-critical router configs to commercial cloud LLMs violates strict data privacy regulations. Furthermore, generative models hallucinate verdicts, making probabilistic AI unsuitable for deterministic compliance scoring."
    },
    {
      icon: <AlertTriangle className="w-4 h-4 text-rose-400" />,
      title: "Auto-Remediation Network Partition Risks",
      desc: "Automated scripts that blindly push remediation commands to live routers can sever control-plane interfaces, corrupt ACLs, or trigger catastrophic network outages without human oversight."
    },
    {
      icon: <ShieldAlert className="w-4 h-4 text-rose-400" />,
      title: "Audit Repudiation & Mutable Database Logs",
      desc: "Standard relational database logs can be manipulated, truncated, or forged retroactively, providing zero cryptographic certainty or non-repudiation during formal compliance inquiries."
    }
  ];

  const solutions = [
    {
      icon: <Cpu className="w-4 h-4 text-emerald-400" />,
      title: "Common Security Model (CSM v7 Normalization)",
      desc: "Vendor adapters parse divergent CLI syntax into a canonical, vendor-neutral JSON schema covering services, interfaces, AAA, logging, NTP, and ACLs. Eliminates M × N rule duplication."
    },
    {
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
      title: "Strictly Deterministic Python Evaluation",
      desc: "All compliance verdicts (PASS, FAIL, UNKNOWN) are evaluated using pure Python deterministic rules against CSM state in ~0.33 ms (measured on 2,000-line config). Zero LLM variance, zero hallucinated verdicts, and 100% reproducible results."
    },
    {
      icon: <Lock className="w-4 h-4 text-emerald-400" />,
      title: "Air-Gapped Advisory AI with Human-in-the-Loop",
      desc: "Local-only SLMs (DistilBERT + Llama 3.2 1B) interpret unmapped syntax and suggest CSM mappings. An authorized human reviewer must approve or correct mappings before they enter the trusted rule library. Remediations are display-only."
    },
    {
      icon: <Key className="w-4 h-4 text-emerald-400" />,
      title: "Cryptographic SHA-256 Hash-Chained Ledger",
      desc: "Completed audits append immutable blocks linked by SHA-256 hash chains into SQLite. Bit-level tamper detection (/api/audit-log/verify) and vector QR codes on PDF reports guarantee cryptographic non-repudiation."
    }
  ];

  return (
    <section id="problem-solution" className="py-16 md:py-24 bg-surface border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-12">
          <div className="text-[11px] font-mono tracking-wider uppercase text-sky-700 font-semibold mb-2">
            The Critical Infrastructure Compliance Dilemma
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-display text-slate-900 tracking-tight">
            Why Traditional Compliance & Cloud LLMs Fail in Critical Network Infrastructure
          </h2>
          <p className="mt-3.5 text-sm sm:text-base text-slate-600 leading-relaxed font-sans">
            Auditing mission-critical telecommunications backbones and enterprise enclaves requires deterministic certainty, strict data privacy, and zero tolerance for automated misconfigurations.
          </p>
        </div>

        {/* Dual-Column Comparison Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: The Problem */}
          <div className="p-6 rounded-xl bg-white border border-rose-200 border-l-4 border-l-rose-500 shadow-sm">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-rose-100">
              <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-200">
                <AlertTriangle className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-sans">
                  The Enterprise Network Compliance Challenge
                </h3>
                <span className="text-[11px] text-rose-600 font-mono">
                  Fragile Manual Audits & Cloud LLM Hazards
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {problems.map((p, idx) => (
                <div key={idx} className="flex gap-3">
                  <div className="p-1.5 rounded-lg bg-rose-50/60 border border-rose-100 mt-0.5 shrink-0">
                    {p.icon}
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-900">
                      {p.title}
                    </h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {p.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: The NTRO PS26155 Solution */}
          <div className="p-6 rounded-xl bg-white border border-emerald-200 border-l-4 border-l-emerald-500 shadow-sm">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-emerald-100">
              <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
                <CheckCircle2 className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-sans">
                  The NTRO PS26155 Resolution
                </h3>
                <span className="text-[11px] text-emerald-700 font-mono">
                  Deterministic Core · Advisory AI · Cryptographic Proof
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {solutions.map((s, idx) => (
                <div key={idx} className="flex gap-3">
                  <div className="p-1.5 rounded-lg bg-emerald-50/60 border border-emerald-100 mt-0.5 shrink-0">
                    {s.icon}
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-900">
                      {s.title}
                    </h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {s.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
