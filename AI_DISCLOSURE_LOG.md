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

**Follow-up:** at the user's request, the `My Trips` title bar in `app/(tourist)/(tabs)/trips.tsx` is now also mobile-only. It stays a plain title because My Trips is a bottom-tab screen on mobile and does not need a back button.

**Verification:** `npx tsc --noEmit` shows no new errors. Not tested on a device or in a browser during this session.

---

## Responsive Website for Phone Browsers (2026-11-16)

AI tool: Claude Code (Anthropic). The user asked that the website fit small phones for visitors who use the browser instead of the app.

**What the AI changed**
- `utils/responsive.ts` (new): `rw()` helper that adds `data-r` tags to react-native-web elements.
- `components/common/WebAppShell.tsx`: tablet (≤1023px) and phone (≤767px) media queries for those tags. Also stops sideways page scrolling.
- `components/web/WebNav.tsx`: below 1024px the nav becomes logo + `☰` menu button with a dropdown of links, theme switch and sign in/out (44px touch targets).
- Tagged layout containers in 39 web files (no logic changes):
  - landing, home, explore, recommendations, destination details
  - sign-in, registration (tourist and business), forgot password, role select
  - the 10 web wrappers around tourist screens
  - all business/admin portal pages, `AdminShell`, `BusinessShell`, `WebLayout`

**Verification:**
- `npx tsc --noEmit` shows no new errors.
- ESLint is clean on the new and changed shared files.
- `npx expo export --platform web` builds successfully, and the page includes the `width=device-width` viewport tag.
- Not viewed on a real phone or a browser in phone size during this session.
- Wide data tables in the admin/business portals may still need sideways scrolling on very small screens.

---

## Deployment Setup and Cleanup (2026-11-16)

AI tool: Claude Code (Anthropic). The user asked for free online hosting, a guide to follow, and removal of unused files.

**What the AI did**
- Read the Expo SDK 58 docs (expo-sqlite web setup, EAS Hosting, publishing websites). Found that expo-sqlite on web needs COOP/COEP headers, so chose Netlify's free plan, which can set them with a `_headers` file.
- Added `netlify.toml`, `public/_headers`, `public/_redirects` and `guide.html` (deploy guide with checkboxes).
- Removed files that nothing in the project references: `App.tsx`, `assets/splash-icon.png`, `assets/images/biz-coastal-table.png`, and the empty `hooks/`, `assets/fonts/`, `assets/icons/` folders. Test files, `.env.example`, `testing/`, `LICENSE` and all source modules were kept.

**Verification:** `npx expo export -p web` succeeds, and the output contains `_headers`, `_redirects` and the sqlite `.wasm` file. The site was not actually deployed during this session. The team does that with their own Netlify account.

---

## Hosting Switched to Vercel (2026-11-16)

AI tool: Claude Code (Anthropic). The user asked to use Vercel instead of Netlify.

**What the AI changed**
- Removed `netlify.toml`, `public/_headers` and `public/_redirects`.
- Added `vercel.json`. It has the build command (`npx expo export -p web`), the output directory (`dist`), and the same COOP/COEP headers expo-sqlite needs on web. It also has a rewrite of all paths to `/` so refreshing a page works.
- Rewrote the hosting steps in `guide.html` for Vercel's free Hobby plan (GitHub import, or `npx vercel --prod`), plus the Vercel troubleshooting steps. Updated the README "Web Deployment" section.

**Verification:** `vercel.json` follows the Expo "Publishing websites" Vercel example, with the headers added. The site was not deployed during this session. The team deploys it with their own Vercel account.

---

## Last Updated

Phase 3 — Tourist MVP, Business Owner Portal, Administrator Portal implementation.
UI refinement — Figma color and component style alignment (2026-11-16).
Bug fix — scrolling and web menu icon on Emergency, Expenses and Budget (2026-11-16).
UI fix — mobile-only back bar on Emergency, Expenses and Budget (2026-11-16).
Responsive website for phone browsers (2026-11-16).
Deployment setup (Netlify) and unused-file cleanup (2026-11-16).
Hosting switched from Netlify to Vercel (2026-11-16).
