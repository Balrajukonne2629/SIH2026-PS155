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
  synopsis: string[];
  chapters?: VideoChapter[];
}

export const VIDEO_CONFIG: { videos: VideoData[] } = {
  videos: [
    {
      id: "video-30s",
      title: "30-Second Sovereign Overview",
      durationLabel: "0:30",
      category: "Executive Attention",
      targetAudience: "Executive Evaluators & Jury Panel",
      purpose: "Rapid synthesis of the sovereign compliance challenge, deterministic certainty, and air-gapped defense architecture.",
      isAvailable: true,
      statusLabel: "Executive Briefing Session",
      posterSrc: "./screenshots/v7_system_architecture.visual-check.2048x1320.dark.png",
      synopsis: [
        "[0:00–0:10] The Sovereign Dilemma: Mission-critical networks run heterogeneous hardware with diverging CLI syntax.",
        "[0:10–0:20] The Deterministic Solution: Pure Python AST rules evaluate on normalized CSM. Zero generative hallucinations in verdicts.",
        "[0:20–0:30] Proof & Integrity: Append-only SHA-256 ledger chaining guarantees cryptographic non-repudiation."
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
      statusLabel: "Interactive Prototype Walkthrough",
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
