# Mendyr Web

The Mendyr website: patients book nurses, physiotherapists and caregivers for home visits,
and healthcare professionals take visits near them on their own schedule.

Built with Next.js 16 (App Router), React 19, TypeScript and Tailwind CSS 4. It talks to the
[Mendyr backend](https://github.com/Mendyr-health/Mendyr-Backend) (FastAPI) — run that
first; this app has no backend of its own.

## How it works

### Two sides, one booking flow

```
Patient                                      Professional (nurse, physio, caretaker, …)
───────                                      ──────────────────────────────────────────
Sign up  /register/patient                   Sign up  /register/professional
                                             Onboard  /pro/onboarding
                                               profession → service area → services → timings
Browse   /services
Book     /patient/book
  service, address, date & time, notes
  → booking is published as a request  ───►  Requests  /pro/requests
                                               everyone it suits sees it; first Accept wins
Track    /patient/bookings/[id]        ◄───  Accept   → patient sees who's coming + can call
  (refreshes every 10s)                      Visit    /pro/bookings/[id]
                                               call, directions, start, complete with notes
Rate the visit                       ◄─────  Completed → earnings on the dashboard
```

A professional sees a request when **all** of these hold (decided by the backend):

- it's for their profession and a service they've switched on,
- the patient's address is inside their travel radius,
- it starts inside their weekly timings (no timings set = any time),
- they're approved and "Accepting new requests" is on.

Before accepting they see the area, time, earning and the patient's notes; the street
address and the patient's phone number are shown only after they accept. Payment is
collected after the visit for now — nothing is charged online.

### Pages

| Route | Who | What | API calls |
|---|---|---|---|
| `/` | everyone | Landing page | `GET /services/categories`, `GET /services` |
| `/services` | everyone | Full catalogue | same |
| `/login`, `/register/*` | everyone | Email + password auth | `POST /auth/login`, `POST /auth/register` |
| `/patient` | patient | Upcoming visits, quick booking | `GET /bookings`, `GET /addresses` |
| `/patient/book` | patient | Booking flow | `POST /bookings/quote`, `GET /professionals/nearby`, `POST /addresses`, `POST /bookings` |
| `/patient/bookings`, `/patient/bookings/view?id=` | patient | Track, cancel, rate | `GET /bookings/{id}`, `POST /bookings/{id}/cancel`, `POST /reviews` |
| `/patient/account` | patient | Profile, saved addresses | `PATCH /users/me`, `/addresses` CRUD |
| `/pro/onboarding` | professional | First-time profile setup | `POST /professionals/onboard`, `PUT /professionals/me/availability/slots` |
| `/pro` | professional | Dashboard, accepting switch, earnings | `GET /professionals/me`, `PATCH /professionals/me`, `GET /bookings/professional/*` |
| `/pro/requests` | professional | Open requests near them | `GET /bookings/professional/requests`, `POST /bookings/{id}/accept` |
| `/pro/bookings`, `/pro/bookings/view?id=` | professional | Their visits; start, complete, hand back | `GET /bookings/professional/{id}`, `POST /bookings/{id}/check-in`, `…/check-out`, `…/release` |
| `/pro/schedule` | professional | Weekly timings | `GET`/`PUT /professionals/me/availability/slots` |
| `/pro/profile` | professional | Details, service area, services | `PATCH /professionals/me`, `/professionals/me/services` |

Address and service-area forms never ask for coordinates: "Use my current location" uses the
browser's location, otherwise the backend geocodes the pincode (`GET /geo/locate`,
`GET /geo/reverse`).

### Auth and the `/api` proxy

The browser only ever calls this site's own origin. `next.config.ts` rewrites `/api/*` to the
backend (`BACKEND_URL`), so the backend's httponly session cookies are **first-party** — no
CORS, no third-party-cookie problems in Safari, and no token ever touches JavaScript.

- Login/register set the `access_token` (30 min) and `refresh_token` (7 days) cookies.
- `src/lib/api.ts` unwraps the backend's `{success, data, error}` envelope and, on a 401,
  calls `POST /auth/token/refresh` once (the refresh cookie is sent automatically) and retries.
- `src/lib/auth.tsx` holds the signed-in user (`GET /auth/me`); `RoleGate` keeps patients and
  professionals in their own areas and sends signed-out visitors to `/login?next=…`.

### Code layout

```
src/
  app/                    routes (see the table above)
    patient/              patient area — layout gates on role "patient"
    pro/                  professional area — layout gates on role "professional" and
                          sends anyone without a profile to /pro/onboarding
  components/             UI kit (ui.tsx), app shell, forms, cards
  lib/
    api.ts                fetch wrapper: envelope, errors, silent refresh (cookies on the web, Bearer in the app)
    platform.ts           which build this is (web or app) and the API origin
    session.ts            the app build's tokens, in the iOS Keychain / Android Keystore
    auth.tsx              signed-in user context
    hooks.ts              useApi (fetch + polling), useNow
    types.ts              API response types — mirror the backend's app/schemas
    format.ts             money, India-time dates, phone numbers
    constants.ts          labels for professions, statuses, languages, states
```

All times are shown and picked in India time (`Asia/Kolkata`), even for someone booking from
abroad. Styling is plain Tailwind; components take props (`variant`, `tone`, `size`) rather
than `className` overrides — see the note on `cn()` in `components/ui.tsx`.

> This is Next.js 16 with Cache Components on. Pages that read the URL (`useSearchParams`,
> `useParams`, `usePathname`) must render inside `<Suspense>`, or `next build` fails. Read
> `AGENTS.md` and the docs in `node_modules/next/dist/docs/` before relying on older Next habits.

## Run it locally

Needs Node 20.9+ and the backend running on `http://127.0.0.1:8000` (see the backend's
`SETUP.md`; `uv run python -m scripts.seed_demo_data` creates demo accounts).

```bash
npm install
npm run dev          # http://localhost:3000
```

Point at a different backend with `BACKEND_URL` (see `.env.example`):

```bash
BACKEND_URL=https://<your-app>.fastapicloud.dev npm run dev
```

Demo accounts from the backend seed (password `Demo@12345`): `asha.patel.demo@mendyr.app`
(patient), `nurse1.demo@mendyr.app`, `nurse2.demo@mendyr.app`, `physio1.demo@mendyr.app`.

Checks: `npm run lint`, `npx tsc --noEmit`, `npm run build`.

## Deploy to Vercel

1. Import this repository in Vercel (framework preset: Next.js — no build settings to change).
2. Add the environment variable `BACKEND_URL` = your FastAPI Cloud URL, e.g.
   `https://mendyr.fastapicloud.dev` (no trailing slash). The build fails with a clear message
   if it's missing.
3. Deploy.

On the backend, set `ENVIRONMENT=production` (secure cookies). Because requests reach it through
this site's proxy, the default `SESSION_COOKIE_SAMESITE=lax` is correct and no CORS origin
needs adding.

## Mobile apps (Android & iOS)

The same code ships as native apps through [Capacitor 8](https://capacitorjs.com). There is
one app, **Mendyr** (`com.mendyr.patient`, the original app's id); patients and professionals
both use it, and it routes them by role exactly like the website.

### How the app build differs

`npm run build:app` builds this repo with `NEXT_PUBLIC_BUILD_TARGET=app`
(`src/lib/platform.ts`), a static export into `out/`, then `cap sync` copies it into
`android/` and `ios/`. In that build:

- **API**: calls the backend directly at `NEXT_PUBLIC_API_URL` (there's no `/api` proxy
  inside a phone). The backend must list the app's origins in `CORS_ORIGINS`:
  `capacitor://localhost` (iOS) and `https://localhost` (Android).
- **Session**: Bearer tokens kept in the iOS Keychain / Android Keystore
  (`src/lib/session.ts`) instead of cookies; refreshed silently, cleared on logout.
- **Start screen**: `/` is a native-style welcome screen; signed-in users skip to their area.
- **Booking pages** use `?id=` (`/patient/bookings/view?id=…`) because a static export can't
  pre-render every booking id. The website uses the same URLs.

### Fitting the phone screen

- The WebView runs edge to edge (`viewport-fit=cover`, Android `EdgeToEdge`, Capacitor's
  `SystemBars` `insetsHandling: "native"`). Every bar pads itself with the `--safe-top` /
  `--safe-bottom` CSS variables (`env(safe-area-inset-*)`) — nothing sits under the notch,
  status bar, home indicator or Android navigation bar.
- Nothing can scroll sideways (`overflow-x: clip`); heights use `dvh`; inputs are 16px so iOS
  doesn't zoom; pinch-zoom and rubber-band overscroll are off in the app (not on the website).
- Portrait only; the splash stays up until the first frame is painted; the Android back button
  goes back (or leaves the app from a home screen); the bottom tab bar hides while the keyboard
  is open; "Use my current location" uses the native permission prompt.
- `src/components/native-bootstrap.tsx` wires the native pieces; `capacitor.config.ts` holds
  the plugin settings.

### Run on a phone or simulator

Needs Android Studio (JDK 21, Android SDK 36) and/or Xcode 16+.

```bash
NEXT_PUBLIC_API_URL=https://<backend>.fastapicloud.dev npm run build:app
npm run cap:android   # opens Android Studio — press Run
npm run cap:ios       # opens Xcode — pick a simulator or device, press Run
```

Use an `https` backend: the app's WebView is a secure origin, so a plain-`http` local backend
is blocked as mixed content. After changing web code, re-run `npm run build:app`.

Icons and splash screens come from `public/mendyr.png`; regenerate them with
`npm run app:assets` (store icons are kept fully opaque, as Apple requires).

### CI/CD (GitHub Actions)

| Workflow | Runs on | Produces |
|---|---|---|
| `ci.yml` | every PR, pushes to `main` | lint, typecheck, website build, app bundle build |
| `android.yml` | PRs, pushes to `main`, tags `v*`, manual | debug APK (run artifact); on `main` also the **android-latest** pre-release (a fixed download link for testers); on tags/manual a signed APK + AAB, a GitHub Release, and optionally Google Play |
| `ios.yml` | pushes to `main`, tags `v*`, manual, PRs touching iOS files | simulator compile check; on tags/manual a signed build uploaded to **TestFlight** |

Ship a release: `git tag v0.2.0 && git push origin v0.2.0`. Build numbers come from the
workflow run number (always increasing); the version name from the tag (numbers only, e.g.
`v1.2.3`) or `package.json`.

**Repository settings** (Settings → Secrets and variables → Actions):

| Name | Kind | Needed for |
|---|---|---|
| `MENDYR_API_URL` | variable | every installable build — the backend URL |
| `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` | secrets | signed Android releases |
| `PLAY_SERVICE_ACCOUNT_JSON` | secret | Google Play uploads |
| `APP_STORE_CONNECT_KEY_ID`, `APP_STORE_CONNECT_ISSUER_ID`, `APP_STORE_CONNECT_KEY_P8`, `APPLE_TEAM_ID` | secrets | TestFlight uploads |

Without the secrets, the matching steps are skipped and everything else still runs.

**Android release signing** — create the upload key once and keep it safe (losing it means
you can't update the app):

```bash
keytool -genkeypair -v -keystore mendyr-upload.keystore -alias mendyr \
  -keyalg RSA -keysize 2048 -validity 10000
base64 -i mendyr-upload.keystore | pbcopy   # paste as ANDROID_KEYSTORE_BASE64
```

**Google Play** — create the app in Play Console (package `com.mendyr.patient`), upload the
first AAB by hand (Google requires it), then add a service account with release permissions
and store its JSON key as `PLAY_SERVICE_ACCOUNT_JSON`. Tagged builds then go to internal
testing; manual runs can pick another track.

**App Store / TestFlight** — in App Store Connect create the app with bundle id
`com.mendyr.patient`, then create an API key (Users and Access → Integrations, role *Admin*
so Xcode can manage signing for you) and store its id, issuer id and the contents of the
`.p8` file. `APPLE_TEAM_ID` is on developer.apple.com → Membership.
