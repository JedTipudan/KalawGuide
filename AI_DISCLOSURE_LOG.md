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

## Live Map for Mobile and Web (2026-11-16)

AI tool: Claude Code (Anthropic). The user reported that the map wasn't showing, and asked for a free real-time map on mobile and web that works in the demo.

**Problems the AI found**
- **Web:** the map was a cross-origin OpenStreetMap `<iframe>`. The COOP/COEP headers needed by expo-sqlite block it.
- **Mobile:** the WebView map loaded tiles from `tile.openstreetmap.org`, which rejects requests that don't say which site they come from. The map's attribution was also hidden.
- **No live location:** the map only showed a fixed pin. Nothing tracked the user's position.

**What the AI changed**
- Installed `expo-location` (`npx expo install`) and added its `app.json` plugin with a permission message. The SDK 58 docs were checked first.
- Added `components/map/mapHtml.ts`: a Leaflet page with CARTO tiles, visible attribution, a pulsing live-position dot, and "locate me" / "show all" buttons.
- Added `components/map/LiveMap.tsx` (WebView) and `LiveMap.web.tsx` (same-origin `srcdoc` frame).
- Added `features/map/useLiveLocation.ts`: foreground `watchPositionAsync`, haversine distance, and a Google Maps directions link.
- Added the Map page (`app/(tourist)/map.tsx`, `app/(web)/map.tsx`) and registered its routes. Links: mobile Home button, web nav "Map", and `/map` in `index.ts`.
- Replaced the static maps on both destination detail pages with the live map, plus distance and a "Get directions" button.
- Added a "Live map" section and troubleshooting rows to `guide.html`.

**Verification:**
- `npx tsc --noEmit` shows no new errors.
- ESLint is clean on the new map files.
- `npx jest` passes 116/116 tests.
- `npx expo export -p web` builds.
- The map and GPS were not tested on a device or in a browser during this session. The team needs to test them (see `guide.html` section 7).

---

## Kalaw Assistance — Enter to Send and Deploy Check (2026-11-16)

AI tool: Claude Code (Anthropic). The user asked that the assistant work fully when deployed, and that pressing Enter sends the message.

**Findings**
- The assistant (`features/assistant/`) is a rule-based engine over the local SQLite data. It has no external AI API, so it needs no keys or server when deployed. It depends only on the browser database, which needs the COOP/COEP headers already set in `vercel.json`.
- A temporary test (deleted afterwards) confirmed that "how much budget need" returns a budget answer.
- On web, the message box is multiline, and `react-native-web` ignores `submitBehavior`, so Enter only inserted a new line.

**What the AI changed** (`components/assistant/KalawAssistanceFAB.tsx`)
- Added a web `onKeyPress` handler: Enter sends, Shift+Enter adds a new line, and IME composition is respected. Mobile behaviour is unchanged (`submitBehavior="submit"`).
- Added a `catch` in `sendMessage`, so a failed reply shows a friendly message instead of no response.

**Verification:**
- `npx tsc --noEmit` shows no new errors.
- ESLint is clean on the changed file.
- `npx jest` passes 116/116 tests.
- The keypress behaviour was not clicked through in a browser during this session.

---

## Light Mode Check Against Figma (2026-11-16)

AI tool: Claude Code (Anthropic). The user reported that parts of the admin area were not light in light mode.

**How it was checked:** the AI read the Figma light frames and their variables:
- Admin dashboard (10:10614)
- Business owner dashboard (64:29938)
- Sign in (10:17098)

It then searched the web code for dark colors hard-coded outside the theme.

**Fixed**
- `components/web/AdminShell.tsx`: the top bar and sidebar always used dark navy (`#0B2635`). They now use theme colors:
  - Light mode matches Figma: white navigation, `#1F2937` text, primary-filled active item, borders.
  - Dark mode is unchanged.
- `components/web/BusinessShell.tsx`: the light-mode sidebar is now white with a primary-filled active item, as in Figma.
- `app/(web)/sign-in.tsx`, `register-tourist.tsx`, `register-business.tsx`, `forgot-password.tsx`: the welcome panel was always dark. It now uses the theme's subtle surface and text colors.
- `app/(web)/landing.tsx`: two headings used `#123747`, a mapping error from the earlier color sweep (AI mistake). They now use the Figma text color.

**Remaining differences (not changed)**
- **Auth pages:** Figma's sign-in shows a beach photo with a heading on the left, not a text panel.
- **Admin sidebar:** Figma lists extra items (Listing Reviews, Category Management, Price Monitoring, Pending Listings, Media Moderation) that have no screens in the app.

**Verification:** `npx tsc --noEmit` shows no new errors. ESLint on the changed files shows only a pre-existing unescaped-apostrophe error in `sign-in.tsx`. Not viewed in a browser during this session.

---

## Mobile Sign-in Fixes and Assistant Recommendations (2026-11-16)

AI tool: Claude Code (Anthropic). The user reported three things on mobile sign-in: the Theme button did nothing on tap, the layout hid under the status bar, and the design needed fixing. They also asked that Kalaw Assistance answer "best places to visit in Mati" with 3 suggestions.

**What the AI changed**
- **`app/(auth)/sign-in.tsx`** (checked against Figma frame 10:17178):
  - Theme button wired to Light → Dark → System.
  - Safe-area `SafeAreaView` (top edges).
  - Real checkbox row for "Remember me" / "Forgot password?".
  - Typed text uses the text color at 15px.
  - Larger touch targets.
  - Fixed the existing `TextInput` ref type error.
- **Other auth screens** (forgot password, registration, role select, verification pending, welcome): swapped React Native's `SafeAreaView`, which ignores the Android status bar, for the safe-area-context version.
- **Assistant** (`features/assistant/intent.ts`, `assistantEngine.ts`):
  - New `recommendPlaces`, which returns 3 ranked picks from the database: featured, verified fee, free, has coordinates.
  - Optional preference filters (beach / nature / adventure / culture / food / free), matched on whole words.
  - Suggested follow-up questions.
  - "recommend / suggest / best / must see / where should we go" are now understood instead of refused.
  - The greeting mentions the Live map.
- **Tests:** 5 new tests in `assistantEngine.test.ts`, covering 3 picks with featured first, recommend/suggest phrasing, preference and free filters, whole-word matching, and no invented places when the database is empty.

**Verification:**
- `npx jest` passes 121/121 tests.
- `npx tsc --noEmit` errors went from 10 to 8. The two fixed were in sign-in, and the rest were already there.
- ESLint on the changed folders shows only a pre-existing unescaped-apostrophe error in `app/(auth)/forgot-password.tsx`.
- A temporary test (deleted) printed the real answer for the seeded Mati destinations.
- The sign-in screen was not viewed on a device during this session.

---

## Admin Settings, Working Reports & Activity Logs, Bookings Removed, README Rewrite (2026-11-16)

AI tool: Claude Code (Anthropic). The user asked for five things:
- Improve mobile admin Settings: the theme switch was missing, and it only held emergency contacts and logout.
- Remove bookings: KalawGuide advertises businesses and verifies that they are legit, but doesn't book them.
- Make Reports and Activity Logs actually work.
- Rewrite `README.md` in detail.

**What the AI changed**
- **Admin Settings** (`app/(admin)/settings.tsx`), modelled on the tourist Profile screen:
  - Account card.
  - Light / Dark / System theme picker.
  - Admin tools list with badges for pending verifications and unverified contacts.
  - About section.
  - Sign out with a confirmation step.
- **Emergency contacts** moved to their own screen: `app/(admin)/emergency-contacts.tsx`.
- **Activity logs:** before, only 3 actions ever wrote a log, so the screen was almost always empty.
  - New `services/admin/activityLog.ts` with `logActivity` (never throws), filtered queries, and readable labels.
  - Now logged:
    - Sign-in, failed sign-in, sign-up, Google sign-in, sign-out and role selection (`contexts/AuthContext.tsx`).
    - Admin role changes and block/unblock (mobile and web).
    - Destination create, edit, hide and show.
    - Category save and delete.
    - Emergency contact save and delete (mobile and web).
    - Business submission for verification and price add/remove (mobile and web).
  - The existing verification logs are unchanged.
- **Reports:** before, the "period" control was static text, half the metrics were bookings, and on mobile one failed query left the page blank.
  - New `services/admin/reportsService.ts` with live counts for 7 days, 30 days and all time.
  - Covers users, business verification, listings, tourist activity (including the amount tracked), popular destinations, and verified businesses by category.
- **Shared views:** new `components/admin/ReportView.tsx` and `ActivityLogView.tsx`, with period and category chips, loading, empty and error states. The mobile and web admin screens now all use them.
- **Bookings removed:**
  - Deleted 8 screens: `(admin)/bookings`, `(business)/bookings`, `(business)/booking-detail`, `(tourist)/booking/[businessId]`, `(tourist)/booking-history`, `(tourist)/booking-submitted`, `(web)/booking-history`, `(web)/business-bookings`.
  - Removed their routes and redirects, along with the empty `features/bookings/` folder.
  - Dashboards now show "price changes to review" and "logged events" (admin) and published prices, products and services (business) instead of booking counts.
  - Updated sign-up and notification wording.
  - Removed the booking types and `getMyBookings`.
  - The migration now drops `booking_requests`.
  - Kalaw Assistance's booking topic became `business_contact`: it explains there are no bookings and lists contact details of verified businesses only.
- **`README.md` rewritten:**
  - How verification works, features by role, assistant examples, the live map.
  - Tech stack, setup, accounts, free deployment, testing.
  - Data model (without bookings), project structure, routing, design tokens, troubleshooting.
  - A condensed changelog.

**Tests:** new `services/admin/admin.test.ts` (6 tests: report counts and period filter, empty database, log ordering and filters, never-throwing writes, labels). Assistant tests were updated for the `business_contact` topic.

**Verification:**
- `npx jest` passes 127/127 tests.
- `npx tsc --noEmit` shows 8 errors, all pre-existing in untouched files.
- ESLint shows no errors in the new or changed admin, service and component files. The setState-in-effect errors already present in older screens are unchanged.
- `npx expo export -p web` builds.
- The new screens were not tested on a device during this session.

---

## Mascot (Kiko) and App Icon (2026-11-16)

AI tool: Claude Code (Anthropic). The team supplied mascot and app-icon artwork, and asked the AI to use it wherever it would attract users. The artwork itself was provided by the team. The AI only processed and placed it.

**Image processing** (Python + Pillow, run locally; no new app dependencies)
- **App icon:**
  - Filled the black rounded-corner surround with the icon's own navy (`#072D4B`) to make a full-bleed 1024 px `assets/icon.png`.
  - Made a 196 px `favicon.png`.
  - Made an Android adaptive foreground (art inside the safe zone) on a solid navy background.
  - Set `android.adaptiveIcon.backgroundColor` in `app.json`.
- **Avatar:** made a round Kiko face crop (`kiko-avatar.png`).
- **Mascot poses:**
  - Trimmed and resized the transparent poses (`kiko-map`, `kiko-presenting`).
  - Removed the white background from three white-background poses (`kiko-welcome`, `kiko-lookout`, `kiko-relax`), and cropped stray marks at the image edges.
  - Converted all of them to 256-colour PNGs: about 1.5 MB → 70–85 KB each.

**Placement**
- New `components/brand/Kiko.tsx` (`Kiko`, `KikoAvatar`, `BrandLogo`).
- Kalaw Assistance:
  - Kiko is the chat button and the header image.
  - The greeting says "I'm Kiko" and shows the presenting pose.
  - Each assistant reply has a Kiko avatar.
- Logo: Kiko + "KalawGuide" in the web nav (wide and compact), mobile Home, Welcome and Sign-in app bars, and the landing nav and footer.
- Mobile Welcome: the 🏖 emoji placeholder is replaced by Kiko with the "Explore Mati!" sign.
- Mobile Home: the banner shows Kiko with binoculars and links to the live map.
- Web landing: the presenting pose over the hero (hidden on phones), and a "plan, then relax" tip with Kiko beside the budget section.
- Web sign-in, registration (tourist and business) and forgot-password panels: Kiko replaces the "K" badge.
- Empty states: My Trips (relaxing pose) and Favorites (binoculars pose).

**Not changed:** the Android monochrome (themed) icon still uses the previous artwork.

**Verification:**
- `npx tsc --noEmit` shows no new errors.
- ESLint shows no new errors.
- `npx jest` passes 127/127 tests.
- `npx expo export -p web` builds and bundles all six mascot images.
- Layouts were not viewed on a device or in a browser during this session.

---

## Google Sign-in Placement Fix (2026-11-16)

AI tool: Claude Code (Anthropic). The user reported that on mobile, Google sign-in appeared on Register but not on the login screen, and asked whether Figma shows it.

**Findings**
- **Figma:** the mobile Sign in (10:17178) and Tourist registration (10:17334) frames show **no** Google button.
- **Mobile sign-in:** already contained a working Google OAuth handler, but never rendered a button.
- **Mobile register:** rendered a Google button, but its handler always used a demo account, even when a real client ID was configured.

**What the AI changed**
- New `services/auth/googlePrompt.ts` (`promptGoogleProfile`):
  - Uses real Google OAuth when `EXPO_PUBLIC_GOOGLE_CLIENT_ID` is set, and demo mode otherwise.
  - Returns `null` when the user cancels.
  - The demo user ID is now fixed instead of time-based. Accounts are matched by email, so the demo user still signs in as the same account.
- Mobile sign-in: shows "Continue with Google" under the Sign In button, with an "or" divider (the Figma layout above it is unchanged). Errors are now shown instead of silently swallowed.
- Mobile tourist register and web sign-in: use the same helper. Mobile register now does real Google sign-in. Web behaviour is unchanged, and the duplicated OAuth code is removed.

**Note:** this adds a Google button the Figma frames don't show, at the user's request. The Figma design could be updated to match.

**Verification:**
- `npx tsc --noEmit` shows no new errors.
- ESLint shows only a pre-existing apostrophe error in web sign-in.
- `npx jest` passes 127/127 tests.
- Not tested on a device.

---

## Last Updated

Phase 3 — Tourist MVP, Business Owner Portal, Administrator Portal implementation.
UI refinement — Figma color and component style alignment (2026-11-16).
Bug fix — scrolling and web menu icon on Emergency, Expenses and Budget (2026-11-16).
UI fix — mobile-only back bar on Emergency, Expenses and Budget (2026-11-16).
Responsive website for phone browsers (2026-11-16).
Deployment setup (Netlify) and unused-file cleanup (2026-11-16).
Hosting switched from Netlify to Vercel (2026-11-16).
Live map for mobile and web (2026-11-16).
Kalaw Assistance Enter-to-send and error fallback (2026-11-16).
Light mode check against Figma: admin/business shells, auth panels (2026-11-16).
Mobile sign-in fixes and assistant place recommendations (2026-11-16).
Admin settings redesign, working reports & activity logs, bookings removed, README rewrite (2026-11-16).
Mascot (Kiko) and app icon added (2026-11-16).
Google sign-in placement fix (2026-11-16).
