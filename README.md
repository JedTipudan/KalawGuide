# KalawGuide

**A little more local. A lot more possibility.**

KalawGuide is a travel guide for **Mati City, Davao Oriental, Philippines**. It runs as a mobile app (Android and iOS) and as a website. Tourists use it to discover destinations, plan trips and budgets, track what they spend, and find **local businesses that an administrator has verified as legitimate**.

KalawGuide **does not take bookings or payments**. It works like a trusted directory: business owners advertise their business, and administrators check that it's legit before it's shown to tourists. Tourists then contact the business directly.

Built for the **ITMSD1 Inter-Class Mobile Hackathon**. All AI assistance used to build it is documented in [`AI_DISCLOSURE_LOG.md`](AI_DISCLOSURE_LOG.md).

---

## Contents

1. [How it works](#how-it-works)
2. [Features by role](#features-by-role)
3. [Kalaw Assistance](#kalaw-assistance)
4. [Live map](#live-map)
5. [Tech stack](#tech-stack)
6. [Getting started](#getting-started)
7. [Accounts and sign-in](#accounts-and-sign-in)
8. [Deploying for free](#deploying-for-free)
9. [Testing and quality checks](#testing-and-quality-checks)
10. [Data and offline model](#data-and-offline-model)
11. [Project structure](#project-structure)
12. [Web architecture and routing](#web-architecture-and-routing)
13. [Design system](#design-system)
14. [Troubleshooting](#troubleshooting)
15. [Changelog](#changelog)
16. [License](#license)

---

## How it works

```
Business owner                     Administrator                         Tourist
──────────────                     ─────────────                         ───────
Creates business profile  ──►  Reviews documents & details  ──►  Sees only ✅ verified businesses
Adds products, services,       Approves / rejects / suspends        Browses prices, photos, facilities
prices, facilities, photos     Reviews later price changes          Contacts the business directly
Submits for verification       Manages destinations & contacts      Plans trips, budgets, expenses
```

- **Verification is the core of the platform.** A business stays hidden from tourists until an administrator approves it. When an approved business changes a price, the change goes to the administrator for review. Tourists keep seeing the current published price until the change is approved.
- **Prices are labelled honestly.** Values that are confirmed in KalawGuide or published by a verified business show as *verified*. Everything else is marked as an *estimate*.
- **Emergency numbers carry a verified / unverified badge.** Administrators only mark a number verified after confirming it themselves.

---

## Features by role

### Tourist
- **Home:** greeting, search, categories, featured destinations, and a **🗺 Live map** shortcut.
- **Explore:** destinations with search and category filters.
- **Destination details:**
  - Description, entrance fee (verified or estimate), and favorites.
  - A **live map** with your position and how far away you are.
  - A **Get directions** button that opens Google Maps.
  - **Add to My Trips**.
- **Live map page:** every destination on one map, plus your real-time GPS location.
- **Businesses:** verified local businesses only. Each one shows its prices, products, services, facilities and contact details.
- **Budget planner:** a deterministic trip estimate (transport, accommodation, food, activities, fees), with saved budgets.
- **My Trips:** a day-by-day itinerary planner.
- **Expense tracker:** actual spending against the estimate, with category totals.
- **Favorites, Recommendations, Emergency information** (tappable phone numbers).
- **Kalaw Assistance:** an offline travel assistant (see below).
- **Profile:** account details, Light / Dark / System theme, quick links, sign out.

### Business owner
- **Business profile:** details, location, operating hours, contact links, photos.
- **Verification:** upload ownership documents and submit for review, then follow the status (not submitted → pending → approved / rejected / suspended).
- **Listings:** products, services, a price list (price changes are re-reviewed after approval), and facilities.
- **Notifications:** verification and listing updates.

### Administrator
- **Dashboard:** users, verification queue, destinations and price changes awaiting review.
- **Business verification:** approve, reject (with a reason) or suspend businesses, and review price changes.
- **User management:** change roles, block or unblock accounts.
- **Destinations and categories:** add, edit, feature, hide or show.
- **Emergency contacts:** add, edit, delete, and mark verified.
- **Reports & analytics:**
  - Live counts for the **last 7 days, last 30 days or all time**.
  - Users, verification breakdown, listings, and tourist activity (trips, budgets, expenses and amount tracked, saved places).
  - The most popular destinations, and verified businesses by category.
- **Activity logs:** a real audit trail, filterable by **Accounts / Businesses / Content**. It records:
  - Account events: sign-ins (including failed attempts), sign-ups and sign-outs.
  - User changes: role changes, blocks and unblocks.
  - Business events: verification decisions, submissions, and price changes.
  - Content edits: destinations, categories and emergency contacts.
- **Settings (mobile):**
  - Account card and a **Light / Dark / System** theme picker.
  - Admin tools, with badges for pending reviews and unverified contacts.
  - About section, and sign out with a confirmation step.

### Website (all roles)
- **Public pages:** landing page, explore, businesses, emergency and map.
- **Role-based apps:** the full tourist experience, a business owner portal and an admin control center, each with its own navigation.
- **Responsive design:** below 1024 px the top navigation collapses into a ☰ menu, and layouts stack into one column on phones. The page never scrolls sideways.

---

## Kalaw Assistance

A rule-based travel assistant that works **fully offline**. It answers only from KalawGuide's own data, never makes up places, prices or phone numbers, and needs **no API key, no server and no paid AI**.

| Ask something like… | You get |
|---|---|
| "What are the best places to visit in Mati?" | **3 recommended places**, each with why to go, the category, the entrance fee and a card |
| "Best beach / nature / free places to visit" | The same, filtered by your preference |
| "How much for Dahican Beach for 4 people, 3 days?" | An itemized budget estimate |
| "Plan a 3-day trip for 2 people" | A day-by-day plan with entrance fees totalled |
| "Where can I stay?" / "Where to eat?" / "How do I get to Mati?" | Verified accommodation, food or transport, with published prices |
| "How do I book a room?" | An explanation that KalawGuide doesn't take bookings, plus contact details for verified businesses |
| "Emergency numbers" | Police, hospital, fire, coast guard and disaster office, each marked verified or not |

- **Safety:**
  - An input guard blocks prompt-injection attempts.
  - Off-topic questions are politely refused.
  - The output is validated before it's shown.
- **Chat history:** saved per signed-in user.
- **Keyboard:** on web, **Enter sends** and Shift+Enter adds a new line.
- **Code:** `features/assistant/` (engine, intent detection, guard, budget parser, knowledge queries) with Jest tests.

---

## Live map

- **What it is:** a [Leaflet](https://leafletjs.com) map with **CARTO** tiles built from OpenStreetMap data. It's free, needs no API key, and the attribution stays visible as the tiles' terms require.
- **Live position:** GPS comes from `expo-location`, and a pulsing blue dot follows the user. The ◎ button centres on you and ⤢ shows all places.
- **Mobile:** the map runs inside a WebView.
- **Web:** the map runs in a same-origin `srcdoc` frame. This is required because the COOP/COEP headers that the browser database needs block cross-origin embeds.
- **Directions:** open in Google Maps through a normal link (free).
- **Requirements:** location only works in a secure context, meaning `https://` or `http://localhost`. On a phone, test with the deployed link.
- **Code:** `components/map/` and `features/map/useLiveLocation.ts`.

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Expo SDK 58 · React Native 0.88 · React 19 |
| Navigation | Expo Router (file-based, typed routes) |
| Language | TypeScript |
| Database | `expo-sqlite`: SQLite on device, and SQLite/WebAssembly in the browser |
| Auth | Email/password + Google (`expo-auth-session`); sessions in SecureStore (native) or localStorage (web) |
| Location and maps | `expo-location`, Leaflet + CARTO tiles via `react-native-webview` |
| Theme | Light / Dark / System, persisted |
| Tests | Jest (runs the real migrations and SQL on Node's built-in SQLite) |
| Hosting | Vercel (web), EAS Build (Android APK) |
| Design | Figma file `MZTmx7DKqJlhSyaObMO3Ht` |

---

## Getting started

**Requirements:** Node.js 20 or newer (Node 22 recommended), npm, and the Expo Go app on your phone.

```bash
git clone https://github.com/JedTipudan/KalawGuide.git
cd KalawGuide
npm install
cp .env.example .env      # optional, see "Accounts and sign-in"
npx expo start
```

- **Phone:** scan the QR code with Expo Go. Phone and computer must be on the same Wi-Fi.
- **Web:** press **w**, or open `http://localhost:8081`.
- **Emulators:** press **a** (Android) or **i** (iOS).

Always add packages with `npx expo install <package>` so the versions match the SDK.

---

## Accounts and sign-in

### Default admin (seeded on first launch)

| Email | Password |
|---|---|
| `admin@kalawguide.app` | `admin2024!` |

Tourist and business owner accounts are created from the sign-up screens. Each device or browser has its own database (see [Data and offline model](#data-and-offline-model)), so create test accounts on the device you'll demo on.

### Google Sign-In (optional)

Without a client ID, the Google button signs in a **demo** Google user, which is fine for the hackathon. To use real Google accounts:

1. In [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials), create OAuth clients: a **Web** client, **Android** (`com.kalawguide.app`) and **iOS** (`com.kalawguide.app`).
2. Put the web client ID in `.env` as `EXPO_PUBLIC_GOOGLE_CLIENT_ID`. Add the Android and iOS IDs too if you build those apps.
3. For the deployed site, add its URL to the web client's *Authorized JavaScript origins* and *redirect URIs*.

Never commit `.env`. Only `.env.example` belongs in git.

---

## Deploying for free

The full step-by-step checklist is in **[`guide.html`](guide.html)**. Open it in a browser.

### Website: Vercel (Hobby plan)
`vercel.json` already contains:
- **Build:** `npx expo export -p web` → `dist`, framework preset "Other".
- **Headers:** `Cross-Origin-Embedder-Policy: credentialless` and `Cross-Origin-Opener-Policy: same-origin`. `expo-sqlite` needs both to run in the browser.
- **Rewrite:** every path goes to `/`, so refreshing any page works.

Import the GitHub repo in Vercel (**Add New → Project → Import → Deploy**), and every push to `main` redeploys. Without GitHub, run `npx vercel login` and then `npx vercel --prod`.

### Android APK: EAS Build (free plan)
```bash
npx eas-cli@latest login
npx eas-cli@latest build -p android --profile preview
```
The `preview` profile in `eas.json` builds an installable `.apk`. Share the download link or its QR code.

---

## Testing and quality checks

```bash
npx jest              # unit tests (assistant, budget service, reports, activity log)
npx tsc --noEmit      # type check
npx expo lint         # lint
npx expo-doctor       # dependency / config check
```

The tests run the app's real migrations and SQL against Node's built-in SQLite (`testing/fakeSqlite.ts`).

---

## Data and offline model

- **All data lives in a local SQLite database:** on the device for mobile, and inside the browser for web. The app works without internet, apart from map tiles and Google Sign-In.
- **The schema migrates itself** on first launch (`database/migrations/init.ts`). Seed data is loaded automatically: categories, destinations, emergency contacts and the admin account.
- **Each device or browser has its own copy.** On the deployed website, every visitor starts from the same seed data, but their accounts and changes stay on their own device. Shared, cross-device data would need a backend, which is outside the free setup.
- **To reset:** uninstall the app (mobile), or clear site data in DevTools → Application → Storage (web).

| Table | Purpose |
|---|---|
| `users` | Accounts with role (tourist / business_owner / admin) and status |
| `destination_categories`, `destinations` | Destinations with coordinates, fee and verification flag |
| `businesses`, `business_documents` | Business listings and their verification documents |
| `business_products`, `business_services`, `listing_prices`, `listing_facilities` | What a business advertises |
| `listing_revisions` | Price changes waiting for admin review |
| `itineraries`, `itinerary_items` | Trips and day-by-day stops |
| `budget_plans`, `expenses` | Saved budgets and actual spending |
| `favorites` | Saved destinations and businesses |
| `emergency_contacts` | Emergency numbers with verified status |
| `notifications` | In-app notifications for business owners |
| `assistant_messages` | Kalaw Assistance chat history |
| `activity_logs` | Admin audit trail |
| `sync_queue` | Reserved for future cloud sync |

---

## Project structure

```
app/                         Expo Router: every file is a screen
  _layout.tsx                Root navigator, role-based redirect guard
  index.tsx                  Entry (splash on native, landing on web)
  (auth)/                    Mobile: welcome, onboarding, sign-in, register (tourist/business),
                             role-select, forgot-password, verification-pending
  (tourist)/                 Mobile tourist app
    (tabs)/                  home, explore, businesses, trips, favorites, profile
    destination/[id], business/[id], itinerary/[id]
    map, budget, budget-results, my-budgets, expenses, add-expense,
    emergency, recommendations, explore-for-trip, settings
  (business)/                Mobile business owner: dashboard, profile, listings, products,
                             services, prices, facilities, photos, notifications, account-settings
  (admin)/                   Mobile admin: dashboard, users, businesses, destinations, categories,
                             emergency-contacts, reports, activity-logs, settings
  (web)/                     Website versions (public, tourist, business-*, admin-*)

components/
  admin/                     ReportView, ActivityLogView (shared by mobile + web admin)
  assistant/                 KalawAssistanceFAB (chat), AssistantCards
  cards/, common/            KalawCard, KalawButton, KalawInput, Icon, GoogleSignInButton, WebAppShell
  map/                       LiveMap (native WebView / web srcdoc frame), mapHtml (Leaflet page)
  web/                       WebNav, WebLayout, AdminShell, BusinessShell

constants/tokens.ts          Design tokens (Figma colors, typography, spacing, radius, shadows)
contexts/                    AuthContext (session + activity logging), ThemeContext
database/                    migrations/init.ts (schema), seeds/index.ts
features/
  assistant/                 Kalaw Assistance engine, intents, guard, budget parser, tests
  map/useLiveLocation.ts     Live GPS hook, distance and directions helpers
services/
  admin/                     activityLog.ts, reportsService.ts (+ tests)
  auth/authService.ts        Email / Google sign-in, session restore
  budget/budgetService.ts    Deterministic budget maths (+ tests)
testing/fakeSqlite.ts        Test database backed by Node's SQLite
types/index.ts               Shared TypeScript types
utils/                       helpers, storage, responsive (rw() web breakpoint tags)
guide.html                   Free deployment checklist
vercel.json                  Vercel build, headers and rewrites
```

---

## Web architecture and routing

- **Separate screen groups.** On web, the root navigator registers only the `(web)` group. On mobile, it registers only the native groups. Refreshing a web URL therefore never opens a mobile screen. `index.ts` maps short paths such as `/explore` and `/map` to their `(web)` routes.
- **Shared screens.** Web pages wrap shared screens in `WebLayout` (top `WebNav` plus footer), or in `AdminShell` / `BusinessShell` for the portals. Mobile-only pieces, such as the in-screen back bar and the extra assistant button, are hidden on web.
- **Phone-friendly layouts.** `utils/responsive.ts` (`rw()`) tags layout containers. Media queries in `components/common/WebAppShell.tsx` then restyle them at tablet (≤1023 px) and phone (≤767 px) widths.

**Redirect rules:**

| Situation | Goes to |
|---|---|
| Web, signed out, protected page | `/(web)/landing` |
| Web, signed in, auth page | That role's dashboard |
| Mobile, signed out | `/(auth)/welcome` |
| Mobile, tourist / business owner / admin | `(tourist)/(tabs)/home` / `(business)/dashboard` / `(admin)/dashboard` |

---

## Design system

Colors come straight from the Figma variables (Design System › Semantic color palette) and live in `constants/tokens.ts`.

| Token | Light | Dark |
|---|---|---|
| Background | `#F8FAFC` | `#071B26` |
| Surface | `#FFFFFF` | `#123747` |
| Subtle | `#E0F2FE` | `#194456` |
| Text | `#1F2937` | `#F8FAFC` |
| Muted | `#64748B` | `#CBD5E1` |
| Border | `#E2E8F0` | `#254656` |
| Primary | `#0E7490` | `#22B8C7` |
| On primary | `#FFFFFF` | `#071B26` |
| Success | `#22C55E` | `#4ADE80` |
| Warning / Danger | `#F97316` | `#FB923C` |

- **Status badges** (`StatusColors` + `statusLabel()`): pending `#FFC83D`, under review `#3772D4`, approved `#00B3C7`, rejected `#FF5700`, suspended `#A83200`.
- **Typography:** Manrope for headings and Inter for body text. Sizes are 48 / 36 / 28 / 22 / 18 / 16 / 14 / 12.
- **Spacing and radius:** spacing steps of 4, 8, 12, 16, 24, 32, 48 and 64. Cards, buttons and inputs use a 12 px radius.
- **Components:**
  - Cards have a 1 px border and the "Soft card" shadow.
  - Buttons have 13 × 16 padding.
  - The bottom tab bar fills the active item with a subtle pill.
  - In light mode, the admin and business portals use white navigation with a primary-filled active item, as in Figma.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Web page blank, or `SharedArrayBuffer is not defined` | The COOP/COEP headers are missing. Locally, use `npx expo start`. When deployed, make sure `vercel.json` is committed and the preset is "Other". |
| "404" after refreshing a web page | The `rewrites` rule in `vercel.json` must be deployed. |
| `no such table` errors | Clear site data (web) or reinstall the app (mobile) so the migrations run fresh. |
| Map is grey | No internet, or the network blocks `basemaps.cartocdn.com` / `unpkg.com`. |
| Blue location dot missing on the website | Open the site over `https://` or `localhost`, not `http://192.168…`, and allow location. |
| Google Sign-In fails | Check `EXPO_PUBLIC_GOOGLE_CLIENT_ID` and the authorized origins. Demo mode works without it. |
| Dependency or build errors | Run `npx expo-doctor`, then `npx expo install --fix`. |

---

## Changelog

The latest changes are listed first. Full details, including what AI did, are in [`AI_DISCLOSURE_LOG.md`](AI_DISCLOSURE_LOG.md).

- **Bookings removed.**
  - KalawGuide now advertises and verifies businesses, and tourists contact them directly.
  - The booking screens, routes, dashboard stats and report sections are gone, and the `booking_requests` table is dropped.
  - Kalaw Assistance now explains how to contact a verified business instead.
- **Reports and activity logs now work.**
  - Reports use a live report service with 7-day, 30-day and all-time periods, popular destinations and verified-business categories.
  - Sign-ins, sign-ups, verification decisions, price changes and admin edits are now logged, with a filterable feed.
  - Both are shared by the mobile and web admin.
- **Mobile admin Settings redesigned.**
  - Account card and Light / Dark / System theme picker.
  - Admin tools with badges, and emergency contacts moved to their own screen.
  - Sign out now asks for confirmation.
- **Mobile sign-in fixed.** The Theme button works, nothing hides under the status bar on any auth screen, and the layout matches Figma.
- **Kalaw Assistance:**
  - "Best places to visit" returns 3 picks, with preference filters.
  - Enter sends on web.
  - An error fallback replaces silent failures.
- **Live map** on mobile and web, with GPS, distance and directions.
- **Light mode matched to Figma** for the admin, business owner and auth pages.
- **Responsive website** for phone browsers, with a ☰ navigation menu.
- **Free deployment:** Vercel (`vercel.json`), with the step-by-step `guide.html`.
- **Scroll fixes** on web pages that scroll themselves. The mobile-only back bar is hidden on web.
- **Figma colors** applied app-wide through design tokens.

---

## License

MIT. See [`LICENSE`](LICENSE).
