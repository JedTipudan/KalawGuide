# AI Disclosure Log — KalawGuide

This document discloses the use of AI tools in the development of KalawGuide, as required for the ITMSD1 Inter-Class Mobile Hackathon.

---

## AI Tools Used

| Tool | Purpose |
|---|---|
| Amazon Q Developer (AWS) | Primary development assistant — architecture, code generation, screen implementation, debugging |
| Claude Code (Anthropic) | UI refinement — reading the Figma file through the Figma MCP connector and applying its exact colors and component styles |

---

## Scope of AI Assistance

### Architecture and Planning
- Project structure design (Expo Router file-based routing, role-based navigation)
- Database schema design (13 SQLite tables with foreign keys and constraints)
- Authentication architecture (SecureStore, session management, Google OAuth flow)
- Offline-first strategy (SQLite-first, sync queue design)

### Code Generation
- All screen implementations (auth, tourist, business owner, administrator)
- Reusable component library (KalawButton, KalawInput, KalawCard, GoogleSignInButton)
- Design token system (colors, typography, spacing, radius, shadows)
- AuthContext and ThemeContext providers
- SQLite migration and seed scripts
- Budget calculation service (deterministic, no AI inference)
- KalawAssistance engine (deterministic keyword matching, no paid AI API)
- Utility functions (generateId, formatCurrency, safeNumber, date helpers)

### Design Implementation
- Color tokens extracted from Figma design (`#F7F8F5` light / `#0B1720` dark)
- Typography scale (Manrope headings, Inter body)
- Spacing and radius scales matching Figma specifications
- Light Mode and Dark Mode theming

### Documentation
- README.md
- .env.example
- This AI disclosure log

---

## Human Responsibilities

- Figma design creation (all visual designs)
- Project concept and requirements definition
- Feature prioritization decisions
- Testing on physical devices
- Google Cloud Console OAuth configuration
- EAS Build configuration and signing
- Final review and approval of all generated code
- Hackathon presentation and demonstration

---

## AI Contribution Estimate

| Area | Estimated AI Contribution |
|---|---|
| Screen implementation | ~85% |
| Architecture design | ~60% |
| Business logic / calculations | ~70% |
| Database schema | ~65% |
| Documentation | ~80% |
| Visual design (Figma) | 0% — human only |
| Testing on device | 0% — human only |
| OAuth configuration | 0% — human only |

These percentages are estimates. All AI-generated code was reviewed by the development team before inclusion.

---

## Important Notes

- No paid AI API is used at runtime. KalawAssistance uses deterministic keyword matching against locally stored data.
- Budget calculations use deterministic mathematical formulas — no AI inference is involved in financial estimates.
- Emergency contact numbers are marked as unverified in seed data. No AI invented or verified any contact information.
- All prices shown are either user-entered estimates or administrator-verified values. No AI invented prices.

---

## UI Refinement — Figma Color & Style Alignment (2026-11-16)

AI tool: Claude Code (Anthropic), connected to the team's Figma file (`MZTmx7DKqJlhSyaObMO3Ht`) through the Figma MCP connector. The visual design in Figma remains human-made. The AI only read values from it and applied them to existing code. No business logic, database, API or authentication code was changed.

**What the AI did**
- Read the Figma color variables (Design System › Semantic color palette, light and dark) and replaced every value in `constants/tokens.ts` with them. Examples: primary `#075C73` → `#0E7490` (dark `#6ED8DF` → `#22B8C7`), background `#F7F8F5` → `#F8FAFC` (dark `#0B1720` → `#071B26`), text `#122F3C` → `#1F2937`, muted `#57717A` → `#64748B`, border `#DDE7E7` → `#E2E8F0`, success `#197151` → `#22C55E`, warning/danger → `#F97316` (dark `#FB923C`). The full table is in README › Design System.
- Added Figma tokens that already existed in the design but not in code: `elevated`, `onNavigation`, `StatusColors` (RequestStatus badge fills) and a `statusLabel()` helper for badge text color.
- Replaced hardcoded old-palette hex values in 32 files with theme tokens or the new Figma values: admin screens, business owner screens, tourist booking screens, web portal screens, `AdminShell`, `BusinessShell` and `Icon`.
- Changed booking and verification status badges (8 screens) to Figma's solid-fill style.
- Shared components: `KalawButton` (radius 20 → 12, padding 13/16, 1px border), `KalawCard` (1px border plus Figma "Soft card" shadow), `KalawInput` (surface fill, 1px border).
- Tourist bottom tab bar: inactive items use the Figma `onNavigation` color. The active pill and layout were already correct and were left alone.
- Updated this log and the README Design System / Changelog sections.

**Not changed:** the mobile profile screen layout (it only picks up the new colors through tokens), screen layouts, features, data and logic.

**Verification:** `npx tsc --noEmit` shows no new errors (10 errors already existed in files this work did not touch). `npx jest` passes 116/116 tests. Lint errors in the edited files are pre-existing `setState`-in-effect warnings. The changes were not checked visually on a device or simulator.

---

## Bug Fix — Scrolling and Web Menu Icon (2026-11-16)

AI tool: Claude Code (Anthropic). The user reported that Emergency and Expenses would not scroll, and that the `☰` menu icon showed on Emergency, Expenses and Budget in web mode.

**What the AI changed**
- `components/web/WebLayout.tsx`: when a page handles its own scrolling, the layout is now held to the viewport height (`100vh`), and every wrapper between the window and the page has `minHeight: 0`. Before this, the wrappers grew to the full content height, so the page's ScrollView had no fixed height and could not scroll on web.
- `app/(tourist)/emergency.tsx`, `expenses.tsx`, `budget.tsx`: the ScrollView gets `flex: 1`, and the `☰` menu button is shown only on mobile (`Platform.OS !== 'web'`).
- `app/(tourist)/emergency.tsx`: switched to the safe-area-context `SafeAreaView` with top/left/right edges, matching the screens that already scroll correctly, and hid its built-in KalawAssistance button on web (the web wrapper already shows one).

**Verification:** `npx tsc --noEmit` shows no new errors. The fix was not tested in a browser or on a device during this session. The user needs to confirm scrolling on web and mobile.

---

## UI Fix — Mobile-only Back Bar (2026-11-16)

AI tool: Claude Code (Anthropic). The user asked that the `‹ Expense tracker` / `‹ Emergency information` back bar appear only on mobile.

**What the AI changed:** in `app/(tourist)/emergency.tsx`, `expenses.tsx` and `budget.tsx`, the whole top bar is now shown only when `Platform.OS !== 'web'`. The `‹ Title` text is now a real back button (`router.back()`, falling back to the Home tab when there is no history) with an accessibility label. Before this it was plain text that did nothing when tapped.

**Verification:** `npx tsc --noEmit` shows no new errors. Not tested on a device or in a browser during this session.

---

## Last Updated

Phase 3 — Tourist MVP, Business Owner Portal, Administrator Portal implementation.
UI refinement — Figma color and component style alignment (2026-11-16).
Bug fix — scrolling and web menu icon on Emergency, Expenses and Budget (2026-11-16).
UI fix — mobile-only back bar on Emergency, Expenses and Budget (2026-11-16).
