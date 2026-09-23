---
name: "NTRO Compliance Auditor"
description: "Enterprise Cybersecurity & National Technical Infrastructure Compliance Platform"
colors:
  canvas-dark: "#0b0d0f"
  surface-dark: "#111417"
  surface-raised-dark: "#171a1e"
  surface-elevated-dark: "#1d2126"
  surface-hover-dark: "#22272e"
  input-dark: "#0e1013"
  border-subtle-dark: "#1c2026"
  border-default-dark: "#282d33"
  border-strong-dark: "#383f47"
  text-primary-dark: "#e8eaed"
  text-secondary-dark: "#b2b8c0"
  text-muted-dark: "#7d858f"
  text-disabled-dark: "#525963"
  canvas-light: "#f0f4f8"
  surface-light: "#ffffff"
  surface-raised-light: "#f8fafc"
  surface-elevated-light: "#ffffff"
  surface-hover-light: "#f1f5f9"
  input-light: "#f0f4f8"
  border-subtle-light: "#e2e8f0"
  border-default-light: "#cbd5e1"
  border-strong-light: "#94a3b8"
  text-primary-light: "#0f172a"
  text-secondary-light: "#475569"
  text-muted-light: "#64748b"
  text-disabled-light: "#94a3b8"
  primary: "#0284c7"
  primary-hover: "#0369a1"
  primary-focus: "#0284c7"
  status-pass: "#34d399"
  status-pass-bg: "#064e3b"
  status-pass-border: "#059669"
  status-fail: "#f87171"
  status-fail-bg: "#450a0a"
  status-fail-border: "#dc2626"
  status-unknown: "#fbbf24"
  status-unknown-bg: "#451a03"
  status-unknown-border: "#d97706"
  status-info: "#38bdf8"
  status-info-bg: "#082f49"
  status-info-border: "#0284c7"
  telemetry-fast: "#6366f1"
  telemetry-quality: "#14b8a6"
typography:
  display:
    fontFamily: "IBM Plex Sans, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: "2rem"
  headline:
    fontFamily: "IBM Plex Sans, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: "1.75rem"
  title:
    fontFamily: "IBM Plex Sans, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: "1.25rem"
  body:
    fontFamily: "IBM Plex Sans, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: "1rem"
  label:
    fontFamily: "IBM Plex Mono, SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace"
    fontSize: "0.6875rem"
    fontWeight: 600
    lineHeight: "0.875rem"
    letterSpacing: "0.05em"
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  full: "9999px"
spacing:
  "2xs": "2px"
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  "2xl": "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
  button-secondary:
    backgroundColor: "{colors.surface-raised-dark}"
    textColor: "{colors.text-primary-dark}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary-dark}"
    rounded: "{rounded.sm}"
    padding: "6px 12px"
  badge-pass:
    backgroundColor: "{colors.status-pass-bg}"
    textColor: "{colors.status-pass}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
  badge-fail:
    backgroundColor: "{colors.status-fail-bg}"
    textColor: "{colors.status-fail}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
  badge-unknown:
    backgroundColor: "{colors.status-unknown-bg}"
    textColor: "{colors.status-unknown}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
  input-text:
    backgroundColor: "{colors.input-dark}"
    textColor: "{colors.text-primary-dark}"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
---

# Design System: NTRO Compliance Auditor

## Overview

**Creative North Star: "The Air-Gapped Sentinel"**

The NTRO Compliance Auditor interface is a high-density, mission-critical cybersecurity console engineered for sovereign technical infrastructure and classified network environments. Its visual aesthetic is rooted in industrial rigor, data density, and absolute factual clarity: zero sci-fi glowing neon accents, zero decorative purple AI flourishes, and zero remote external asset dependencies. The application is built to run entirely offline inside an air-gapped security perimeter.

Visual hierarchy is maintained through subtle tonal layering on deep carbon and graphite surfaces (`#0B0D0F`, `#111417`, `#171A1E`) in Dark Mode, and clean, cool-neutral off-white card surfaces (`#F0F4F8`, `#FFFFFF`, `#F8FAFC`) in Light Mode. A single restrained sky-blue accent (`#0284C7`) commands user focus strictly for interactive navigation tabs, focus indicators, and forward progression buttons. Every visual token emphasizes non-repudiation, deterministic verification, and auditable cryptographic integrity.

**Key Characteristics:**
- **Zero Remote Dependencies:** Typography, icons, and styling run entirely from local bundles without Google Fonts, CDN links, or external analytics.
- **Dual-Theme Parity:** Full contrast and semantic parity between Carbon/Graphite Dark Mode and Clean Neutral Light Mode with seamless live switching and persistence.
- **Deterministic Status Integrity:** Strict semantic color boundaries where green is certified compliant, red is strictly non-compliant violation, amber is missing/unmapped evidence, and blue is navigational focus.
- **Data-Dense Operational Layout:** Tabular registers, compact metrics, and two-line Indian Standard Time (IST) timestamps built for continuous SOC monitoring.

## Colors

The palette is divided into an industrial Carbon & Graphite dark foundation, a crisp light foundation, a single restrained Sky Blue accent, and strict semantic audit status roles.

### Primary
- **Restrained Sky Blue** (`#0284C7`): The core interactive accent. Used exclusively for primary action buttons, active navigation tab outlines, focus rings, and forward workflow triggers.
- **Sky Blue Hover** (`#0369A1`): Hover state for interactive primary actions.
- **Sky Blue Subtle** (`rgba(2, 132, 199, 0.12)`): Low-contrast selection tints, active session pills, and focus ring backdrops.

### Secondary
- **Indigo Telemetry** (`#6366F1`): Informational hardware and performance mode badge. Deliberately separated from green (pass) and amber (warning) to avoid cognitive misclassification.
- **Teal Precision** (`#14B8A6`): High-precision evaluation badge and quality mode indicator.

### Neutral (Dark Theme)
- **Deep Carbon Canvas** (`#0B0D0F`): Deepest root application canvas and outer viewport background (`--bg-app`).
- **Primary Surface** (`#111417`): Standard card, panel, and table background surface (`--bg-surface`).
- **Raised Container** (`#171A1E`): Elevated cards, toolbars, and hovered table row fills (`--bg-surface-raised`).
- **Elevated Popover** (`#1D2126`): Modals, dropdown menus, and floating tooltips (`--bg-surface-elevated`).
- **Recessed Input** (`#0E1013`): Form input fields and CLI code snippet blocks (`--bg-input`).
- **Subtle Graphite Border** (`#1C2026`): Hairline table row dividers and inner structural splits (`--border-subtle`).
- **Standard Border** (`#282D33`): Standard panel outlines, card borders, and input strokes (`--border-default`).
- **Strong Border** (`#383F47`): Emphasized card boundaries, active tab borders, and header dividers (`--border-strong`).
- **Primary Body Text** (`#E8EAED`): High-contrast warm off-white primary text (`--text-primary`).
- **Secondary Muted Text** (`#B2B8C0`): Secondary descriptions, helper text, and inactive tab labels (`--text-secondary`).
- **Footnote / Helper Text** (`#7D858F`): Timestamps, rule subtitles, and table header labels (`--text-muted`).
- **Disabled Text** (`#525963`): Inactive or unselectable control labels (`--text-disabled`).

### Neutral (Light Theme)
- **Cool Neutral Canvas** (`#F0F4F8`): Soft blue-tinted light canvas background (`--bg-app`).
- **Pure White Surface** (`#FFFFFF`): Crisp white card, panel, and table surface (`--bg-surface`).
- **Raised Light Container** (`#F8FAFC`): Subtly raised cards, table headers, and active row fills (`--bg-surface-raised`).
- **Light Border Subtle** (`#E2E8F0`): Hairline dividers and inner separators (`--border-subtle`).
- **Light Border Default** (`#CBD5E1`): Card outlines and form field boundaries (`--border-default`).
- **Light Border Strong** (`#94A3B8`): Strong structural dividers and active borders (`--border-strong`).
- **Graphite Primary Text** (`#0F172A`): Deep slate primary text for WCAG AAA contrast (`--text-primary`).
- **Cool Neutral Secondary Text** (`#475569`): Secondary descriptions and subtitle text (`--text-secondary`).
- **Muted Helper Text** (`#64748B`): Helper text, metadata labels, and table headers (`--text-muted`).

### Status (Semantic Audit Integrity)
- **PASS (Certified Compliant)**: Text `#34D399` (dark) / `#059669` (light), Background `#064E3B` (dark) / `#ECFDF5` (light), Border `#059669` (dark) / `#A7F3D0` (light). Strictly reserved for verified compliance checks.
- **FAIL (Non-Compliant Violation)**: Text `#F87171` (dark) / `#DC2626` (light), Background `#450A0A` (dark) / `#FEF2F2` (light), Border `#DC2626` (dark) / `#FECACA` (light). Strictly reserved for security policy violations requiring remediation.
- **UNKNOWN (Missing / Ambiguous Evidence)**: Text `#FBBF24` (dark) / `#D97706` (light), Background `#451A03` (dark) / `#FFFBEB` (light), Border `#D97706` (dark) / `#FDE68A` (light). A first-class audit verdict representing missing config blocks or unmapped syntax (§4.2). Never coerced into Pass or Fail.
- **INFO (Diagnostic / Advisory)**: Text `#38BDF8` (dark) / `#0284C7` (light), Background `#082F49` (dark) / `#F0F9FF` (light), Border `#0284C7` (dark) / `#BAE6FD` (light).
- **PROCESSING (Evaluating / Queue)**: Text `#9DA5B0` (dark) / `#475569` (light), Background `#1A1F26` (dark) / `#F1F5F9` (light), Border `#383F47` (dark) / `#CBD5E1` (light).

### Named Rules
**The Rarity of Accent Rule.** The primary sky blue accent (`#0284C7`) is used on ≤10% of any given screen. Its rarity directs instant cognitive attention to navigation and primary action.
**The Red is Only for Fail Rule.** Red is strictly prohibited for navigation, general branding, or forward primary action buttons. Red indicates a security policy failure, destructive action, or backend probe failure.
**The No-Purple AI Rule.** AI suggestions are advisory subsystems. They must never use playful purple or magenta styling; AI proposals use neutral slate, cautionary amber, or restrained sky blue.

## Typography

**Display / Header Font:** `IBM Plex Sans` (with system fallback: `-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif`)
**Body Font:** `IBM Plex Sans` (with system fallback: `-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif`)
**Monospace / Technical Font:** `IBM Plex Mono` (with fallback: `SFMono-Regular, Consolas, Liberation Mono, Menlo, Monaco, monospace`)

**Character:** Clinical, authoritative, legible, and completely self-hosted. Sans-serif handles structured human cognition and navigation; monospace handles deterministic technical artifacts.

### Hierarchy
- **Display / Page Title** (`font-bold`, `20px` to `24px` / `1.25rem` to `1.5rem`, line-height `1.75rem`): Top console headings, login branding, primary screen titles.
- **Section Headline (H2)** (`font-semibold` / `font-bold`, `16px` / `1.0rem`, line-height `1.5rem`): Main division headers, triage headers, table section titles.
- **Card / Widget Title (H3)** (`font-semibold`, `12px` / `0.75rem`, line-height `1.0rem`, uppercase tracking-wider): KPI card labels, panel titles, sub-widget headings.
- **Body Text** (`font-normal`, `12px` / `0.75rem`, line-height `1.25rem`): Standard operational text, rule descriptions, audit observations.
- **Secondary / Helper Text** (`font-normal`, `11px` / `0.6875rem`, line-height `1.0rem`): Footnotes, explanatory text, metadata subtitles.
- **Technical Mono (Hashes / Rule IDs / CLI)** (`font-mono font-medium`, `11px` to `12px` / `0.6875rem` to `0.75rem`): Rule identifiers (`CISCO-NTP-001`), SHA-256 hashes, IP addresses, CLI commands, AST nodes, and sequence numbers.
- **System Metric Value** (`font-mono font-bold tabular-nums`, `18px` to `24px` / `1.125rem` to `1.5rem`): KPI numbers, pass rates, latency measurements.

### Named Rules
**The Strict Monospace Boundary Rule.** Monospace (`IBM Plex Mono`) is strictly reserved for machine evidence: hashes, CLI commands, rule IDs, IP addresses, session IDs, and JSON payloads. All UI labels, table column headers, and prose remain sans-serif.
**The Tabular Numbers Rule.** Any numeric metric, timestamp, ratio, or percentage rendered in tables or KPI cards must specify `tabular-nums` to prevent horizontal jitter during updates.

## Layout

The layout uses a constrained responsive container with a maximum width of `1600px`, centered with responsive horizontal padding (`px-4 sm:px-6 lg:px-8`) and standard `py-6` vertical rhythm.

### Grid & Spacing Model
- **Outer Shell:** Top fixed/sticky navigation header (`min-h-[56px]`), flex-1 main container (`max-w-[1600px]`), and bottom classification watermark footer.
- **KPI Metrics Ribbon:** 4-column responsive grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`).
- **Operational Two-Column Workstation:** 12-column grid split into 7 columns on the left (trend charts, audit registers) and 5 columns on the right (AI queues, framework alignment, system vitals) via `grid-cols-1 lg:grid-cols-12 gap-6`.
- **Rhythm Scale:** 4px base increment (`2xs: 2px`, `xs: 4px`, `sm: 8px`, `md: 12px`, `lg: 16px`, `xl: 24px`, `2xl: 32px`).
- **Dense Table Row Rhythm:** Row heights are compact (`py-2.5 px-3`) to maximize the number of visible records above the fold for continuous SOC monitoring.

### Responsive Behavior
- **Mobile (< 640px):** Navigation items wrap cleanly into flex rows; KPI cards stack into a single column; tables enable horizontal scroll via `overflow-x-auto`; timestamps stack into date and time lines.
- **Tablet (640px – 1023px):** KPI cards display in 2x2 grid; 12-column sections stack vertically; actions remain accessible.
- **Desktop (≥ 1024px):** Full dual-column operations workspace; 4-column KPI banner; expanded tabular evidence matrices.

## Elevation & Depth

The system uses flat tonal layering by default. Depth is conveyed primarily through background luminance shifts and border contrast, rather than heavy skeuomorphic shadows.

### Shadow Vocabulary
- **Shadow Subtlety (Ambient Low)** (`box-shadow: 0 1px 2px rgba(0,0,0,0.35)` dark / `0 1px 2px rgba(0,0,0,0.05)` light): Standard cards, resting buttons, and subtle panel containers.
- **Shadow Medium (Lifted Element)** (`box-shadow: 0 4px 12px rgba(0,0,0,0.45)` dark / `0 4px 10px rgba(0,0,0,0.06)` light): Dropdown menus, hovered cards, and active triage boxes.
- **Shadow Large (Floating Modal / Popover)** (`box-shadow: 0 10px 24px rgba(0,0,0,0.55)` dark / `0 8px 20px rgba(0,0,0,0.08)` light): Modals, confirmation dialogs, and SVG chart hover tooltips.
- **Shadow Extra Large (Top Floating Toast)** (`box-shadow: 0 16px 36px rgba(0,0,0,0.65)` dark / `0 14px 28px rgba(0,0,0,0.10)` light): Fixed copy-to-clipboard notifications.

### Named Rules
**The Tonal Layering First Rule.** Depth is established by stepping surface luminosity (`--bg-app` → `--bg-surface` → `--bg-surface-raised` → `--bg-surface-elevated`), bounded by crisp 1px borders (`#282D33`). Shadows are secondary and ambient.
**The Subtle Micro-Interaction Rule.** Interactive buttons and clickable rows use subtle scale compression (`active:scale-[0.98]`) with 150ms cubic-bezier transition curves (`cubic-bezier(0.23, 1, 0.32, 1)`) for tactile responsiveness without sluggishness.

## Shapes

The form language is disciplined, rectangular, and industrial with restrained corner rounding.

### Corner Radii
- **Sharp Small (`rounded`, 4px):** Standard corner radius used on cards, panels, table containers, inputs, buttons, and status badges.
- **Medium Pill (`rounded-md`, 6px):** Navigation tabs, action pills, and status tags.
- **Large Container (`rounded-lg`, 8px):** Primary dashboard headers, modal dialogs, and high-level triage containers.
- **Full Circle (`rounded-full`, 9999px):** Status beacon indicator dots and circular counter badges.

### Borders
- **Standard Panel Border:** `1px solid var(--border-default)` (`#282D33` dark / `#CBD5E1` light).
- **Hairline Divider:** `1px solid var(--border-subtle)` (`#1C2026` dark / `#E2E8F0` light).
- **Focus Ring:** `2px solid rgba(2, 132, 199, 0.8)` with `1px offset`.

## Components

### Buttons
- **Shape:** Rectangular with 4px border radius (`rounded`).
- **Primary Action (`.btn-primary`):** Background `#0284C7` (Sky 600), border `#0284C7`, text `#FFFFFF`, font-size `12px` (`text-xs`), font-weight `600` (`font-semibold`), padding `8px 16px`. Hover `#0369A1` (Sky 700), active `scale-[0.98]`.
- **Secondary Action (`.btn-secondary`):** Background `#171A1E` (`bg-slate-800`), border `#282D33` (`border-slate-700`), text `#E8EAED`, font-size `12px`, padding `8px 16px`.
- **Ghost Action (`.btn-ghost`):** Background transparent, text `#B2B8C0`, hover background `#171A1E/60`, hover text `#FFFFFF`.
- **Destructive Action (`.btn-destructive`):** Background `#450A0A` (`bg-rose-950`), border `#DC2626` (`border-rose-800`), text `#F87171` (`text-rose-300`). Strictly for retiring rules, rejecting suggestions, or ending sessions.

### Status Badges & Chips
- **Pass Badge (`.badge-pass`):** Background `#064E3B`, text `#34D399`, border `#059669`, `rounded`, font-mono `text-[10px]` (`0.625rem`), padding `2px 8px`. In light mode, maps to `#ECFDF5` / `#059669` / `#A7F3D0`.
- **Fail Badge (`.badge-fail`):** Background `#450A0A`, text `#F87171`, border `#DC2626`, `rounded`, font-mono `text-[10px]`, padding `2px 8px`. In light mode, maps to `#FEF2F2` / `#DC2626` / `#FECACA`.
- **Unknown Badge (`.badge-unknown`):** Background `#451A03`, text `#FBBF24`, border `#D97706`, `rounded`, font-mono `text-[10px]`, padding `2px 8px`. In light mode, maps to `#FFFBEB` / `#D97706` / `#FDE68A`.
- **Pending Badge (`.badge-pending`):** Background `#171A1E`, text `#CBD1D8`, border `#282D33`.

### Cards & Surfaces
- **Card Base (`.card-base`):** Background `#111417` (`bg-slate-900`), border `1px solid #282D33` (`border-slate-700`), radius `4px` (`rounded`), internal padding `16px` (`p-4`).
- **Panel Base (`.panel-base`):** Background `#111417`, border `1px solid #282D33`, radius `4px`, internal padding `20px` (`p-5`).

### Inputs & Fields
- **Input Base (`.input-base`):** Background `#0B0D0F` (`bg-slate-950`), border `1px solid #282D33` (`border-slate-700`), radius `4px`, text `12px` (`text-xs`), text color `#E8EAED`, placeholder `#7D858F`. Focus treatment: border `#0284C7`, ring `1px solid #0284C7`.

### Navigation
- **Global Header (`Navbar.tsx`):** Fixed/sticky top navigation bar with `min-h-[56px]`, dark slate background (`bg-slate-900`), 1px bottom border (`border-slate-700`). Features product badge (`NT`), system title, role-based navigation tabs with badge counters, runtime status indicator, operator profile badge, and theme toggle.
- **Contextual Audit Workspace Tabs:** Segmented toolbar inside `AuditWorkspace.tsx` toggling Overview, Results Matrix, Evidence, AI Review, Remediation, Conflict Analysis, and Report & Ledger.

### Signature Component: The Chronological Compliance Trend Chart
- An interactive, air-gapped SVG vector visualization embedded in the Reviewer Dashboard that maps compliance pass ratios across chronological audit runs. Uses zero remote charting libraries. Includes subtle SVG area fill gradient (`url(#trendGradient)`), 3px reference gridlines, data node hit-testing with interactive hover tooltips, and clickable nodes that route directly to the corresponding audit workspace.

## Do's and Don'ts

### Do:
- **Do** maintain strict air-gapped independence: all fonts, icons, and stylesheets must originate from local bundles.
- **Do** preserve the semantic meaning of status colors: Emerald is certified compliant, Rose is a non-compliant violation, Amber is missing/unmapped evidence.
- **Do** map all theme colors through CSS custom properties or mapped Tailwind utilities so that Dark and Light themes render with equal fidelity.
- **Do** format all audit timestamps in Indian Standard Time (IST, UTC+05:30) using the two-line format (`dateStr` + `timeStr`) in dense tables.
- **Do** wrap machine evidence (rule IDs, hashes, CLI commands, IP addresses) in monospace font (`IBM Plex Mono`).
- **Do** respect role-based access control (RBAC): Viewers have read-only visibility; Uploaders can ingest and audit; Reviewers manage trusted rules, models, and ledger sealing.

### Don't:
- **Don't** use red (`#FF3333` or `#DC2626`) for forward progression buttons, browse buttons, or general navigation. Red is strictly reserved for failures and destructive actions.
- **Don't** hardcode raw hex values (e.g. `bg-[#0c1f17]`, `bg-[#220d0f]`, `bg-[#241a08]`) inside components; use semantic token classes or CSS custom properties.
- **Don't** use neon purple, magenta, or sci-fi cyberpunk visual tropes for AI suggestions; treat AI as an advisory subsystem.
- **Don't** load external fonts via `@import url('https://fonts.googleapis.com/...')` or external CDN scripts.
- **Don't** coerce `UNKNOWN` compliance results into `PASS` or `FAIL`. Unmapped lines and missing blocks are first-class audit verdicts.
- **Don't** bypass human-in-the-loop verification (§19): AI suggestions cannot write directly to the trusted rule library without authorized reviewer sign-off.
