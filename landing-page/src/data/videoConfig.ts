// NTRO PS26155 — Video Demonstration Configuration
// Zero fabrication policy: Explicitly discloses when binary is pending final recording

export interface VideoChapter {
  timeFormatted: string;
  seconds: number;
  title: string;
  description: string;
}

export interface VideoData {
  id: string;
  title: string;
  durationLabel: string;
  category: "Executive Attention" | "Technical Deep-Dive";
  targetAudience: string;
  purpose: string;
  isAvailable: boolean; // Zero fabrication flag
  statusLabel: string;
  videoSrc?: string;
  posterSrc?: string;
  youtubeUrl?: string;
  synopsis: string[];
  chapters?: VideoChapter[];
}

export const VIDEO_CONFIG: { videos: VideoData[] } = {
  videos: [
    {
      id: "video-30s",
      title: "30-Second Sovereign Overview & Mission-Critical Architecture",
      durationLabel: "0:30",
      category: "Executive Attention",
      targetAudience: "Executive Evaluators & Jury Panel",
      purpose: "High-impact synthesis of the air-gapped sovereign compliance engine: 5 enterprise vendors (Cisco, Juniper, Arista, Fortinet, Palo Alto), 82 deterministic controls in 0.065ms, out-of-band SLM, and SHA-256 cryptographic non-repudiation.",
      isAvailable: true,
      statusLabel: "Official 30s Launch Feature Video",
      videoSrc: "./videos/ntro-ps26155-launch-30s.mp4",
      posterSrc: "./videos/ntro-ps26155-launch-30s-poster.jpg",
      synopsis: [
        "[0:00–0:05] The Sovereign Invariant Hook: 0.065 ms latency, zero cloud egress, and complete air-gapped isolation.",
        "[0:05–0:10] 5 Enterprise Vendors: Cisco, Juniper, Arista, Fortinet & Palo Alto normalized via Common Security Model (CSM v7).",
        "[0:10–0:15] Deterministic AST Rules: 82 controls across CIS v2.0, DISA-STIG, NIST SP 800-53, and ISO 27001.",
        "[0:15–0:20] The Safety Invariant: Out-of-band local SLM advises on unmapped syntax; AI never mutates verdicts or touches live hardware.",
        "[0:20–0:25] Mandatory Human Governance: SecOps reviewer authorization, signed and sealed out-of-band.",
        "[0:25–0:30] Cryptographic Non-Repudiation: Immutable SHA-256 Merkel chain and 8.47 GB offline standalone verification."
      ]
    },
    {
      id: "video-5m",
      title: "5-Minute Comprehensive Technical Walkthrough",
      durationLabel: "5:00",
      category: "Technical Deep-Dive",
      targetAudience: "Technical Mentors, Network Security Architects & Evaluators",
      purpose: "End-to-end operational walkthrough covering Cisco/Juniper ingestion, deterministic scoring, HITL AI suggestions, and ledger verification.",
      isAvailable: true,
      statusLabel: "YouTube Interactive Technical Demo",
      youtubeUrl: "https://www.youtube.com/embed/YGzcPgUpD8o",
      posterSrc: "./screenshots/ntro-compliance-workflow.visual-check.1440x900.dark.png",
      synopsis: [
        "Structured walk from air-gapped ingestion through vendor normalization, multi-framework audit, reviewer approval gate, and cryptographic PDF export."
      ],
      chapters: [
        {
          timeFormatted: "0:00–0:30",
          seconds: 0,
          title: "Introduction & Critical Infrastructure Compliance Stakes",
          description: "Problem statement context, air-gap requirements, and the failure modes of cloud AI in enterprise network backbones."
        },
        {
          timeFormatted: "0:30–1:30",
          seconds: 30,
          title: "7-Layer System Architecture & CSM",
          description: "Walkthrough of the unified ingestion boundary, AST safety sandbox, vendor detection, and CSM normalization."
        },
        {
          timeFormatted: "1:30–4:30",
          seconds: 90,
          title: "Live Operational Prototype Demonstration",
          description: "Uploading sample Cisco and Juniper configurations, deterministic CIS/STIG evaluation, staging unmapped syntax to local DistilBERT/SLM, reviewer approval, and safe remediation preview."
        },
        {
          timeFormatted: "4:30–5:00",
          seconds: 270,
          title: "Cryptographic Proof, Ledger Verification & Conclusion",
          description: "Live SHA-256 hash-chain verification (/api/audit-log/verify), tamper simulation, and canonical PDF export with vector QR code."
        }
      ]
    }
  ]
};
