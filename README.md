# OCC Track

**A production-grade Collection Week companion for Samaritan's Purse Operation Christmas Child.**

OCC Track is a React/TypeScript prototype demonstrating how a $100M+ ministry org could run Collection Week logistics end-to-end: volunteer signup, day-of arrival, shoebox check-in, cartonization, trailer loading, and the data integrity / privacy infrastructure to make all of it auditable.

> **Status:** Phase 29 complete. ~12,000 LOC, 23 routes, 80 components, full Spanish coverage on the public surfaces, production-grade security stack, ephemeral preview live at the URL below.

## Quick preview

This repo currently runs as a frontend-only prototype (everything is localStorage, no real backend). Drop into a fresh browser to get the demo data:

- **Live ephemeral preview:** `https://attendance-generations-heading-stating.trycloudflare.com` (cloudflared quick tunnel — may rotate)
- **Local:** `npm install && npm run dev` → http://localhost:3000

## Roles to try

The app defaults to **Super Admin (Franklin Graham)** but every role has a distinct dashboard. Use the role-switcher at the bottom of the side menu:

| Role | What they see |
|---|---|
| Super Admin | Everything across all 50 states + 5 regions + Audit Log + Outbox + Security Center |
| SP Admin | National view, same as Super Admin minus Security Center / Audit Log retention |
| Regional Admin | Their region's CDOs, scoped signups, Welcome Table dashboard widget |
| CDO Leader | Their CDO's shoebox totals, drop-offs, cartons + "Open the Welcome Table" card |
| DO Leader | Their drop-off's daily totals |
| Greeter | Check-in form (the only role that interacts with donors directly) |

## What's built (24+ phases)

**Public flow** — Volunteer signup wizard with i18n (EN/ES), magic-link self-edit, lost-link recovery, Welcome Table iPad kiosk with PIN lock, clock kiosk.

**Admin flow** — Per-CDO scoped roster, bulk CSV import, cross-CDO transfer, token resend/reissue, printable Avery 5390 name badges, role-aware dashboards, idle auto-lock after 15 min.

**Privacy + audit** — Full audit log with retention purge (90/180/365-day), PII blur with click-to-reveal + 30-sec auto-restore, role-based access cascading from Super Admin down to Greeter.

**Security** — Honeypot, time-to-fill check, per-browser throttle, Cloudflare Turnstile stub, magic-link brute-force lockout (5-in-5min → 15-min wall), FNV-1a tamper detection on protected localStorage keys, anomaly detector with per-kind thresholds + anti-fatigue cooldowns, kiosk SHA-256 PIN with constant-time compare, full CSP + HSTS + COOP/COEP/CORP via meta tags AND netlify.toml AND vercel.json AND public/_headers, robots.txt + per-page noindex.

**Messaging** — Notification outbox (mocked email/SMS/in-app) with scheduled reminder dispatcher (T-7d / T-1d / day-of, idempotent).

**Data integrity** — App-mode toggle (production-by-default locks shoebox + carton entry; testing-mode unlocks with a persistent gold banner). Mode flips logged + audited. Duplicate signup detection with normalized email/phone matching.

For the full catalog plus what's still needed for production, see **[TODO.md](./TODO.md)**.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | React 19 + Vite 7 |
| Routing | react-router (HashRouter for static-host compatibility) |
| Styling | Tailwind CSS 4 |
| State | useState + useLocalStorage + Context (no Redux/Zustand — small enough) |
| Animations | Framer Motion |
| Icons | lucide-react |
| Charts | Recharts |
| Types | TypeScript 5.x strict |
| i18n | Custom 200-line module — no react-i18next |
| Backend | **None.** Everything is localStorage. See TODO.md P0.1. |
| Tests | Vitest configured but **zero tests written yet.** See TODO.md P1.2. |

## Local development

```bash
npm install
npm run dev           # localhost:3000
npm run build         # tsc -b && vite build → dist/
npm run lint          # eslint .
```

## Deployment

Three host configs are pre-wired for one-click deployment with full security headers (CSP / HSTS / COOP / X-Frame-Options / Permissions-Policy / etc.):

- **Vercel:** `vercel.json` at repo root
- **Netlify:** `netlify.toml` at repo root
- **Cloudflare Pages:** `public/_headers` is the format their build step reads

## Repository layout

```
src/
  App.tsx                      Root; wraps I18n + AppMode + Auth providers
  pages/                       23 route components
    Dashboard.tsx              Role-aware root → AdminDashboard / RegionalDashboard / ...
    VolunteerSignup.tsx        Public 3-step wizard
    MySignup.tsx               Magic-link self-edit
    Signups.tsx                Admin roster + schedule + transfers + bulk import
    WelcomeTable.tsx           Fullscreen iPad kiosk (PIN-locked)
    AuditLog.tsx               Privacy access trail (Super Admin)
    Outbox.tsx                 Mock email/SMS/in-app messages (Super Admin)
    SecurityCenter.tsx         Real-time security signals + hardening checklist
    Settings.tsx               App mode toggle + preferences
    ...
  components/                  80 reusable pieces
    LockOverlay.tsx            Idle-lock blur + role re-confirm
    KioskPinGate.tsx           4-digit PIN setup + unlock for kiosks
    TurnstileStub.tsx          Cloudflare-style CAPTCHA placeholder
    ModeBanner.tsx             Persistent gold "TESTING MODE" strip
    BulkImportDialog.tsx       CSV drop-and-validate
    TransferDialog.tsx         Two-step cross-CDO transfer
    ...
  lib/                         Pure helpers
    auditLog.ts                Append-only privacy event ledger
    outbox.ts                  Multi-channel mock messaging
    security.ts                Honeypot constants, throttle, brute-force lockout
    anomalyDetector.ts         Per-kind threshold spike detection
    appMode.tsx                Test/production state + context + history
    i18n.tsx                   EN + ES dictionary, useTranslation hook
    tamperDetection.ts         FNV-1a checksums on protected keys
    kioskPin.ts                SHA-256 + constant-time PIN compare
  hooks/                       useAuth, useIdleLock, useNoIndex, useLocalStorage
  data/                        Mock data (states, locations, demo users)
```

## License

This is a prototype. No license declared yet. The Operation Christmas Child logo and the Samaritan's Purse name are trademarks of Samaritan's Purse; this prototype is not affiliated with or endorsed by them.

## Author

Patrick Kennedy — built incrementally across 29 phases with Claude Sonnet 4.5 (1M context). Full design rationale captured in commit messages.
