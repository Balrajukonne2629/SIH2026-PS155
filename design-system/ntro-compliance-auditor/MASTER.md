# NTRO PS26155 — Enterprise Cybersecurity Design System
### Master Specification & Design Tokens (v3.0 — Carbon & Graphite Enterprise UI)

**Project:** NTRO AI-Driven Multi-Vendor Network Security Compliance Auditor  
**Category:** Enterprise Cybersecurity & National Technical Infrastructure  
**Design Philosophy:** Minimalist, calm, high-contrast, data-dense, authoritative enterprise security tool. Built on a Carbon / Graphite industrial palette in Dark Mode and a warm off-white Neutral palette in Light Mode. Air-gapped typography, 0 remote runtime dependencies, strict semantic color fidelity, and zero sci-fi / cyberpunk tropes.

---

## 1. Core Visual Principles

1. **Carbon / Graphite Industrial Rigor:** Dark surfaces are neutral carbon and graphite (`#0B0D0F`, `#111417`, `#171A1E`), not neon blue or deep purple. Subtle `#282D33` borders provide crisp definition without visual noise.
2. **Dual-Theme Parity (Dark + Light):** Both themes provide equal contrast (WCAG AA compliant), clear typographic hierarchy, and consistent information density.
3. **Restrained Accent System:** Single primary accent (`#0284C7` Slate/Sky Blue) strictly reserved for interactive navigation highlights, focus rings, primary action buttons, and active tabs. 90%+ of the interface remains neutral.
4. **Air-Gapped Typographic Discipline:**
   - **UI Sans-Serif:** `IBM Plex Sans`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Roboto`, `sans-serif`. Used for all titles, headers, labels, navigation, buttons, and tabular labels. No remote font `@import` or Google Fonts dependencies.
   - **Monospace:** `IBM Plex Mono`, `SFMono-Regular`, `Consolas`, `monospace`. Strictly reserved for hashes, rule IDs, IP addresses, CLI commands, and raw JSONL/AST.
5. **Semantic Status Integrity:**
   - **PASS** (`#10B981` Emerald) = Certified compliant condition.
   - **FAIL** (`#E11D48` Rose / Red) = Non-compliant finding requiring remediation.
   - **UNKNOWN** (`#F59E0B` Amber) = Missing evidence / ambiguous syntax. A first-class audit verdict, never coerced.
   - **NO PURPLE AI:** AI is an advisory subsystem, not a colorful feature toy. Suggestions and telemetry use neutral slate, cautionary amber for pending review, or subtle teal/sky.
   - **RED IS ONLY FOR FAIL / DESTRUCTIVE:** Forward primary actions are calm slate/sky blue (`#0284C7`), never red.

---

## 2. Dual-Theme Token Architecture

Tokens are implemented as CSS custom properties in `frontend/src/index.css` and mapped to Tailwind's `slate` palette in `tailwind.config.js`. This guarantees that Tailwind utilities adapt instantly when switching themes via `<html data-theme="dark|light">`.

### 2.1 Dark Mode (Carbon / Graphite)
| Token | CSS Variable (RGB) | Hex Equivalent | Semantic Purpose |
|---|---|---|---|
| `--color-canvas` | `11 13 15` | `#0B0D0F` | Deepest root background / viewport canvas |
| `--color-surface` | `17 20 23` | `#111417` | Standard card, panel, and table background |
| `--color-surface-raised` | `23 26 30` | `#171A1E` | Hovered rows, elevated toolbars, dropdowns |
| `--color-slate-800` | `40 45 51` | `#282D33` | Subtle interior panel borders and dividers |
| `--color-slate-700` | `54 60 67` | `#363C43` | Strong container borders, active card borders |
| `--color-slate-100` | `232 234 237` | `#E8EAED` | Primary high-contrast body & header text |
| `--color-slate-300` | `178 184 192` | `#B2B8C0` | Secondary copy, metadata, descriptive text |
| `--color-slate-400` | `138 145 154` | `#8A919A` | Muted labels, secondary table headers |
| `--color-slate-500` | `98 105 114` | `#626972` | Disabled controls, footnote timestamps |

### 2.2 Light Mode (Clean Neutral)
| Token | CSS Variable (RGB) | Hex Equivalent | Semantic Purpose |
|---|---|---|---|
| `--color-canvas` | `244 245 247` | `#F4F5F7` | Soft neutral off-white canvas |
| `--color-surface` | `255 255 255` | `#FFFFFF` | Crisp white card and panel surfaces |
| `--color-surface-raised` | `250 250 251` | `#FAFAFB` | Raised headers, active row fills |
| `--color-slate-800` | `217 221 226` | `#D9DDE2` | Subtle light border |
| `--color-slate-700` | `203 209 216` | `#CBD1D8` | Strong light border and card outlines |
| `--color-slate-100` | `23 26 31` | `#171A1F` | Deep graphite primary text |
| `--color-slate-300` | `58 64 72` | `#3A4048` | High-contrast secondary text |
| `--color-slate-400` | `85 93 102` | `#555D66` | Clean neutral muted text |
| `--color-slate-500` | `125 133 144` | `#7D8590` | Subdued metadata & timestamps |

### 2.3 Interactive & Status Semantics
| Intent | Dark Treatment | Light Treatment | Usage |
|---|---|---|---|
| **Primary CTA** | `bg-sky-600 text-white hover:bg-sky-500 border-sky-500` | `bg-sky-600 text-white hover:bg-sky-700 border-sky-600` | Primary workflow progression |
| **Secondary Button** | `bg-slate-800 text-slate-200 hover:bg-slate-700 border-slate-700` | `bg-slate-800 text-slate-100 hover:bg-slate-700 border-slate-700` | View, cancel, filter, reset |
| **Pass Badge** | `bg-emerald-950/70 text-emerald-300 border-emerald-700/60` | `bg-emerald-50 text-emerald-800 border-emerald-300` | Certified compliant rule |
| **Fail Badge** | `bg-rose-950/70 text-rose-300 border-rose-700/60` | `bg-rose-50 text-rose-800 border-rose-300` | Violation / non-compliance |
| **Unknown Badge** | `bg-amber-950/70 text-amber-300 border-amber-700/60` | `bg-amber-50 text-amber-800 border-amber-300` | Unresolved syntax / missing evidence |

---

## 3. Typography Specification

```css
/* Air-gapped font stack: zero remote network downloads */
font-sans: "IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
font-mono: "IBM Plex Mono", SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace;
```

| Element | Class / Tokens | Size / Line Height | Weight | Font Family |
|---|---|---|---|---|
| **Page Title** | `text-xl font-bold text-slate-100` | 20px / 28px | 700 Bold | Sans-serif |
| **Section Title (H2)** | `text-base font-semibold text-slate-100` | 16px / 24px | 600 SemiBold | Sans-serif |
| **Card / Widget Title (H3)**| `text-xs font-semibold text-slate-200` | 12px / 16px | 600 SemiBold | Sans-serif |
| **Navigation Tab** | `text-xs font-medium` | 12px / 16px | 500 Medium | Sans-serif |
| **Table Header** | `text-[11px] font-semibold text-slate-400` | 11px / 14px | 600 SemiBold | Sans-serif |
| **Table Data (Standard)** | `text-xs text-slate-200 font-sans` | 12px / 16px | 400 Regular | Sans-serif |
| **Rule ID / Hash / CLI** | `text-xs font-mono select-all` | 12px / 16px | 500 Medium | Monospace |
| **System Metric Value** | `text-lg font-bold font-mono text-slate-100`| 18px / 24px | 700 Bold | Monospace |

---

## 4. Theme Persistence & Toggle Contract

1. **Storage Key:** `localStorage.getItem('ntro_theme')` with values `'dark'` or `'light'`.
2. **System Preference Fallback:** `window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'`.
3. **DOM Attributes:** When active, `document.documentElement` sets both `data-theme="dark|light"` and the corresponding `.dark` or `.light` CSS class for seamless Tailwind / CSS variable cascading.
4. **Accessible Shell Toggle:** Positioned prominently in the top header (`Navbar.tsx`) with clear visual feedback (`☼ Light` / `☾ Dark`) and accessible labels.

---

## 5. Architectural Quality Bar

- **Zero Fabricated Data:** Every rendered metric, session ID, rule status, hash, and inference time connects to real backend APIs.
- **Air-Gapped Integrity:** No external CDN scripts, font stylesheets, or remote images.
- **Role-Aware Shell Intact:** Role navigation and permissions (Viewer, Uploader, Reviewer) operate identically across both themes.
