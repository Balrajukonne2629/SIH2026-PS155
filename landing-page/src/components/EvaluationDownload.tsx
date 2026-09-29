import React, { useState } from 'react';
import { Download, ShieldCheck, Terminal, Copy, Check, Key, AlertTriangle, HardDrive, CheckCircle2, Lock, ExternalLink } from 'lucide-react';
import { verifiedFacts } from '../data/productFacts';

export const EvaluationDownload: React.FC = () => {
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  const verificationSnippet = `Get-FileHash -Algorithm SHA256 .\\NTRO-PS26155-OFFLINE-DEMO-v1.0.zip | Format-List`;

  const handleCopyHash = () => {
    navigator.clipboard.writeText(verifiedFacts.offlinePackage.sha256);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(verificationSnippet);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  return (
    <section id="download" className="py-20 md:py-28 border-t border-border bg-gradient-to-b from-app to-surface relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="max-w-3xl mb-14">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-sky-50 border border-sky-200 text-[11px] font-mono tracking-wider uppercase text-sky-700 font-semibold mb-3">
            <Download className="w-3.5 h-3.5 text-sky-600" />
            <span>Air-Gapped Sovereign Deployment Bundle</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold font-display text-slate-900 tracking-tight">
            Self-Contained Offline Evaluation Distribution
          </h2>
          <p className="mt-4 text-sm sm:text-base text-slate-600 leading-relaxed font-sans">
            Packaged exclusively for air-gapped enclaves with zero external internet dependencies. 
            Includes the complete compliance engine, local DistilBERT NLP weights, SQLite RBAC database, and 12 golden test configs.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Package Card */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 sm:p-8 relative overflow-hidden shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-slate-500">Release Archive</span>
                <h3 className="text-xl sm:text-2xl font-mono font-bold text-slate-900 mt-1">
                  {verifiedFacts.offlinePackage.filename}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs font-mono font-medium text-slate-700">
                  v1.0.0
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-sky-50 border border-sky-200 text-xs font-mono font-bold text-sky-700">
                  {verifiedFacts.offlinePackage.sizeFormatted}
                </span>
              </div>
            </div>

            {/* SHA-256 Checksum Block */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-mono font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Verified SHA-256 Cryptographic Digest
                </label>
                <button
                  onClick={handleCopyHash}
                  className="text-xs font-mono text-sky-700 hover:text-sky-900 flex items-center gap-1 transition-colors"
                >
                  {copiedHash ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700 font-semibold">Copied to Clipboard</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-sky-600" />
                      <span>Copy Hash</span>
                    </>
                  )}
                </button>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs text-white break-all select-all flex items-center justify-between gap-2 shadow-inner">
                <span className="text-emerald-400 font-semibold">{verifiedFacts.offlinePackage.sha256}</span>
              </div>
              <p className="mt-2 text-xs font-mono text-slate-500">
                Computed on binary payload ({verifiedFacts.offlinePackage.exactBytes.toLocaleString()} bytes).
              </p>
            </div>

            {/* PowerShell Verification Command */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-mono font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-slate-500" />
                  PowerShell Pre-Launch Integrity Check
                </label>
                <button
                  onClick={handleCopySnippet}
                  className="text-xs font-mono text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"
                >
                  {copiedSnippet ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700 font-semibold">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Snippet</span>
                    </>
                  )}
                </button>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs text-sky-300 select-all overflow-x-auto shadow-inner">
                <code>{verificationSnippet}</code>
              </div>
            </div>

            {/* Bundled Artifacts List */}
            <div className="mt-6 pt-6 border-t border-slate-100">
              <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-700 mb-3">
                Pre-Packaged Sovereign Artifacts:
              </h4>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
                {verifiedFacts.offlinePackage.contents.map((item: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-sky-600 mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Download Action Notice */}
            <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-4">
              <a
                href="./NTRO-PS26155-OFFLINE-DEMO-v1.0.sha256"
                download
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-xs font-mono font-bold bg-sky-600 hover:bg-sky-500 text-white transition-all shadow-md hover:shadow-lg"
              >
                <Download className="w-4 h-4" />
                <span>Download Verification Manifest (.sha256)</span>
              </a>
              <div className="text-xs text-slate-500">
                <span className="font-semibold text-slate-800">Evaluator Note:</span> Due to the 8.47 GB payload, the complete ZIP archive is delivered via the sovereign USB/NAS submission share.
              </div>
            </div>
          </div>

          {/* Quickstart & Credentials Column */}
          <div className="lg:col-span-5 space-y-6">
            {/* Quickstart Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <HardDrive className="w-4 h-4 text-sky-600" />
                <h3 className="text-sm font-mono font-bold text-slate-900 uppercase tracking-wide">
                  Single-Click Air-Gap Bootstrap
                </h3>
              </div>
              <p className="text-xs text-slate-600 mb-4 leading-relaxed font-sans">
                Extract the package and execute the self-contained orchestrator. It verifies SHA-256 digests, configures zero-telemetry flags, and spins up both services on loopback:
              </p>
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs text-emerald-400 mb-3 shadow-inner">
                <code>.\START.bat</code>
              </div>
              <p className="text-xs text-slate-500 font-sans">
                To cleanly terminate all running containers and flush volatile locks:
              </p>
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs text-rose-400 mt-2 shadow-inner">
                <code>.\STOP.bat</code>
              </div>
            </div>

            {/* Test Credentials Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Key className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-mono font-bold text-slate-900 uppercase tracking-wide">
                  Pre-Configured RBAC Evaluation Accounts
                </h3>
              </div>
              <p className="text-xs text-slate-600 mb-4 leading-relaxed font-sans">
                Seeded zero-trust accounts loaded in SQLite for role-based access control evaluation:
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono text-left">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="pb-2">Role</th>
                      <th className="pb-2">Username</th>
                      <th className="pb-2">Password</th>
                      <th className="pb-2 hidden sm:table-cell">Clearance / Capabilities</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {verifiedFacts.demoCredentials.map((cred: { role: string; user: string; pass: string; capabilities?: string }, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 font-medium text-slate-900">{cred.role}</td>
                        <td className="py-2.5 text-sky-700 font-bold">{cred.user}</td>
                        <td className="py-2.5 text-slate-600 font-mono select-all font-semibold">{cred.pass}</td>
                        <td className="py-2.5 text-slate-500 font-sans text-[11px] hidden sm:table-cell">{cred.capabilities}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sovereign Outbound Telemetry Guarantee */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-mono font-bold text-slate-900 uppercase tracking-wide">
                    Zero Outbound Telemetry Guarantee
                  </h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed font-sans">
                    Runs with <code>DISABLE_OUTBOUND_TELEMETRY=1</code>. Zero network packets leave the machine. No cloud LLMs or third-party APIs are contacted.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
