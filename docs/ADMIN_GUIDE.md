# OCC Track — Admin Guide

For Super Admins, SP Admins, Regional Admins, and CDO Leaders.
Written for non-engineers — no terminal, no code.

---

## Who you are, what you see

OCC Track scopes every screen by your role. Pick yours below to jump to the
section that applies to you.

| Role | Where to start | What you can do |
|---|---|---|
| **Super Admin** (Franklin Graham) | `/` Dashboard → National View | Everything. Audit log, security center, mode flips, all signups, all CDOs. |
| **SP Admin** (HQ oversight) | `/` Dashboard → National View | Same as Super Admin minus the Security Center retention/wipe + audit-log retention purge. |
| **Regional Admin** (David Chen et al.) | `/` Dashboard → Region View | Signups + attendance + transfers for CDOs in your region. |
| **CDO Leader** (Maria, etc.) | `/` Dashboard → CDO View | Open the Welcome Table, manage your CDO's drop-offs, pack cartons, load trailers. No PII roster. |
| **Drop-off Leader** | `/` Dashboard → DO View | Daily totals at your drop-off, transfer to your CDO. |
| **Greeter** | `/checkin` | Log shoeboxes as donors walk up. The only role that interacts with donors directly. |

To switch roles for a demo: open the side menu (☰ icon top-left) and pick a
role from the "Demo Mode" grid at the bottom. In production this would be
real auth (SSO + magic-link).

---

## The seven daily tasks

### 1. Set up the schedule before Collection Week (`/signups`)

Regional Admin or higher. One week before Collection Week:

1. **Open `/signups`** from the side menu → "Signups & Schedule"
2. Find the **"Collection Week Schedule"** grid — eight day-cards (Mon Nov 16 → Mon Nov 23).
3. Click a time below the date to **edit shift hours**: "9 AM – 12 Noon" etc.
4. If a group has a day fully covered (e.g. "First Baptist Youth Group has Saturday"), click **"Block out this day"**. The volunteer signup page will mark it as already-covered.
5. Click **"Reset to defaults"** if you make a mess and want to start over.

### 2. Invite volunteers (the public signup page)

Share the URL `/signup` with anyone who wants to volunteer. They:
- Pick **English or Spanish** at the top of the intro page
- Fill name + email + phone + ZIP (auto-routes to closest CDO)
- Choose first-time/returner, T-shirt size, emergency contact (optional)
- Tap the **CAPTCHA** ("I'm not a robot")
- Agree + submit

They'll see a confirmation page with a **personal edit link** — a unique URL
they can use later to update their info without calling anyone. We also
"email" it to them (mocked in this prototype).

### 3. Manage the roster (`/signups`)

Once people sign up, the **Signups list** appears below the schedule. By default:
- **All PII is blurred** — phone, email, emergency contact. Click a row to reveal one card (auto-restores after 30 seconds). Click the "PII hidden" master toggle for a global reveal.
- **Search** filters by name/email/phone/notes.
- **Sort** by Newest / Oldest / A-Z.
- Each row has icons:
  - 📨 **Send** — resend their existing edit link by email
  - 🔑 **Reissue** — mint a NEW token, invalidating the old (security incident path)
  - ↔️ **Transfer** — move them to a different CDO (notifies both CDO Leaders + emails the volunteer)
  - 🗑 **Remove** — delete the signup

### 4. Bulk import last year's roster

If you have a CSV from a previous Collection Week:

1. On `/signups`, click **"Import"** (top action row)
2. **Download template** to see expected columns
3. Drop your CSV into the dialog — every row is parsed + validated
4. Green check = ready; red ⚠ = required field missing
5. Click **"Import N rows"** — each row gets a fresh magic link + audit entry

### 5. Print name badges

The day before Collection Week:

1. From `/signups`, click **"Badges"** (top action row)
2. Or from the side menu → "Print Badges"
3. Preview shows Avery 5390 layout (8 per page, 3⅜" × 2⅓")
4. Click **"Print"** — pre-loaded badge stock prints + peels + sticks

### 6. Day-of: open the Welcome Table kiosk

On Day 1 of Collection Week, hand a tablet to your greeter:

1. From CDO Dashboard, tap the green **"Open the Welcome Table"** card
2. **Set a 4-digit PIN** — share with greeters covering this CDO only
3. Volunteers walk up + tap their own name to check in
4. The kiosk locks after idle; greeter unlocks with the PIN
5. **Triple-tap the lock icon** (top-left corner) to manually re-lock when handing the tablet to a new greeter

### 7. During Collection Week (CDO Leader operational view)

- `/checkin` — log shoeboxes as donors arrive (Greeters use this most)
- `/cartons` — pack + seal cartons of ~15 shoeboxes
- `/loading` — Bill of Lading + trailer load + ship
- `/dropoffs` — see daily totals from sub-locations
- `/totals` — your daily roll-up
- `/summary` — your CDO's total for the week so far

> **Important:** these are LOCKED IN PRODUCTION MODE.
> Switch to "Testing Mode" in `/settings` to enter sample data.
> Switch BACK to production before real Collection Week begins.

---

## Super Admin extras

### Audit log (`/audit-log`)

Every PII access is recorded with actor, timestamp, target, action.
- **Filter** by action type
- **Search** across actors / details
- **Export CSV** for offline analysis
- **Retention purge** — delete events older than 90 / 180 / 365 days, or wipe all. The purge itself is logged so destroying evidence completely is impossible.

### Outbox (`/outbox`)

Every email/SMS/in-app notification the platform would have sent.
- **Filter** by channel
- Click a message to **expand the full body** — verify the magic link is in the email, etc.
- **Run dispatcher** — manually simulate the T-7d / T-1d / day-of reminder cron

### Security Center (`/security`)

Live security signals + production hardening checklist.
- **Top stats**: honeypot trips, throttle hits, brute-force lockouts, PII reveals
- **Top origins** — distinguishes 1 persistent bot from N distributed origins
- **Hardening checklist** — what production still needs (CAPTCHA, server-side rate limits, etc.). 6 items still open.

### App Mode (`/settings`)

The single biggest data-integrity control:
- **Production mode** (default): shoebox + carton entry **locked**.
- **Testing mode**: full read/write; gold banner appears at top of every page.
- Each flip requires a reason + is logged in the mode-change ledger.

---

## Common questions

**"A volunteer says they can't find their edit link."**
→ On `/signups`, find their row, click the 📨 Send icon. Resends the same link to their email.

**"A volunteer thinks their link was leaked."**
→ Click the 🔑 Reissue icon. Mints a new link + invalidates the old. The old link starts returning the "link expired" page immediately.

**"A volunteer was routed to the wrong CDO."**
→ Click the ↔️ Transfer icon. Both CDO Leaders get notified; the volunteer gets an email.

**"The kiosk PIN was forgotten."**
→ Greeter enters 5 wrong PINs → the PIN auto-resets. Next person who launches the kiosk sets a fresh one.

**"What happens if a bot floods the signup form?"**
→ Honeypot trips, time-to-fill bounces fast submits, browser throttle caps to 1 submission per 10 seconds. Spikes trigger an in-app alert + email to Super Admin via the anomaly detector (configurable thresholds).

**"How do I see who looked at the signup roster yesterday?"**
→ Super Admin only — `/audit-log` → filter by "Viewed signup roster" → sort by timestamp.

---

## What this app is NOT (yet)

- **Not connected to a real backend.** All data lives in your browser's localStorage. Clearing site data wipes the app.
- **No real email/SMS delivery.** Messages are captured in `/outbox` for review but nothing actually sends.
- **No real CAPTCHA.** The "I'm not a robot" button is a stub; production wires to Cloudflare Turnstile.
- **No real authentication.** Role-switching is a demo; production needs SSO.

See [DEPLOYMENT.md](./DEPLOYMENT.md) for the engineer's guide to wiring this to a real backend, and [`TODO.md`](../TODO.md) for the full gap inventory.
