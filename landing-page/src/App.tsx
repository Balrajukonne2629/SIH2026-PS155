import React from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { ProblemSolution } from './components/ProblemSolution';
import { FoundationalPillars } from './components/FoundationalPillars';
import { PipelineWorkflow } from './components/PipelineWorkflow';
import { ArchitectureSection } from './components/ArchitectureSection';
import { AiGovernanceSection } from './components/AiGovernanceSection';
import { MultiVendorSection } from './components/MultiVendorSection';
import { TechnicalEvidence } from './components/TechnicalEvidence';
import { GraphifySpotlight } from './components/GraphifySpotlight';
import { PrototypeShowcase } from './components/PrototypeShowcase';
import { VideoSection } from './components/VideoSection';
import { DocumentationHub } from './components/DocumentationHub';
import { EvaluationDownload } from './components/EvaluationDownload';
import { Footer } from './components/Footer';
import { ConsoleStatusProvider } from './context/ConsoleStatusContext';
import { ConsoleOfflineModal } from './components/ConsoleOfflineModal';

export const App: React.FC = () => {
  return (
    <ConsoleStatusProvider>
      <div className="min-h-screen bg-app text-content-primary selection:bg-accent/30 selection:text-white font-sans antialiased">
        {/* Top Sticky Navigation with ScrollSpy */}
        <Navbar />

      {/* Main Technical Product Layout */}
      <main className="relative z-10 flex flex-col">
        {/* Section 1: Hero & Sovereign Invariant Axiom */}
        <Hero />

        {/* Section 2: Problem vs Solution */}
        <ProblemSolution />

        {/* Section 3: 3 Foundational Pillars */}
        <FoundationalPillars />

        {/* Section 4: 7-Stage Pipeline & Contracts */}
        <PipelineWorkflow />

        {/* Section 5: Interactive System Architecture (Archify Embed & Vector Diagrams) */}
        <ArchitectureSection />

        {/* Section 6: AI Governance & Out-of-Band HITL Invariant */}
        <AiGovernanceSection />

        {/* Section 7: Multi-Vendor Support & Framework Catalogs */}
        <MultiVendorSection />

        {/* Section 8: Technical Evidence, Empirical Benchmarks & Tamper Simulator */}
        <TechnicalEvidence />

        {/* Section 9: Graphify Codebase Knowledge Graph Spotlight (6,364 Nodes) */}
        <GraphifySpotlight />

        {/* Section 10: Operational Prototype Showcase (Retina Screenshots & Zoom) */}
        <PrototypeShowcase />

        {/* Section 11: Video Presentation & Walkthroughs */}
        <VideoSection />

        {/* Section 12: Technical Documentation & Specifications Hub */}
        <DocumentationHub />

        {/* Section 13: Offline Standalone Evaluation Package & Cryptographic Verification */}
        <EvaluationDownload />
      </main>

      {/* Footer */}
      <Footer />

      {/* Offline Console Guidance Modal */}
      <ConsoleOfflineModal />
    </div>
    </ConsoleStatusProvider>
  );
};

export default App;
