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

## Mobile Admin: Reports, Activity Logs, Emergency Contacts, Categories (2026-11-16)

AI tool: Claude Code (Anthropic). The user reported that the admin Reports, Activity logs, Emergency contacts and Categories screens worked on web but not on mobile.

**Findings** (no Android/iOS device or emulator image was available, so these come from reading the code and building the native bundle)
- **Hidden tabs:** on mobile these four screens were registered as hidden tabs (`href: null`) inside the admin bottom-tab navigator.
  - Back always went to the first tab (Dashboard).
  - The screens stayed mounted between visits.
  - **Categories had no back button at all**, only a "☰ Control Center" title, so it was a dead end.
- **Status bar:** Categories still used React Native's `SafeAreaView`, which doesn't pad for the Android status bar.
- **Concurrent queries:** the report service fired ~20 SQL queries at once with `Promise.all`. The browser SQLite queues them, but this is fragile on the native expo-sqlite driver, which shares one connection.

**What the AI changed**
- **Restructured mobile admin like the tourist app:**
  - `app/(admin)/_layout.tsx` is now a Stack.
  - The five tab screens moved to `app/(admin)/(tabs)/` (with their own Tabs layout and updated imports).
  - Categories, Reports, Activity logs and Emergency contacts are Stack screens pushed over the tabs, so Back returns to the screen they came from.
  - Route strings were updated (`/(admin)/(tabs)/…`), as was the web Destinations wrapper import.
- **Categories:** "‹ Destination categories" back bar, plus a safe-area-context `SafeAreaView`.
- **`services/admin/reportsService.ts`:** queries now run one at a time (`inOrder`).
- **`ReportView` / `ActivityLogView`:** the error state now shows the real error message, so any remaining device-specific problem is visible.

**Verification:**
- `npx tsc --noEmit` shows the 8 pre-existing errors only, after regenerating typed routes with a short `expo start`.
- `npx jest` passes 127/127 tests.
- ESLint shows only the existing setState-in-effect pattern.
- `npx expo export -p android` compiles the native Hermes bundle.
- `npx expo export -p web` builds.
- **Not run on a phone during this session.** The user needs to confirm on Expo Go.

---

## Demo Prices, "What Is Cheapest?", Photos Everywhere, Deploy & APK Guide (2026-11-17)

AI tool: Claude Code (Anthropic). The user asked: why the map seemed to need an API on mobile; a guide to deploy everything online and to build an APK that Android doesn't flag as unsafe; seed data with prices to demonstrate budgeting; the assistant to suggest the cheapest options; their own resort photos to be used; the duplicate landing photo fixed; and pictures on list items that had none.

**Findings**
- **Map:** it never needed an API key (Leaflet + free CARTO/OpenStreetMap tiles + phone GPS). The confusion came from an unused `EXPO_PUBLIC_API_BASE_URL` in `.env.example`, which has been removed. The map now falls back to jsDelivr/cdnjs if unpkg is blocked, and shows "needs an internet connection, no API key required" instead of a grey box.
- **Landing duplicate:** `hero-coast.png` was a byte-for-byte copy of `hero-bg.png`. The `onboarding-1/2/3.png` files were also copies of other images. All four duplicates were deleted, which makes the APK smaller.
- **Kalaw Assistance guard:** the prompt-injection guard drops any business text containing the word "terminal", so a "Van Terminal" listing silently disappeared. The listing was renamed and the guard was not weakened.
- **Route bug:** the Favorites empty-state buttons pushed `/(tourist)/explore`, which doesn't exist. They now push `/(tourist)/(tabs)/explore` and `/(tourist)/(tabs)/businesses`.

**What the AI changed**
- **Photos:**
  - The user's 9 resort photos were converted (AVIF/PNG/JPG → JPEG, max 960 px, about 70–200 KB each) into `assets/images/places/`.
  - New `utils/placeImages.ts` resolves a picture in this order: uploaded photo, then a photo matched by name, then a photo that fits the category. The helper `distinctByPhoto` keeps a row of cards from repeating a picture.
  - It is used on mobile and web Explore, Home, Businesses, Favorites, Recommendations, destination and business details, the landing page, assistant destination cards, and the mobile splash screen.
  - `KalawCard` gained an `image` prop.
- **Demo seed:** `database/seeds/demoContent.ts` is idempotent, uses stable IDs, and runs on every launch, so it also reaches existing installs. It adds:
  - 4 destinations: Sleeping Dinosaur, Waniban Island, Pujada Island and Subangan Museum.
  - 13 approved businesses owned by a demo owner account that can't sign in: 8 resorts from the user's photos, 2 food, 2 transport and 1 island-hopping operator.
  - Sample prices and facilities.
  - Prices are marked `Sample price…` in `conditions`. `knowledge.ts` then reports them as **estimate**, not verified. No phone numbers were invented.
- **"What is cheapest?":**
  - `assistantEngine.ts` adds a `cheapest` answer. It lists the lowest stay, food, transport, activity or place prices, or, when no type is named, builds the cheapest complete trip (fare, room, meals, free spots) with a total and a check against the user's budget.
  - Bisaya/Tagalog "mura / pinakamura / barato / tipid" are recognised.
  - New suggestion chips were added.
- **Budget planner:** "Quick fill from KalawGuide prices" with Cheapest / Mid-range / Comfort presets (`services/budget/budgetPresets.ts`). Each preset shows where every amount came from.
- **Android:** `app.json` blocks the CAMERA and RECORD_AUDIO permissions, which the image picker added by default but the app never uses. It also sets `versionCode`. `eas.json` sets `appVersionSource: remote` and makes production an app bundle.
- **Docs:**
  - `guide.html` was rewritten: why the map needs no API key, pre-deploy checks, Vercel, the EAS APK, avoiding Play Protect warnings (release signing, minimal permissions, the appeal form, Play internal testing), Android developer verification, and a demo script.
  - `.env.example` was cleaned up.
  - README was updated.
- **Pre-existing type errors fixed:** tab icon color types and the root layout segment check. `app/index.tsx` now calls its hook before the early return.

**Verification:**
- `npx tsc --noEmit` shows **0 errors** (previously 8).
- `npx jest` passes all suites, including new tests for the cheapest answers, the demo seed, budget presets and the map HTML.
- `npx expo lint` shows the same 102 pre-existing problems; no new ones.
- `npx expo export -p web` builds, with all photos bundled.
- `npx expo export -p android` compiles the native bundle.
- **Not run on a phone or in a browser during this session.** The user should check the screens visually and install the APK. Android rules for developer verification were checked against Google's announcements (enforcement started 30 Sep 2026 in Brazil, Indonesia, Singapore and Thailand, with a global rollout planned for 2027).

---

## Prices on Every List, Based on Mati Travel Guides (2026-11-17)

AI tool: Claude Code (Anthropic). The user asked for a PHP price on every list item in the app, based on real Mati, Davao Oriental prices where available.

**Research:** a web search found no official fee list from Mati City or Davao Oriental. Travel blogs and guides (2013–2025) report:
- a ₱100–150 consumable entrance at Dahican beachfront resorts;
- about ₱5–10 at the Sleeping Dinosaur viewing deck;
- ₱50 each at Subangan Museum and Menzi Beach Park;
- ₱10 at Pangyan Falls;
- Pujada Bay island hopping from Brgy. Tam-isan at about ₱200 per person on weekends, or ₱4,000 for a whole boat.

Those figures were used. Everything else stays a typical local rate, and every price is labelled "estimate".

**What the AI changed**
- New `utils/priceLabel.ts`:
  - `feeLabel` gives "Entrance ₱50 / person · estimate", "Free entrance", or "not recorded yet".
  - `fromPriceLabel` gives "From ₱1,200 / room / night".
  - `LOWEST_PRICE_SQL` finds a business's lowest price; for stays it is the cheapest room, not a day pass.
- Prices now appear on:
  - mobile Explore, Home and the trip picker;
  - the Businesses list (mobile and web);
  - both Favorites screens;
  - web Explore and Home;
  - the landing page destination and resort cards.

  Before this, mobile Explore always said "needs verification", and web Explore showed "Free" when a fee was simply unknown.
- **Seed data:**
  - Fee updates: Dahican Beach ₱100, Sleeping Dinosaur ₱10, Waniban Island ₱50.
  - New destinations: Menzi Beach Park & Campsite (₱50) and Pangyan Falls (₱10).
  - Dahican Surf Resort has a ₱100 consumable entrance.
  - Island hopping is ₱250 per person, or ₱4,000 for a private boat.
  - Existing installs get these updates. Only rows still marked as sample prices, or fees nobody has verified or changed, are touched.
- **Tests:** label formatting, the v2 update, and a check that an admin-verified fee is left alone.

**Verification:**
- `npx tsc --noEmit` shows 0 errors.
- `npx jest` passes 143/143 tests.
- The web and Android production bundles build.
- ESLint shows only the existing setState-in-effect pattern in the edited files.
- **Not checked on a phone or in a browser.**

---

## Keyless Map, Resort Locations, Unique Mati Photos, .gitignore (2026-11-17)

AI tool: Claude Code (Anthropic). The user saw "API KEY REQUIRED · carto.com/basemaps/apikey" on the map after opening a resort in Expo Go. They also asked for photos that don't repeat, taken from real images of Mati, and for unneeded files to stay off GitHub.

**Findings**
- CARTO began requiring an API key for its raster basemaps (enforced from 25 Sep 2026, per CARTO's FAQ). Without a key, every tile is a watermark. This affected Expo Go, the APK and the website.
- With `curl`, Esri `server.arcgisonline.com` tiles (street, dark gray, imagery, labels) and `tile.openstreetmap.org` tiles returned real images without a key, with `Access-Control-Allow-Origin: *`. CARTO returned a 2 KB watermark.
- A headless Edge render of the map showed some approximate demo pins in the wrong place, including one in the sea. OpenStreetMap's Nominatim search gave real positions for most places. It also showed that Cape San Agustin is in Governor Generoso and Pangyan Falls is in Lupon, not Mati.

**What the AI changed**
- **`components/map/mapHtml.ts`:**
  - The default tiles are now Esri World Street Map (dark mode: Esri Dark Gray plus a labels overlay).
  - It switches to OpenStreetMap automatically after repeated tile errors.
  - A new 🛰 button shows Esri World Imagery with place labels.
  - CARTO is used only if the optional `EXPO_PUBLIC_CARTO_KEY` is set.
  - Tests cover the source order, dark mode and the key behaviour. A headless browser render confirmed the tiles load in light and dark mode.
- **Business/resort detail page:** a location map with the user's live position, the distance, and Get directions.
- **Positions:** seed coordinates corrected (OpenStreetMap where the place is mapped, otherwise approximate on the right stretch of coast), along with location labels.
  - Existing installs are updated only where the old seeded position is unchanged, so a position an admin fixed is never overwritten.
  - Demo-owned businesses are always kept current.
- **Photos:**
  - 14 photos were downloaded from Wikimedia Commons via its API, licensed CC BY 2.0, CC BY-SA 3.0 or CC BY-SA 4.0. They were resized to 960 px and stored in `assets/images/places/commons/`.
  - Authors, licenses and source links are in `CREDITS.md`, and the landing footer credits them.
  - `utils/placeImages.ts` now gives every seeded destination and business its own photo; a test enforces this.
  - The photo for Pangyan Falls is illustrative (it shows Aliwagwag), as stated in the credits.
- **`.gitignore`** now also blocks app builds (`*.apk`, `*.aab`, `*.ipa`), signing and credential files (`*.keystore`, `credentials.json`, `google-services.json`, …), every `.env.*` except `.env.example`, logs and caches, OS and editor files, `.vercel/` and local assistant settings. `git ls-files -ci --exclude-standard` confirmed that nothing already tracked is affected.
- **`guide.html`, `README.md` and `.env.example`:**
  - Why the CARTO error happened, and that no key is needed now.
  - What to do in Expo Go, on Vercel and for the APK (rebuild).
  - The optional CARTO key.
  - A new "Keep junk off GitHub" section.

**Verification:**
- `npx tsc --noEmit` shows 0 errors.
- `npx jest` passes all tests.
- `npx expo export` builds for both web and Android.
- **Not tested in Expo Go on a phone during this session.** The user should reload Expo Go and build a new APK.

---

## Real Map with a Free API Key (2026-11-17)

AI tool: Claude Code (Anthropic). The user asked for a "real map" using a map API with a free tier, plus a guide so they can set it up themselves.

**Research:**
- MapTiler's free plan: 5,000 map sessions a month, non-commercial use, no credit card, and usage pauses instead of being billed.
- Google Maps Platform: Dynamic Maps has a 10,000/month free cap and needs a billing account.

These figures come from the pricing pages and third-party summaries, as of November 2026.

**What the AI changed**
- **New `components/map/realMapHtml.ts`:**
  - A MapTiler engine (MapLibre GL 4.7.1 from unpkg, with jsDelivr as backup; streets-v2 / streets-v2-dark / hybrid styles; 3D tilt, compass, satellite toggle).
  - A Google Maps JavaScript API engine (roadmap/hybrid, Street View, 45° tilt, dark style).
  - Both use the same message protocol as the keyless map.
  - A rejected key (HTTP 401/403 from MapTiler, or Google's `gm_authFailure`) sends `{type:'fallback'}`.
- **`mapHtml.ts`:** `chooseMapProvider` reads `EXPO_PUBLIC_MAPTILER_KEY`, `EXPO_PUBLIC_GOOGLE_MAPS_KEY` and `EXPO_PUBLIC_MAP_PROVIDER`. `buildMapHtml` picks the engine.
- **`LiveMap` (native and web):** on `fallback`, it redraws with the keyless map and logs `Map key problem (…)`. On native, links inside the map open in the browser instead of replacing the map. The map page's origin (`https://kalawguide.app/`) is a named constant, because key restrictions depend on it.
- **Config:**
  - `eas.json` profiles are linked to the EAS `development` / `preview` / `production` environments.
  - `.env.example` documents the new keys.
- **Docs:**
  - A new `guide.html` section covers MapTiler and Google setup step by step: sign-up, key, origin and website restrictions including `kalawguide.app`, `.env` with `expo start -c`, Vercel, `eas env:create` plus rebuild, Google quota and budget caps, how to tell which map is showing, and troubleshooting.
  - README updated.
- **Tests:** provider selection, each engine's output (valid JavaScript, key in the URLs, escaping, fallback hooks), and `forceFree`.

**Verification:**
- Headless Edge with a fake MapTiler key and a fake Google key: both pages sent `fallback`.
- The MapLibre engine rendered real tiles over Mati, with correct pins and the 3D / 🛰 / ⤢ / ◎ controls, when given a raster style. MapTiler's own vector tiles couldn't be rendered headlessly without a real key, and headless Edge also stalls MapLibre's vector workers.
- `npx tsc --noEmit` shows 0 errors.
- `npx jest` passes.
- The web and Android bundles build.
- **Not verified with a real MapTiler or Google key, or on a phone.** The user needs to create a key and follow `guide.html`.

---

## Guide Fix: MapTiler Key Steps Match the Real Dashboard (2026-11-17)

AI tool: Claude Code (Anthropic). The user's MapTiler dashboard showed **API keys → New** and a "Create a new key" form (Name, Description, Allowed user-agent header, Allowed HTTP Origins). It did not show the "Account → API keys / Default key" the guide described.

`guide.html` now walks through that form field by field:
- Leave the user-agent field and the origins field empty at first.
- Copy the key from the API keys list.
- Once the map works, lock the key with `kalawguide.app`, the Vercel address, `localhost` and `?`. The `?` allows requests with no origin, which some Android WebViews send.
- The troubleshooting row was updated to match.

Documentation only; no code changed.

---

## Fix: MapTiler Map Blank (Only the Pins Showed) (2026-11-17)

AI tool: Claude Code (Anthropic). After adding a MapTiler key, the user saw the pins but no map.

**Diagnosis**
- The key in `.env` was valid. With `curl`, all three styles, tiles.json, the vector tiles and the fonts returned 200, with `Access-Control-Allow-Origin: *`.
- In real Chrome (driven through the Claude in Chrome extension), the same map page rendered fully when opened directly.
- Inside an `about:srcdoc` iframe, which is how the website embeds the map, MapLibre's tiles stayed "loading" forever. This happened with or without the COOP/COEP headers, so the trigger is `srcdoc` itself. No error event fires in that case, so the bad-key fallback never triggered.
- A `blob:` URL iframe under the same COOP/COEP headers rendered the full map.
- Earlier, headless Edge had shown the same blank map, and it was wrongly put down to a headless limitation.

**What the AI changed**
- **`LiveMap.web.tsx`:** the map page is now loaded from a `blob:` URL (same origin, allowed under COEP) instead of `srcDoc`, and old blob URLs are released.
- **`realMapHtml.ts`:** a 20-second safety net. If the MapTiler map hasn't finished loading, it reports `maptiler-timeout` and the app shows the keyless map, so the map can never stay blank.

**Verification:**
- In the user's running dev server, `/map` in Chrome showed the full MapTiler map (roads, towns and labels around Mati, dark mode), and the 3D tilt worked.
- `npx tsc --noEmit` shows 0 errors.
- `npx jest` passes.
- The native phone app loads the page with a real base URL (`https://kalawguide.app/`), not `srcdoc`. Expo Go wasn't tested on a phone; the 20-second fallback covers it if anything else goes wrong there.

---

## Shared Online Database for Multi-Device Testing (2026-11-17)

AI tool: Claude Code (Anthropic). The user's second course has an instructor who will create tourist and business accounts on their own devices and use the admin account. A business approved by the admin must therefore show on the tourist side across devices. With on-device SQLite, every device had its own copy, so that could not work.

**Decision:** Turso, a hosted SQLite (libSQL) database with a free plan and no credit card, accessed over its HTTP API.
- The app already used only four expo-sqlite calls with plain SQL (`getAllAsync` ×64, `getFirstAsync` ×67, `runAsync` ×161, `execAsync` ×13).
- A drop-in adapter keeps all screens unchanged. Moving to Firebase or Supabase would have meant rewriting the queries.
- The on-device mode stays as the default when no Turso settings are present.

**What the AI changed**
- **New `database/remote/tursoDatabase.ts`:**
  - Turso "Hrana over HTTP" (`POST /v2/pipeline`) with typed arguments and values.
  - Each `BEGIN … COMMIT` is buffered into one atomic request; reads flush pending writes first.
  - `PRAGMA table_info` is answered from an empty `SELECT`, and local-only PRAGMAs are skipped.
  - Clear errors for a missing connection and for a bad token.
- **`init.ts`:** the online mode is used when `EXPO_PUBLIC_TURSO_DATABASE_URL` and `EXPO_PUBLIC_TURSO_AUTH_TOKEN` are set. `DATABASE_MODE` is exported, and a `users.password_hash` column is added.
- **Accounts:**
  - Password hashes move from device storage into the users table, so accounts sign in on any device.
  - New `services/auth/passwords.ts` uses a salted SHA-256 hash (expo-crypto). Old hashes are still accepted and upgraded on sign-in.
  - The admin's hash is seeded into the database.
- **Uploads:** business cover photos and verification documents are stored as compressed `data:` URIs (`utils/pickImage.ts`, with a size cap), so the admin can see them from another device.
- **Admin Settings** (mobile and web) shows "Shared online database" or "on this device".
- **Docs:**
  - A new `guide.html` section covers creating the database and token, connecting `.env`, Vercel and EAS, rehearsing the three-device test, backups, starting fresh, and security.
  - `.env.example` and README updated.

**Verification:**
- New tests use a stand-in Turso server that speaks the same JSON protocol over Node's SQLite. Three isolated "devices" run the full scenario: a business registers with a document on phone A; the admin signs in and approves on laptop B (and sees the document); the owner signs in and a tourist sees the approved business on phone C; the shared seed runs only once.
- `npx tsc --noEmit` shows 0 errors.
- `npx jest` passes all tests.
- The web and Android bundles build.
- **Not tested against a real Turso database.** The user still has to create one. Turso's CORS behavior for browser use could not be checked without a real database, so the guide and the error messages cover it.

**Security note (also in the guide):** the database token ships inside the app, as with map keys. That's acceptable for a class demo with no real personal data. A public launch would need a server API in between.

---

## Phone Layout for Admin/Business Website and APK Build Fix (2026-11-17)

AI tool: Claude Code (Anthropic). The user reported two problems: (1) on a phone browser, the admin and business-owner pages overlapped, and (2) the EAS Android build failed at `:app:mergeReleaseResources` with `AAPT: error: file failed to compile` for `hero-bg.png`, `dest-waniban.png` and `dest-sleeping-dinosaur.png`.

**Cause of the APK error:** those three files were JPEG photos saved with a `.png` name. Android's resource compiler (AAPT2) reads the extension, tries to compile them as PNG, and fails.

**What the AI changed**
- Renamed the three files to `.jpg` (`git mv`) and updated every `require()` (onboarding, landing, web home, mobile index, `utils/placeImages.ts`). All other images were checked by their file header and are real PNGs.
- New phone-only (≤ 767 px) CSS tokens in `components/common/WebAppShell.tsx`:
  - `table`: admin/business tables keep a 680 px minimum width and scroll sideways inside their card instead of squashing columns on top of each other.
  - `cols`: side-by-side cards and form fields stack into one full-width column.
- Applied to the web admin and business pages (`app/(web)/admin-*.tsx`, `business-*.tsx`): every table gets `table`; two-column form rows and the business dashboard stats/cards get `cols`; button rows, the products tabs and settings rows get `wrap`; page titles get `h2` (smaller on phones).

**Checks:** `npx tsc --noEmit` passes. `npx expo lint` reports the same 60 pre-existing problems before and after. The phone layout was not checked in a browser by the AI, and a new APK build has not been run yet.

---

## Kalaw Assistance: Cloud AI + Local AI with Offline Data Sync (2026-11-17)

AI tool: Claude Code (Anthropic). The user asked for Kalaw Assistance to have a real AI, free of charge. A cloud part would gather users' latest changes while online, and a local part would keep answering from that stored data offline. The approach was left to the AI.

**Decisions**
- **Cloud AI:** Google Gemini, free tier (no billing), model alias `gemini-flash-lite-latest`, via the Interactions API (`POST /v1beta/interactions`, `x-goog-api-key` header). The AI read Google's current docs first: they now call `generateContent` legacy, and Gemini 2.5 models are deprecated.
- **Local AI:** the existing deterministic engine stays the source of facts and the offline answerer. The cloud model only rewords its answer, using the engine's draft plus a compact copy of KalawGuide's data. It is told to copy prices exactly and to never invent anything, and its output still passes `validateOutput`. The input guard and off-topic refusal still run first, in code.
- **Offline data:** a snapshot (destinations, approved businesses, prices, facilities, emergency contacts) is kept in AsyncStorage. It is refreshed while online: on start, on reconnect, on opening the chat, and every 2 minutes. With the shared Turso database, reads fall back to it when the database can't be reached, and skip the network when the device is known to be offline.

**What the AI changed**
- New `features/assistant/knowledgeCache.ts` (snapshot storage) and `features/assistant/cloudModel.ts` (Gemini client, prompt rules, data-to-text, response parsing).
- `features/assistant/knowledge.ts`: queries are now "live first, snapshot when offline"; added `syncKnowledge()`.
- `features/assistant/assistantEngine.ts`: calls the cloud AI when online and configured, and falls back to the local answer on any error, timeout (15 s) or used-up quota. Reply metadata records `cloud_ai` and the snapshot time.
- `components/assistant/KalawAssistanceFAB.tsx`: background sync; the status shows `Online · Cloud AI` or `Offline · Local AI · data from …`; offline answers show when the data was saved; the last 6 messages are sent as context.
- `types/index.ts`: `model` can be `cloud_ai`; new `dataSyncedAt`.
- `.env.example`: `EXPO_PUBLIC_GEMINI_API_KEY`, `EXPO_PUBLIC_GEMINI_MODEL`.
- Tests: `cloudModel.test.ts`, `knowledgeCache.test.ts`. A Jest setup file adds the official AsyncStorage mock (`testing/jestSetup.js`, `package.json`).

**Limitations**
- **Not tested against the real Gemini API** (no key was available). The request and response shape follow Google's docs. The response parser also accepts the older `generateContent` shape.
- **Not checked in the docs:** free-tier request limits and browser CORS. If Gemini fails, the local answer is shown.
- **The key ships inside the app,** like the map and Turso keys.
- **Chat history is not queued offline.** With the shared database, messages sent offline are shown but not saved.

---

## Cloud AI Guardrails (2026-11-17)

AI tool: Claude Code (Anthropic). The user asked that the cloud AI never answer outside the app's scope, using guardrails or a better approach.

**Approach:** a grounding check on the model's output, on top of the input guard and system rules. A system prompt alone can be talked around, so the app checks the reply in code and falls back to the database-only local answer.

**What the AI changed**
- `features/assistant/cloudModel.ts`: new `checkCloudReply()`. It rejects replies that:
  - are over 1,500 characters;
  - contain links, domains, HTML or code blocks;
  - contain off-topic words (the same list as the intent check) that KalawGuide's data doesn't use;
  - contain a peso amount, a 7+ digit phone number, or a **bold** name not found in the local draft, the synced data or the question.
- The system rules now limit bold to names from the data and forbid code.
- `features/assistant/assistantEngine.ts`: a rejected cloud reply is discarded and the local answer shown. If the model gives the standard refusal, that refusal is kept.
- `features/assistant/intent.ts`: `OFF_TOPIC` is exported so both checks share one list.
- `features/assistant/cloudModel.test.ts`: tests for grounded, invented-price, invented-place, invented-number, off-topic, link/code and length cases.
- The user's local setup guide (`guide.html`, gitignored, not pushed) got a cloud AI section: getting a free key, adding it for Expo, Vercel and EAS, test steps, the guardrails, and troubleshooting.

**Limitation:** the checks are pattern-based. A reply that is on-topic but rephrased loosely can still pass if it uses no unknown prices, numbers or names. It can only use facts KalawGuide already has.

---

## Installable Website (PWA) for iPhone and Android (2026-11-17)

AI tool: Claude Code (Anthropic). The user wants iPhone users, and anyone who doesn't want the APK, to use the website as an app. The approach was left to the AI.

**Decision:** make the existing Expo website a Progressive Web App, following Expo's PWA guide for `web.output: "single"`: a `public/index.html` template (made with `npx expo customize public/index.html`) plus `public/manifest.json`. The AI wrote a small service worker by hand instead of Expo's suggested Workbox. Pages are network-first, which avoids the stale-update problem Expo's guide warns about.

**What the AI changed**
- `public/index.html`: manifest link, `theme-color`, iOS tags (`apple-mobile-web-app-capable`, title, status bar style, `apple-touch-icon`), and service-worker registration (skipped on localhost and LAN).
- `public/manifest.json`: name, standalone display, navy theme and background colors, icons.
- `public/icons/`: 192, 512, maskable 512 and 180 (Apple) PNGs, made from `assets/icon.png` with Pillow.
- `public/sw.js`:
  - Pages are network-first, with a cached copy used offline.
  - Same-origin built assets are cache-first.
  - Other sites (Gemini, Turso, map tiles) are never cached.
- `components/web/InstallAppBanner.tsx`, shown from `WebAppShell`:
  - iOS gets *Share → Add to Home Screen* steps.
  - Chrome/Edge get a real Install button (`beforeinstallprompt`).
  - Hidden when already installed, and for 14 days after dismissal.
- `vercel.json`: `no-cache` for `sw.js`, and the manifest content type.

**Checks:** `npx tsc --noEmit` passes. `npx expo export -p web` puts the manifest, icons and `sw.js` in `dist/`, and the tags in `index.html`.

**Limitations**
- **Not tested on a real iPhone or Android browser.**
- **Possible iPhone database problem (not confirmed):** the site's `Cross-Origin-Embedder-Policy: credentialless` header may not be supported by Safari, and on-device web SQLite needs it. With the shared Turso database set on Vercel, the website doesn't use on-device SQLite at all.

---

## Fix: "Invalid VFS state" on Google Sign-In (Web/PWA) (2026-11-17)

AI tool: Claude Code (Anthropic). The user installed the PWA on Windows. Google sign-in showed "Invalid VFS state".

**Cause:** on the web, expo-sqlite stores data with OPFS access handles (`AccessHandlePoolVFS`), and only one window can hold them at a time. After Google sign-in, the redirect loads the site inside the sign-in popup. That popup booted the whole app, tried to open the database the main window already held, and failed. It never sent the sign-in result back to the main window.

**What the AI changed**
- `app/_layout.tsx`: before any provider mounts, a window opened as the auth popup calls `WebBrowser.maybeCompleteAuthSession()`, sends the result to the main window, and shows only "Signing you in…". The database is never opened in the popup.
- `database/migrations/init.ts`: VFS / access-handle errors become a clear message: KalawGuide is already open in another window or tab, so close it and reload.

**Not verified:** the AI couldn't run a real Google sign-in. The fix follows the expo-sqlite and expo-web-browser source code in `node_modules`.

---

## Category Icons, Overlap Fixes and Business Layout (2026-11-17)

AI tool: Claude Code (Anthropic). The user reported: destination category icons showed as words ("bed", "mo", "wav") in the APK; things overlapped in the app, the phone browser and the PWA; and the tourist Businesses list was too big, even on a desktop browser.

**Causes found**
- Seed categories stored icon *names* (`bed`, `mountain`, `waves`…) and screens printed them as text, cut off inside a 44 px badge.
- `WebLayout` gave scrolling pages `minHeight: 0`, so on short screens the body shrank to the window height and content ran under the footer.
- The tourist tab bar (APK) was 66 px tall with 42 px of padding, leaving about 24 px for an icon and label that need about 50 px.
- Business cards were one full-width column on every screen, and on the website a business opened the bare phone screen stretched across the window.
- `Inter`/`Manrope` were never loaded on the web, so text fell back to Times.
- With 9 links, the tourist web nav ran into the logo at about 1200–1300 px wide. The PWA install banner sat on top of the Sign In button.

**What the AI changed**
- `utils/categoryIcon.ts` (new) maps stored icon names to emoji. It is used in the admin Categories and Destinations screens. New seeds store emoji.
- `components/web/WebLayout.tsx`: scrolling pages keep their full height. On phones, the footer is hidden on fixed-height pages.
- `app/(tourist)/(tabs)/_layout.tsx`: tab bar padding and icon sizes fixed.
- `app/(tourist)/(tabs)/businesses.tsx` and `components/cards/KalawCard.tsx`: 1 column on phones, 2 on tablets and 3 on desktop, with equal-height cards and shorter photos.
- `app/(web)/business/[id].tsx` (new): business details on the website now have the nav bar and a centered 860 px column.
- `constants/tokens.ts` and `public/index.html`: web fonts load from Google Fonts, with a sans-serif fallback. Native uses the system font.
- `components/web/WebNav.tsx`: the tourist menu collapses below 1320 px. `components/web/InstallAppBanner.tsx`: on wide screens, the banner is a small card in the bottom-left corner.

**Checked:** in Chrome, admin pages at desktop and phone width (390 px), and the tourist Businesses grid at desktop width. A layout script measured overlapping text before and after the footer fix. Typecheck and the 177 tests pass.
**Not verified:** the APK itself (needs a new EAS build). Chrome stopped responding before the business-owner web pages could be re-checked visually, so those were reviewed in code.

---

## Guide Fix: EAS `env:create` Renamed to `env:set` (2026-11-18)

AI tool: Claude Code (Anthropic). The user ran the guide's Turso APK step and got: "This command is deprecated. Use eas env:set instead" and "Flag --name can only be specified once".

**Causes found**
- EAS CLI renamed `eas env:create` to `eas env:set`.
- Both commands were pasted at once, so they ran as one command with two `--name` flags.

**What the AI changed**
- `guide.html` (local only, not in git): every `env:create` is now `env:set`.
- The user still got an error pasting the token inside the long command. The Turso and Gemini APK steps now add secrets on the expo.dev *Environment variables* page (Option A), or with a plain `eas env:set` that asks for each value (Option B). The token is never pasted into a command line.

---

## Shared Database Fix and Responsive Check on Every Screen (2026-11-18)

AI tool: Claude Code (Anthropic). The user asked for every screen to be responsive with no overlap (APK, desktop browser, phone browser and PWA), then a push and a new APK now that the shared Turso database is set up.

**How it was checked**
- The web app ran locally against the shared Turso database. Every tourist, public, admin and business page (46 routes) was loaded at 360 px (phone), 768 px (tablet) and 1224 px (desktop). A script measured each page for sideways overflow, text off the right edge, clipped text and overlapping visible text. The landing page was also checked at 900, 1024, 1100 and 1280 px.
- Admin and business pages were opened with a browser-only test session for the seeded admin and demo-owner accounts. Nothing was changed in the database.
- Native-only screens were reviewed in code: all use safe-area insets, and no fixed width is wider than a phone.

**Problems found and fixed**
- **Businesses never showed with the shared database** ("No businesses found"). The "from" price subquery used the outer column `b.category` in its `ORDER BY`, which Turso rejects (`no such column: b.category`). The local SQLite on each device accepts it, so this only happened online. `utils/priceLabel.ts` now keeps that column in `WHERE` and falls back to the cheapest price of any kind. Same result: stays still show the cheapest room. This also fixes prices on the landing page and Favorites.
- **Landing page menu overlapped at tablet widths** (768–1000 px): the text links ran into the theme and Sign in buttons. `app/(web)/landing.tsx` shows the text links only from 1024 px.
- **Empty text rendered inside a View.** `{error && <Text>}` with `error = ''` puts an empty string straight into a View. The web logged "Unexpected text node", and Android can crash with "Text strings must be rendered within a <Text> component". `components/common/KalawInput.tsx` and 6 screens now use `!!value &&`.

**Not changed**
- 58 existing lint errors (mostly unescaped quotes in text) are unrelated to this work.

---

## Hamburger Menu Only on Phones, Full Nav on Laptops (2026-11-19)

AI tool: Claude Code (Anthropic). The user reported that the website looked like the phone version on a desktop or laptop (☰ menu). They wanted the ☰ menu only in phone browsers and phone PWAs.

**Change**
- `components/web/WebNav.tsx`: the tourist nav switched to the ☰ menu below 1320 px (and the other roles below 1024 px), so most laptops got the phone menu. The ☰ menu now shows only below 768 px, the same breakpoint the admin and business shells already use.
- Between 768 and 1320 px (laptops, small desktop windows, laptop PWAs), the full link bar stays. It uses smaller padding and gaps, and the links wrap onto a second line instead of running into the logo.

---

## Fix: Chatbot Input Hidden by the Keyboard on the APK (2026-11-24)

AI tool: Claude Code (Anthropic). The user reported that in the Android APK, the keyboard covered the Kalaw Assistance (Kiko) text box. They had to close the keyboard to see what they typed.

**Change**
- `components/assistant/KalawAssistanceFAB.tsx`: the `KeyboardAvoidingView` wrapped only the input row and used `behavior="height"` on Android. Android apps are now always edge-to-edge (React Native 0.88), so the window no longer resizes for the keyboard and the input stayed behind it. The `KeyboardAvoidingView` now wraps the whole chat with `behavior="padding"` on every platform, so the message list shrinks and the input sits just above the keyboard.
- The chat `Modal` is drawn edge-to-edge on Android (`statusBarTranslucent`, `navigationBarTranslucent`) so the keyboard's position matches the layout. `SafeAreaView` still keeps content clear of the system bars.
- The message list scrolls to the newest message when the keyboard opens. Tapping a suggestion or the send button no longer just closes the keyboard first (`keyboardShouldPersistTaps="handled"`).

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
Mobile admin navigation and reports fix (2026-11-16).
Demo prices, "what is cheapest?", photos on every list, deploy & APK guide (2026-11-17).
Prices on every list, based on Mati travel guides (2026-11-17).
Keyless map, resort locations, unique Mati photos, .gitignore (2026-11-17).
Real map with a free API key (MapTiler / Google) and setup guide (2026-11-17).
Guide fix: MapTiler key steps (2026-11-17).
Fix: MapTiler map blank on web (srcdoc → blob iframe) + 20 s fallback (2026-11-17).
Shared online database (Turso) for multi-device testing (2026-11-17).
Phone layout for admin/business website and APK build fix (JPEGs named .png) (2026-11-17).
Kalaw Assistance cloud AI (Gemini free tier) + local AI with offline data sync (2026-11-17).
Cloud AI guardrails: replies checked against KalawGuide data (2026-11-17).
Installable website (PWA) for iPhone and Android (2026-11-17).
Fix: "Invalid VFS state" on Google sign-in in the web app/PWA (2026-11-17).
Category icons, overlap fixes, business list grid and web business page (2026-11-17).
Guide fix: EAS `env:create` renamed to `env:set` (2026-11-18).
Shared database business list fix, landing nav overlap, empty-text crash guard (2026-11-18).
Hamburger menu only on phones; full nav bar on laptops and desktops (2026-11-19).
Fix: chatbot text box hidden by the keyboard on the Android APK (2026-11-24).
