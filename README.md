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
13. [Design system](#design-system) · [Meet Kiko](#meet-kiko-the-mascot)
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
- **Budget planner:** a deterministic trip estimate (transport, accommodation, food, activities, fees), with saved budgets. **Quick fill** presets (💸 Cheapest · ⚖️ Mid-range · 🌴 Comfort) fill every amount from prices published in KalawGuide and show where each number came from.
- **Photos everywhere, never repeated:** every destination and business card shows its own picture. An owner's upload comes first; otherwise the app uses a bundled photo: the team's resort photos, plus Wikimedia Commons photos of Mati and Davao Oriental (Dahican, Pujada Bay, Hamiguitan, Aliwagwag, Cape San Agustin, Subangan Museum, the baywalk, kinilaw, tricycles). See `utils/placeImages.ts`; authors and licenses are in [`assets/images/places/commons/CREDITS.md`](assets/images/places/commons/CREDITS.md).
- **Resort and business pages** have a location map, the distance from you, and **Get directions**.
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
- **Responsive design:** the ☰ menu appears only on phone-width screens (below 768 px: phone browsers and phone PWAs). Laptops and desktops always get the full navigation bar, and layouts stack into one column on phones. The page never scrolls sideways.

---

## Install the website as an app (PWA)

For people who don't want to download the APK, especially on iPhone, where APKs can't be installed.

| Device | How to install |
|---|---|
| iPhone / iPad | Open the website in **Safari** → tap **Share** (square with ⬆) → **Add to Home Screen** → **Add**. A banner on the site shows these steps. |
| Android | Open the website in **Chrome** → tap **Install** on the banner (or menu ⋮ → *Install app*). |
| Desktop Chrome / Edge | Click **Install** on the banner, or the install icon in the address bar. |

- It opens full-screen from its own home-screen icon (KalawGuide icon, navy splash), like a normal app.
- **Updates are automatic:** pages always load fresh when online, so a new Vercel deploy reaches installed apps without reinstalling.
- **Offline:** after one online visit, the app opens without internet and Kalaw Assistance uses its saved data.
- **Files:** `public/index.html` (iOS tags, manifest link, service-worker registration), `public/manifest.json`, `public/sw.js`, `public/icons/`, and `components/web/InstallAppBanner.tsx`. The service worker is skipped on `localhost` and LAN addresses, so development always gets fresh code.

---

## Kalaw Assistance

A travel assistant with a **cloud AI** (online) and a **local AI** (offline). Both answer only from KalawGuide's own data and never make up places, prices or phone numbers. Everything is **free**: no paid AI and no server.

| | Online | Offline |
|---|---|---|
| Who answers | **Cloud AI:** Google Gemini (free tier) writes a natural reply from the local engine's answer plus KalawGuide's latest data | **Local AI:** the on-device rule-based engine |
| Data used | The live database, so changes by business owners and the admin on other devices show at once | The **copy saved on the device** at the last sync |
| Status in chat | `Online · Cloud AI` | `Offline · Local AI · data from 5:42 PM` |

- **Syncing data to the device:** while online, the app copies destinations, approved businesses, prices, facilities and emergency contacts into device storage (AsyncStorage, which is `localStorage` on the web). It syncs when the app starts, when the connection comes back, when the chat opens, and every 2 minutes. Offline answers say when that copy was saved.
- **Cloud AI setup (optional):** create a free key at <https://aistudio.google.com/api-keys> (no billing). Put it in `.env` as `EXPO_PUBLIC_GEMINI_API_KEY`. For the APK, add the same variable on expo.dev under *Project → Environment variables* (the `preview` environment), because `.env` isn't uploaded to EAS. Without a key, or when the free quota runs out, the local AI answers everything.
- **Cloud AI guardrails (stays inside KalawGuide):**
  1. Off-topic and prompt-injection questions are refused in code and never sent to Gemini.
  2. Gemini gets strict rules: KalawGuide travel topics only, facts only from the data sent with the question, no links or code.
  3. Every Gemini reply is checked against KalawGuide's data before it's shown. It is discarded, and the local answer is shown instead, if it contains a price, phone number or bold place/business name that isn't in KalawGuide, a link, code, off-topic words, or is too long.
  4. The existing leak filter runs last.
- **Note:** like the map and Turso keys, the Gemini key is built into the app. That's fine for a class demo on the free tier. A public launch should call Gemini from a small server.

| Ask something like… | You get |
|---|---|
| "What are the best places to visit in Mati?" | **3 recommended places**, each with why to go, the category, the entrance fee and a card |
| "Best beach / nature / free places to visit" | The same, filtered by your preference |
| "How much for Dahican Beach for 4 people, 3 days?" | An itemized budget estimate |
| "What is the cheapest trip for 2 people, 3 days?" / "pinakamura?" | The cheapest fare, room, meals and free spots in KalawGuide, with a total and a budget check |
| "Cheapest place to stay" / "cheapest food" / "cheapest activities" | The 3 lowest published prices of that type, lowest first |
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
- **Code:** `features/assistant/` (engine, intent detection, guard, budget parser, knowledge queries, `cloudModel.ts` for Gemini, `knowledgeCache.ts` for the saved copy) with Jest tests.

---

## Live map

- **Real map with a free API key (recommended):** set **one** key and the whole app (Expo Go, APK, website) uses it. Step-by-step setup is in `guide.html` (local setup guide, not in the repo) → *Real map with a free API key*.

  | Key | Map | Free plan |
  |---|---|---|
  | `EXPO_PUBLIC_MAPTILER_KEY` (recommended) | MapTiler vector map via MapLibre GL: streets, 🛰 satellite, **3D** tilt, compass | 5,000 map sessions/month, non-commercial, no credit card |
  | `EXPO_PUBLIC_GOOGLE_MAPS_KEY` | Google Maps JavaScript API: roadmap, 🛰 hybrid, Street View, 45° tilt | 10,000 map loads/month, needs a billing account |

  With both keys set, MapTiler wins unless `EXPO_PUBLIC_MAP_PROVIDER=google`. **If a key is missing or rejected**, the map page reports it and LiveMap redraws with the keyless map, so the map never breaks. In Expo Go the terminal prints `Map key problem (…)`.
- **Keyless map (fallback):**
- **What it is:** a [Leaflet](https://leafletjs.com) map with **keyless Esri World Street Map tiles**. If those fail it switches to OpenStreetMap on its own, and a 🛰 button shows Esri satellite imagery. It **needs no API key in Expo Go, the APK or the website**. It only needs internet for the tiles, plus location permission for the blue dot. The attribution stays visible.
- **Why not CARTO any more:** since 25 Sep 2026, CARTO tiles without a key show an "API KEY REQUIRED" watermark. If you prefer CARTO's style, set the optional `EXPO_PUBLIC_CARTO_KEY` (free at carto.com/basemaps/apikey). It's then tried first, with Esri as the fallback.
- **Pins** use OpenStreetMap positions where the place is mapped (Dahican, Sleeping Dinosaur, Subangan, Menzi, Pujada Island, the public market, Amery, Dahican Surf Resort, Somewhere in Dahican); the others are approximate.
- **Resilient loading:** Leaflet loads from unpkg, falling back to jsDelivr and then cdnjs. Offline, the map says it needs a connection instead of showing a grey box.
- **Live position:** GPS comes from `expo-location`, and a pulsing blue dot follows the user. The ◎ button centres on you and ⤢ shows all places.
- **Mobile:** the map runs inside a WebView.
- **Web:** the map runs in a same-origin `blob:` iframe (not `srcdoc`, which stalls MapLibre's tile worker). This is required because the COOP/COEP headers that the browser database needs block cross-origin embeds.
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
| Location and maps | `expo-location`; MapTiler (MapLibre GL) or Google Maps JS with a free key, otherwise Leaflet + Esri/OpenStreetMap; all rendered in `react-native-webview` / an iframe |
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

The **Continue with Google** button is on the sign-in and tourist registration screens (mobile and web sign-in). It signs in a returning user and creates the account for a new one. Without a client ID, it signs in a **demo** Google user, which is fine for the hackathon. To use real Google accounts:

1. In [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials), create OAuth clients: a **Web** client, **Android** (`com.kalawguide.app`) and **iOS** (`com.kalawguide.app`).
2. Put the web client ID in `.env` as `EXPO_PUBLIC_GOOGLE_CLIENT_ID`. Add the Android and iOS IDs too if you build those apps.
3. For the deployed site, add its URL to the web client's *Authorized JavaScript origins* and *redirect URIs*.

Never commit `.env`. Only `.env.example` belongs in git.

---

## Deploying for free

The full step-by-step checklist is in `guide.html` (a local setup guide kept off GitHub). Open it in a browser. It covers pre-deploy checks, Vercel, the Android APK, **avoiding Play Protect "unsafe app" warnings**, and a demo script. No `.env` or API keys are needed.

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
The `preview` profile in `eas.json` builds a release-signed, installable `.apk`. Share the expo.dev link or its QR code.

**Fewer Play Protect warnings:** the APK is release-signed with your EAS keystore, targets a current Android version, and `app.json` blocks the unused camera and microphone permissions. Android always asks once to *allow installs from this source* for any APK outside the Play Store. For zero warnings, distribute through Google Play internal testing; see `guide.html` §6.

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

- **Two database modes, same SQL** (`database/migrations/init.ts`):
  - **Shared online database (Turso)** when `EXPO_PUBLIC_TURSO_DATABASE_URL` and `EXPO_PUBLIC_TURSO_AUTH_TOKEN` are set. Every phone, the APK and the website use one database, so a business registered on one device and approved by the admin on another shows for tourists everywhere. `database/remote/tursoDatabase.ts` implements the four expo-sqlite calls the app uses over Turso's HTTP API, and buffers each `BEGIN … COMMIT` into one atomic request. Setup is in `guide.html` → *Shared online database*.
  - **On this device** otherwise: SQLite on the device or in the browser. It works fully offline, but each device has its own copy.
  - Password hashes (salted SHA-256) are stored with the user, so accounts work on any device that shares the database. Business photos and verification documents are saved as compressed images in the database, so the admin can review them from anywhere.
  - Admin *Settings* shows which mode is active.
- **The schema migrates itself** on first launch (`database/migrations/init.ts`). Seed data is loaded automatically: categories, destinations, emergency contacts and the admin account.
- **Prices on lists:** `utils/priceLabel.ts` formats the entrance fee and the "From ₱…" price shown on every destination and business card.
- **Demo listings** (`database/seeds/demoContent.ts`) are added on every launch if missing, so they also reach existing installs:
  - 4 more destinations (Sleeping Dinosaur, Waniban Island, Pujada Island, Subangan Museum).
  - 13 approved businesses: Mati resorts with photos, plus food, transport and island hopping.
  - **Their prices are sample values.** They're labelled "sample price" and treated as *estimates*, never as verified. No contact numbers are invented.
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
  (admin)/                   Mobile admin: a Stack (like the tourist app)
    (tabs)/                  dashboard, users, businesses, destinations, settings
    categories, emergency-contacts, reports, activity-logs   (pushed on top, with Back)
  (web)/                     Website versions (public, tourist, business-*, admin-*)

components/
  brand/Kiko.tsx             Mascot images, KikoAvatar, BrandLogo (Kiko + wordmark)
  admin/                     ReportView, ActivityLogView (shared by mobile + web admin)
  assistant/                 KalawAssistanceFAB (chat), AssistantCards
  cards/, common/            KalawCard, KalawButton, KalawInput, Icon, GoogleSignInButton, WebAppShell
  map/                       LiveMap (native WebView / web srcdoc frame), mapHtml (Leaflet page)
  web/                       WebNav, WebLayout, AdminShell, BusinessShell

constants/tokens.ts          Design tokens (Figma colors, typography, spacing, radius, shadows)
contexts/                    AuthContext (session + activity logging), ThemeContext
database/                    migrations/init.ts (schema), seeds/index.ts, seeds/demoContent.ts (demo listings)
features/
  assistant/                 Kalaw Assistance engine, intents, guard, budget parser, tests
  map/useLiveLocation.ts     Live GPS hook, distance and directions helpers
services/
  admin/                     activityLog.ts, reportsService.ts (+ tests)
  auth/authService.ts        Email / Google sign-in, session restore
  budget/budgetService.ts    Deterministic budget maths (+ tests)
  budget/budgetPresets.ts    Cheapest / mid-range / comfort quick fill (+ tests)
testing/fakeSqlite.ts        Test database backed by Node's SQLite
types/index.ts               Shared TypeScript types
utils/                       helpers, storage, responsive (rw() web breakpoint tags), placeImages (photo fallback)
assets/images/mascot/        Kiko poses (transparent, compressed) · assets/icon.png = app icon
assets/images/places/        Mati resort and viewpoint photos (JPEG, ≤960 px)
guide.html                   Setup & deploy checklist (local only, not on GitHub)
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
| Mobile, tourist / business owner / admin | `(tourist)/(tabs)/home` / `(business)/dashboard` / `(admin)/(tabs)/dashboard` |

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

### Meet Kiko, the mascot

<img src="assets/images/mascot/kiko-map.png" alt="Kiko" width="140" align="right" />

**Kiko** is KalawGuide's mascot: a cheerful Mati travel bird in a "Mati" sun hat and a hibiscus shirt.

- **Where Kiko appears:**
  - The **app icon**, Android adaptive icon and web favicon.
  - The **logo** next to "KalawGuide" in the web nav, mobile app bars and landing footer.
  - **Kalaw Assistance:** Kiko is the chat button, the header, the greeting and the avatar on every reply.
  - The mobile **welcome** screen, holding an "Explore Mati!" sign.
  - The **Home** banner, with binoculars. Tapping it opens the live map.
  - The website **landing hero** (desktop and tablet), plus a budget tip with Kiko relaxing.
  - The web **sign-in and registration** panels.
  - The **empty states** for My Trips and Favorites.
- **Code:** `components/brand/Kiko.tsx` exports `Kiko` (full-body poses: `map`, `presenting`, `welcome`, `lookout`, `relax`), `KikoAvatar` and `BrandLogo`.
- **Images:** compressed transparent PNGs in `assets/images/mascot/`, about 70–85 KB each. They were produced from the team's original art, which was about 1.5 MB per file.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Web page blank, or `SharedArrayBuffer is not defined` | The COOP/COEP headers are missing. Locally, use `npx expo start`. When deployed, make sure `vercel.json` is committed and the preset is "Other". |
| "404" after refreshing a web page | The `rewrites` rule in `vercel.json` must be deployed. |
| `no such table` errors | Clear site data (web) or reinstall the app (mobile) so the migrations run fresh. |
| Map tiles say "API KEY REQUIRED" | That's an old build that still uses CARTO. Reload Expo Go, redeploy, or build a new APK. The current map needs no key. |
| Map says it needs internet | Connect to the internet and tap the message. No API key is needed. Leaflet falls back from unpkg to jsDelivr/cdnjs, and tiles fall back from Esri to OpenStreetMap. |
| Something unwanted shows in `git status` | `.gitignore` blocks builds (`*.apk`), keys (`*.keystore`, `credentials.json`), `.env*` files, logs and editor files. If a file was already committed, run `git rm --cached <file>`. See `guide.html` → *Keep junk off GitHub*. |
| Android blocks the APK as unsafe | Install a `preview` (release) build, not a development build. Tap *More details → Install anyway* and submit the Play Protect appeal, or use Play internal testing. See `guide.html` §6. |
| Blue location dot missing on the website | Open the site over `https://` or `localhost`, not `http://192.168…`, and allow location. |
| Google Sign-In fails | Check `EXPO_PUBLIC_GOOGLE_CLIENT_ID` and the authorized origins. Demo mode works without it. |
| APK build fails with `AAPT: error: file failed to compile` on an image | The file is not really a PNG (often a JPEG renamed to `.png`). Give it the right extension and update its `require()`. |
| Kalaw Assistance says `Online · On-device answers` instead of `Cloud AI` | `EXPO_PUBLIC_GEMINI_API_KEY` is missing. Add it to `.env` and restart Expo, or for the APK add it to the EAS environment and rebuild. |
| iPhone: no *Add to Home Screen* option | Use **Safari** (on iOS 16.4+ other browsers work through their Share menu too). Scroll down the Share sheet to find it. |
| Installed web app shows an old version | Close it fully and reopen while online. If it still looks old, delete the home-screen icon and add it again. |
| Website says "already open in another window or tab" (was "Invalid VFS state") | The browser lets only one window use the on-device database. Close the other KalawGuide tab or installed-app window, then reload. With the shared Turso database this can't happen. |
| Dependency or build errors | Run `npx expo-doctor`, then `npx expo install --fix`. |

---

## Changelog

The latest changes are listed first. Full details, including what AI did, are in [`AI_DISCLOSURE_LOG.md`](AI_DISCLOSURE_LOG.md).

- **☰ menu only on phones.** Laptops and desktops (browser or installed PWA) now show the full navigation bar instead of the phone menu. The ☰ menu appears only below 768 px.

- **Fix: businesses missing with the shared online database.** The "from" price query used SQL that Turso rejects, so the list was empty online. It now works on Turso and on-device.
- **Responsive check on every screen.** All 46 web pages were measured at phone, tablet and desktop widths. The landing page menu no longer overlaps between 768 and 1024 px. Empty text values no longer render inside a View, which can crash Android.

- **Guide fix: EAS environment variables.** `guide.html` now uses `eas env:set` (EAS renamed `env:create`). The Turso token and Gemini key are added on the expo.dev *Environment variables* page, or with `eas env:set` asking for each value, so they're never pasted into a long command.

- **Fix: category icons and overlaps.** Destination categories show real icons, not cut-off words ("bed", "mo", "wav"). On phones (website/PWA), pages no longer run under the footer. The APK's tourist tab bar has room for icons and labels again. The install banner no longer covers the Sign In button.
- **Businesses list fits every screen.** 1 column on phones, 2 on tablets and 3 on desktop. On the website, business details now open in a centered page with the nav bar. Website text uses Inter/Manrope instead of falling back to Times.

- **Fix: Google sign-in on the website showed "Invalid VFS state".** The sign-in popup no longer starts a second copy of the app. If KalawGuide really is open twice, a clear message explains what to do.

- **Install the website as an app (PWA), no APK needed.** iPhone/iPad: Safari → Share → *Add to Home Screen*. Android/desktop Chrome: an *Install* button appears. It opens full-screen with its own icon, and pages it has loaded still open offline.

- **Cloud AI guardrails:** Gemini replies are checked against KalawGuide's data (prices, phone numbers, place names, no links/code/off-topic) before they're shown; otherwise the local answer is used.
- **Kalaw Assistance: cloud AI + local AI.** Online, a free Google Gemini key gives natural answers from KalawGuide's latest data. That data is saved on the device whenever there's internet, so offline the local assistant still answers from the latest update.

- **Admin and business website on phones.** Tables scroll sideways instead of overlapping. Two-column forms and cards stack into one column, and button rows wrap.
- **Fix: APK build failed (`AAPT: error: file failed to compile`).** Three photos were JPEGs named `.png`, so they were renamed to `.jpg`.

- **Shared online database (Turso).** With two settings, every device uses one database: the tourist, business-owner and admin sides can be tested on different devices. Accounts sign in anywhere, uploads are visible to the admin, and approvals reach tourists. Without the settings, the app keeps its on-device mode. See `guide.html`.

- **Fix: blank MapTiler map (only pins showing).**
  - The web map now loads in a `blob:` iframe instead of `srcdoc`, where MapLibre's tiles never arrived.
  - If a real map hasn't loaded within 20 seconds, the keyless map takes over.

- **Guide:** the MapTiler steps now match the dashboard (*API keys → New*), field by field, with a safe way to lock the key afterwards.

- **Real map with a free API key.**
  - Add `EXPO_PUBLIC_MAPTILER_KEY` (MapTiler: vector streets, satellite, 3D tilt) or `EXPO_PUBLIC_GOOGLE_MAPS_KEY` (Google Maps). Setup steps are in `guide.html`.
  - A missing or invalid key falls back to the keyless map automatically.
  - Links inside the map now open in the browser.
  - `eas.json` profiles are linked to EAS environments, so keys reach APK builds.

- **Map works with no API key; every place has its own photo.**
  - CARTO began requiring a key, so the map now uses keyless Esri tiles with OpenStreetMap as backup, plus a 🛰 satellite view.
  - Resort and business pages show their location, distance and directions.
  - Pins were corrected against OpenStreetMap. Cape San Agustin (Governor Generoso) and Pangyan Falls (Lupon) are now labelled correctly.
  - 14 freely licensed Wikimedia Commons photos replace the repeated pictures (credits in `assets/images/places/commons/CREDITS.md`).
  - `.gitignore` now blocks APKs, keys, `.env*` files, logs and editor files.

- **Prices on every list (PHP).** Destination cards show the entrance fee (`Entrance ₱50 / person · estimate`). Business cards show the lowest price (`From ₱1,200 / room / night`). Prices are based on Mati travel guides where they publish one (Dahican ₱100 consumable entrance, Sleeping Dinosaur ₱10, Subangan Museum and Menzi Beach Park ₱50, Pangyan Falls ₱10, island hopping ₱250/person or ₱4,000/boat); the rest are typical local rates. Existing installs update automatically, unless an admin has verified or changed the fee.

- **Demo prices, "what is cheapest?" and photos everywhere.**
  - Mati resorts (with the team's photos), food, transport and tours are seeded with labelled sample prices.
  - Kalaw Assistance answers "what is cheapest?" with a full cheapest trip, or the lowest stay/food/transport/activity prices.
  - The budget planner has Cheapest / Mid-range / Comfort quick fill.
  - Every destination and business card now has a picture.
  - The landing page no longer shows the same photo twice (duplicate image files removed).
  - The map explains it needs no API key and falls back between CDNs.
  - Unused camera and microphone permissions are blocked in the APK.
  - `guide.html` was rewritten with full deploy, APK and Play Protect steps.
  - Type check is now clean.

- **Mobile admin screens fixed.** Categories, Reports, Activity logs and Emergency contacts used to be hidden tabs (Categories had no Back button). They now open as proper screens on top of the admin tabs, with Back. Reports run their queries one at a time, which is safer on the phone's SQLite, and errors show their real message.
- **Google sign-in on the mobile login.** "Continue with Google" now appears on mobile sign-in, not only on registration. Mobile register now uses real Google sign-in instead of the demo-only version. All screens share `services/auth/googlePrompt.ts`.
- **Kiko the mascot and a new app icon.** Kiko now appears on the app icon, favicon, logo, assistant, welcome screen, Home banner, landing page, auth panels and empty states.
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
