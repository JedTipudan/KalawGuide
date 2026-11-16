# KalawGuide

A cross-platform travel discovery and management platform for Mati City, Davao Oriental, Philippines.

Built for the ITMSD1 Inter-Class Mobile Hackathon.

---

## Platform Support

KalawGuide runs on two separate platforms that share the same SQLite database and business logic — only the layout differs.

| Platform | Entry point | Layout |
|---|---|---|
| Mobile (Expo Go / Android / iOS) | `app/(auth)/`, `app/(tourist)/`, `app/(business)/`, `app/(admin)/` | Tab navigator + mobile screens |
| Web (browser) | `app/(web)/` | Full-width website with top navbar |

The root navigator detects `Platform.OS === 'web'` at build time and registers **only** the `(web)` screen group on web and **only** the native groups on mobile. This prevents Expo Router from resolving web URLs into mobile screens on hard refresh.

---

## Features

**Tourist**
- Destination discovery with search and category filters
- Destination detail page with Leaflet map, entrance fee, and favorites
- Budget planner with deterministic cost calculations
- Saved budget plans list
- Itinerary planner with day-by-day activity management
- Actual expense tracker with category totals
- Local business discovery (verified listings only)
- Booking requests with status tracking
- Emergency information with tappable phone numbers
- KalawAssistance — offline-first travel assistant
- Recommendations page
- Light / Dark / System theme

**Business Owner**
- Business profile creation and verification submission
- Product and service management
- Price list management
- Facilities management
- Booking request approval and rejection
- Business notifications

**Administrator**
- Platform-wide statistics dashboard
- User management with role assignment and status control
- Business verification (approve / reject / suspend)
- Destination management with featured toggle
- Emergency contact management with verification status
- Activity logs
- Reports

**Web (all roles)**
- Public landing page — hero, destination grid, category browser, budget promo, how it works
- Two-column authentication pages (sign in, register tourist, register business, forgot password, role select)
- Full-width tourist dashboard, explore, budget, trips, expenses, businesses, emergency, profile, recommendations
- Full-width business owner portal (dashboard, profile, products, prices, facilities, bookings, notifications, settings)
- Full-width admin control center (dashboard, users, businesses, destinations, emergency, reports, activity logs, settings)
- Top navbar with role-based navigation links and theme toggle
- Hard-refresh safe — web URLs always resolve to the correct web screen

---

## Technology Stack

| Layer | Technology |
|---|---|
| Mobile framework | React Native 0.88.1 + Expo SDK 58 |
| Navigation | Expo Router 5 |
| Language | TypeScript 6 |
| Local database | Expo SQLite (~58.0.15) |
| Secure storage | Expo SecureStore (native) / localStorage (web) |
| Authentication | Email/password + Google OAuth (expo-auth-session) |
| Fonts | Manrope + Inter (expo-google-fonts) |
| Theme | React Native useColorScheme + AsyncStorage |
| Web layout | WebNav + WebLayout + AdminShell + BusinessShell components |
| SVG | react-native-svg 15.16.0 |
| Web maps | Leaflet (loaded via WebView HTML on native, iframe on web) |
| Design | Figma (`MZTmx7DKqJlhSyaObMO3Ht`) — Mobile Version canvas |

---

## Prerequisites

- Node.js 18+
- npm
- Expo Go app on your device, or Android Studio / Xcode for native builds

---

## Installation

```bash
git clone <repository-url>
cd KalawGuide
npm install
```

---

## Environment Configuration

```bash
cp .env.example .env
```

Edit `.env` and fill in your values. The app runs in demo mode without a Google Client ID — Google Sign-In will use a simulated account.

---

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a project
3. Configure the OAuth consent screen
4. Create OAuth 2.0 credentials:
   - **Web** client — for Expo Go and web
   - **Android** client — package: `com.kalawguide.app`
   - **iOS** client — bundle ID: `com.kalawguide.app`
5. Add your Web Client ID to `.env` as `EXPO_PUBLIC_GOOGLE_CLIENT_ID`
6. For Android builds, add your SHA-1 fingerprint to the Android OAuth client

---

## Running the App

```bash
# Start development server (then press W for web, scan QR for mobile)
npm start

# Android
npm run android

# iOS
npm run ios

# Web
npm run web
```

- **Web**: opens at `http://localhost:8081` — full-width website layout
- **Mobile**: scan the QR code with Expo Go, or press `a` / `i` for emulators

---

## Database

The app uses Expo SQLite with automatic migrations on first launch. All 19 tables are created via `CREATE TABLE IF NOT EXISTS` before any `ALTER TABLE` column migrations run — this ensures a fresh database initialises correctly on both web and native.

Seed data (destinations, categories, emergency contacts, default admin account) is inserted automatically on first launch.

Both web and mobile share the same local SQLite database — data entered on web is visible on mobile and vice versa (same device).

To reset the database during development, uninstall and reinstall the app (mobile) or clear site data in the browser (web).

### Database Tables

| Table | Purpose |
|---|---|
| `users` | Accounts with role and status |
| `destination_categories` | Category definitions (Beach, Nature, etc.) |
| `destinations` | Destination listings with geo coordinates |
| `businesses` | Business listings with verification status |
| `business_documents` | Uploaded verification documents |
| `business_services` | Services offered by a business |
| `business_products` | Products offered by a business |
| `booking_requests` | Tourist booking requests |
| `itineraries` | Trip itineraries |
| `itinerary_items` | Day-by-day itinerary activities |
| `budget_plans` | Saved budget calculations |
| `expenses` | Actual expense records |
| `emergency_contacts` | Emergency numbers with verification |
| `notifications` | In-app notifications |
| `sync_queue` | Offline sync queue |
| `assistant_messages` | KalawAssistance chat history |
| `listing_prices` | Business price lists |
| `listing_facilities` | Business facility tags |
| `listing_revisions` | Business listing change requests |
| `favorites` | Tourist saved destinations and businesses |
| `activity_logs` | Admin audit trail |

---

## Default Admin Account

A default admin account is seeded automatically on first launch:

| Field | Value |
|---|---|
| Email | `admin@kalawguide.app` |
| Password | `admin2024!` |

To promote any other account to admin:

1. Register a normal account via the app
2. Open the SQLite database and run:
   ```sql
   UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
   ```
3. Sign out and sign back in

---

## Android Build (EAS)

```bash
npm install -g eas-cli
eas login
eas build --platform android --profile preview
```

For a local APK:
```bash
npx expo run:android
```

---

## iOS Build

```bash
eas build --platform ios --profile preview
```

Requires an Apple Developer account.

---

## Project Structure

```
app/
  (auth)/          Mobile authentication screens
                     welcome, onboarding, sign-in, register-tourist,
                     register-business, role-select, forgot-password,
                     verification-pending
  (tourist)/       Mobile tourist tab navigator + screens
    (tabs)/          home, explore, businesses, trips, favorites, profile
                   budget, budget-results, my-budgets, expenses, add-expense,
                   booking-history, booking-submitted, emergency, settings,
                   recommendations, favorites
                   destination/[id], business/[id], booking/[businessId],
                   itinerary/[id]
  (business)/      Mobile business owner screens
                     dashboard, profile, products, services, prices,
                     facilities, bookings, booking-detail, photos,
                     notifications, account-settings
  (admin)/         Mobile administrator screens
                     dashboard, users, businesses, destinations, categories,
                     bookings, reports, activity-logs, settings
  (web)/           Web-only screens
                     landing, sign-in, register-tourist, register-business,
                     forgot-password, role-select
                     home, explore, businesses, budget, budget-results,
                     my-budgets, trips, expenses, add-expense, booking-history,
                     emergency, profile, settings, recommendations
                     destination/[id]
                     business-dashboard, business-profile, business-products,
                     business-prices, business-facilities, business-bookings,
                     business-notifications, business-settings
                     admin-dashboard, admin-users, admin-businesses,
                     admin-destinations, admin-emergency, admin-reports,
                     admin-activity-logs, admin-settings
  _layout.tsx      Root navigator — platform-split Stack registration,
                   role-based redirect guard, web splash suppression
  index.tsx        Entry point — redirects web to /(web)/landing,
                   shows splash on native

components/
  common/          KalawButton, KalawInput, KalawCard, Icon,
                   GoogleSignInButton, WebAppShell
  cards/           KalawCard
  assistant/       KalawAssistanceFAB (floating chat modal)
  web/             WebNav (top navbar), WebLayout (page wrapper),
                   AdminShell, BusinessShell

constants/
  tokens.ts        Design tokens — colors, typography, spacing, radius, shadows

contexts/
  AuthContext.tsx  Authentication state, session restore, role management
  ThemeContext.tsx Light / Dark / System theme with AsyncStorage persistence

database/
  migrations/
    init.ts        19-table SQLite schema with CREATE TABLE IF NOT EXISTS
                   followed by ALTER TABLE column migrations for existing DBs
                   Singleton pattern with web-safe globalThis caching
  seeds/
    index.ts       Default admin account + destinations + emergency contacts

features/
  assistant/       assistantEngine.ts — deterministic keyword-based responses
  authentication/
  bookings/
  budget/
  businesses/
  destinations/
  emergency/
  expenses/
  itineraries/

services/
  auth/
    authService.ts   Email + Google sign-in, session restore, SecureStore wrapper
  budget/
    budgetService.ts Deterministic budget and expense calculations
  api/
  sync/

types/
  index.ts         All shared TypeScript interfaces and types

utils/
  helpers.ts       generateId, formatCurrency, safeNumber, date utilities
  storage.ts       Cross-platform storage (localStorage on web, SecureStore on native)
```

---

## Web Architecture

On web, the root layout detects `Platform.OS === 'web'` and:

1. Registers **only** `<Stack.Screen name="(web)" />` — native groups `(auth)`, `(tourist)`, `(business)`, `(admin)` are never added to the Stack on web. This is the key fix that prevents hard-refresh from resolving into mobile screens.
2. Routes to `/(web)/landing` for unauthenticated users hitting any protected screen.
3. Routes authenticated users away from auth screens to their role dashboard.

Web screens use:
- `WebLayout` — wraps every page with `WebNav` + scrollable body + footer
- `WebNav` — shows role-based nav links (tourist / business / admin / public), theme toggle, sign in/out
- `AdminShell` / `BusinessShell` — role-specific layout wrappers for admin and business portals
- Auth screens use a two-column layout: left travel invitation panel + right form card
- `WebAppShell` — top-level web wrapper applied in `RootLayout`

Mobile screens are completely unaffected — they continue to use tab navigators and `SafeAreaView`.

---

## Routing Guard Logic

The `RootNavigator` effect in `app/_layout.tsx` runs after auth loading completes:

| Condition | Action |
|---|---|
| Web + unauthenticated + on protected screen | Redirect to `/(web)/landing` |
| Web + authenticated + on auth screen | Redirect to role dashboard |
| Web + authenticated + on protected screen | Stay (no redirect) |
| Native + unauthenticated + not in `(auth)` | Redirect to `/(auth)/welcome` |
| Native + tourist + not in `(tourist)` | Redirect to `/(tourist)/(tabs)/home` |
| Native + business_owner + not in `(business)` | Redirect to `/(business)/dashboard` |
| Native + admin + not in `(admin)` | Redirect to `/(admin)/dashboard` |

Public web screens (`landing`, `explore`, `businesses`, `emergency`) are accessible without authentication.

---

## Troubleshooting

**App crashes on startup**
- Run `npx expo-doctor` to check for dependency issues
- Run `npx expo install --fix` to resolve version mismatches

**Web shows mobile layout on refresh**
- This was fixed by platform-splitting the Stack screen registration in `app/_layout.tsx`
- Ensure `app.json` has `"web": { "output": "single" }`
- Clear browser cache and hard reload

**`no such table: users` on first web load**
- This was fixed by moving all `CREATE TABLE IF NOT EXISTS` statements before `ALTER TABLE` column migrations in `database/migrations/init.ts`
- If the error persists, clear site data in browser DevTools → Application → Storage

**Google Sign-In not working**
- Ensure `EXPO_PUBLIC_GOOGLE_CLIENT_ID` is set in `.env`
- Without it, the app uses demo mode (simulated Google account)
- For native builds, ensure SHA-1 fingerprint is registered in Google Cloud Console

**Database errors**
- Uninstall the app to reset the SQLite database (mobile)
- Clear site data in browser DevTools → Application → Storage (web)
- Check that `expo-sqlite` version matches the Expo SDK

**Build errors**
- Run `npx expo-doctor`
- Ensure `app.json` asset paths point to existing files

---

## Design System

All mobile screens are implemented to match the Figma design exactly (file `MZTmx7DKqJlhSyaObMO3Ht`, node `3-4` — Mobile Version canvas).

Colors are taken directly from the Figma variables (Design System › Semantic color palette, nodes `3:27` light / `3:27639` dark) and live in `constants/tokens.ts`.

| Token | Light | Dark |
|---|---|---|
| Background | `#F8FAFC` | `#071B26` |
| Surface | `#FFFFFF` | `#123747` |
| Elevated surface | `#FFFFFF` | `#194456` |
| Subtle / Secondary surface | `#E0F2FE` | `#194456` |
| Text / Heading | `#1F2937` | `#F8FAFC` |
| Muted | `#64748B` | `#CBD5E1` |
| On navigation (inactive tab) | `#64748B` | `#94A3B8` |
| Border | `#E2E8F0` | `#254656` |
| Primary (Primary Action / Brand Text) | `#0E7490` | `#22B8C7` |
| On primary | `#FFFFFF` | `#071B26` |
| Accent (Secondary Action) | `#22C55E` | `#22B8C7` |
| Success (Status Approved) | `#22C55E` | `#4ADE80` |
| Warning (Highlight) | `#F97316` | `#FB923C` |
| Danger (Input error) | `#F97316` | `#FB923C` |
| Sand | `#E0F2FE` | `#0B2635` |

**Status badges** (`StatusColors` + `statusLabel()` in `constants/tokens.ts`, Figma `RequestStatus/*`): solid fills with dark `#171717` or white labels.
Pending `#FFC83D` · Under review `#3772D4` · Approved `#00B3C7` · Rejected `#FF5700` · Cancelled `#F3E9DF` · Completed `#0755CC` · Suspended `#A83200`.

**Patterns:**
- Nav bar: `‹ Screen name` in primary color + `☰` icon, surface bg, `paddingHorizontal: 20`
- Cards (`KalawCard`): surface bg, 1px border, `borderRadius: 12`, Figma "Soft card" shadow (`#1F2937` @ 6%, y 2, blur 8)
- Primary button: primary bg, on-primary text, 1px border, `borderRadius: 12`, `paddingVertical: 13`, `paddingHorizontal: 16`, Inter SemiBold 14
- Secondary button: transparent bg, 1px primary border, same radius/padding
- Text inputs: surface fill, 1px border (danger color on error), `borderRadius: 12`
- Bottom tab: active item has subtle pill, `borderRadius: 8`, Inter Bold 10px labels, inactive items use `onNavigation`
- FAB: primary color, 56×56, `borderRadius: 28`, `bottom: 90, right: 20`

### Screens implemented from Figma

| Screen | File |
|---|---|
| Splash | `app/index.tsx` |
| Welcome | `app/(auth)/welcome.tsx` |
| Sign In | `app/(auth)/sign-in.tsx` |
| Onboarding | `app/(auth)/onboarding.tsx` |
| Home dashboard | `app/(tourist)/(tabs)/home.tsx` |
| Explore destinations | `app/(tourist)/(tabs)/explore.tsx` |
| My Trips | `app/(tourist)/(tabs)/trips.tsx` |
| Profile | `app/(tourist)/(tabs)/profile.tsx` |
| Budget planner | `app/(tourist)/budget.tsx` |
| Destination detail | `app/(tourist)/destination/[id].tsx` |
| Emergency | `app/(tourist)/emergency.tsx` |
| Expense tracker | `app/(tourist)/expenses.tsx` |
| Tab navigator | `app/(tourist)/(tabs)/_layout.tsx` |
| KalawAssistance FAB | `components/assistant/KalawAssistanceFAB.tsx` |

---

## Changelog

### Mobile-only back bar (Emergency, Expenses, Budget)
- The `‹ Screen name` top bar (with its `☰` menu) on Emergency, Expenses and Budget now shows only on mobile. On web, the top WebNav bar handles navigation.
- On mobile, tapping `‹ Screen name` now goes back (`router.back()`), or to Home if there is no previous screen. Before this it was plain text.

### Scroll and web menu fixes (Emergency, Expenses, Budget)
- `components/web/WebLayout.tsx`: pages that scroll themselves (`scrollable={false}`) are now held to the browser window height (`100vh`), and every wrapper between the window and the page has `minHeight: 0`, so the page's own ScrollView can scroll on web (Emergency, Expenses, Trips, My Budgets, Booking history, etc.)
- Emergency, Expenses and Budget: the ScrollView now fills the remaining screen height (`flex: 1`) on mobile and web
- Emergency, Expenses and Budget: the in-screen `☰` menu icon is hidden on web, because the top web navigation bar already does that job. It still shows on mobile.
- Emergency: uses `react-native-safe-area-context` `SafeAreaView` like the other tourist screens, and no longer shows a second KalawAssistance button on web

### Figma color system alignment
- Replaced the whole light and dark palette in `constants/tokens.ts` with the exact Figma variable values (see Design System above)
- Added `elevated`, `onNavigation`, `StatusColors` and `statusLabel()` tokens from Figma
- Removed hardcoded old-palette hex values from 32 screens/components (admin, business owner, tourist, web portals) in favor of theme tokens
- Booking and verification status badges now use Figma's solid `RequestStatus` fills
- `KalawButton`, `KalawCard` and `KalawInput` aligned with the Figma component specs (radius 12, 1px borders, Soft card shadow)

### Figma design implementation
- Rewrote all major tourist-facing mobile screens to match Figma pixel-for-pixel
- Updated `constants/tokens.ts` light mode colors to match Figma design tokens
- Tab navigator updated: active pill `#EDF3F2`, Inter Bold 10px labels, correct padding
- FAB fixed to exact 56×56 with `borderRadius: 28`
- Added `app/(tourist)/explore-for-trip.tsx` — destination picker for new trips

### "Add to My Trips" behavior fix
- Destination detail `Add to My Trips` now directly creates an itinerary (no navigation to picker)
- `+New` on the Trips screen still navigates to the explore-for-trip destination picker

---

## License

MIT — see LICENSE file.
