import React, { useState } from 'react';
import { FileText, ExternalLink, Download, BookOpen, Layers, CheckCircle2, ChevronRight, X } from 'lucide-react';
import { DOCUMENTATION_RESOURCES, DocumentationResource } from '../data/documentationLinks';

export const DocumentationHub: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [previewDoc, setPreviewDoc] = useState<DocumentationResource | null>(null);

  const categories = ["All", "Architecture", "Decisions", "Specifications", "Codebase", "Evaluation"];

  const filteredResources = selectedCategory === "All"
    ? DOCUMENTATION_RESOURCES
    : DOCUMENTATION_RESOURCES.filter(r => r.category === selectedCategory);

  return (
    <section id="documentation" className="py-16 md:py-24 bg-surface border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mb-10">
          <div className="text-[11px] font-mono tracking-wider uppercase text-sky-700 font-semibold mb-2">
            Canonical Specifications & Reference
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-display text-slate-900 tracking-tight">
            Documentation & Architecture Decision Hub
          </h2>
          <p className="mt-3.5 text-sm sm:text-base text-slate-600 leading-relaxed font-sans">
            Direct access to all technical specifications, Architecture Decision Records (ADRs), 
            and engineering manifests. Evaluators can inspect documents online without full repository checkout.
          </p>
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap gap-2 mb-8 border-b border-slate-200 pb-3">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedCategory === cat
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:text-slate-900 border border-slate-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Resource Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredResources.map((resource) => (
            <div
              key={resource.id}
              className="p-5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition-all flex flex-col justify-between shadow-sm group"
            >
              <div>
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mb-2">
                  <span className="px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-600">
                    {resource.format}
                  </span>
                  <span className="text-sky-700 font-semibold">
                    {resource.status}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 group-hover:text-sky-600 transition-colors mb-1 font-sans">
                  {resource.title}
                </h3>
                <div className="text-[11px] font-mono text-slate-500 mb-2.5">
                  {resource.subtitle}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed font-sans mb-4">
                  {resource.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-400 truncate max-w-[150px]">
                  {resource.path}
                </span>

                <div className="flex items-center gap-2">
                  {resource.targetBlank ? (
                    <a
                      href={resource.primaryActionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold text-sky-600 hover:text-sky-800 transition-colors"
                    >
                      <span>Open</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <button
                      onClick={() => setPreviewDoc(resource)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-sky-600 hover:text-sky-800 transition-colors"
                    >
                      <span>View Brief</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* In-Page Document Preview Modal */}
        {previewDoc && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="max-w-2xl w-full bg-white border border-slate-200 rounded-xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-sky-700 font-semibold">
                    {previewDoc.category} · {previewDoc.status}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 font-sans">
                    {previewDoc.title}
                  </h3>
                </div>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="p-1 rounded text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-700 font-sans leading-relaxed max-h-[60vh] overflow-y-auto pr-2">
                <p>{previewDoc.description}</p>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 font-mono text-[11px] text-slate-800">
                  Repository Location: <span className="text-sky-700 font-semibold">{previewDoc.path}</span>
                </div>
                <p className="text-slate-500">
                  This document is canonical repository truth and has been validated as an authoritative 
                  engineering specification for NTRO PS26155.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="px-3 py-1.5 rounded text-xs text-slate-500 hover:text-slate-800"
                >
                  Close
                </button>
                <a
                  href={previewDoc.primaryActionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-colors shadow-sm"
                >
                  <span>Open Raw File in New Tab</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
