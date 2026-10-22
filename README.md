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
| `/patient/bookings[/id]` | patient | Track, cancel, rate | `GET /bookings/{id}`, `POST /bookings/{id}/cancel`, `POST /reviews` |
| `/patient/account` | patient | Profile, saved addresses | `PATCH /users/me`, `/addresses` CRUD |
| `/pro/onboarding` | professional | First-time profile setup | `POST /professionals/onboard`, `PUT /professionals/me/availability/slots` |
| `/pro` | professional | Dashboard, accepting switch, earnings | `GET /professionals/me`, `PATCH /professionals/me`, `GET /bookings/professional/*` |
| `/pro/requests` | professional | Open requests near them | `GET /bookings/professional/requests`, `POST /bookings/{id}/accept` |
| `/pro/bookings[/id]` | professional | Their visits; start, complete, hand back | `GET /bookings/professional/{id}`, `POST /bookings/{id}/check-in`, `…/check-out`, `…/release` |
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
    api.ts                fetch wrapper: envelope, errors, silent refresh
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
